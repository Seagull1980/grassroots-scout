const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Database = require('./db/database.js');
const encryptionService = require('./utils/encryption.js');
const emailService = require('./services/emailService.js');
const alertService = require('./services/alertService.js');
const cronService = require('./services/cronService.js');
const NotificationServer = require('./services/notificationServer.js');
const { 
  generalLimiter, 
  authLimiter, 
  profileLimiter, 
  securityHeaders, 
  sanitizeRequest, 
  auditLogger 
} = require('./middleware/security.js');
const { requireBetaAccess } = require('./middleware/betaAccess.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';

// Middleware
// app.use(securityHeaders); // Temporarily disable security headers for testing
// app.use(generalLimiter); // General rate limiting - temporarily disabled for debugging
app.use(sanitizeRequest); // Request sanitization
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://192.168.0.44:5173', // Your network IP
    'http://192.168.0.44:5174', // Your network IP alternate port
    process.env.FRONTEND_URL, // Environment variable for production deployment
    true // Allow all origins for local development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));
app.use(express.json({ limit: '10mb' })); // Limit payload size

// Database connection
const db = new Database();

// Routes
const leagueRequestsRouter = require('./routes/league-requests');
const verificationRouter = require('./routes/verification');
const savedSearchesRouter = require('./routes/saved-searches');

app.use('/api/league-requests', leagueRequestsRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/saved-searches', savedSearchesRouter);

// Initialize database tables on startup
(async () => {
  try {
    await db.createTables();
    
    // CRITICAL: Force-check emailHash column exists (migration may not run on existing DBs)
    try {
      const checkEmailHash = await db.query('PRAGMA table_info(users)');
      const hasEmailHash = checkEmailHash.rows.some(row => row.name === 'emailHash');
      if (!hasEmailHash) {
        console.log('⚠️  emailHash column missing - adding now...');
        // SQLite doesn't allow adding UNIQUE columns to existing tables - add without UNIQUE first
        try {
          await db.query('ALTER TABLE users ADD COLUMN emailHash VARCHAR');
          console.log('✅ Added emailHash column to users table');
        } catch (alterError) {
          if (alterError.message && alterError.message.includes('duplicate column')) {
            console.log('✅ emailHash column already exists (duplicate error ignored)');
          } else {
            throw alterError;
          }
        }
        // Create unique index separately
        await db.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_emailhash ON users(emailHash)');
        console.log('✅ Created unique index on emailHash column');
      } else {
        console.log('✅ emailHash column exists');
      }
    } catch (hashError) {
      // Ignore duplicate column errors
      if (!hashError.message || !hashError.message.includes('duplicate column')) {
        console.error('❌ Error checking/adding emailHash column:', hashError);
      }
    }
    
    // Auto-create admin account on production if none exists
    try {
      const adminCheck = await db.query("SELECT id FROM users WHERE role = 'Admin'");
      if (!adminCheck.rows || adminCheck.rows.length === 0) {
        console.log('⚠️  No admin account found - creating default admin...');
        const adminEmail = 'cgill1980@hotmail.com';
        const adminPassword = 'GrassrootsAdmin2026!'; // CHANGE THIS AFTER FIRST LOGIN
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        const emailHash = crypto.createHash('sha256').update(adminEmail.toLowerCase()).digest('hex');
        
        await db.query(
          `INSERT INTO users (email, emailHash, password, firstName, lastName, role, isEmailVerified, betaAccess)
           VALUES (?, ?, ?, ?, ?, 'Admin', 1, 1)`,
          [adminEmail, emailHash, hashedPassword, 'Chris', 'Gill']
        );
        console.log('✅ Admin account created: cgill1980@hotmail.com / GrassrootsAdmin2026!');
        console.log('⚠️  CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN');
      } else {
        console.log('✅ Admin account exists');
      }
    } catch (adminError) {
      console.error('❌ Error checking/creating admin account:', adminError);
    }
    
    console.log(`🚀 Server running on port ${PORT} with ${process.env.DB_TYPE || 'sqlite'} database`);
    
    // Initialize and start cron jobs with shared database instance
    cronService.db = db;
    cronService.init();
    cronService.start();
    
    // Test email service connection (disabled - SMTP blocked on Render)
    // await emailService.testConnection();
    
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
})();

// Analytics middleware to track page views
const trackPageView = async (req, res, next) => {
  if (req.user && req.method === 'GET') {
    const sessionId = req.headers['x-session-id'] || `session_${Date.now()}_${Math.random()}`;
    
    try {
      await db.query(`INSERT INTO page_views (userId, page, sessionId, ipAddress, userAgent) 
              VALUES (?, ?, ?, ?, ?)`, 
             [req.user.userId, req.path, sessionId, req.ip, req.get('User-Agent')]);

      // Update or create user session
      await db.query(`INSERT OR REPLACE INTO user_sessions 
              (userId, sessionId, startTime, pageViews, ipAddress, userAgent)
              VALUES (?, ?, 
                      COALESCE((SELECT startTime FROM user_sessions WHERE sessionId = ?), ?),
                      COALESCE((SELECT pageViews FROM user_sessions WHERE sessionId = ?), 0) + 1,
                      ?, ?)`,
             [req.user.userId, sessionId, sessionId, new Date().toISOString(), sessionId, req.ip, req.get('User-Agent')]);
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }
  next();
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes

// Register
app.post('/api/auth/register', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['Coach', 'Player', 'Parent/Guardian']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Prevent Admin registration through public endpoint
    if (role === 'Admin') {
      return res.status(403).json({ error: 'Admin accounts can only be created by existing administrators' });
    }

    // Encrypt email for secure storage
    const emailData = encryptionService.encryptEmail(email);

    // Check if user already exists using searchable hash
    const existingUserResult = await db.query('SELECT id FROM users WHERE emailHash = ?', [emailData.searchHash]);
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password with increased rounds for better security
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user with encrypted email - simplified for compatibility with older DBs
    const insertResult = await db.query(
      'INSERT INTO users (email, emailHash, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?, ?)',
      [emailData.encrypted, emailData.searchHash, hashedPassword, firstName, lastName, role]
    );

    const userId = insertResult.lastID;

    // Skip email sending for now (SMTP blocked on Render)
    // try {
    //   await emailService.sendVerificationEmail(email, firstName, emailVerificationToken);
    // } catch (emailError) {
    //   console.error('Failed to send verification email:', emailError);
    // }

    // Create JWT token - user is verified but needs beta approval
    const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });

    // Audit log successful registration
    auditLogger('user_registered', userId, {
      email,
      role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'Registration successful! You can now login.',
      token,
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Email verification endpoint
app.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this verification token
    const result = await db.query(
      'SELECT * FROM users WHERE emailVerificationToken = ? AND emailVerificationExpires > datetime("now")',
      [token]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user as verified and clear verification token
    await db.query(
      'UPDATE users SET isEmailVerified = ?, emailVerificationToken = NULL, emailVerificationExpires = NULL WHERE id = ?',
      [true, user.id]
    );

    // Decrypt email for response
    const decryptedEmail = encryptionService.decrypt(user.email);

    // Create full access token now that email is verified
    const token_new = jwt.sign({ 
      userId: user.id, 
      email: decryptedEmail, 
      role: user.role 
    }, JWT_SECRET, { expiresIn: '7d' });

    // Audit log successful verification
    auditLogger('email_verified', user.id, {
      email: decryptedEmail,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Email verified successfully!',
      token: token_new,
      user: {
        id: user.id,
        email: decryptedEmail,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: true,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email
app.post('/api/auth/resend-verification', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const emailHash = encryptionService.hashForSearch(email);

    const result = await db.query('SELECT * FROM users WHERE emailHash = ?', [emailHash]);
    const user = result.rows[0];

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If your email is registered, you will receive a verification email.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await db.query(
      'UPDATE users SET emailVerificationToken = ?, emailVerificationExpires = ? WHERE id = ?',
      [emailVerificationToken, emailVerificationExpires.toISOString(), user.id]
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, user.firstName, emailVerificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ message: 'Verification email sent successfully!' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Create searchable hash for email lookup
    const emailHash = encryptionService.hashForSearch(email);

    const result = await db.query('SELECT * FROM users WHERE emailHash = ?', [emailHash]);
    const user = result.rows[0];
    
    if (!user) {
      auditLogger('login_failed', null, {
        email,
        reason: 'user_not_found',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      auditLogger('login_failed', user.id, {
        email,
        reason: 'invalid_password',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Email verification disabled - skip check

    // Decrypt email for response
    const decryptedEmail = encryptionService.decrypt(user.email);

    const token = jwt.sign(
      { userId: user.id, email: decryptedEmail, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Audit log successful login
    auditLogger('login_success', user.id, {
      email: decryptedEmail,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: decryptedEmail,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        betaAccess: user.betaAccess === 1 || user.betaAccess === true || user.role === 'Admin',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DEV ONLY: Quick admin login endpoint (remove in production)
app.get('/api/dev/admin-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    // Find the admin user
    const result = await db.query('SELECT * FROM users WHERE role = ? LIMIT 1', ['Admin']);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'No admin user found. Create an admin account first.' });
    }

    // Decrypt email for response
    const decryptedEmail = encryptionService.decrypt(user.email);

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: decryptedEmail,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Dev admin login successful',
      token,
      user: {
        id: user.id,
        email: decryptedEmail,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Dev admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const result = await db.query('SELECT id, email, firstName, lastName, role, createdAt FROM users WHERE id = ?', 
      [req.user.userId]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt email for response
    const decryptedEmail = encryptionService.decrypt(user.email);
    
    res.json({ 
      user: {
        ...user,
        email: decryptedEmail
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, requireBetaAccess, async (req, res) => {
  console.log('Profile GET request from user:', req.user.userId);
  const query = `
    SELECT u.id, u.email, u.firstName, u.lastName, u.role, u.createdAt,
           p.phone, p.dateOfBirth, p.location, p.bio, p.position, p.preferredTeamGender,
           p.preferredFoot, p.height, p.weight, p.experienceLevel, p.availability, 
           p.coachingLicense, p.yearsExperience, p.specializations, p.trainingLocation, 
           p.matchLocation, p.trainingDays, p.ageGroupsCoached, p.emergencyContact, 
           p.emergencyPhone, p.medicalInfo, p.profilePicture, p.isProfileComplete, p.lastUpdated
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.userId
    WHERE u.id = ?
  `;
  
  try {
    const result = await db.query(query, [req.user.userId]);
    const row = result.rows[0];
    
    if (!row) {
      console.log('No user found for ID:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Raw profile data:', row);
    
    // Decrypt email
    row.email = encryptionService.decrypt(row.email);
    
    // Decrypt sensitive profile data
    const decryptedProfile = encryptionService.decryptProfileData(row);
    
    // Parse JSON fields
    if (decryptedProfile.availability) {
      try {
        decryptedProfile.availability = JSON.parse(decryptedProfile.availability);
      } catch (e) {
        decryptedProfile.availability = [];
      }
    } else {
      decryptedProfile.availability = [];
    }
    
    if (decryptedProfile.specializations) {
      try {
        decryptedProfile.specializations = JSON.parse(decryptedProfile.specializations);
      } catch (e) {
        decryptedProfile.specializations = [];
      }
    } else {
      decryptedProfile.specializations = [];
    }
    
    if (decryptedProfile.trainingDays) {
      try {
        decryptedProfile.trainingDays = JSON.parse(decryptedProfile.trainingDays);
      } catch (e) {
        decryptedProfile.trainingDays = [];
      }
    } else {
      decryptedProfile.trainingDays = [];
    }
    
    if (decryptedProfile.ageGroupsCoached) {
      try {
        decryptedProfile.ageGroupsCoached = JSON.parse(decryptedProfile.ageGroupsCoached);
      } catch (e) {
        decryptedProfile.ageGroupsCoached = [];
      }
    } else {
      decryptedProfile.ageGroupsCoached = [];
    }
    
    console.log('Processed profile data:', decryptedProfile);
    res.json({ profile: decryptedProfile });
  } catch (error) {
    console.error('Database error in profile GET:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user profile
app.put('/api/profile', profileLimiter, authenticateToken, requireBetaAccess, [
  body('phone').optional().isLength({ min: 5, max: 20 }).withMessage('Phone number must be 5-20 characters'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
  body('location').optional().notEmpty().withMessage('Location cannot be empty'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('position').optional().notEmpty().withMessage('Position cannot be empty'),
  body('height').optional().isInt({ min: 100, max: 250 }).withMessage('Height must be between 100-250 cm'),
  body('weight').optional().isInt({ min: 30, max: 200 }).withMessage('Weight must be between 30-200 kg'),
  body('yearsExperience').optional().isInt({ min: 0, max: 50 }).withMessage('Years of experience must be 0-50')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      phone, dateOfBirth, location, bio, position, preferredFoot, height, weight,
      experienceLevel, availability, coachingLicense, yearsExperience, specializations,
      trainingLocation, matchLocation, trainingDays, ageGroupsCoached,
      emergencyContact, emergencyPhone, medicalInfo, profilePicture
    } = req.body;

    // Encrypt sensitive profile data
    const encryptedData = encryptionService.encryptProfileData({
      phone, dateOfBirth, location, bio, emergencyContact, 
      emergencyPhone, medicalInfo, trainingLocation, matchLocation
    });

    // Check if profile exists
    const existingResult = await db.query('SELECT userId FROM user_profiles WHERE userId = ?', [req.user.userId]);
    const existingProfile = existingResult.rows[0];

    const profileData = [
      encryptedData.phone, encryptedData.dateOfBirth, encryptedData.location, encryptedData.bio, 
      position, preferredFoot, height, weight, experienceLevel, JSON.stringify(availability), 
      coachingLicense, yearsExperience, JSON.stringify(specializations), 
      encryptedData.trainingLocation, encryptedData.matchLocation,
      JSON.stringify(trainingDays), JSON.stringify(ageGroupsCoached), 
      encryptedData.emergencyContact, encryptedData.emergencyPhone,
      encryptedData.medicalInfo, profilePicture, 1, new Date().toISOString()
    ];

    if (existingProfile) {
      // Update existing profile
      const updateQuery = `
        UPDATE user_profiles SET
          phone = ?, dateOfBirth = ?, location = ?, bio = ?, position = ?, preferredFoot = ?,
          height = ?, weight = ?, experienceLevel = ?, availability = ?, coachingLicense = ?,
          yearsExperience = ?, specializations = ?, trainingLocation = ?, matchLocation = ?,
          trainingDays = ?, ageGroupsCoached = ?, emergencyContact = ?, emergencyPhone = ?,
          medicalInfo = ?, profilePicture = ?, isProfileComplete = ?, lastUpdated = ?
        WHERE userId = ?
      `;
      
      await db.query(updateQuery, [...profileData, req.user.userId]);
      res.json({ message: 'Profile updated successfully' });
    } else {
      // Create new profile
      const insertQuery = `
        INSERT INTO user_profiles (
          phone, dateOfBirth, location, bio, position, preferredFoot, height, weight,
          experienceLevel, availability, coachingLicense, yearsExperience, specializations,
          trainingLocation, matchLocation, trainingDays, ageGroupsCoached, emergencyContact, 
          emergencyPhone, medicalInfo, profilePicture, isProfileComplete, lastUpdated, userId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await db.query(insertQuery, [...profileData, req.user.userId]);
      res.json({ message: 'Profile created successfully' });
    }
  } catch (error) {
    console.error('Profile operation error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Post team vacancy
app.post('/api/vacancies', authenticateToken, requireBetaAccess, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('league').notEmpty().withMessage('League is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('position').notEmpty().withMessage('Position is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, league, ageGroup, position, location, contactInfo, locationData, hasMatchRecording, hasPathwayToSenior } = req.body;

  // Encrypt contact information for privacy
  const encryptedContactInfo = encryptionService.encryptContactInfo(contactInfo);

  // Handle location data if provided
  let locationAddress = null, locationLatitude = null, locationLongitude = null, locationPlaceId = null;
  if (locationData) {
    locationAddress = locationData.address;
    locationLatitude = locationData.latitude;
    locationLongitude = locationData.longitude;
    locationPlaceId = locationData.placeId;
  }

  // Convert boolean values
  const matchRecording = hasMatchRecording ? 1 : 0;
  const pathwayToSenior = hasPathwayToSenior ? 1 : 0;

  db.run(
    `INSERT INTO team_vacancies (
      title, description, league, ageGroup, position, location, contactInfo, postedBy,
      locationAddress, locationLatitude, locationLongitude, locationPlaceId,
      hasMatchRecording, hasPathwayToSenior
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, league, ageGroup, position, location, encryptedContactInfo, req.user.userId,
     locationAddress, locationLatitude, locationLongitude, locationPlaceId,
     matchRecording, pathwayToSenior],
    async function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create vacancy' });
      }
      
      const vacancyId = this.lastID;
      
      // Send alerts to matching players
      try {
        const vacancy = {
          id: vacancyId,
          title,
          description,
          league,
          ageGroup,
          position,
          location,
          postedBy: req.user.userId
        };
        await alertService.sendNewVacancyAlerts(vacancy);
        
        // Send real-time notifications
        const notificationServer = req.app.locals.notificationServer;
        if (notificationServer) {
          notificationServer.notifyNewTeamVacancy(vacancy);
        }
      } catch (alertError) {
        console.error('Failed to send vacancy alerts:', alertError);
        // Don't fail the vacancy creation if alerts fail
      }
      
      res.status(201).json({
        message: 'Vacancy created successfully',
        vacancyId: vacancyId
      });
    }
  );
});

// Get team vacancies
app.get('/api/vacancies', async (req, res) => {
  const { 
    league, 
    ageGroup, 
    position, 
    location, 
    search, 
    teamGender,
    // Advanced filters
    experienceLevel,
    travelDistance,
    trainingFrequency,
    availability,
    coachingLicense,
    hasMatchRecording,
    hasPathwayToSenior,
    // Location-based filtering
    centerLat,
    centerLng
  } = req.query;
  
  let query = `
    SELECT v.*, u.firstName, u.lastName, up.coachingLicense, up.yearsExperience
    FROM team_vacancies v 
    JOIN users u ON v.postedBy = u.id 
    LEFT JOIN user_profiles up ON u.id = up.userId
    WHERE v.status = 'active'
  `;
  const params = [];

  if (league) {
    query += ' AND v.league = ?';
    params.push(league);
  }
  if (ageGroup) {
    query += ' AND v.ageGroup = ?';
    params.push(ageGroup);
  }
  if (position) {
    query += ' AND v.position = ?';
    params.push(position);
  }
  if (teamGender) {
    query += ' AND v.teamGender = ?';
    params.push(teamGender);
  }
  if (location) {
    query += ' AND v.location LIKE ?';
    params.push(`%${location}%`);
  }
  if (search) {
    query += ' AND (v.title LIKE ? OR v.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Advanced filters
  if (experienceLevel) {
    const experienceLevels = experienceLevel.split(',');
    const experienceConditions = [];
    
    for (const level of experienceLevels) {
      switch (level) {
        case 'beginner':
          experienceConditions.push('up.yearsExperience BETWEEN 0 AND 2');
          break;
        case 'intermediate':
          experienceConditions.push('up.yearsExperience BETWEEN 3 AND 7');
          break;
        case 'advanced':
          experienceConditions.push('up.yearsExperience BETWEEN 8 AND 15');
          break;
        case 'professional':
          experienceConditions.push('up.yearsExperience > 15');
          break;
      }
    }
    
    if (experienceConditions.length > 0) {
      query += ` AND (${experienceConditions.join(' OR ')})`;
    }
  }

  if (coachingLicense) {
    const licenses = coachingLicense.split(',');
    const placeholders = licenses.map(() => '?').join(',');
    query += ` AND up.coachingLicense IN (${placeholders})`;
    params.push(...licenses);
  }

  // Filter by match recording facilities
  if (hasMatchRecording === 'true' || hasMatchRecording === '1') {
    query += ' AND v.hasMatchRecording = 1';
  }

  // Filter by pathway to senior team
  if (hasPathwayToSenior === 'true' || hasPathwayToSenior === '1') {
    query += ' AND v.hasPathwayToSenior = 1';
  }

  if (availability) {
    const availabilityOptions = availability.split(',');
    const availabilityConditions = [];
    
    if (availabilityOptions.includes('weekdays')) {
      availabilityConditions.push("(v.trainingDays LIKE '%Monday%' OR v.trainingDays LIKE '%Tuesday%' OR v.trainingDays LIKE '%Wednesday%' OR v.trainingDays LIKE '%Thursday%' OR v.trainingDays LIKE '%Friday%')");
    }
    if (availabilityOptions.includes('weekends')) {
      availabilityConditions.push("(v.trainingDays LIKE '%Saturday%' OR v.trainingDays LIKE '%Sunday%')");
    }
    if (availabilityOptions.includes('evenings')) {
      availabilityConditions.push("v.trainingTime LIKE '%evening%' OR v.trainingTime LIKE '%19:%' OR v.trainingTime LIKE '%20:%' OR v.trainingTime LIKE '%21:%'");
    }
    if (availabilityOptions.includes('mornings')) {
      availabilityConditions.push("v.trainingTime LIKE '%morning%' OR v.trainingTime LIKE '%09:%' OR v.trainingTime LIKE '%10:%' OR v.trainingTime LIKE '%11:%'");
    }
    if (availabilityOptions.includes('afternoons')) {
      availabilityConditions.push("v.trainingTime LIKE '%afternoon%' OR v.trainingTime LIKE '%13:%' OR v.trainingTime LIKE '%14:%' OR v.trainingTime LIKE '%15:%' OR v.trainingTime LIKE '%16:%'");
    }
    
    if (availabilityConditions.length > 0) {
      query += ` AND (${availabilityConditions.join(' OR ')})`;
    }
  }

  // Location-based filtering for travel distance
  if (centerLat && centerLng && travelDistance) {
    // Using Haversine formula approximation for SQLite
    query += ` AND (
      6371 * acos(
        cos(radians(?)) * cos(radians(COALESCE(v.latitude, 0))) *
        cos(radians(COALESCE(v.longitude, 0)) - radians(?)) +
        sin(radians(?)) * sin(radians(COALESCE(v.latitude, 0)))
      )
    ) <= ?`;
    params.push(centerLat, centerLng, centerLat, parseFloat(travelDistance));
  }

  query += ' ORDER BY v.createdAt DESC';

  try {
    const result = await db.query(query, params);
    const rows = result.rows;
    
    // Transform rows to include locationData object and decrypt contact info
    const vacancies = rows.map(row => {
      const vacancy = { ...row };
      
      // Decrypt contact information
      if (vacancy.contactInfo) {
        vacancy.contactInfo = encryptionService.decryptContactInfo(vacancy.contactInfo);
      }
      
      // Add locationData if coordinates exist
      if (row.locationLatitude && row.locationLongitude) {
        vacancy.locationData = {
          address: row.locationAddress,
          latitude: row.locationLatitude,
          longitude: row.locationLongitude,
          placeId: row.locationPlaceId
        };
      }
      
      // Remove raw location columns from response
      delete vacancy.locationAddress;
      delete vacancy.locationLatitude;
      delete vacancy.locationLongitude;
      delete vacancy.locationPlaceId;
      
      return vacancy;
    });
    
    res.json({ vacancies });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Player Availability endpoints

// Create player availability
app.post('/api/player-availability', authenticateToken, requireBetaAccess, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('league').notEmpty().withMessage('League is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('positions').isArray({ min: 1 }).withMessage('At least one position is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, league, ageGroup, positions, location, contactInfo, locationData } = req.body;

  // Encrypt contact information for privacy
  const encryptedContactInfo = encryptionService.encryptContactInfo(contactInfo);

  // Handle location data if provided
  let locationAddress = null, locationLatitude = null, locationLongitude = null, locationPlaceId = null;
  if (locationData) {
    locationAddress = locationData.address;
    locationLatitude = locationData.latitude;
    locationLongitude = locationData.longitude;
    locationPlaceId = locationData.placeId;
  }

  db.run(
    `INSERT INTO player_availability (
      title, description, preferredLeagues, ageGroup, positions, location, contactInfo, postedBy,
      locationAddress, locationLatitude, locationLongitude, locationPlaceId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, league, ageGroup, JSON.stringify(positions), location, encryptedContactInfo, req.user.userId,
     locationAddress, locationLatitude, locationLongitude, locationPlaceId],
    async function(err) {
      if (err) {
        console.error('Error creating player availability:', err);
        return res.status(500).json({ error: 'Failed to create player availability' });
      }
      
      const availabilityId = this.lastID;
      
      // Send alerts to matching coaches
      try {
        const playerAvailability = {
          id: availabilityId,
          title,
          description,
          preferredLeagues: league,
          ageGroup,
          positions,
          location
        };
        await alertService.sendNewPlayerAlerts(playerAvailability);
      } catch (alertError) {
        console.error('Failed to send player alerts:', alertError);
        // Don't fail the availability creation if alerts fail
      }
      
      res.status(201).json({
        message: 'Player availability created successfully',
        availabilityId: availabilityId
      });
    }
  );
});

// Get player availability
app.get('/api/player-availability', async (req, res) => {
  const { 
    league, 
    ageGroup, 
    position, 
    location, 
    search, 
    preferredTeamGender,
    // Advanced filters
    experienceLevel,
    travelDistance,
    trainingFrequency,
    availability,
    // Location-based filtering
    centerLat,
    centerLng
  } = req.query;
  
  let query = `
    SELECT p.*, u.firstName, u.lastName, up.yearsExperience, up.experienceLevel 
    FROM player_availability p 
    JOIN users u ON p.postedBy = u.id 
    LEFT JOIN user_profiles up ON u.id = up.userId
    WHERE p.status = 'active'
  `;
  const params = [];

  if (league) {
    query += ' AND p.preferredLeagues = ?';
    params.push(league);
  }
  if (ageGroup) {
    query += ' AND p.ageGroup = ?';
    params.push(ageGroup);
  }
  if (position) {
    // Search within the JSON array of positions
    query += ' AND p.positions LIKE ?';
    params.push(`%"${position}"%`);
  }
  if (preferredTeamGender) {
    query += ' AND p.preferredTeamGender = ?';
    params.push(preferredTeamGender);
  }
  if (location) {
    query += ' AND p.location LIKE ?';
    params.push(`%${location}%`);
  }
  if (search) {
    query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Advanced filters
  if (experienceLevel) {
    const experienceLevels = experienceLevel.split(',');
    const experienceConditions = [];
    
    for (const level of experienceLevels) {
      switch (level) {
        case 'beginner':
          experienceConditions.push('up.yearsExperience BETWEEN 0 AND 2 OR up.experienceLevel = "Beginner"');
          break;
        case 'intermediate':
          experienceConditions.push('up.yearsExperience BETWEEN 3 AND 7 OR up.experienceLevel = "Intermediate"');
          break;
        case 'advanced':
          experienceConditions.push('up.yearsExperience BETWEEN 8 AND 15 OR up.experienceLevel = "Advanced"');
          break;
        case 'professional':
          experienceConditions.push('up.yearsExperience > 15 OR up.experienceLevel = "Professional"');
          break;
      }
    }
    
    if (experienceConditions.length > 0) {
      query += ` AND (${experienceConditions.join(' OR ')})`;
    }
  }

  if (trainingFrequency) {
    const frequencies = trainingFrequency.split(',');
    const placeholders = frequencies.map(() => '?').join(',');
    query += ` AND p.trainingFrequency IN (${placeholders})`;
    params.push(...frequencies);
  }

  if (availability) {
    const availabilityOptions = availability.split(',');
    const availabilityConditions = [];
    
    if (availabilityOptions.includes('weekdays')) {
      availabilityConditions.push("(p.availability LIKE '%Monday%' OR p.availability LIKE '%Tuesday%' OR p.availability LIKE '%Wednesday%' OR p.availability LIKE '%Thursday%' OR p.availability LIKE '%Friday%')");
    }
    if (availabilityOptions.includes('weekends')) {
      availabilityConditions.push("(p.availability LIKE '%Saturday%' OR p.availability LIKE '%Sunday%')");
    }
    if (availabilityOptions.includes('evenings')) {
      availabilityConditions.push("p.availability LIKE '%evening%'");
    }
    if (availabilityOptions.includes('mornings')) {
      availabilityConditions.push("p.availability LIKE '%morning%'");
    }
    if (availabilityOptions.includes('afternoons')) {
      availabilityConditions.push("p.availability LIKE '%afternoon%'");
    }
    if (availabilityOptions.includes('flexible')) {
      availabilityConditions.push("p.availability LIKE '%flexible%' OR p.availability LIKE '%any%'");
    }
    
    if (availabilityConditions.length > 0) {
      query += ` AND (${availabilityConditions.join(' OR ')})`;
    }
  }

  // Location-based filtering for travel distance
  if (centerLat && centerLng && travelDistance) {
    // Using Haversine formula approximation for SQLite
    query += ` AND (
      6371 * acos(
        cos(radians(?)) * cos(radians(COALESCE(p.latitude, 0))) *
        cos(radians(COALESCE(p.longitude, 0)) - radians(?)) +
        sin(radians(?)) * sin(radians(COALESCE(p.latitude, 0)))
      )
    ) <= ?`;
    params.push(centerLat, centerLng, centerLat, parseFloat(travelDistance));
  }

  query += ' ORDER BY p.createdAt DESC';

  try {
    const result = await db.query(query, params);
    const rows = result.rows;
    
    // Transform rows to include locationData object and parse positions
    const availability = rows.map(row => {
      const item = { ...row };
      
      // Decrypt contact information
      if (item.contactInfo) {
        item.contactInfo = encryptionService.decryptContactInfo(item.contactInfo);
      }
      
      // Parse positions JSON array
      try {
        item.positions = JSON.parse(row.positions || '[]');
      } catch (e) {
        console.error('Error parsing positions JSON:', e);
        item.positions = [];
      }
      
      // Add locationData if coordinates exist
      if (row.locationLatitude && row.locationLongitude) {
        item.locationData = {
          address: row.locationAddress,
          latitude: row.locationLatitude,
          longitude: row.locationLongitude,
          placeId: row.locationPlaceId
        };
      }
      
      // Remove raw location columns from response
      delete item.locationAddress;
      delete item.locationLatitude;
      delete item.locationLongitude;
      delete item.locationPlaceId;
      
      return item;
    });
    
    res.json({ availability });
  } catch (err) {
    console.error('Error fetching player availability:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// League management endpoints

// Get all leagues (includes user's pending requests if authenticated)
app.get('/api/leagues', (req, res, next) => {
  // Try to authenticate but don't require it
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Continue without authentication if token is invalid
    }
  }
  next();
}, async (req, res) => {
  try {
    const { includePending = false } = req.query;
    
    // Get approved leagues (simplified for old DB compatibility)
    let query = 'SELECT id, name, url, \'approved\' as status FROM leagues WHERE isActive = 1';
    let params = [];

    // If user wants pending leagues and is authenticated
    if (includePending === 'true' && req.user) {
      query += ` 
        UNION ALL 
        SELECT 
          CAST(('pending_' || id) as TEXT) as id, 
          name, 
          url, 
          'pending' as status 
        FROM league_requests 
        WHERE status = 'pending' AND submittedBy = ?
      `;
      params.push(req.user.userId);
    }

    query += ' ORDER BY status, name ASC';
    
    const result = await db.query(query, params);
    const leagues = result.rows.map(league => ({
      ...league,
      isPending: league.status === 'pending'
    }));
    
    res.json({ leagues });
  } catch (error) {
    console.error('Error fetching leagues:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });
    res.status(500).json({ 
      error: 'Database error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new league (Admin only)
app.post('/api/leagues', authenticateToken, requireAdmin, [
  body('name').notEmpty().withMessage('League name is required'),
  body('description').optional()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description } = req.body;

  db.run(
    'INSERT INTO leagues (name, description, createdBy) VALUES (?, ?, ?)',
    [name, description, req.user.userId],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(400).json({ error: 'League name already exists' });
        }
        return res.status(500).json({ error: 'Failed to create league' });
      }
      res.status(201).json({
        message: 'League created successfully',
        league: {
          id: this.lastID,
          name,
          description
        }
      });
    }
  );
});

// Update league (Admin only)
app.put('/api/leagues/:id', authenticateToken, requireAdmin, [
  body('name').notEmpty().withMessage('League name is required'),
  body('description').optional()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description } = req.body;
  const leagueId = req.params.id;

  db.run(
    'UPDATE leagues SET name = ?, description = ? WHERE id = ?',
    [name, description, leagueId],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(400).json({ error: 'League name already exists' });
        }
        return res.status(500).json({ error: 'Failed to update league' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'League not found' });
      }
      res.json({ message: 'League updated successfully' });
    }
  );
});

// Delete league (Admin only)
app.delete('/api/leagues/:id', authenticateToken, requireAdmin, (req, res) => {
  const leagueId = req.params.id;

  db.run(
    'UPDATE leagues SET isActive = 0 WHERE id = ?',
    [leagueId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete league' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'League not found' });
      }
      res.json({ message: 'League deleted successfully' });
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Analytics API endpoints

// Analytics overview
app.get('/api/analytics/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching analytics overview...');
    
    // Use simpler queries that work with the existing database structure
    const totalUsersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const totalTeamsResult = await db.query('SELECT COUNT(*) as count FROM team_vacancies');
    const totalPlayersResult = await db.query('SELECT COUNT(*) as count FROM player_availability');
    
    // Handle different result formats
    const getTotalFromResult = (result) => {
      if (result && result.rows && result.rows[0]) {
        return result.rows[0].count || 0;
      }
      if (result && result[0]) {
        return result[0].count || 0;
      }
      return 0;
    };

    const overview = {
      totalUsers: getTotalFromResult(totalUsersResult),
      totalTeams: getTotalFromResult(totalTeamsResult),
      totalPlayers: getTotalFromResult(totalPlayersResult),
      totalMatches: 0, // Default for now
      todayUsers: 0,
      todayTeams: 0, 
      todayPlayers: 0,
      todayPageViews: 0,
      todayUniqueVisitors: 0,
      activeSessions: 0
    };

    // Get user type breakdown
    const userTypesResult = await db.query('SELECT role as userType, COUNT(*) as count FROM users GROUP BY role');
    const userTypes = userTypesResult?.rows || userTypesResult || [];
    
    // Simple popular pages data
    const popularPages = [
      { page: '/dashboard', views: 150 },
      { page: '/teams', views: 89 },
      { page: '/players', views: 67 }
    ];
    
    console.log('✅ Analytics data fetched successfully');
    
    res.json({
      overview,
      userTypeBreakdown: userTypes,
      popularPages
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data', details: error.message });
  }
});

// Daily statistics
app.get('/api/analytics/daily-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching daily stats...');
    const days = parseInt(req.query.days) || 30;
    
    // Simplified daily stats with sample data
    const sampleData = [];
    const today = new Date();
    
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      sampleData.push({
        date: dateStr,
        users: Math.floor(Math.random() * 5) + 1,
        teams: Math.floor(Math.random() * 3) + 1,
        players: Math.floor(Math.random() * 8) + 2,
        pageViews: Math.floor(Math.random() * 50) + 20,
        uniqueVisitors: Math.floor(Math.random() * 25) + 10
      });
    }

    console.log('✅ Daily stats fetched successfully');
    res.json(sampleData);
  } catch (error) {
    console.error('Analytics daily stats error:', error);
    res.status(500).json({ error: 'Failed to fetch daily statistics', details: error.message });
  }
});

// User activity analytics
app.get('/api/analytics/user-activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching user activity...');
    
    // Simple sample user activity data
    const sampleActivity = {
      mostActiveUsers: [
        { name: 'Chris Gill', email: 'cgill1980@hotmail.com', userType: 'Admin', pageViews: 45 },
        { name: 'Test User', email: 'test2@example.com', userType: 'Player', pageViews: 23 }
      ],
      recentActivity: [
        { timestamp: new Date().toISOString(), user: 'Chris Gill', action: 'Viewed Analytics', page: '/analytics' },
        { timestamp: new Date(Date.now() - 300000).toISOString(), user: 'Test User', action: 'Login', page: '/dashboard' }
      ]
    };

    console.log('✅ User activity fetched successfully');
    res.json(sampleActivity);
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity', details: error.message });
  }
});

// Analytics tracking endpoint
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { events, sessionId, userId } = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }

    // For now, just log the events (you can extend this to store in database)
    console.log(`📊 Analytics: Received ${events.length} events${userId ? ` for user ${userId}` : ' (anonymous)'}`);
    
    // Process each event
    for (const event of events) {
      console.log(`📈 Event: ${event.category}/${event.action}`, {
        label: event.label,
        value: event.value,
        timestamp: event.timestamp
      });
    }

    res.json({ 
      success: true, 
      processed: events.length,
      message: 'Analytics events processed successfully'
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Failed to process analytics events', details: error.message });
  }
});

// Create admin user (Admin only)
app.post('/api/admin/create-admin', authenticateToken, requireAdmin, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert admin user
      db.run(
        'INSERT INTO users (email, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, firstName, lastName, 'Admin'],
        function(err) {
          if (err) {
            console.error('Database error during admin creation:', err);
            return res.status(500).json({ error: 'Failed to create admin user' });
          }

          res.status(201).json({
            message: 'Admin user created successfully',
            admin: {
              id: this.lastID,
              email,
              firstName,
              lastName,
              role: 'Admin',
              createdAt: new Date().toISOString()
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin League Management Routes

// Get all leagues from database (for admin management)
app.get('/api/admin/leagues', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM leagues ORDER BY name');
    const leagues = result.rows;
    res.json({ leagues });
  } catch (error) {
    console.error('Error fetching admin leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// Create a new league
app.post('/api/admin/leagues', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, region, ageGroup, country, url, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'League name is required' });
    }

    const insertResult = await db.query(
      'INSERT INTO leagues (name, region, ageGroup, country, url, description, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, region || null, ageGroup || null, country || 'England', url || null, description || null, req.user.userId]
    );
    
    const leagueResult = await db.query('SELECT * FROM leagues WHERE id = ?', [insertResult.lastID]);
    const league = leagueResult.rows[0];
    
    res.json({ league, message: 'League created successfully' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A league with this name already exists' });
    }
    console.error('Error creating league:', error);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// Update a league
app.put('/api/admin/leagues/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, region, ageGroup, country, url, description, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'League name is required' });
    }

    const updateResult = await db.query(
      'UPDATE leagues SET name = ?, region = ?, ageGroup = ?, country = ?, url = ?, description = ?, isActive = ? WHERE id = ?',
      [name, region || null, ageGroup || null, country || 'England', url || null, description || null, isActive !== undefined ? isActive : true, id]
    );

    if (updateResult.changes === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    const leagueResult = await db.query('SELECT * FROM leagues WHERE id = ?', [id]);
    const league = leagueResult.rows[0];
    
    res.json({ league, message: 'League updated successfully' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A league with this name already exists' });
    }
    console.error('Error updating league:', error);
    res.status(500).json({ error: 'Failed to update league' });
  }
});

// Delete a league
app.delete('/api/admin/leagues/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleteResult = await db.query('DELETE FROM leagues WHERE id = ?', [id]);

    if (deleteResult.changes === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({ message: 'League deleted successfully' });
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ error: 'Failed to delete league' });
  }
});

// Freeze/Unfreeze a league (toggle isActive status)
app.patch('/api/admin/leagues/:id/freeze', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { freeze } = req.body;

    // Get current league status
    const leagueResult = await db.query('SELECT * FROM leagues WHERE id = ?', [id]);
    
    if (leagueResult.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    const newStatus = freeze !== undefined ? !freeze : !leagueResult.rows[0].isActive;

    const updateResult = await db.query(
      'UPDATE leagues SET isActive = ? WHERE id = ?',
      [newStatus, id]
    );

    const updatedLeagueResult = await db.query('SELECT * FROM leagues WHERE id = ?', [id]);
    const league = updatedLeagueResult.rows[0];
    
    res.json({ 
      league, 
      message: `League ${newStatus ? 'activated' : 'frozen'} successfully` 
    });
  } catch (error) {
    console.error('Error freezing/unfreezing league:', error);
    res.status(500).json({ error: 'Failed to update league status' });
  }
});

// Populate database with FA leagues (one-time setup)
app.post('/api/admin/leagues/populate-fa-leagues', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const faLeagues = [
      { 
        name: 'Central Warwickshire Youth Football League', 
        region: 'Midlands', 
        ageGroup: 'Youth',
        url: 'https://fulltime.thefa.com/index.html?league=4385806',
        hits: 163137
      },
      { 
        name: 'Northumberland Football League', 
        region: 'North East', 
        ageGroup: 'Senior',
        url: 'https://fulltime.thefa.com/index.html?league=136980506',
        hits: 154583
      },
      { 
        name: 'Eastern Junior Alliance', 
        region: 'Eastern', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=257944965',
        hits: 150693
      },
      { 
        name: 'Sheffield & District Junior Sunday League', 
        region: 'Yorkshire', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=5484799',
        hits: 136761
      },
      { 
        name: 'East Manchester Junior Football League ( Charter Standard League )', 
        region: 'North West', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=8335132',
        hits: 124371
      },
      { 
        name: 'Warrington Junior Football League', 
        region: 'North West', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=70836961',
        hits: 118582
      },
      { 
        name: 'Teesside Junior Football Alliance League', 
        region: 'North East', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=8739365',
        hits: 116243
      },
      { 
        name: 'Surrey Youth League (SYL)', 
        region: 'South East', 
        ageGroup: 'Youth',
        url: 'https://fulltime.thefa.com/index.html?league=863411662',
        hits: 113925
      }
    ];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const league of faLeagues) {
      try {
        await db.query(
          'INSERT INTO leagues (name, region, ageGroup, url, hits, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
          [league.name, league.region, league.ageGroup, league.url, league.hits, req.user.userId]
        );
        insertedCount++;
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          skippedCount++;
        } else {
          throw error;
        }
      }
    }

    res.json({ 
      message: 'FA leagues population completed',
      inserted: insertedCount,
      skipped: skippedCount,
      total: faLeagues.length
    });
  } catch (error) {
    console.error('Error populating FA leagues:', error);
    res.status(500).json({ error: 'Failed to populate FA leagues' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Alert System API endpoints

// Get user alert preferences
app.get('/api/alerts/preferences', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const preferences = await alertService.getAlertPreferences(req.user.userId);
    res.json({ preferences });
  } catch (error) {
    console.error('Error getting alert preferences:', error);
    res.status(500).json({ error: 'Failed to get alert preferences' });
  }
});

// Update user alert preferences
app.put('/api/alerts/preferences', authenticateToken, requireBetaAccess, [
  body('emailNotifications').optional().isBoolean(),
  body('newVacancyAlerts').optional().isBoolean(),
  body('newPlayerAlerts').optional().isBoolean(),
  body('trialInvitations').optional().isBoolean(),
  body('weeklyDigest').optional().isBoolean(),
  body('instantAlerts').optional().isBoolean(),
  body('preferredLeagues').optional().isArray(),
  body('ageGroups').optional().isArray(),
  body('positions').optional().isArray(),
  body('maxDistance').optional().isInt({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await alertService.setAlertPreferences(req.user.userId, req.body);
    res.json({ message: 'Alert preferences updated successfully' });
  } catch (error) {
    console.error('Error updating alert preferences:', error);
    res.status(500).json({ error: 'Failed to update alert preferences' });
  }
});

// Get alert history for user
app.get('/api/alerts/history', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(`
      SELECT al.*, 
        CASE 
          WHEN al.targetType = 'vacancy' THEN (
            SELECT json_object('title', title, 'league', league, 'position', position)
            FROM team_vacancies WHERE id = al.targetId
          )
          WHEN al.targetType = 'player_availability' THEN (
            SELECT json_object('title', title, 'preferredLeagues', preferredLeagues)
            FROM player_availability WHERE id = al.targetId
          )
          ELSE NULL
        END as targetData
      FROM alert_logs al
      WHERE al.userId = ?
      ORDER BY al.sentAt DESC
      LIMIT ? OFFSET ?
    `, [req.user.userId, limit, offset]);

    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM alert_logs WHERE userId = ?',
      [req.user.userId]
    );

    res.json({
      alerts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.rows[0].total,
        totalPages: Math.ceil(totalResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting alert history:', error);
    res.status(500).json({ error: 'Failed to get alert history' });
  }
});

// User Engagement and Recommendation System

// Track user interaction
app.post('/api/engagement/track', authenticateToken, requireBetaAccess, [
  body('actionType').notEmpty().withMessage('Action type is required'),
  body('targetId').optional().isInt(),
  body('targetType').optional().notEmpty(),
  body('metadata').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { actionType, targetId, targetType, metadata } = req.body;

    await db.query(`
      INSERT INTO user_interactions (userId, actionType, targetId, targetType, metadata)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.userId, actionType, targetId, targetType, JSON.stringify(metadata || {})]);

    // Update daily engagement metrics
    const today = new Date().toISOString().split('T')[0];
    await db.query(`
      INSERT INTO user_engagement_metrics (userId, date, actionsCompleted)
      VALUES (?, ?, 1)
      ON CONFLICT(userId, date) DO UPDATE SET
        actionsCompleted = actionsCompleted + 1
    `, [req.user.userId, today]);

    res.json({ message: 'Interaction tracked successfully' });
  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

// Get personalized recommendations
app.get('/api/recommendations', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { type = 'all', limit = 10 } = req.query;
    
    // Get user's recent interactions to understand preferences
    const interactionsResult = await db.query(`
      SELECT actionType, targetType, metadata
      FROM user_interactions
      WHERE userId = ? AND createdAt > datetime('now', '-30 days')
      ORDER BY createdAt DESC
      LIMIT 50
    `, [req.user.userId]);

    const interactions = interactionsResult.rows;
    
    // Get user profile to understand preferences
    const profileResult = await db.query(`
      SELECT position, preferredTeamGender, experienceLevel, ageGroupsCoached
      FROM user_profiles
      WHERE userId = ?
    `, [req.user.userId]);

    let recommendations = [];

    if (req.user.role === 'Player' || req.user.role === 'Parent/Guardian') {
      // Recommend team vacancies
      let vacancyQuery = `
        SELECT v.*, u.firstName, u.lastName,
          CASE 
            WHEN ui.targetId IS NOT NULL THEN 1 
            ELSE 0 
          END as hasInteracted
        FROM team_vacancies v
        JOIN users u ON v.postedBy = u.id
        LEFT JOIN user_interactions ui ON ui.targetId = v.id AND ui.targetType = 'vacancy' AND ui.userId = ?
        WHERE v.status = 'active' AND ui.targetId IS NULL
      `;

      // Add filters based on user interactions and profile
      if (profileResult.rows.length > 0) {
        const profile = profileResult.rows[0];
        if (profile.position) {
          vacancyQuery += ` AND v.position = '${profile.position}'`;
        }
      }

      vacancyQuery += ` ORDER BY v.createdAt DESC LIMIT ?`;
      
      const vacanciesResult = await db.query(vacancyQuery, [req.user.userId, limit]);
      recommendations = recommendations.concat(
        vacanciesResult.rows.map(v => ({
          type: 'vacancy',
          id: v.id,
          title: v.title,
          description: v.description,
          metadata: {
            league: v.league,
            position: v.position,
            ageGroup: v.ageGroup,
            location: v.location,
            postedBy: `${v.firstName} ${v.lastName}`
          },
          score: Math.random() * 100 // Simple scoring for now
        }))
      );
    }

    if (req.user.role === 'Coach') {
      // Recommend available players
      let playerQuery = `
        SELECT p.*, u.firstName, u.lastName,
          CASE 
            WHEN ui.targetId IS NOT NULL THEN 1 
            ELSE 0 
          END as hasInteracted
        FROM player_availability p
        JOIN users u ON p.postedBy = u.id
        LEFT JOIN user_interactions ui ON ui.targetId = p.id AND ui.targetType = 'player_availability' AND ui.userId = ?
        WHERE p.status = 'active' AND ui.targetId IS NULL
        ORDER BY p.createdAt DESC 
        LIMIT ?
      `;
      
      const playersResult = await db.query(playerQuery, [req.user.userId, limit]);
      recommendations = recommendations.concat(
        playersResult.rows.map(p => ({
          type: 'player',
          id: p.id,
          title: p.title,
          description: p.description,
          metadata: {
            preferredLeagues: p.preferredLeagues,
            positions: JSON.parse(p.positions || '[]'),
            ageGroup: p.ageGroup,
            location: p.location,
            postedBy: `${p.firstName} ${p.lastName}`
          },
          score: Math.random() * 100 // Simple scoring for now
        }))
      );
    }

    // Sort by score (descending)
    recommendations.sort((a, b) => b.score - a.score);

    res.json({ 
      recommendations: recommendations.slice(0, limit),
      total: recommendations.length
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Social Sharing API

// Track social share
app.post('/api/social/share', [
  body('shareType').notEmpty().withMessage('Share type is required'),
  body('targetId').isInt().withMessage('Target ID is required'),
  body('targetType').notEmpty().withMessage('Target type is required'),
  body('platform').notEmpty().withMessage('Platform is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shareType, targetId, targetType, platform } = req.body;
    const userId = req.user ? req.user.userId : null;

    await db.query(`
      INSERT INTO social_shares (userId, shareType, targetId, targetType, platform)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, shareType, targetId, targetType, platform]);

    res.json({ message: 'Share tracked successfully' });
  } catch (error) {
    console.error('Error tracking share:', error);
    res.status(500).json({ error: 'Failed to track share' });
  }
});

// Get social share stats
app.get('/api/social/stats/:targetType/:targetId', async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    const result = await db.query(`
      SELECT platform, COUNT(*) as shareCount
      FROM social_shares
      WHERE targetType = ? AND targetId = ?
      GROUP BY platform
      ORDER BY shareCount DESC
    `, [targetType, targetId]);

    const totalResult = await db.query(`
      SELECT COUNT(*) as total
      FROM social_shares
      WHERE targetType = ? AND targetId = ?
    `, [targetType, targetId]);

    res.json({
      shares: result.rows,
      totalShares: totalResult.rows[0].total
    });
  } catch (error) {
    console.error('Error getting share stats:', error);
    res.status(500).json({ error: 'Failed to get share stats' });
  }
});

// User Bookmarks/Favorites

// Add bookmark
app.post('/api/bookmarks', authenticateToken, requireBetaAccess, [
  body('targetId').isInt().withMessage('Target ID is required'),
  body('targetType').isIn(['vacancy', 'player_availability']).withMessage('Valid target type required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { targetId, targetType } = req.body;

    await db.query(`
      INSERT OR IGNORE INTO user_bookmarks (userId, targetId, targetType)
      VALUES (?, ?, ?)
    `, [req.user.userId, targetId, targetType]);

    res.json({ message: 'Bookmark added successfully' });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

// Remove bookmark
app.delete('/api/bookmarks/:targetType/:targetId', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    await db.query(`
      DELETE FROM user_bookmarks
      WHERE userId = ? AND targetId = ? AND targetType = ?
    `, [req.user.userId, targetId, targetType]);

    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// Get user bookmarks
app.get('/api/bookmarks', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT ub.*, 
        CASE 
          WHEN ub.targetType = 'vacancy' THEN (
            SELECT json_object(
              'title', tv.title, 
              'description', tv.description,
              'league', tv.league,
              'position', tv.position,
              'ageGroup', tv.ageGroup,
              'location', tv.location,
              'status', tv.status,
              'createdAt', tv.createdAt
            )
            FROM team_vacancies tv WHERE tv.id = ub.targetId
          )
          WHEN ub.targetType = 'player_availability' THEN (
            SELECT json_object(
              'title', pa.title,
              'description', pa.description,
              'preferredLeagues', pa.preferredLeagues,
              'positions', pa.positions,
              'ageGroup', pa.ageGroup,
              'location', pa.location,
              'status', pa.status,
              'createdAt', pa.createdAt
            )
            FROM player_availability pa WHERE pa.id = ub.targetId
          )
        END as targetData
      FROM user_bookmarks ub
      WHERE ub.userId = ?
    `;

    const params = [req.user.userId];

    if (type) {
      query += ' AND ub.targetType = ?';
      params.push(type);
    }

    query += ' ORDER BY ub.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await db.query(query, params);

    const totalQuery = `
      SELECT COUNT(*) as total FROM user_bookmarks WHERE userId = ?
      ${type ? 'AND targetType = ?' : ''}
    `;
    const totalParams = type ? [req.user.userId, type] : [req.user.userId];
    const totalResult = await db.query(totalQuery, totalParams);

    res.json({
      bookmarks: result.rows.map(bookmark => ({
        ...bookmark,
        targetData: bookmark.targetData ? JSON.parse(bookmark.targetData) : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.rows[0].total,
        totalPages: Math.ceil(totalResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

// Advanced Search with History

// Enhanced search endpoint with history tracking
app.get('/api/search/enhanced', async (req, res) => {
  try {
    const { 
      q: searchTerm, 
      type = 'both', 
      league, 
      ageGroup, 
      position, 
      location, 
      page = 1, 
      limit = 20,
      sortBy = 'newest',
      radius = 50
    } = req.query;

    const offset = (page - 1) * limit;
    const filters = { league, ageGroup, position, location, radius };

    // Track search if user is authenticated
    if (req.user) {
      try {
        await db.query(`
          INSERT INTO user_search_history (userId, searchTerm, filters, searchedAt)
          VALUES (?, ?, ?, ?)
        `, [req.user.userId, searchTerm || '', JSON.stringify(filters), new Date().toISOString()]);
      } catch (searchLogError) {
        console.warn('Failed to log search:', searchLogError);
      }
    }

    let results = [];
    let totalResults = 0;

    // Search vacancies
    if (type === 'vacancies' || type === 'both') {
      let vacancyQuery = `
        SELECT v.*, u.firstName, u.lastName, 'vacancy' as resultType
        FROM team_vacancies v 
        JOIN users u ON v.postedBy = u.id 
        WHERE v.status = 'active'
      `;
      const vacancyParams = [];

      if (searchTerm) {
        vacancyQuery += ' AND (v.title LIKE ? OR v.description LIKE ?)';
        vacancyParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }
      if (league) {
        vacancyQuery += ' AND v.league = ?';
        vacancyParams.push(league);
      }
      if (ageGroup) {
        vacancyQuery += ' AND v.ageGroup = ?';
        vacancyParams.push(ageGroup);
      }
      if (position) {
        vacancyQuery += ' AND v.position = ?';
        vacancyParams.push(position);
      }
      if (location) {
        vacancyQuery += ' AND v.location LIKE ?';
        vacancyParams.push(`%${location}%`);
      }

      // Add sorting
      switch (sortBy) {
        case 'oldest':
          vacancyQuery += ' ORDER BY v.createdAt ASC';
          break;
        case 'alphabetical':
          vacancyQuery += ' ORDER BY v.title ASC';
          break;
        default:
          vacancyQuery += ' ORDER BY v.createdAt DESC';
      }

      vacancyQuery += ' LIMIT ? OFFSET ?';
      vacancyParams.push(limit, offset);

      const vacancyResult = await db.query(vacancyQuery, vacancyParams);
      results = results.concat(vacancyResult.rows);
    }

    // Search player availability
    if (type === 'players' || type === 'both') {
      let playerQuery = `
        SELECT p.*, u.firstName, u.lastName, 'player_availability' as resultType
        FROM player_availability p 
        JOIN users u ON p.postedBy = u.id 
        WHERE p.status = 'active'
      `;
      const playerParams = [];

      if (searchTerm) {
        playerQuery += ' AND (p.title LIKE ? OR p.description LIKE ?)';
        playerParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }
      if (league) {
        playerQuery += ' AND p.preferredLeagues = ?';
        playerParams.push(league);
      }
      if (ageGroup) {
        playerQuery += ' AND p.ageGroup = ?';
        playerParams.push(ageGroup);
      }
      if (position) {
        playerQuery += ' AND p.positions LIKE ?';
        playerParams.push(`%"${position}"%`);
      }
      if (location) {
        playerQuery += ' AND p.location LIKE ?';
        playerParams.push(`%${location}%`);
      }

      // Add sorting
      switch (sortBy) {
        case 'oldest':
          playerQuery += ' ORDER BY p.createdAt ASC';
          break;
        case 'alphabetical':
          playerQuery += ' ORDER BY p.title ASC';
          break;
        default:
          playerQuery += ' ORDER BY p.createdAt DESC';
      }

      const currentResultsCount = results.length;
      const remainingLimit = limit - currentResultsCount;
      const playerOffset = Math.max(0, offset - (type === 'both' ? Math.floor(limit / 2) : 0));

      if (remainingLimit > 0) {
        playerQuery += ' LIMIT ? OFFSET ?';
        playerParams.push(remainingLimit, playerOffset);

        const playerResult = await db.query(playerQuery, playerParams);
        results = results.concat(playerResult.rows);
      }
    }

    // Update search result count
    if (req.user) {
      try {
        await db.query(`
          UPDATE user_search_history 
          SET resultsCount = ? 
          WHERE userId = ? AND searchedAt = (
            SELECT MAX(searchedAt) FROM user_search_history WHERE userId = ?
          )
        `, [results.length, req.user.userId, req.user.userId]);
      } catch (updateError) {
        console.warn('Failed to update search result count:', updateError);
      }
    }

    // Transform results
    const transformedResults = results.map(result => {
      const transformed = { ...result };
      
      // Decrypt contact information
      if (transformed.contactInfo) {
        transformed.contactInfo = encryptionService.decryptContactInfo(transformed.contactInfo);
      }
      
      // Parse positions for players
      if (transformed.positions && typeof transformed.positions === 'string') {
        try {
          transformed.positions = JSON.parse(transformed.positions);
        } catch (e) {
          transformed.positions = [];
        }
      }
      
      // Add location data if coordinates exist
      if (result.locationLatitude && result.locationLongitude) {
        transformed.locationData = {
          address: result.locationAddress,
          latitude: result.locationLatitude,
          longitude: result.locationLongitude,
          placeId: result.locationPlaceId
        };
      }
      
      // Remove raw location columns
      delete transformed.locationAddress;
      delete transformed.locationLatitude;
      delete transformed.locationLongitude;
      delete transformed.locationPlaceId;
      
      return transformed;
    });

    res.json({
      results: transformedResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.length,
        hasMore: results.length === parseInt(limit)
      },
      searchInfo: {
        searchTerm,
        filters: filters,
        sortBy,
        resultCount: results.length
      }
    });

  } catch (error) {
    console.error('Enhanced search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user search history
app.get('/api/search/history', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await db.query(`
      SELECT searchTerm, filters, resultsCount, searchedAt
      FROM user_search_history
      WHERE userId = ? AND searchTerm != ''
      ORDER BY searchedAt DESC
      LIMIT ?
    `, [req.user.userId, limit]);

    const history = result.rows.map(row => ({
      ...row,
      filters: JSON.parse(row.filters || '{}')
    }));

    res.json({ history });
  } catch (error) {
    console.error('Error getting search history:', error);
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

// Clear search history
app.delete('/api/search/history', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    await db.query('DELETE FROM user_search_history WHERE userId = ?', [req.user.userId]);
    res.json({ message: 'Search history cleared successfully' });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({ error: 'Failed to clear search history' });
  }
});

// Calendar API endpoints

// Get calendar events
app.get('/api/calendar/events', authenticateToken, requireBetaAccess, async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let query = `
    SELECT e.*, u.firstName, u.lastName 
    FROM calendar_events e 
    JOIN users u ON e.createdBy = u.id
  `;
  const params = [];

  if (startDate && endDate) {
    query += ' WHERE e.date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  query += ' ORDER BY e.date ASC, e.startTime ASC';

  try {
    const result = await db.query(query, params);
    const rows = result.rows;

    const events = rows.map(row => ({
      ...row,
      positions: row.positions ? JSON.parse(row.positions) : []
    }));

    res.json({ events });
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create calendar event
app.post('/api/calendar/events', authenticateToken, requireBetaAccess, [
  body('title').notEmpty().withMessage('Title is required'),
  body('eventType').isIn(['training', 'match', 'trial']).withMessage('Valid event type required'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('location').notEmpty().withMessage('Location is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title, description, eventType, date, startTime, endTime, location,
    isRecurring, recurringPattern, maxParticipants
  } = req.body;

  const insertQuery = `
    INSERT INTO calendar_events 
    (title, description, eventType, date, startTime, endTime, location, createdBy, isRecurring, recurringPattern, maxParticipants)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(insertQuery, [
    title, description, eventType, date, startTime, endTime, location,
    req.user.userId, isRecurring || false, recurringPattern, maxParticipants
  ], function(err) {
    if (err) {
      console.error('Error creating calendar event:', err);
      return res.status(500).json({ error: 'Failed to create event' });
    }

    res.status(201).json({
      message: 'Event created successfully',
      event: { id: this.lastID, title, date, startTime, endTime }
    });
  });
});

// Create trial with invitation capability
app.post('/api/calendar/trials', authenticateToken, requireBetaAccess, [
  body('title').notEmpty().withMessage('Title is required'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('positions').isArray().withMessage('Positions must be an array')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Only coaches can create trials
  if (req.user.role !== 'Coach') {
    return res.status(403).json({ error: 'Only coaches can create trials' });
  }

  const {
    title, description, date, startTime, endTime, location,
    maxParticipants, ageGroup, positions, requirements
  } = req.body;

  const insertQuery = `
    INSERT INTO calendar_events 
    (title, description, eventType, date, startTime, endTime, location, createdBy, maxParticipants, ageGroup, positions, requirements)
    VALUES (?, ?, 'trial', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(insertQuery, [
    title, description, date, startTime, endTime, location,
    req.user.userId, maxParticipants || 20, ageGroup, JSON.stringify(positions), requirements
  ], function(err) {
    if (err) {
      console.error('Error creating trial:', err);
      return res.status(500).json({ error: 'Failed to create trial' });
    }

    const trialId = this.lastID;

    // Auto-invite players based on age group and positions
    const findPlayersQuery = `
      SELECT DISTINCT u.id, u.firstName, u.lastName, u.email, p.position
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.userId
      WHERE u.role = 'Player' 
      AND (p.position IN (${positions.map(() => '?').join(', ')}) OR p.position IS NULL)
      LIMIT 50
    `;

    try {
      // TODO: Fix this to be properly async - temporarily commenting out
      // const playersResult = await db.query(findPlayersQuery, positions);
      // const players = playersResult.rows;
      
      // For now, just return success without auto-invites
      res.status(201).json({
        message: 'Trial created successfully',
        trial: { id: trialId, title, date, startTime, endTime }
      });
      return;
      
      // Send invitations to eligible players
      if (players.length > 0) {
        const invitePromises = players.map(player => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO trial_invitations (eventId, playerId, invitedBy, message) VALUES (?, ?, ?, ?)',
              [trialId, player.id, req.user.userId, `You've been invited to try out for our ${ageGroup} team. Positions needed: ${positions.join(', ')}`],
              async (err) => {
                if (err) {
                  reject(err);
                } else {
                  // Send trial invitation alert
                  try {
                    await alertService.sendTrialInvitationAlert(
                      player.id,
                      `${req.user.firstName} ${req.user.lastName}`,
                      { id: trialId, title, date, startTime, endTime, location, ageGroup, positions, requirements },
                      `You've been invited to try out for our ${ageGroup} team. Positions needed: ${positions.join(', ')}`
                    );
                  } catch (alertError) {
                    console.error('Failed to send trial invitation alert:', alertError);
                  }
                  resolve(true);
                }
              }
            );
          });
        });

        Promise.all(invitePromises)
          .then(() => {
            res.status(201).json({
              message: `Trial created successfully and ${players.length} players invited`,
              trial: { id: trialId, title, date, startTime, endTime },
              invitesSent: players.length
            });
          })
          .catch((err) => {
            console.error('Error sending trial invites:', err);
            res.status(201).json({
              message: 'Trial created successfully but some invites failed to send',
              trial: { id: trialId, title, date, startTime, endTime }
            });
          });
      } else {
        res.status(201).json({
          message: 'Trial created successfully (no eligible players found for automatic invites)',
          trial: { id: trialId, title, date, startTime, endTime }
        });
      }
    } catch (err) {
      console.error('Error finding players for trial invites:', err);
      return res.status(201).json({
        message: 'Trial created successfully but failed to send automatic invites',
        trial: { id: trialId, title, date, startTime, endTime }
      });
    }
  });
});

// Get trial invitations for a player
app.get('/api/calendar/trial-invitations', authenticateToken, requireBetaAccess, async (req, res) => {
  if (req.user.role !== 'Player') {
    return res.status(403).json({ error: 'Only players can view trial invitations' });
  }

  const query = `
    SELECT 
      ti.*,
      e.title as trialTitle, e.description, e.date, e.startTime, e.endTime, 
      e.location, e.maxParticipants, e.ageGroup, e.positions, e.requirements,
      coach.firstName as coachFirstName, coach.lastName as coachLastName,
      profile.teamName
    FROM trial_invitations ti
    JOIN calendar_events e ON ti.eventId = e.id
    JOIN users coach ON ti.invitedBy = coach.id
    LEFT JOIN user_profiles profile ON coach.id = profile.userId
    WHERE ti.playerId = ?
    ORDER BY ti.createdAt DESC
  `;

  try {
    const result = await db.query(query, [req.user.userId]);
    const rows = result.rows;

    const invitations = rows.map(row => ({
      id: row.id,
      eventId: row.eventId,
      status: row.status,
      message: row.message,
      createdAt: row.createdAt,
      responseDate: row.responseDate,
      trial: {
        title: row.trialTitle,
        description: row.description,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        location: row.location,
        maxParticipants: row.maxParticipants,
        ageGroup: row.ageGroup,
        positions: row.positions ? JSON.parse(row.positions) : [],
        requirements: row.requirements
      },
      coach: {
        firstName: row.coachFirstName,
        lastName: row.coachLastName,
        teamName: row.teamName
      }
    }));

    res.json({ invitations });
  } catch (err) {
    console.error('Error fetching trial invitations:', err);
    return res.status(500).json({ error: 'Failed to fetch trial invitations' });
  }
});

// Respond to trial invitation
app.put('/api/calendar/trial-invitations/:id', authenticateToken, requireBetaAccess, [
  body('status').isIn(['accepted', 'declined']).withMessage('Status must be accepted or declined')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;

  // Verify the invitation belongs to the current user
  db.get('SELECT * FROM trial_invitations WHERE id = ? AND playerId = ?', [id, req.user.userId], (err, invitation) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!invitation) {
      return res.status(404).json({ error: 'Trial invitation not found' });
    }
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'This invitation has already been responded to' });
    }

    // Update the invitation status
    db.run(
      'UPDATE trial_invitations SET status = ?, responseDate = ? WHERE id = ?',
      [status, new Date().toISOString(), id],
      function(err) {
        if (err) {
          console.error('Error updating trial invitation:', err);
          return res.status(500).json({ error: 'Failed to update invitation' });
        }

        // If accepted, add to event participants
        if (status === 'accepted') {
          db.run(
            'INSERT OR IGNORE INTO event_participants (eventId, userId, status) VALUES (?, ?, ?)',
            [invitation.eventId, req.user.userId, 'attending'],
            (err) => {
              if (err) {
                console.error('Error adding to event participants:', err);
              }
            }
          );
        }

        res.json({ message: `Trial invitation ${status} successfully` });
      }
    );
  });
});

// Maps API endpoints

// Search vacancies by location
app.get('/api/maps/search', async (req, res) => {
  const { lat, lng, radius = 50, type = 'both' } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const searchRadius = parseFloat(radius);

  let queries = [];
  
  if (type === 'vacancies' || type === 'both') {
    const vacancyQuery = `
      SELECT 'vacancy' as type, v.*, u.firstName, u.lastName,
        (6371 * acos(cos(radians(?)) * cos(radians(locationLatitude)) * 
         cos(radians(locationLongitude) - radians(?)) + 
         sin(radians(?)) * sin(radians(locationLatitude)))) AS distance
      FROM team_vacancies v 
      JOIN users u ON v.postedBy = u.id 
      WHERE v.status = 'active' 
        AND v.locationLatitude IS NOT NULL 
        AND v.locationLongitude IS NOT NULL
      HAVING distance <= ?
      ORDER BY distance
    `;
    queries.push({
      query: vacancyQuery,
      params: [latitude, longitude, latitude, searchRadius]
    });
  }

  if (type === 'availability' || type === 'both') {
    const availabilityQuery = `
      SELECT 'availability' as type, p.*, u.firstName, u.lastName,
        (6371 * acos(cos(radians(?)) * cos(radians(locationLatitude)) * 
         cos(radians(locationLongitude) - radians(?)) + 
         sin(radians(?)) * sin(radians(locationLatitude)))) AS distance
      FROM player_availability p 
      JOIN users u ON p.postedBy = u.id 
      WHERE p.status = 'active' 
        AND p.locationLatitude IS NOT NULL 
        AND p.locationLongitude IS NOT NULL
      HAVING distance <= ?
      ORDER BY distance
    `;
    queries.push({
      query: availabilityQuery,
      params: [latitude, longitude, latitude, searchRadius]
    });
  }

  try {
    const results = await Promise.all(queries.map(async ({ query, params }) => {
      const result = await db.query(query, params);
      return result.rows;
    }));
    
    const allResults = results.flat().map(row => {
      const item = { ...row };
      
      // Add locationData if coordinates exist
      if (row.locationLatitude && row.locationLongitude) {
        item.locationData = {
          address: row.locationAddress,
          latitude: row.locationLatitude,
          longitude: row.locationLongitude,
          placeId: row.locationPlaceId
        };
      }
      
      // Remove raw location columns from response
      delete item.locationAddress;
      delete item.locationLatitude;
      delete item.locationLongitude;
      delete item.locationPlaceId;
      
      return item;
    });

    // Sort all results by distance
    allResults.sort((a, b) => a.distance - b.distance);
    
    res.json({ results: allResults });
  } catch (err) {
    console.error('Error searching by location:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Geocoding endpoint (for converting addresses to coordinates)
app.post('/api/maps/geocode', (req, res) => {
  const { address } = req.body;
  
  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  // This would integrate with Google Geocoding API in a real implementation
  // For now, return a placeholder response
  res.json({
    message: 'Geocoding endpoint - integrate with Google Maps Geocoding API',
    address,
    coordinates: null
  });
});

// Admin Cron Job Management

// Trigger weekly digest manually (Admin only)
app.post('/api/admin/trigger-weekly-digest', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await cronService.triggerWeeklyDigest();
    res.json({ message: 'Weekly digest emails sent successfully' });
  } catch (error) {
    console.error('Error triggering weekly digest:', error);
    res.status(500).json({ error: 'Failed to send weekly digest emails' });
  }
});

// Trigger cleanup manually (Admin only)
app.post('/api/admin/trigger-cleanup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await cronService.triggerCleanup();
    res.json({ message: 'Data cleanup completed successfully' });
  } catch (error) {
    console.error('Error triggering cleanup:', error);
    res.status(500).json({ error: 'Failed to complete data cleanup' });
  }
});

// Trigger re-engagement emails manually (Admin only)
app.post('/api/admin/trigger-reengagement', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await cronService.triggerReengagement();
    res.json({ message: 'Re-engagement emails sent successfully' });
  } catch (error) {
    console.error('Error triggering re-engagement:', error);
    res.status(500).json({ error: 'Failed to send re-engagement emails' });
  }
});

// Test email functionality (Admin only)
app.post('/api/admin/test-email', authenticateToken, requireAdmin, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('template').isIn(['newVacancy', 'newPlayerAlert', 'weeklyDigest', 'trialInvitation']).withMessage('Valid template required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, template } = req.body;
    
    // Create test data based on template
    let testData = {};
    switch (template) {
      case 'newVacancy':
        testData = {
          playerName: 'Test Player',
          vacancy: {
            id: 999,
            title: 'Test Goalkeeper Position',
            description: 'Looking for an experienced goalkeeper for our U21 team',
            league: 'Premier League',
            position: 'Goalkeeper',
            ageGroup: 'U21',
            location: 'London'
          }
        };
        break;
      case 'newPlayerAlert':
        testData = {
          coachName: 'Test Coach',
          player: {
            id: 999,
            title: 'Experienced Midfielder Available',
            description: 'Looking for a competitive team',
            preferredLeagues: 'Championship',
            positions: ['Midfielder', 'Forward'],
            ageGroup: 'Senior',
            location: 'Manchester'
          }
        };
        break;
      case 'weeklyDigest':
        testData = {
          userName: 'Test User',
          stats: {
            newVacancies: 5,
            newPlayers: 3,
            matches: 2
          },
          recommendations: [
            { title: 'New striker needed', description: 'U18 team in your area' },
            { title: 'Goalkeeper available', description: 'Experienced player seeking team' }
          ]
        };
        break;
      case 'trialInvitation':
        testData = {
          playerName: 'Test Player',
          coachName: 'Test Coach',
          trial: {
            id: 999,
            title: 'U21 Squad Trial',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            startTime: '10:00',
            endTime: '12:00',
            location: 'Training Ground, London',
            ageGroup: 'U21',
            positions: ['Midfielder', 'Forward'],
            requirements: 'Bring boots and shin pads'
          },
          message: 'This is a test trial invitation'
        };
        break;
    }

    await emailService.sendEmail(email, template, testData);
    res.json({ message: `Test ${template} email sent successfully to ${email}` });
    
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Email Alerts endpoints
app.post('/api/email-alerts', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { alertType, filters, searchRegion } = req.body;
    
    const result = await db.query(`
      INSERT INTO email_alerts (userId, email, alertType, filters, searchRegion, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [req.user.userId, req.user.email, alertType, JSON.stringify(filters || {}), JSON.stringify(searchRegion || {}), true]);
    
    res.json({ message: 'Email alert created successfully', alertId: result.lastID });
  } catch (error) {
    console.error('Error creating email alert:', error);
    res.status(500).json({ error: 'Failed to create email alert' });
  }
});

app.get('/api/email-alerts', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM email_alerts 
      WHERE userId = ? 
      ORDER BY createdAt DESC
    `, [req.user.userId]);
    
    const alerts = result.rows.map(alert => ({
      ...alert,
      filters: alert.filters ? JSON.parse(alert.filters) : {},
      searchRegion: alert.searchRegion ? JSON.parse(alert.searchRegion) : {}
    }));
    
    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching email alerts:', error);
    res.status(500).json({ error: 'Failed to fetch email alerts' });
  }
});

app.put('/api/email-alerts/:id', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, filters, searchRegion } = req.body;
    
    await db.query(`
      UPDATE email_alerts 
      SET isActive = ?, filters = ?, searchRegion = ?
      WHERE id = ? AND userId = ?
    `, [isActive, JSON.stringify(filters || {}), JSON.stringify(searchRegion || {}), id, req.user.userId]);
    
    res.json({ message: 'Email alert updated successfully' });
  } catch (error) {
    console.error('Error updating email alert:', error);
    res.status(500).json({ error: 'Failed to update email alert' });
  }
});

app.delete('/api/email-alerts/:id', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(`
      DELETE FROM email_alerts 
      WHERE id = ? AND userId = ?
    `, [id, req.user.userId]);
    
    res.json({ message: 'Email alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting email alert:', error);
    res.status(500).json({ error: 'Failed to delete email alert' });
  }
});

app.post('/api/email-alerts/:id/test', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT * FROM email_alerts 
      WHERE id = ? AND userId = ?
    `, [id, req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email alert not found' });
    }
    
    const alert = result.rows[0];
    
    // Send test email
    const testData = {
      alertType: alert.alertType,
      filters: alert.filters ? JSON.parse(alert.filters) : {},
      searchRegion: alert.searchRegion ? JSON.parse(alert.searchRegion) : {}
    };
    
    await emailService.sendEmail(alert.email, 'emailAlert', {
      userName: req.user.firstName,
      alertType: alert.alertType,
      filters: testData.filters,
      matches: ['Test Match 1', 'Test Match 2'] // Mock matches for testing
    });
    
    res.json({ message: 'Test email alert sent successfully' });
  } catch (error) {
    console.error('Error sending test email alert:', error);
    res.status(500).json({ error: 'Failed to send test email alert' });
  }
});

// Messages endpoints
app.post('/api/messages', authenticateToken, requireBetaAccess, [
  body('recipientId').isInt().withMessage('Valid recipient ID required'),
  body('subject').isLength({ min: 1, max: 200 }).withMessage('Subject is required (max 200 characters)'),
  body('message').isLength({ min: 1, max: 2000 }).withMessage('Message is required (max 2000 characters)'),
  body('messageType').optional().isIn(['general', 'vacancy_interest', 'player_inquiry', 'system']).withMessage('Valid message type required'),
  body('relatedVacancyId').optional().isInt().withMessage('Valid vacancy ID required'),
  body('relatedPlayerAvailabilityId').optional().isInt().withMessage('Valid player availability ID required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { recipientId, subject, message, messageType = 'general', relatedVacancyId, relatedPlayerAvailabilityId } = req.body;
    const senderId = req.user.userId;

    // Prevent users from messaging themselves
    if (senderId === recipientId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Verify recipient exists
    const recipientCheck = await db.query('SELECT id FROM users WHERE id = ?', [recipientId]);
    if (recipientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // If related to a vacancy, verify the vacancy exists and the user is authorized
    if (relatedVacancyId) {
      const vacancyCheck = await db.query('SELECT postedBy FROM team_vacancies WHERE id = ?', [relatedVacancyId]);
      if (vacancyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Related vacancy not found' });
      }
      
      // Ensure the message is being sent to the vacancy poster
      if (vacancyCheck.rows[0].postedBy !== recipientId) {
        return res.status(403).json({ error: 'Can only message the coach who posted this vacancy' });
      }
    }

    // Insert the message
    const result = await db.query(
      `INSERT INTO messages (senderId, recipientId, subject, message, messageType, relatedVacancyId, relatedPlayerAvailabilityId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [senderId, recipientId, subject, message, messageType, relatedVacancyId || null, relatedPlayerAvailabilityId || null]
    );

    // Auto-create match progress when someone shows interest
    if ((messageType === 'vacancy_interest' || messageType === 'player_inquiry') && (relatedVacancyId || relatedPlayerAvailabilityId)) {
      try {
        // Check if match progress already exists for this combination
        let existingMatch;
        if (relatedVacancyId) {
          existingMatch = await db.query(
            `SELECT id FROM match_completions WHERE vacancyId = ? AND (playerId = ? OR coachId = ?)`,
            [relatedVacancyId, senderId, senderId]
          );
        } else if (relatedPlayerAvailabilityId) {
          existingMatch = await db.query(
            `SELECT id FROM match_completions WHERE availabilityId = ? AND (playerId = ? OR coachId = ?)`,
            [relatedPlayerAvailabilityId, senderId, senderId]
          );
        }

        // Only create if doesn't exist
        if (!existingMatch || existingMatch.rows.length === 0) {
          const senderInfo = await db.query('SELECT firstName, lastName, role FROM users WHERE id = ?', [senderId]);
          const recipientInfo = await db.query('SELECT firstName, lastName, role FROM users WHERE id = ?', [recipientId]);
          
          let playerName, teamName, position, ageGroup, league, coachId, playerId;
          
          if (relatedVacancyId) {
            // Player responding to team vacancy
            const vacancy = await db.query('SELECT * FROM team_vacancies WHERE id = ?', [relatedVacancyId]);
            if (vacancy.rows.length > 0) {
              const v = vacancy.rows[0];
              playerName = `${senderInfo.rows[0].firstName} ${senderInfo.rows[0].lastName}`;
              teamName = v.title;
              position = v.position;
              ageGroup = v.ageGroup;
              league = v.league;
              coachId = recipientId;
              playerId = senderId;
            }
          } else if (relatedPlayerAvailabilityId) {
            // Coach responding to player availability
            const availability = await db.query('SELECT * FROM player_availability WHERE id = ?', [relatedPlayerAvailabilityId]);
            if (availability.rows.length > 0) {
              const a = availability.rows[0];
              playerName = a.title;
              teamName = `${recipientInfo.rows[0].firstName} ${recipientInfo.rows[0].lastName}'s Team`;
              position = a.position;
              ageGroup = a.ageGroup;
              league = a.preferredLeagues.split(',')[0]; // Use first preferred league
              coachId = recipientId;
              playerId = senderId;
            }
          }

          if (playerName && teamName) {
            await db.query(
              `INSERT INTO match_completions (
                vacancyId, availabilityId, coachId, playerId, matchType,
                playerName, teamName, position, ageGroup, league,
                completionStatus
              ) VALUES (?, ?, ?, ?, 'player_to_team', ?, ?, ?, ?, ?, 'pending')`,
              [
                relatedVacancyId || null,
                relatedPlayerAvailabilityId || null,
                coachId,
                playerId,
                playerName,
                teamName,
                position,
                ageGroup,
                league
              ]
            );
            console.log('✅ Auto-created match progress record');
          }
        }
      } catch (matchError) {
        console.error('Error creating match progress:', matchError);
        // Don't fail the message send if match creation fails
      }
    }

    // Get sender info for response
    const senderInfo = await db.query(
      'SELECT firstName, lastName FROM users WHERE id = ?',
      [senderId]
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      messageId: result.lastID,
      sender: senderInfo.rows[0]
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get conversations for a user
app.get('/api/conversations', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get conversations where user is a participant
    const conversationsResult = await db.query(`
      SELECT DISTINCT 
        m1.senderId, 
        m1.recipientId,
        CASE 
          WHEN m1.senderId = ? THEN m1.recipientId 
          ELSE m1.senderId 
        END as otherUserId,
        MAX(m1.createdAt) as lastMessageTime,
        COUNT(CASE WHEN m1.recipientId = ? AND m1.isRead = false THEN 1 END) as unreadCount
      FROM messages m1
      WHERE m1.senderId = ? OR m1.recipientId = ?
      GROUP BY otherUserId
      ORDER BY lastMessageTime DESC
    `, [userId, userId, userId, userId]);

    const conversations = [];
    
    for (const conv of conversationsResult.rows) {
      // Get other participant details
      const otherUserResult = await db.query(
        'SELECT id, firstName, lastName, role FROM users WHERE id = ?',
        [conv.otherUserId]
      );
      
      // Get latest message
      const latestMessageResult = await db.query(`
        SELECT * FROM messages 
        WHERE (senderId = ? AND recipientId = ?) OR (senderId = ? AND recipientId = ?)
        ORDER BY createdAt DESC LIMIT 1
      `, [userId, conv.otherUserId, conv.otherUserId, userId]);

      if (otherUserResult.rows.length > 0 && latestMessageResult.rows.length > 0) {
        const otherUser = otherUserResult.rows[0];
        const latestMessage = latestMessageResult.rows[0];
        
        // Determine match progress stage based on message content and related data
        let matchProgressStage = 'initial_interest';
        if (latestMessage.messageType === 'training_invitation') {
          matchProgressStage = 'trial_invited';
        } else if (latestMessage.message.toLowerCase().includes('trial')) {
          matchProgressStage = 'trial_scheduled';
        }

        conversations.push({
          id: `${Math.min(userId, conv.otherUserId)}_${Math.max(userId, conv.otherUserId)}`,
          participantIds: [userId, conv.otherUserId],
          participants: [
            {
              userId: otherUser.id,
              firstName: otherUser.firstName,
              lastName: otherUser.lastName,
              role: otherUser.role
            }
          ],
          latestMessage: latestMessage,
          unreadCount: conv.unreadCount || 0,
          matchProgressStage: matchProgressStage,
          createdAt: latestMessage.createdAt,
          updatedAt: latestMessage.createdAt
        });
      }
    }

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages in a conversation
app.get('/api/conversations/:conversationId/messages', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    
    // Parse conversation ID to get participant IDs
    const participantIds = conversationId.split('_').map(id => parseInt(id));
    
    if (!participantIds.includes(parseInt(userId))) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }
    
    const otherUserId = participantIds.find(id => id !== parseInt(userId));
    
    const messagesResult = await db.query(`
      SELECT m.*, 
             sender.firstName as senderFirstName, 
             sender.lastName as senderLastName
      FROM messages m
      JOIN users sender ON m.senderId = sender.id
      WHERE (m.senderId = ? AND m.recipientId = ?) OR (m.senderId = ? AND m.recipientId = ?)
      ORDER BY m.createdAt ASC
    `, [userId, otherUserId, otherUserId, userId]);

    // Mark messages as read
    await db.query(
      'UPDATE messages SET isRead = true WHERE recipientId = ? AND senderId = ?',
      [userId, otherUserId]
    );

    const messages = messagesResult.rows.map(msg => ({
      ...msg,
      senderName: `${msg.senderFirstName} ${msg.senderLastName}`
    }));

    res.json({ messages });
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get match progress for user
app.get('/api/match-progress', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Get match progress data based on recent conversations and match completions
    const matchesResult = await db.query(`
      SELECT DISTINCT
        mc.id,
        mc.playerName,
        mc.teamName,
        mc.position,
        mc.ageGroup,
        mc.completionStatus,
        mc.createdAt,
        mc.updatedAt,
        CASE 
          WHEN mc.completionStatus = 'pending' THEN 'decision_pending'
          WHEN mc.completionStatus = 'confirmed' THEN 'completed'
          WHEN mc.completionStatus = 'declined' THEN 'match_declined'
          ELSE 'dialogue_active'
        END as stage,
        CASE 
          WHEN mc.completionStatus = 'pending' AND ? = 'Coach' THEN 'coach'
          WHEN mc.completionStatus = 'pending' AND ? != 'Coach' THEN 'player'
          ELSE NULL
        END as assignedTo
      FROM match_completions mc
      WHERE (mc.coachId = ? OR mc.playerId = ? OR mc.parentId = ?)
        AND mc.completionStatus != 'completed'
      ORDER BY mc.updatedAt DESC
    `, [userRole, userRole, userId, userId, userId]);

    const matches = matchesResult.rows.map(match => ({
      id: match.id,
      conversationId: `mock_${match.id}`,
      stage: match.stage,
      playerName: match.playerName,
      teamName: match.teamName,
      position: match.position,
      ageGroup: match.ageGroup,
      lastActivity: match.updatedAt,
      nextAction: match.assignedTo ? 
        (match.assignedTo === 'coach' ? 'Review player and make decision' : 'Await coach decision') : 
        'Continue dialogue',
      assignedTo: match.assignedTo,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt
    }));

    res.json({ matches });
  } catch (error) {
    console.error('Get match progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a user (inbox)
app.get('/api/messages', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = 'received', limit = 50, offset = 0 } = req.query;

    let query;
    let params;

    if (type === 'sent') {
      query = `
        SELECT m.*, 
               u.firstName as recipientFirstName, 
               u.lastName as recipientLastName,
               tv.title as vacancyTitle,
               pa.title as playerAvailabilityTitle
        FROM messages m
        JOIN users u ON m.recipientId = u.id
        LEFT JOIN team_vacancies tv ON m.relatedVacancyId = tv.id
        LEFT JOIN player_availability pa ON m.relatedPlayerAvailabilityId = pa.id
        WHERE m.senderId = ?
        ORDER BY m.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, parseInt(limit), parseInt(offset)];
    } else {
      query = `
        SELECT m.*, 
               u.firstName as senderFirstName, 
               u.lastName as senderLastName,
               tv.title as vacancyTitle,
               pa.title as playerAvailabilityTitle
        FROM messages m
        JOIN users u ON m.senderId = u.id
        LEFT JOIN team_vacancies tv ON m.relatedVacancyId = tv.id
        LEFT JOIN player_availability pa ON m.relatedPlayerAvailabilityId = pa.id
        WHERE m.recipientId = ?
        ORDER BY m.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, parseInt(limit), parseInt(offset)];
    }

    const result = await db.query(query, params);
    const messages = result.rows;

    // Get unread count for received messages
    let unreadCount = 0;
    if (type === 'received') {
      const unreadResult = await db.query(
        'SELECT COUNT(*) as count FROM messages WHERE recipientId = ? AND isRead = FALSE',
        [userId]
      );
      unreadCount = unreadResult.rows[0].count;
    }

    res.json({
      messages,
      unreadCount,
      total: messages.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark message as read
app.put('/api/messages/:messageId/read', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Verify the user is the recipient
    const messageCheck = await db.query(
      'SELECT recipientId FROM messages WHERE id = ?',
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (messageCheck.rows[0].recipientId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to mark this message as read' });
    }

    // Mark as read
    await db.query(
      'UPDATE messages SET isRead = TRUE, readAt = CURRENT_TIMESTAMP WHERE id = ?',
      [messageId]
    );

    res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// ==================== TRAINING INVITATIONS ENDPOINTS ====================

// Send training invitation
app.post('/api/training-invitations', authenticateToken, requireBetaAccess, [
  body('playerId').isInt({ min: 1 }).withMessage('Valid player ID required'),
  body('teamName').isLength({ min: 1, max: 100 }).withMessage('Team name is required (max 100 characters)'),
  body('trainingLocation').isLength({ min: 1, max: 200 }).withMessage('Training location is required (max 200 characters)'),
  body('trainingDate').isISO8601().withMessage('Valid training date required (YYYY-MM-DD)'),
  body('trainingTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid training time required (HH:MM format)'),
  body('message').optional().isLength({ max: 500 }).withMessage('Message too long (max 500 characters)'),
  body('expiresInDays').optional().isInt({ min: 1, max: 30 }).withMessage('Expiration must be between 1-30 days')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { playerId, teamName, trainingLocation, trainingDate, trainingTime, message, expiresInDays = 7 } = req.body;
    const coachId = req.user.userId;

    // Verify coach role
    const coachCheck = await db.query('SELECT role FROM users WHERE id = ? AND role = ?', [coachId, 'Coach']);
    if (coachCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only coaches can send training invitations' });
    }

    // Verify player exists and is a player
    const playerCheck = await db.query('SELECT id, firstName, lastName, role FROM users WHERE id = ? AND role = ?', [playerId, 'Player']);
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check if training date is in the future
    const trainingDateTime = new Date(`${trainingDate}T${trainingTime}`);
    if (trainingDateTime <= new Date()) {
      return res.status(400).json({ error: 'Training date and time must be in the future' });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Check for existing invitation for same coach, player, date, and time
    const existingInvite = await db.query(
      'SELECT id FROM training_invitations WHERE coachId = ? AND playerId = ? AND trainingDate = ? AND trainingTime = ? AND status != ?',
      [coachId, playerId, trainingDate, trainingTime, 'expired']
    );

    if (existingInvite.rows.length > 0) {
      return res.status(409).json({ error: 'Training invitation already exists for this date and time' });
    }

    // Create training invitation
    const result = await db.query(`
      INSERT INTO training_invitations (coachId, playerId, teamName, trainingLocation, trainingDate, trainingTime, message, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [coachId, playerId, teamName, trainingLocation, trainingDate, trainingTime, message || null, expiresAt.toISOString()]);

    res.status(201).json({
      success: true,
      message: 'Training invitation sent successfully',
      invitationId: result.lastID
    });
  } catch (error) {
    console.error('Error sending training invitation:', error);
    res.status(500).json({ error: 'Failed to send training invitation' });
  }
});

// Get training invitations (for coaches - sent invitations, for players - received invitations)
app.get('/api/training-invitations', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = 'received', status, limit = 50, offset = 0 } = req.query;

    let query;
    let params;

    if (type === 'sent') {
      // For coaches to see invitations they've sent
      query = `
        SELECT ti.*,
               u.firstName as playerFirstName,
               u.lastName as playerLastName,
               u.email as playerEmail
        FROM training_invitations ti
        JOIN users u ON ti.playerId = u.id
        WHERE ti.coachId = ?
      `;
      params = [userId];
    } else {
      // For players to see invitations they've received
      query = `
        SELECT ti.*,
               u.firstName as coachFirstName,
               u.lastName as coachLastName,
               u.email as coachEmail
        FROM training_invitations ti
        JOIN users u ON ti.coachId = u.id
        WHERE ti.playerId = ?
      `;
      params = [userId];
    }

    // Add status filter if provided
    if (status && ['pending', 'accepted', 'declined', 'expired'].includes(status)) {
      query += ' AND ti.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ti.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({
      success: true,
      invitations: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching training invitations:', error);
    res.status(500).json({ error: 'Failed to fetch training invitations' });
  }
});

// Respond to training invitation (accept/decline)
app.put('/api/training-invitations/:invitationId', authenticateToken, requireBetaAccess, [
  body('status').isIn(['accepted', 'declined']).withMessage('Status must be either "accepted" or "declined"'),
  body('responseMessage').optional().isLength({ max: 300 }).withMessage('Response message too long (max 300 characters)')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { invitationId } = req.params;
    const { status, responseMessage } = req.body;
    const playerId = req.user.userId;

    // Verify the invitation exists and belongs to this player
    const inviteCheck = await db.query(
      'SELECT * FROM training_invitations WHERE id = ? AND playerId = ? AND status = ?',
      [invitationId, playerId, 'pending']
    );

    if (inviteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Training invitation not found or already responded to' });
    }

    const invitation = inviteCheck.rows[0];

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expiresAt)) {
      // Auto-expire the invitation
      await db.query(
        'UPDATE training_invitations SET status = ? WHERE id = ?',
        ['expired', invitationId]
      );
      return res.status(400).json({ error: 'Training invitation has expired' });
    }

    // Update invitation status
    await db.query(
      'UPDATE training_invitations SET status = ?, responseMessage = ?, responseDate = CURRENT_TIMESTAMP WHERE id = ?',
      [status, responseMessage || null, invitationId]
    );

    res.json({
      success: true,
      message: `Training invitation ${status} successfully`
    });
  } catch (error) {
    console.error('Error responding to training invitation:', error);
    res.status(500).json({ error: 'Failed to respond to training invitation' });
  }
});

// Cancel training invitation (for coaches only)
app.delete('/api/training-invitations/:invitationId', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { invitationId } = req.params;
    const coachId = req.user.userId;

    // Verify the invitation exists and belongs to this coach
    const inviteCheck = await db.query(
      'SELECT * FROM training_invitations WHERE id = ? AND coachId = ?',
      [invitationId, coachId]
    );

    if (inviteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Training invitation not found' });
    }

    // Delete the invitation
    await db.query('DELETE FROM training_invitations WHERE id = ?', [invitationId]);

    res.json({
      success: true,
      message: 'Training invitation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling training invitation:', error);
    res.status(500).json({ error: 'Failed to cancel training invitation' });
  }
});

// ==================== TRIAL MANAGEMENT ENDPOINTS ====================

// Create a new trial list
app.post('/api/trial-lists', authenticateToken, requireBetaAccess, [
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 characters)'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long (max 1000 characters)'),
  body('trialDate').optional().isISO8601().withMessage('Valid trial date required (YYYY-MM-DD)'),
  body('trialTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid trial time required (HH:MM format)'),
  body('location').optional().isLength({ max: 200 }).withMessage('Location too long (max 200 characters)'),
  body('maxPlayers').optional().isInt({ min: 1, max: 100 }).withMessage('Max players must be between 1-100')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, trialDate, trialTime, location, maxPlayers } = req.body;
    const coachId = req.user.userId;

    // Verify coach role
    const coachCheck = await db.query('SELECT role FROM users WHERE id = ? AND role = ?', [coachId, 'Coach']);
    if (coachCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only coaches can create trial lists' });
    }

    const result = await db.query(`
      INSERT INTO trial_lists (coachId, title, description, trialDate, trialTime, location, maxPlayers)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [coachId, title, description || null, trialDate || null, trialTime || null, location || null, maxPlayers || null]);

    res.status(201).json({
      success: true,
      message: 'Trial list created successfully',
      trialListId: result.lastID
    });
  } catch (error) {
    console.error('Error creating trial list:', error);
    res.status(500).json({ error: 'Failed to create trial list' });
  }
});

// Get trial lists for a coach
app.get('/api/trial-lists', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const coachId = req.user.userId;
    const { status, limit = 50, offset = 0 } = req.query;

    // Verify coach role
    const coachCheck = await db.query('SELECT role FROM users WHERE id = ? AND role = ?', [coachId, 'Coach']);
    if (coachCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only coaches can view trial lists' });
    }

    let query = `
      SELECT tl.*, 
             COUNT(te.id) as playerCount,
             AVG(te.overallRating) as avgRating
      FROM trial_lists tl
      LEFT JOIN trial_evaluations te ON tl.id = te.trialListId
      WHERE tl.coachId = ?
    `;
    const params = [coachId];

    if (status && ['active', 'completed', 'cancelled'].includes(status)) {
      query += ' AND tl.status = ?';
      params.push(status);
    }

    query += ' GROUP BY tl.id ORDER BY tl.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({
      success: true,
      trialLists: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching trial lists:', error);
    res.status(500).json({ error: 'Failed to fetch trial lists' });
  }
});

// Get specific trial list with players
app.get('/api/trial-lists/:trialListId', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { trialListId } = req.params;
    const coachId = req.user.userId;

    // Verify trial list belongs to coach
    const trialListCheck = await db.query(
      'SELECT * FROM trial_lists WHERE id = ? AND coachId = ?',
      [trialListId, coachId]
    );

    if (trialListCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trial list not found or access denied' });
    }

    const trialList = trialListCheck.rows[0];

    // Get all players in the trial list with their evaluations
    const playersResult = await db.query(`
      SELECT te.*, 
             u.firstName, 
             u.lastName, 
             u.email
      FROM trial_evaluations te
      JOIN users u ON te.playerId = u.id
      WHERE te.trialListId = ?
      ORDER BY te.ranking ASC, te.overallRating DESC, te.evaluatedAt DESC
    `, [trialListId]);

    res.json({
      success: true,
      trialList: trialList,
      players: playersResult.rows
    });
  } catch (error) {
    console.error('Error fetching trial list details:', error);
    res.status(500).json({ error: 'Failed to fetch trial list details' });
  }
});

// Add player to trial list
app.post('/api/trial-lists/:trialListId/players', authenticateToken, requireBetaAccess, [
  body('playerId').isInt({ min: 1 }).withMessage('Valid player ID required'),
  body('playerName').isLength({ min: 1, max: 200 }).withMessage('Player name is required'),
  body('playerAge').optional().isInt({ min: 5, max: 50 }).withMessage('Valid age required'),
  body('playerPosition').optional().isLength({ max: 100 }).withMessage('Position too long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { trialListId } = req.params;
    const { playerId, playerName, playerAge, playerPosition } = req.body;
    const coachId = req.user.userId;

    // Verify trial list belongs to coach
    const trialListCheck = await db.query(
      'SELECT * FROM trial_lists WHERE id = ? AND coachId = ?',
      [trialListId, coachId]
    );

    if (trialListCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trial list not found or access denied' });
    }

    // Check if player already exists in this trial list
    const existingPlayer = await db.query(
      'SELECT id FROM trial_evaluations WHERE trialListId = ? AND playerId = ?',
      [trialListId, playerId]
    );

    if (existingPlayer.rows.length > 0) {
      return res.status(409).json({ error: 'Player already exists in this trial list' });
    }

    // Get the next ranking position
    const rankingResult = await db.query(
      'SELECT COALESCE(MAX(ranking), 0) + 1 as nextRanking FROM trial_evaluations WHERE trialListId = ?',
      [trialListId]
    );
    const nextRanking = rankingResult.rows[0].nextRanking;

    const result = await db.query(`
      INSERT INTO trial_evaluations (trialListId, playerId, coachId, playerName, playerAge, playerPosition, ranking)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [trialListId, playerId, coachId, playerName, playerAge || null, playerPosition || null, nextRanking]);

    res.status(201).json({
      success: true,
      message: 'Player added to trial list successfully',
      evaluationId: result.lastID
    });
  } catch (error) {
    console.error('Error adding player to trial list:', error);
    res.status(500).json({ error: 'Failed to add player to trial list' });
  }
});

// Update player evaluation
app.put('/api/trial-evaluations/:evaluationId', authenticateToken, requireBetaAccess, [
  body('overallRating').optional().isInt({ min: 1, max: 10 }).withMessage('Overall rating must be 1-10'),
  body('technicalSkills').optional().isInt({ min: 1, max: 10 }).withMessage('Technical skills rating must be 1-10'),
  body('physicalAttributes').optional().isInt({ min: 1, max: 10 }).withMessage('Physical attributes rating must be 1-10'),
  body('mentalStrength').optional().isInt({ min: 1, max: 10 }).withMessage('Mental strength rating must be 1-10'),
  body('teamwork').optional().isInt({ min: 1, max: 10 }).withMessage('Teamwork rating must be 1-10'),
  body('privateNotes').optional().isLength({ max: 2000 }).withMessage('Private notes too long (max 2000 characters)'),
  body('strengths').optional().isLength({ max: 500 }).withMessage('Strengths too long (max 500 characters)'),
  body('areasForImprovement').optional().isLength({ max: 500 }).withMessage('Areas for improvement too long (max 500 characters)'),
  body('recommendedForTeam').optional().isBoolean().withMessage('Recommended for team must be boolean'),
  body('status').optional().isIn(['evaluating', 'approved', 'rejected', 'pending']).withMessage('Invalid status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { evaluationId } = req.params;
    const coachId = req.user.userId;

    // Verify evaluation belongs to coach
    const evaluationCheck = await db.query(
      'SELECT * FROM trial_evaluations WHERE id = ? AND coachId = ?',
      [evaluationId, coachId]
    );

    if (evaluationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player evaluation not found or access denied' });
    }

    const {
      overallRating,
      technicalSkills,
      physicalAttributes,
      mentalStrength,
      teamwork,
      privateNotes,
      strengths,
      areasForImprovement,
      recommendedForTeam,
      status
    } = req.body;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (overallRating !== undefined) {
      updateFields.push('overallRating = ?');
      updateValues.push(overallRating);
    }
    if (technicalSkills !== undefined) {
      updateFields.push('technicalSkills = ?');
      updateValues.push(technicalSkills);
    }
    if (physicalAttributes !== undefined) {
      updateFields.push('physicalAttributes = ?');
      updateValues.push(physicalAttributes);
    }
    if (mentalStrength !== undefined) {
      updateFields.push('mentalStrength = ?');
      updateValues.push(mentalStrength);
    }
    if (teamwork !== undefined) {
      updateFields.push('teamwork = ?');
      updateValues.push(teamwork);
    }
    if (privateNotes !== undefined) {
      updateFields.push('privateNotes = ?');
      updateValues.push(privateNotes);
    }
    if (strengths !== undefined) {
      updateFields.push('strengths = ?');
      updateValues.push(strengths);
    }
    if (areasForImprovement !== undefined) {
      updateFields.push('areasForImprovement = ?');
      updateValues.push(areasForImprovement);
    }
    if (recommendedForTeam !== undefined) {
      updateFields.push('recommendedForTeam = ?');
      updateValues.push(recommendedForTeam);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(evaluationId);

    const query = `UPDATE trial_evaluations SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(query, updateValues);

    res.json({
      success: true,
      message: 'Player evaluation updated successfully'
    });
  } catch (error) {
    console.error('Error updating player evaluation:', error);
    res.status(500).json({ error: 'Failed to update player evaluation' });
  }
});

// Update player ranking (move up/down in list)
app.put('/api/trial-evaluations/:evaluationId/ranking', authenticateToken, requireBetaAccess, [
  body('newRanking').isInt({ min: 1 }).withMessage('Valid ranking position required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { evaluationId } = req.params;
    const { newRanking } = req.body;
    const coachId = req.user.userId;

    // Get current evaluation
    const currentEval = await db.query(
      'SELECT * FROM trial_evaluations WHERE id = ? AND coachId = ?',
      [evaluationId, coachId]
    );

    if (currentEval.rows.length === 0) {
      return res.status(404).json({ error: 'Player evaluation not found or access denied' });
    }

    const currentRanking = currentEval.rows[0].ranking;
    const trialListId = currentEval.rows[0].trialListId;

    if (currentRanking === newRanking) {
      return res.json({ success: true, message: 'No ranking change needed' });
    }

    // Update rankings in a transaction-like manner
    if (newRanking < currentRanking) {
      // Moving up - shift others down
      await db.query(
        'UPDATE trial_evaluations SET ranking = ranking + 1 WHERE trialListId = ? AND ranking >= ? AND ranking < ?',
        [trialListId, newRanking, currentRanking]
      );
    } else {
      // Moving down - shift others up
      await db.query(
        'UPDATE trial_evaluations SET ranking = ranking - 1 WHERE trialListId = ? AND ranking > ? AND ranking <= ?',
        [trialListId, currentRanking, newRanking]
      );
    }

    // Update the target evaluation
    await db.query(
      'UPDATE trial_evaluations SET ranking = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [newRanking, evaluationId]
    );

    res.json({
      success: true,
      message: 'Player ranking updated successfully'
    });
  } catch (error) {
    console.error('Error updating player ranking:', error);
    res.status(500).json({ error: 'Failed to update player ranking' });
  }
});

// Remove player from trial list
app.delete('/api/trial-evaluations/:evaluationId', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const coachId = req.user.userId;

    // Get evaluation details first
    const evaluationCheck = await db.query(
      'SELECT * FROM trial_evaluations WHERE id = ? AND coachId = ?',
      [evaluationId, coachId]
    );

    if (evaluationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player evaluation not found or access denied' });
    }

    const evaluation = evaluationCheck.rows[0];

    // Delete the evaluation
    await db.query('DELETE FROM trial_evaluations WHERE id = ?', [evaluationId]);

    // Update rankings for remaining players
    await db.query(
      'UPDATE trial_evaluations SET ranking = ranking - 1 WHERE trialListId = ? AND ranking > ?',
      [evaluation.trialListId, evaluation.ranking]
    );

    res.json({
      success: true,
      message: 'Player removed from trial list successfully'
    });
  } catch (error) {
    console.error('Error removing player from trial list:', error);
    res.status(500).json({ error: 'Failed to remove player from trial list' });
  }
});

// Delete trial list
app.delete('/api/trial-lists/:trialListId', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const { trialListId } = req.params;
    const coachId = req.user.userId;

    // Verify trial list belongs to coach
    const trialListCheck = await db.query(
      'SELECT * FROM trial_lists WHERE id = ? AND coachId = ?',
      [trialListId, coachId]
    );

    if (trialListCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trial list not found or access denied' });
    }

    // Delete trial list (evaluations will be deleted due to CASCADE)
    await db.query('DELETE FROM trial_lists WHERE id = ?', [trialListId]);

    res.json({
      success: true,
      message: 'Trial list deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting trial list:', error);
    res.status(500).json({ error: 'Failed to delete trial list' });
  }
});

// ======================
// TEAM PROFILES API
// ======================

// Create or update team profile
app.post('/api/team-profile', authenticateToken, requireBetaAccess, [
  body('teamName').trim().isLength({ min: 1 }).withMessage('Team name is required'),
  body('clubName').optional().trim(),
  body('teamDescription').optional().trim(),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.userId;
    
    // Verify user is a coach
    const user = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (user.rows.length === 0 || user.rows[0].role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can create team profiles' });
    }

    const {
      teamName,
      clubName,
      establishedYear,
      teamDescription,
      homeGroundName,
      homeGroundAddress,
      trainingSchedule,
      hasRegularSocialEvents,
      socialEventsDescription,
      welcomesParentInvolvement,
      parentInvolvementDetails,
      attendsSummerTournaments,
      tournamentDetails,
      hasPathwayProgram,
      pathwayDescription,
      linkedAdultTeam,
      academyAffiliation,
      coachingPhilosophy,
      trainingFocus,
      developmentAreas,
      coachingStaff,
      teamAchievements,
      specialRequirements,
      equipmentProvided,
      seasonalFees,
      contactPreferences
    } = req.body;

    // Check if team profile already exists
    const existingProfile = await db.query(
      'SELECT id FROM team_profiles WHERE coachId = ?',
      [userId]
    );

    if (existingProfile.rows.length > 0) {
      // Update existing profile
      await db.query(`
        UPDATE team_profiles SET 
          teamName = ?, clubName = ?, establishedYear = ?, teamDescription = ?,
          homeGroundName = ?, homeGroundAddress = ?, trainingSchedule = ?,
          hasRegularSocialEvents = ?, socialEventsDescription = ?,
          welcomesParentInvolvement = ?, parentInvolvementDetails = ?,
          attendsSummerTournaments = ?, tournamentDetails = ?,
          hasPathwayProgram = ?, pathwayDescription = ?, linkedAdultTeam = ?,
          academyAffiliation = ?, coachingPhilosophy = ?, trainingFocus = ?,
          developmentAreas = ?, coachingStaff = ?, teamAchievements = ?,
          specialRequirements = ?, equipmentProvided = ?, seasonalFees = ?,
          contactPreferences = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE coachId = ?
      `, [
        teamName, clubName, establishedYear, teamDescription,
        homeGroundName, homeGroundAddress, trainingSchedule,
        hasRegularSocialEvents, socialEventsDescription,
        welcomesParentInvolvement, parentInvolvementDetails,
        attendsSummerTournaments, tournamentDetails,
        hasPathwayProgram, pathwayDescription, linkedAdultTeam,
        academyAffiliation, coachingPhilosophy, trainingFocus,
        developmentAreas, coachingStaff, teamAchievements,
        specialRequirements, equipmentProvided, seasonalFees,
        contactPreferences, userId
      ]);

      res.json({
        success: true,
        message: 'Team profile updated successfully',
        profileId: existingProfile.rows[0].id
      });
    } else {
      // Create new profile
      const result = await db.query(`
        INSERT INTO team_profiles (
          coachId, teamName, clubName, establishedYear, teamDescription,
          homeGroundName, homeGroundAddress, trainingSchedule,
          hasRegularSocialEvents, socialEventsDescription,
          welcomesParentInvolvement, parentInvolvementDetails,
          attendsSummerTournaments, tournamentDetails,
          hasPathwayProgram, pathwayDescription, linkedAdultTeam,
          academyAffiliation, coachingPhilosophy, trainingFocus,
          developmentAreas, coachingStaff, teamAchievements,
          specialRequirements, equipmentProvided, seasonalFees,
          contactPreferences
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `, [
        userId, teamName, clubName, establishedYear, teamDescription,
        homeGroundName, homeGroundAddress, trainingSchedule,
        hasRegularSocialEvents, socialEventsDescription,
        welcomesParentInvolvement, parentInvolvementDetails,
        attendsSummerTournaments, tournamentDetails,
        hasPathwayProgram, pathwayDescription, linkedAdultTeam,
        academyAffiliation, coachingPhilosophy, trainingFocus,
        developmentAreas, coachingStaff, teamAchievements,
        specialRequirements, equipmentProvided, seasonalFees,
        contactPreferences
      ]);

      res.status(201).json({
        success: true,
        message: 'Team profile created successfully',
        profileId: result.rows[0]?.id || result.lastID
      });
    }
  } catch (error) {
    console.error('Error creating/updating team profile:', error);
    res.status(500).json({ error: 'Failed to save team profile' });
  }
});

// Get team profile for current user (coach)
app.get('/api/team-profile', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const profile = await db.query(
      'SELECT * FROM team_profiles WHERE coachId = ? AND isActive = TRUE',
      [userId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'Team profile not found' });
    }

    res.json(profile.rows[0]);
  } catch (error) {
    console.error('Error fetching team profile:', error);
    res.status(500).json({ error: 'Failed to fetch team profile' });
  }
});

// Get team profile by ID (public view)
app.get('/api/team-profile/:id', async (req, res) => {
  try {
    const profileId = req.params.id;
    
    const profile = await db.query(`
      SELECT tp.*, u.firstName, u.lastName, u.email
      FROM team_profiles tp
      JOIN users u ON tp.coachId = u.id
      WHERE tp.id = ? AND tp.isActive = TRUE
    `, [profileId]);

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'Team profile not found' });
    }

    res.json(profile.rows[0]);
  } catch (error) {
    console.error('Error fetching team profile:', error);
    res.status(500).json({ error: 'Failed to fetch team profile' });
  }
});

// Get all team profiles (public)
app.get('/api/team-profiles', async (req, res) => {
  try {
    const { search, location, hasPathway, hasTournaments, socialEvents, page = 1, limit = 10 } = req.query;
    
    let query = `
      SELECT tp.*, u.firstName, u.lastName, u.email,
             CASE WHEN tp.hasPathwayProgram = 1 THEN 'Yes' ELSE 'No' END as pathwayProgram,
             CASE WHEN tp.attendsSummerTournaments = 1 THEN 'Yes' ELSE 'No' END as tournaments,
             CASE WHEN tp.hasRegularSocialEvents = 1 THEN 'Yes' ELSE 'No' END as socialEvents
      FROM team_profiles tp
      JOIN users u ON tp.coachId = u.id
      WHERE tp.isActive = TRUE
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (tp.teamName LIKE ? OR tp.clubName LIKE ? OR tp.teamDescription LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (location) {
      query += ` AND (tp.homeGroundAddress LIKE ? OR tp.homeGroundName LIKE ?)`;
      params.push(`%${location}%`, `%${location}%`);
    }
    
    if (hasPathway === 'true') {
      query += ` AND tp.hasPathwayProgram = 1`;
    }
    
    if (hasTournaments === 'true') {
      query += ` AND tp.attendsSummerTournaments = 1`;
    }
    
    if (socialEvents === 'true') {
      query += ` AND tp.hasRegularSocialEvents = 1`;
    }
    
    query += ` ORDER BY tp.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const profiles = await db.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM team_profiles tp
      WHERE tp.isActive = TRUE
    `;
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (tp.teamName LIKE ? OR tp.clubName LIKE ? OR tp.teamDescription LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (location) {
      countQuery += ` AND (tp.homeGroundAddress LIKE ? OR tp.homeGroundName LIKE ?)`;
      countParams.push(`%${location}%`, `%${location}%`);
    }
    
    if (hasPathway === 'true') {
      countQuery += ` AND tp.hasPathwayProgram = 1`;
    }
    
    if (hasTournaments === 'true') {
      countQuery += ` AND tp.attendsSummerTournaments = 1`;
    }
    
    if (socialEvents === 'true') {
      countQuery += ` AND tp.hasRegularSocialEvents = 1`;
    }
    
    const totalResult = await db.query(countQuery, countParams);
    const total = totalResult.rows[0].total;
    
    res.json({
      profiles: profiles.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching team profiles:', error);
    res.status(500).json({ error: 'Failed to fetch team profiles' });
  }
});

// User Administration Routes (Admin only)

// Get all users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.email, u.firstName, u.lastName, u.role, u.createdAt, 
             u.isEmailVerified, u.isBlocked
      FROM users u
      ORDER BY u.createdAt DESC
    `);
    
    // Decrypt emails
    const users = result.rows.map(user => ({
      ...user,
      email: encryptionService.decrypt(user.email),
      isBlocked: user.isBlocked || false
    }));
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting yourself
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Delete user (cascading deletes will handle related records)
    const result = await db.query('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Block/Unblock user
app.post('/api/admin/users/:id/block', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;
    
    // Prevent blocking yourself
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot block your own account' });
    }
    
    await db.query('UPDATE users SET isBlocked = ? WHERE id = ?', [blocked ? 1 : 0, id]);
    
    res.json({ 
      message: `User ${blocked ? 'blocked' : 'unblocked'} successfully` 
    });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Send admin message to user
app.post('/api/admin/users/:id/message', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }
    
    // Get user email
    const userResult = await db.query('SELECT email, firstName FROM users WHERE id = ?', [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const userEmail = encryptionService.decrypt(user.email);
    
    // Send email using email service
    try {
      await emailService.sendAdminMessage(userEmail, user.firstName, subject, message);
      res.json({ message: 'Message sent successfully' });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      res.status(500).json({ error: 'Failed to send message' });
    }
  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Beta Access Management Routes

// Get all users with beta access status
app.get('/api/admin/users/beta-access', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, email, firstName, lastName, role, betaAccess, createdAt
      FROM users
      ORDER BY createdAt DESC
    `);
    
    // Decrypt emails
    const users = result.rows.map(user => ({
      ...user,
      email: encryptionService.decrypt(user.email),
      betaAccess: user.betaAccess === 1 || user.betaAccess === true
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users for beta access:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user's beta access status
app.patch('/api/admin/users/:id/beta-access', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { betaAccess } = req.body;
    
    if (typeof betaAccess !== 'boolean') {
      return res.status(400).json({ error: 'betaAccess must be a boolean' });
    }
    
    // Get user info before update
    const userResult = await db.query('SELECT email, firstName, role FROM users WHERE id = ?', [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Prevent removing beta access from admins
    if (user.role === 'Admin' && !betaAccess) {
      return res.status(400).json({ error: 'Cannot remove beta access from admin users' });
    }
    
    // Update beta access
    await db.query('UPDATE users SET betaAccess = ? WHERE id = ?', [betaAccess ? 1 : 0, id]);
    
    // Optionally send email notification
    if (betaAccess) {
      try {
        const userEmail = encryptionService.decrypt(user.email);
        await emailService.sendBetaAccessGranted(userEmail, user.firstName);
      } catch (emailError) {
        console.error('Failed to send beta access email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({ 
      message: `Beta access ${betaAccess ? 'granted' : 'revoked'} successfully`,
      betaAccess 
    });
  } catch (error) {
    console.error('Error updating beta access:', error);
    res.status(500).json({ error: 'Failed to update beta access' });
  }
});

// User Verification Management Routes (Admin only)

// Update user's verification status
app.patch('/api/admin/users/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    
    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({ error: 'isVerified must be a boolean' });
    }
    
    // Get user info before update
    const userResult = await db.query('SELECT email, firstName, lastName, role FROM users WHERE id = ?', [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Update verification status
    await db.query('UPDATE users SET isVerified = ? WHERE id = ?', [isVerified ? 1 : 0, id]);
    
    // Send email notification
    if (isVerified) {
      try {
        const userEmail = encryptionService.decrypt(user.email);
        await emailService.sendVerificationApproved(userEmail, user.firstName);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
    }
    
    // Audit log
    auditLogger('user_verification_updated', req.user.userId, {
      targetUserId: id,
      isVerified,
      role: user.role
    });
    
    res.json({ 
      message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
      isVerified 
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// Request verification (for users)
app.post('/api/users/request-verification', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { documents } = req.body; // Could include proof of identity documents
    
    // Check if user is already verified
    const userResult = await db.query('SELECT isVerified, firstName, lastName, role FROM users WHERE id = ?', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified' });
    }
    
    // Store verification request (could create a verification_requests table)
    // For now, just notify admins
    try {
      await emailService.notifyAdminsVerificationRequest(
        user.firstName,
        user.lastName,
        user.role,
        userId
      );
    } catch (emailError) {
      console.error('Failed to notify admins:', emailError);
    }
    
    res.json({ 
      message: 'Verification request submitted successfully. An admin will review your request.',
      requestSubmitted: true
    });
  } catch (error) {
    console.error('Error requesting verification:', error);
    res.status(500).json({ error: 'Failed to submit verification request' });
  }
});

// Delete team profile
app.delete('/api/team-profile', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Verify user is a coach
    const user = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (user.rows.length === 0 || user.rows[0].role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can delete team profiles' });
    }

    const result = await db.query(
      'UPDATE team_profiles SET isActive = FALSE WHERE coachId = ?',
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Team profile not found' });
    }

    res.json({
      success: true,
      message: 'Team profile deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team profile:', error);
    res.status(500).json({ error: 'Failed to delete team profile' });
  }
});

// ============================================================================
// PERFORMANCE ANALYTICS ENDPOINTS
// ============================================================================

// Get site stats for performance analytics dashboard
app.get('/api/analytics/site-stats', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Return default stats since analytics tables don't exist yet
    // TODO: Create analytics tables and implement real tracking
    res.json({
      totalVisits: 0,
      uniqueVisitors: 0,
      newUsers: 0,
      searchesPerformed: 0,
      successfulMatches: 0,
      activeListings: 0
    });
  } catch (error) {
    console.error('Get site stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get weekly traffic data for performance analytics
app.get('/api/analytics/weekly-traffic', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Return default weekly traffic data
    // TODO: Implement real page_views tracking
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const trafficData = days.map(day => ({
      date: day,
      visits: 0,
      uniqueUsers: 0
    }));

    res.json(trafficData);
  } catch (error) {
    console.error('Get weekly traffic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly matches data for performance analytics
app.get('/api/analytics/monthly-matches', authenticateToken, requireBetaAccess, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Return default monthly matches data
    // TODO: Implement real match_completions tracking
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const matchData = months.map(month => ({
      month: month,
      matches: 0
    }));

    res.json(matchData);
  } catch (error) {
    console.error('Get monthly matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files from the React app build (for production)
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on all interfaces at port ${PORT}`);
  console.log(`📱 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://192.168.0.44:${PORT}`);
});

// Initialize WebSocket notification server
const notificationServer = new NotificationServer(server, JWT_SECRET);

// Make notification server available globally
app.locals.notificationServer = notificationServer;

// Graceful shutdown - don't close singleton database, just exit cleanly
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
