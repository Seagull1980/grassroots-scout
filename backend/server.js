const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const helmet = require('helmet');
require('dotenv').config();

const DatabaseUtils = require('./db/database');
const leagueRequestsRouter = require('./routes/league-requests');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-jwt-secret';

// Middleware
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
    'https://grassroots-scout-frontend.vercel.app', // Explicit Vercel URL
    true // Allow all origins for local development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-Id']
}));
app.use(express.json());

// Client-side error reporting (from ErrorBoundary)
app.post('/api/client-error', async (req, res) => {
  try {
    console.error('🚨 Client Error Report:', {
      message: req.body?.message,
      stack: req.body?.stack,
      componentStack: req.body?.componentStack,
      errorId: req.body?.errorId,
      url: req.body?.url,
      userAgent: req.body?.userAgent,
      timestamp: req.body?.timestamp
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to log client error:', error);
    res.status(500).json({ ok: false });
  }
});

// Engagement tracking endpoint (safe no-op logger)
app.post('/api/engagement/track', (req, res) => {
  try {
    console.log('📊 Engagement track:', {
      actionType: req.body?.actionType,
      targetType: req.body?.targetType,
      targetId: req.body?.targetId,
      metadata: req.body?.metadata,
      userAgent: req.headers['user-agent'],
      url: req.headers['referer'] || req.body?.metadata?.url
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to track engagement:', error);
    res.status(500).json({ ok: false });
  }
});

// Bookmarks endpoint (temporary mock until full implementation)
app.get('/api/bookmarks', (req, res) => {
  try {
    console.log('📑 Bookmarks requested');
    // Return empty bookmarks array for now
    res.json({ 
      bookmarks: [],
      total: 0 
    });
  } catch (error) {
    console.error('Failed to fetch bookmarks:', error);
    res.status(500).json({ bookmarks: [], total: 0 });
  }
});

// Recommendations endpoint (temporary mock until full implementation)
app.get('/api/recommendations', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    console.log('💡 Recommendations requested, limit:', limit);
    // Return empty recommendations array for now
    res.json({ 
      recommendations: [],
      total: 0 
    });
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    res.status(500).json({ recommendations: [], total: 0 });
  }
});

// Security headers with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "https://*.googleapis.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Analytics middleware to track page views
const trackPageView = async (req, res, next) => {
  try {
    // Generate session ID if not exists
    let sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      sessionId = require('crypto').randomBytes(32).toString('hex');
      res.setHeader('X-Session-ID', sessionId);
    }

    // Only track frontend page requests (not API calls)
    if (!req.path.startsWith('/api/')) {
      const pageViewData = {
        sessionId,
        userId: req.user?.id || null,
        page: req.path,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        referrer: req.headers['referer'] || null
      };

      // Track page view asynchronously
      setImmediate(async () => {
        try {
          await db.query(
            `INSERT INTO page_views (sessionId, userId, page, userAgent, ipAddress, referrer) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [pageViewData.sessionId, pageViewData.userId, pageViewData.page, 
             pageViewData.userAgent, pageViewData.ipAddress, pageViewData.referrer]
          );

          // Update or create user session
          await db.query(
            `INSERT OR REPLACE INTO user_sessions (sessionId, userId, ipAddress, userAgent, lastActivity) 
             VALUES (?, ?, ?, ?, datetime('now'))`,
            [pageViewData.sessionId, pageViewData.userId, pageViewData.ipAddress, pageViewData.userAgent]
          );
        } catch (error) {
          console.error('Error tracking page view:', error);
        }
      });
    }
  } catch (error) {
    console.error('Analytics middleware error:', error);
  }
  next();
};

app.use(trackPageView);

// Initialize database
const db = new DatabaseUtils();

// Email transporter setup (configure with your email service)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail', // Change to your email service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Check email configuration on startup
if (process.env.EMAIL_USER === 'your-email@gmail.com' || !process.env.EMAIL_USER) {
  console.warn('⚠️  WARNING: Email credentials not configured! Password reset emails will not send.');
  console.warn('⚠️  Set EMAIL_USER and EMAIL_PASS environment variables to enable email sending.');
} else {
  console.log('✅ Email service configured for:', process.env.EMAIL_USER);
}

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Helper function to send email with timeout to prevent blocking
const sendEmailWithTimeout = async (emailPromise, timeoutMs = 5000) => {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Email service timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  
  return Promise.race([emailPromise, timeoutPromise]);
};

// Helper function to send verification email
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: email,
    subject: 'Verify Your Email - The Grassroots Hub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E7D32;">Welcome to The Grassroots Hub, ${firstName}!</h2>
        <p>Thank you for registering with us. To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2E7D32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          This verification link will expire in 24 hours. If you didn't create an account with us, please ignore this email.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          The Grassroots Hub - Connecting Football Players with Teams
        </p>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending verification email:', error.message);
    console.error('Email config - USER:', process.env.EMAIL_USER);
    console.error('Email config - PASS set:', !!process.env.EMAIL_PASS);
    throw error;
  }
};

// Helper function to send password reset email
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: email,
    subject: 'Reset Your Password - The Grassroots Hub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E7D32;">Password Reset Request</h2>
        <p>Hello ${firstName},</p>
        <p>We received a request to reset your password for your The Grassroots Hub account. If you made this request, please click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2E7D32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        </p>
        
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          For security reasons, we recommend that you:
        </p>
        <ul style="font-size: 14px; color: #666;">
          <li>Use a strong, unique password</li>
          <li>Don't share your password with anyone</li>
          <li>Log out from shared computers</li>
        </ul>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          The Grassroots Hub - Connecting Football Players with Teams
        </p>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    console.error('Email config - USER:', process.env.EMAIL_USER);
    console.error('Email config - PASS set:', !!process.env.EMAIL_PASS);
    throw error;
  }
};

// Emergency admin creation endpoint (remove after use)
app.post('/api/admin/create-cgill', async (req, res) => {
  try {
    const email = 'cgill1980@hotmail.com';
    const password = 'TempPassword123!';
    const emailHash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
    
    // Check if user exists
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (existing.rows && existing.rows.length > 0) {
      console.log('✅ User exists, updating role to Admin');
      await db.query('UPDATE users SET role = $1, emailhash = $2 WHERE email = $3', ['Admin', emailHash, email]);
      
      // Update password if provided
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
      
      return res.json({ message: 'Admin updated', email, password });
    }
    
    // Create new admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (email, emailhash, password, firstname, lastname, role, betaaccess, isemailverified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, role`,
      [email, emailHash, hashedPassword, 'Chris', 'Gill', 'Admin', true, true]
    );
    
    console.log('✅ Admin created:', result.rows[0]);
    res.json({
      message: 'Admin created successfully',
      user: result.rows[0],
      tempPassword: password
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (for debugging)
app.get('/api/debug/users', async (req, res) => {
  try {
    const result = await db.query('SELECT id, email, firstname, role FROM users LIMIT 20');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize database tables on startup
(async () => {
  console.log('🚀 Starting server initialization with table order fix...');
  try {
    await db.createTables();
    console.log(`🚀 Server running on port ${PORT} with ${process.env.DB_TYPE || 'sqlite'} database`);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    console.log('⚠️  Continuing without database - some features may not work');
    // Don't exit - allow server to start even without database
  }
})();

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// CSRF token endpoint
app.get('/api/auth/csrf-token', (req, res) => {
  try {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    // Store token in global store (for development - use Redis/session in production)
    if (!global.csrfTokens) global.csrfTokens = new Set();
    global.csrfTokens.add(csrfToken);
    
    // Clean up old tokens periodically
    if (global.csrfTokens.size > 1000) {
      global.csrfTokens.clear();
    }
    
    res.json({ csrfToken });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Team vacancies endpoint
app.get('/api/vacancies', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        tv.id,
        tv.title,
        tv.description,
        tv.league,
        tv.ageGroup,
        tv.position,
        tv.teamGender,
        tv.location,
        tv.locationData,
        tv.contactInfo,
        tv.postedBy,
        tv.hasMatchRecording,
        tv.hasPathwayToSenior,
        tv.createdAt,
        tv.status,
        u.firstname as firstName,
        u.lastname as lastName
      FROM team_vacancies tv
      LEFT JOIN users u ON tv.postedBy = u.id
      WHERE tv.status = 'active'
      ORDER BY tv.createdAt DESC
    `);

    const vacancies = (result.rows || []).map((row) => {
      let locationData = row.locationData;
      if (typeof locationData === 'string') {
        try {
          locationData = JSON.parse(locationData);
        } catch {
          locationData = null;
        }
      }

      return {
        id: row.id?.toString() ?? row.id,
        title: row.title,
        description: row.description,
        league: row.league,
        ageGroup: row.ageGroup,
        position: row.position,
        teamGender: row.teamGender,
        location: row.location,
        locationData,
        contactInfo: row.contactInfo,
        postedBy: row.postedBy?.toString() ?? row.postedBy,
        firstName: row.firstName,
        lastName: row.lastName,
        hasMatchRecording: row.hasMatchRecording,
        hasPathwayToSenior: row.hasPathwayToSenior,
        createdAt: row.createdAt,
        status: row.status
      };
    });

    res.json({ vacancies });
  } catch (error) {
    console.error('Error fetching vacancies:', error);
    res.status(500).json({ error: 'Failed to fetch vacancies' });
  }
});

// Analytics tracking endpoint (allows anonymous tracking)
app.post('/api/analytics/track', async (req, res) => {
  try {
    // Check for authentication token (optional for anonymous users)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
        req.user = decoded; // Set user for authenticated requests
      } catch (error) {
        // Token is invalid, but we'll still allow anonymous tracking
        console.log('Invalid token for analytics, proceeding anonymously');
      }
    }

    const { events, sessionId } = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }

    // Store analytics events in database
    const authStatus = userId ? 'authenticated' : 'anonymous';
    console.log(`📊 Analytics: ${events.length} events from ${authStatus} user (session: ${sessionId})`);

    // Insert events into database
    for (const event of events) {
      try {
        console.log('Inserting event:', event);
        await db.query(
          `INSERT INTO analytics_events (event, category, action, label, value, user_id, session_id, timestamp, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.event,
            event.category,
            event.action,
            event.label,
            event.value,
            userId,
            sessionId,
            event.timestamp,
            JSON.stringify(event.metadata || {})
          ]
        );
        console.log('Event inserted successfully');
      } catch (insertError) {
        console.error('Error inserting analytics event:', insertError);
        // Continue processing other events even if one fails
      }
    }

    // Update or create user session
    try {
      const existingSession = await db.query(
        'SELECT id FROM user_sessions WHERE sessionid = ?',
        [sessionId]
      );

      if (existingSession.rows.length === 0) {
        // Create new session
        await db.query(
          `INSERT INTO user_sessions (sessionid, userid, ipaddress, useragent, lastactivity)
           VALUES (?, ?, ?, ?, NOW())`,
          [
            sessionId,
            userId,
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent')
          ]
        );
      } else {
        // Update existing session
        await db.query(
          'UPDATE user_sessions SET lastactivity = NOW() WHERE sessionid = ?',
          [sessionId]
        );
      }
    } catch (sessionError) {
      console.error('Error updating user session:', sessionError);
      // Don't fail the request for session errors
    }

    res.json({ success: true, eventsProcessed: events.length });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Failed to process analytics events' });
  }
});

// Register endpoint
app.post('/api/auth/register', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['Coach', 'Player', 'Parent/Guardian']).withMessage('Valid role is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required for players')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, dateOfBirth } = req.body;

    // Age restriction check for players
    if (role === 'Player') {
      if (!dateOfBirth) {
        return res.status(400).json({ 
          error: 'Date of birth is required for player registration',
          requiresDateOfBirth: true
        });
      }

      const age = calculateAge(dateOfBirth);
      if (age < 16) {
        return res.status(400).json({ 
          error: 'Players under 16 must be registered by a parent or guardian. Please use Parent/Guardian registration.',
          ageRestriction: true,
          suggestedRole: 'Parent/Guardian',
          playerAge: age
        });
      }
    }

    // Prevent Admin registration through public endpoint
    if (role === 'Admin') {
      return res.status(403).json({ error: 'Admin accounts can only be created by existing administrators' });
    }

    // Check if user already exists
    const existingUserResult = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUserResult.rows && existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email hash for uniqueness and privacy
    const emailHash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert user with email verification fields
    const result = await db.query(
      'INSERT INTO users (email, emailHash, password, firstName, lastName, role, isEmailVerified, emailVerificationToken, emailVerificationExpires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [email, emailHash, hashedPassword, firstName, lastName, role, false, verificationToken, verificationExpires]
    );

    const userId = result.rows[0].id;

    // Send verification email with timeout (don't block registration on email failure)
    sendEmailWithTimeout(sendVerificationEmail(email, firstName, verificationToken), 5000)
      .then(() => {
        console.log(`✅ Verification email sent to ${email}`);
      })
      .catch((emailError) => {
        console.error(`Failed to send verification email to ${email}:`, emailError.message);
        // Don't block registration - user can request resend later
      });

    // Create user profile with date of birth if provided (only for Players)
    if (dateOfBirth && role === 'Player') {
      try {
        await db.query(
          'INSERT INTO user_profiles (userId, dateOfBirth) VALUES (?, ?)',
          [userId, dateOfBirth]
        );
      } catch (profileError) {
        console.warn('Failed to create user profile with dateOfBirth:', profileError.message);
        // Continue - user profile is optional, don't block registration
      }
    }

    // Generate JWT token for immediate login (email verification optional)
    const token = jwt.sign(
      { userId, email, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully. Please check your email to verify your account.',
      emailVerificationRequired: true,
      token,
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        role,
        isEmailVerified: false,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Registration error details:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Email verification endpoint
app.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this verification token
    const userResult = await db.query(
      'SELECT * FROM users WHERE emailVerificationToken = ? AND emailVerificationExpires > ?',
      [token, new Date()]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification token',
        expired: true
      });
    }

    const user = userResult.rows[0];

    // Update user as verified
    await db.query(
      'UPDATE users SET isEmailVerified = ?, emailVerificationToken = NULL, emailVerificationExpires = NULL WHERE id = ?',
      [true, user.id]
    );

    res.json({
      message: 'Email verified successfully! You can now log in.',
      verified: true
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email endpoint
app.post('/api/auth/resend-verification', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user
    const userResult = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await db.query(
      'UPDATE users SET emailVerificationToken = ?, emailVerificationExpires = ? WHERE id = ?',
      [verificationToken, verificationExpires, user.id]
    );

    // Send verification email with timeout
    sendEmailWithTimeout(sendVerificationEmail(email, user.firstName, verificationToken), 5000)
      .then(() => {
        console.log(`✅ Verification email resent to ${email}`);
      })
      .catch((emailError) => {
        console.error(`Failed to resend verification email to ${email}:`, emailError.message);
        // Still return success since the token was updated
      });

    res.json({
      message: 'Verification email sent successfully. Please check your email.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password endpoint
app.post('/api/auth/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    console.log('📧 Forgot password request for:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user
    const userResult = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    console.log('📋 User lookup result rows:', userResult.rows?.length || 0);
    
    if (!userResult.rows || userResult.rows.length === 0) {
      console.log('⚠️  Email not found in database:', email);
      // Don't reveal if email exists or not for security
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const user = userResult.rows[0];
    console.log('✅ User found:', user.id, user.email);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await db.query(
      'UPDATE users SET passwordResetToken = ?, passwordResetExpires = ? WHERE id = ?',
      [resetToken, resetExpires, user.id]
    );
    console.log('💾 Token saved to database');

    // Send reset email with timeout (don't block forgot password response)
    console.log('📨 Sending reset email...');
    sendEmailWithTimeout(sendPasswordResetEmail(email, user.firstName, resetToken), 5000)
      .then(() => {
        console.log(`✅ Password reset email sent to ${email}`);
      })
      .catch((emailError) => {
        console.error(`Failed to send password reset email to ${email}:`, emailError.message);
      });

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password endpoint
app.post('/api/auth/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Find user with this reset token
    const userResult = await db.query(
      'SELECT * FROM users WHERE passwordResetToken = ? AND passwordResetExpires > ?',
      [token, new Date()]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token',
        expired: true
      });
    }

    const user = userResult.rows[0];

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with new password and clear reset token
    await db.query(
      'UPDATE users SET password = ?, passwordResetToken = NULL, passwordResetExpires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate reset token endpoint
app.get('/api/auth/validate-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this reset token
    const userResult = await db.query(
      'SELECT id, firstName, email FROM users WHERE passwordResetToken = ? AND passwordResetExpires > ?',
      [token, new Date()]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token',
        expired: true,
        valid: false
      });
    }

    const user = userResult.rows[0];

    res.json({
      valid: true,
      message: 'Reset token is valid',
      userEmail: user.email
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Find user
    const userResult = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = userResult.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        betaAccess: Boolean(user.betaaccess)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
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

// Get current user endpoint
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Fetch full user data from database
    const userResult = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        betaAccess: Boolean(user.betaaccess)
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics endpoints
app.get('/api/analytics/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching analytics overview...');
    
    // Get real user count from database
    const totalUsersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const totalTeamsResult = await db.query('SELECT COUNT(DISTINCT postedBy) as count FROM team_vacancies');
    const totalPlayersResult = await db.query('SELECT COUNT(*) as count FROM player_availability');
    
    const overview = {
      totalUsers: totalUsersResult?.rows?.[0]?.count || 0,
      totalTeams: totalTeamsResult?.rows?.[0]?.count || 0,
      totalPlayers: totalPlayersResult?.rows?.[0]?.count || 0,
      totalMatches: 0,
      todayUsers: 1,
      todayTeams: 0,
      todayPlayers: 0,
      todayPageViews: 25,
      todayUniqueVisitors: 8,
      activeSessions: 3
    };

    // Get user type breakdown
    const userTypesResult = await db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const userTypes = (userTypesResult?.rows || []).map(row => ({ userType: row.role, count: row.count }));
    
    const popularPages = [
      { page: '/dashboard', views: 150 },
      { page: '/teams', views: 89 },
      { page: '/players', views: 67 },
      { page: '/analytics', views: 45 }
    ];
    
    console.log('✅ Analytics data fetched successfully');
    
    res.json({
      overview,
      userTypeBreakdown: userTypes,
      popularPages
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

app.get('/api/analytics/daily-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const sampleData = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
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

    res.json(sampleData);
  } catch (error) {
    console.error('Analytics daily stats error:', error);
    res.status(500).json({ error: 'Failed to fetch daily statistics' });
  }
});

app.get('/api/analytics/user-activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
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

    res.json(sampleActivity);
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// Change password endpoint (for logged-in users)
app.put('/api/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Get user from database
    const userResult = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    console.log(`✅ Password changed successfully for user ID: ${userId}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile Endpoints

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user basic info
    const userResult = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Get user profile data (use quoted names for case sensitivity)
    const profileResult = await db.query('SELECT * FROM user_profiles WHERE userid = ?', [userId]);
    const profile = profileResult.rows && profileResult.rows.length > 0 ? profileResult.rows[0] : {};
    
    console.log('Profile data retrieved:', {
      userId,
      profileExists: !!profile.userid,
      profileKeys: Object.keys(profile),
      dateofbirth: profile.dateofbirth,
      phone: profile.phone
    });
    
    // Return combined profile (map camelCase to lowercase for frontend)
    res.json({
      profile: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        createdat: user.createdat,
        phone: profile.phone,
        dateofbirth: profile.dateofbirth,
        location: profile.location,
        bio: profile.bio,
        position: profile.position,
        preferredfoot: profile.preferredfoot,
        height: profile.height,
        weight: profile.weight,
        experiencelevel: profile.experiencelevel,
        availability: profile.availability,
        coachinglicense: profile.coachinglicense,
        yearsexperience: profile.yearsexperience,
        specializations: profile.specializations,
        traininglocation: profile.traininglocation,
        matchlocation: profile.matchlocation,
        trainingdays: profile.trainingdays,
        agegroupscoached: profile.agegroupscoached,
        emergencycontact: profile.emergencycontact,
        emergencyphone: profile.emergencyphone,
        medicalinfo: profile.medicalinfo,
        profilepicture: profile.profilepicture,
        isprofilecomplete: profile.isprofilecomplete,
        lastupdated: profile.lastupdated
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('Profile update request body:', {
      userId,
      bodyKeys: Object.keys(req.body),
      phone: req.body.phone,
      dateofbirth: req.body.dateofbirth,
      location: req.body.location
    });
    
    const {
      phone,
      dateofbirth,
      location,
      bio,
      position,
      preferredfoot,
      height,
      weight,
      experiencelevel,
      availability,
      coachinglicense,
      yearsexperience,
      specializations,
      traininglocation,
      matchlocation,
      trainingdays,
      agegroupscoached,
      emergencycontact,
      emergencyphone,
      medicalinfo,
      profilepicture,
      isprofilecomplete
    } = req.body;

    // Check if profile exists
    const existingProfile = await db.query('SELECT * FROM user_profiles WHERE userid = ?', [userId]);
    
    if (!existingProfile.rows || existingProfile.rows.length === 0) {
      // Create new profile with lowercase column names
      await db.query(
        `INSERT INTO user_profiles (
          userid, phone, dateofbirth, location, bio, position, preferredfoot,
          height, weight, experiencelevel, availability, coachinglicense,
          yearsexperience, specializations, traininglocation, matchlocation,
          trainingdays, agegroupscoached, emergencycontact, emergencyphone,
          medicalinfo, profilepicture, isprofilecomplete, lastupdated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId, phone, dateofbirth, location, bio, position, preferredfoot,
          height, weight, experiencelevel, JSON.stringify(availability),
          coachinglicense, yearsexperience, JSON.stringify(specializations),
          traininglocation, matchlocation, JSON.stringify(trainingdays),
          JSON.stringify(agegroupscoached), emergencycontact, emergencyphone,
          medicalinfo, profilepicture, isprofilecomplete
        ]
      );
    } else {
      // Update existing profile with lowercase column names
      const updates = [];
      const values = [];

      if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
      if (dateofbirth !== undefined) { updates.push('dateofbirth = ?'); values.push(dateofbirth); }
      if (location !== undefined) { updates.push('location = ?'); values.push(location); }
      if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
      if (position !== undefined) { updates.push('position = ?'); values.push(position); }
      if (preferredfoot !== undefined) { updates.push('preferredfoot = ?'); values.push(preferredfoot); }
      if (height !== undefined) { updates.push('height = ?'); values.push(height); }
      if (weight !== undefined) { updates.push('weight = ?'); values.push(weight); }
      if (experiencelevel !== undefined) { updates.push('experiencelevel = ?'); values.push(experiencelevel); }
      if (availability !== undefined) { updates.push('availability = ?'); values.push(JSON.stringify(availability)); }
      if (coachinglicense !== undefined) { updates.push('coachinglicense = ?'); values.push(coachinglicense); }
      if (yearsexperience !== undefined) { updates.push('yearsexperience = ?'); values.push(yearsexperience); }
      if (specializations !== undefined) { updates.push('specializations = ?'); values.push(JSON.stringify(specializations)); }
      if (traininglocation !== undefined) { updates.push('traininglocation = ?'); values.push(traininglocation); }
      if (matchlocation !== undefined) { updates.push('matchlocation = ?'); values.push(matchlocation); }
      if (trainingdays !== undefined) { updates.push('trainingdays = ?'); values.push(JSON.stringify(trainingdays)); }
      if (agegroupscoached !== undefined) { updates.push('agegroupscoached = ?'); values.push(JSON.stringify(agegroupscoached)); }
      if (emergencycontact !== undefined) { updates.push('emergencycontact = ?'); values.push(emergencycontact); }
      if (emergencyphone !== undefined) { updates.push('emergencyphone = ?'); values.push(emergencyphone); }
      if (medicalinfo !== undefined) { updates.push('medicalinfo = ?'); values.push(medicalinfo); }
      if (profilepicture !== undefined) { updates.push('profilepicture = ?'); values.push(profilepicture); }
      if (isprofilecomplete !== undefined) { updates.push('isprofilecomplete = ?'); values.push(isprofilecomplete); }
      
      // Always update lastupdated
      updates.push('lastupdated = NOW()');

      if (updates.length === 1) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(userId);
      const query = `UPDATE user_profiles SET ${updates.join(', ')} WHERE userid = ?`;

      console.log('UPDATE Query:', query);
      console.log('UPDATE Values:', values);
      console.log('dateofbirth being updated:', dateofbirth);
      
      await db.query(query, values);
      
      // Verify what was saved
      const verifyResult = await db.query('SELECT dateofbirth, location FROM user_profiles WHERE userid = ?', [userId]);
      console.log('After UPDATE - dateofbirth in DB:', verifyResult.rows[0]);
    }

    console.log(`✅ Profile updated successfully for user ID: ${userId}`);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Children Management Endpoints

// Get all children for a parent
app.get('/api/children', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can access children data' });
    }

    const childrenResult = await db.query(
      'SELECT * FROM children WHERE parentId = ? AND isActive = ? ORDER BY firstName',
      [req.user.userId, true]
    );

    res.json({
      children: childrenResult.rows || []
    });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new child
app.post('/api/children', [
  authenticateToken,
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can add children' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      preferredPosition,
      medicalInfo,
      emergencyContact,
      emergencyPhone,
      schoolName
    } = req.body;

    // Verify child is under 16
    const age = calculateAge(dateOfBirth);
    if (age >= 16) {
      return res.status(400).json({ 
        error: 'Children must be under 16 years old. Players 16 and over should register their own accounts.',
        ageRestriction: true,
        childAge: age
      });
    }

    const result = await db.query(
      `INSERT INTO children (parentId, firstName, lastName, dateOfBirth, gender, preferredPosition, 
       medicalInfo, emergencyContact, emergencyPhone, schoolName) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.userId, firstName, lastName, dateOfBirth, gender, preferredPosition, 
       medicalInfo, emergencyContact, emergencyPhone, schoolName]
    );

    const childId = result.lastID;

    res.status(201).json({
      message: 'Child added successfully',
      child: {
        id: childId,
        parentId: req.user.userId,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        preferredPosition,
        medicalInfo,
        emergencyContact,
        emergencyPhone,
        schoolName,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Add child error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update child information
app.put('/api/children/:childId', [
  authenticateToken,
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can update children' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { childId } = req.params;
    
    // Verify child belongs to this parent
    const childResult = await db.query(
      'SELECT * FROM children WHERE id = ? AND parentId = ?',
      [childId, req.user.userId]
    );

    if (!childResult.rows || childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    const updateFields = [];
    const updateValues = [];
    
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(req.body[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updatedAt = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(childId);

    await db.query(
      `UPDATE children SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Child information updated successfully' });
  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete/deactivate a child
app.delete('/api/children/:childId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can delete children' });
    }

    const { childId } = req.params;
    
    // Verify child belongs to this parent
    const childResult = await db.query(
      'SELECT * FROM children WHERE id = ? AND parentId = ?',
      [childId, req.user.userId]
    );

    if (!childResult.rows || childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    // Soft delete - set isActive to false
    await db.query(
      'UPDATE children SET isActive = ?, updatedAt = ? WHERE id = ?',
      [false, new Date().toISOString(), childId]
    );

    // Also deactivate any player availability for this child
    await db.query(
      'UPDATE child_player_availability SET status = ?, updatedAt = ? WHERE childId = ?',
      ['inactive', new Date().toISOString(), childId]
    );

    res.json({ message: 'Child removed successfully' });
  } catch (error) {
    console.error('Delete child error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Child Player Availability Endpoints

// Get all player availability for parent's children
app.get('/api/child-player-availability', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can access child player availability' });
    }

    const availabilityResult = await db.query(
      `SELECT cpa.*, c.firstName, c.lastName, c.dateOfBirth 
       FROM child_player_availability cpa 
       JOIN children c ON cpa.childId = c.id 
       WHERE cpa.parentId = ? AND cpa.status != 'inactive'
       ORDER BY cpa.createdAt DESC`,
      [req.user.userId]
    );

    const availability = (availabilityResult.rows || []).map(row => ({
      ...row,
      preferredLeagues: row.preferredLeagues ? JSON.parse(row.preferredLeagues) : [],
      positions: row.positions ? JSON.parse(row.positions) : [],
      locationData: row.locationData ? JSON.parse(row.locationData) : null,
      availability: row.availability ? JSON.parse(row.availability) : null
    }));

    res.json({ availability });
  } catch (error) {
    console.error('Get child player availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new player availability for a child
app.post('/api/child-player-availability', [
  authenticateToken,
  body('childId').isInt().withMessage('Valid child ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('positions').isArray({ min: 1 }).withMessage('At least one position is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can create child player availability' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      childId,
      title,
      description,
      preferredLeagues,
      ageGroup,
      positions,
      preferredTeamGender,
      location,
      locationData,
      contactInfo,
      availability
    } = req.body;

    // Verify child belongs to this parent
    const childResult = await db.query(
      'SELECT * FROM children WHERE id = ? AND parentId = ? AND isActive = ?',
      [childId, req.user.userId, true]
    );

    if (!childResult.rows || childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    const result = await db.query(
      `INSERT INTO child_player_availability 
       (childId, parentId, title, description, preferredLeagues, ageGroup, positions, 
        preferredTeamGender, location, locationData, contactInfo, availability) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        childId,
        req.user.userId,
        title,
        description,
        JSON.stringify(preferredLeagues || []),
        ageGroup,
        JSON.stringify(positions),
        preferredTeamGender || 'Mixed',
        location,
        JSON.stringify(locationData),
        contactInfo,
        JSON.stringify(availability)
      ]
    );

    const availabilityId = result.lastID;

    res.status(201).json({
      message: 'Child player availability created successfully',
      availability: {
        id: availabilityId,
        childId,
        parentId: req.user.userId,
        title,
        description,
        preferredLeagues: preferredLeagues || [],
        ageGroup,
        positions,
        location,
        locationData,
        contactInfo,
        availability,
        status: 'active',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create child player availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update child player availability
app.put('/api/child-player-availability/:availabilityId', [
  authenticateToken,
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('ageGroup').optional().notEmpty().withMessage('Age group cannot be empty'),
  body('positions').optional().isArray({ min: 1 }).withMessage('At least one position is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can update child player availability' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { availabilityId } = req.params;
    
    // Verify availability belongs to this parent
    const availabilityResult = await db.query(
      'SELECT * FROM child_player_availability WHERE id = ? AND parentId = ?',
      [availabilityId, req.user.userId]
    );

    if (!availabilityResult.rows || availabilityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player availability not found or access denied' });
    }

    const updateFields = [];
    const updateValues = [];
    
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        if (['preferredLeagues', 'positions', 'locationData', 'availability'].includes(key)) {
          updateFields.push(`${key} = ?`);
          updateValues.push(JSON.stringify(req.body[key]));
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(req.body[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updatedAt = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(availabilityId);

    await db.query(
      `UPDATE child_player_availability SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Child player availability updated successfully' });
  } catch (error) {
    console.error('Update child player availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete child player availability
app.delete('/api/child-player-availability/:availabilityId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can delete child player availability' });
    }

    const { availabilityId } = req.params;
    
    // Verify availability belongs to this parent
    const availabilityResult = await db.query(
      'SELECT * FROM child_player_availability WHERE id = ? AND parentId = ?',
      [availabilityId, req.user.userId]
    );

    if (!availabilityResult.rows || availabilityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player availability not found or access denied' });
    }

    // Soft delete - set status to inactive
    await db.query(
      'UPDATE child_player_availability SET status = ?, updatedAt = ? WHERE id = ?',
      ['inactive', new Date().toISOString(), availabilityId]
    );

    res.json({ message: 'Child player availability removed successfully' });
  } catch (error) {
    console.error('Delete child player availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public child player availability (for coaches to see)
app.get('/api/public/child-player-availability', async (req, res) => {
  try {
    const { league, ageGroup, position, location } = req.query;
    
    let query = `
      SELECT cpa.*, c."firstName", c."lastName", c."dateOfBirth", u.email as "parentEmail"
      FROM child_player_availability cpa 
      JOIN children c ON cpa."childId" = c.id 
      JOIN users u ON cpa."parentId" = u.id
      WHERE cpa.status = $1 AND c."isActive" = $2
    `;
    const params = ['active', true];
    let paramIndex = 3;

    if (league) {
      query += ` AND cpa."preferredLeagues" LIKE $${paramIndex}`;
      params.push(`%"${league}"%`);
      paramIndex++;
    }

    if (ageGroup) {
      query += ` AND cpa."ageGroup" = $${paramIndex}`;
      params.push(ageGroup);
      paramIndex++;
    }

    if (position) {
      query += ` AND cpa.positions LIKE $${paramIndex}`;
      params.push(`%"${position}"%`);
      paramIndex++;
    }

    if (location) {
      query += ` AND cpa.location LIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    query += ` ORDER BY cpa."createdAt" DESC`;

    const availabilityResult = await db.query(query, params);

    const availability = (availabilityResult.rows || []).map(row => ({
      ...row,
      preferredLeagues: row.preferredLeagues ? JSON.parse(row.preferredLeagues) : [],
      positions: row.positions ? JSON.parse(row.positions) : [],
      locationData: row.locationData ? JSON.parse(row.locationData) : null,
      availability: row.availability ? JSON.parse(row.availability) : null
    }));

    res.json({ availability });
  } catch (error) {
    console.error('Get public child player availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public site statistics (for homepage display)
app.get('/api/public/site-stats', async (req, res) => {
  try {
    // Get total active teams (from team_vacancies table - count distinct users who posted vacancies)
    const activeTeams = await db.query("SELECT COUNT(DISTINCT postedby) as count FROM team_vacancies WHERE status = 'active'");
    
    // Get total registered players (from users table, excluding admins)
    const registeredPlayers = await db.query("SELECT COUNT(*) as count FROM users WHERE role != 'Admin'");
    
    // Get successful matches (confirmed match completions)
    const successfulMatches = await db.query("SELECT COUNT(*) as count FROM match_completions WHERE completionstatus = 'confirmed'");

    res.json({
      activeTeams: activeTeams.rows[0].count,
      registeredPlayers: registeredPlayers.rows[0].count,
      successfulMatches: successfulMatches.rows[0].count
    });
  } catch (error) {
    console.error('Get public site stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all active leagues (public endpoint)
app.get('/api/leagues', async (req, res) => {
  try {
    const leaguesResult = await db.query(
      'SELECT id, name, region, country, url, description, hits FROM leagues WHERE isActive = true ORDER BY name'
    );

    res.json({ leagues: leaguesResult.rows || [] });
  } catch (error) {
    console.error('Get leagues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Match Completion Endpoints

// Create a match completion (when a coach/player confirms a successful match)
app.post('/api/match-completions', [
  authenticateToken,
  body('matchType').isIn(['player_to_team', 'child_to_team']).withMessage('Valid match type required'),
  body('playerName').notEmpty().withMessage('Player name is required'),
  body('teamName').notEmpty().withMessage('Team name is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('league').notEmpty().withMessage('League is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      vacancyId,
      availabilityId,
      childAvailabilityId,
      matchType,
      playerName,
      teamName,
      position,
      ageGroup,
      league,
      startDate,
      playerId,
      parentId
    } = req.body;

    // Validate user role based on match type
    if (matchType === 'child_to_team' && req.user.role !== 'Parent/Guardian' && req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only parents/guardians or coaches can confirm child matches' });
    }

    if (matchType === 'player_to_team' && req.user.role !== 'Player' && req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only players or coaches can confirm player matches' });
    }

    // Set confirmation status based on who is creating the completion
    let coachConfirmed = false;
    let playerConfirmed = false;
    let parentConfirmed = false;

    if (req.user.role === 'Coach') {
      coachConfirmed = true;
    } else if (req.user.role === 'Player') {
      playerConfirmed = true;
    } else if (req.user.role === 'Parent/Guardian') {
      parentConfirmed = true;
    }

    const result = await db.query(
      `INSERT INTO match_completions 
       (vacancyId, availabilityId, childAvailabilityId, coachId, playerId, parentId, 
        matchType, playerName, teamName, position, ageGroup, league, startDate,
        coachConfirmed, playerConfirmed, parentConfirmed) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vacancyId || null,
        availabilityId || null,
        childAvailabilityId || null,
        req.user.role === 'Coach' ? req.user.userId : null,
        playerId || null,
        parentId || null,
        matchType,
        playerName,
        teamName,
        position,
        ageGroup,
        league,
        startDate || null,
        coachConfirmed,
        playerConfirmed,
        parentConfirmed
      ]
    );

    const completionId = result.lastID;

    res.status(201).json({
      message: 'Match completion created successfully',
      completion: {
        id: completionId,
        matchType,
        playerName,
        teamName,
        position,
        ageGroup,
        league,
        coachConfirmed,
        playerConfirmed,
        parentConfirmed,
        completionStatus: 'pending',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create match completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm a match completion (when the other party confirms)
app.put('/api/match-completions/:completionId/confirm', [
  authenticateToken,
  body('confirmed').isBoolean().withMessage('Confirmation status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { completionId } = req.params;
    const { confirmed } = req.body;

    // Get the completion record
    const completionResult = await db.query(
      'SELECT * FROM match_completions WHERE id = ?',
      [completionId]
    );

    if (!completionResult.rows || completionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match completion not found' });
    }

    const completion = completionResult.rows[0];

    // Determine which confirmation to update based on user role
    let updateField = '';
    let canConfirm = false;

    if (req.user.role === 'Coach' && !completion.coachConfirmed) {
      updateField = 'coachConfirmed';
      canConfirm = true;
    } else if (req.user.role === 'Player' && !completion.playerConfirmed && completion.playerId === req.user.userId) {
      updateField = 'playerConfirmed';
      canConfirm = true;
    } else if (req.user.role === 'Parent/Guardian' && !completion.parentConfirmed && completion.parentId === req.user.userId) {
      updateField = 'parentConfirmed';
      canConfirm = true;
    }

    if (!canConfirm) {
      return res.status(403).json({ error: 'You are not authorized to confirm this match or it has already been confirmed' });
    }

    // Update the confirmation
    await db.query(
      `UPDATE match_completions SET ${updateField} = ?, updatedAt = ? WHERE id = ?`,
      [confirmed, new Date().toISOString(), completionId]
    );

    // Check if all required parties have confirmed
    const updatedResult = await db.query(
      'SELECT * FROM match_completions WHERE id = ?',
      [completionId]
    );

    const updated = updatedResult.rows[0];
    let allConfirmed = false;
    let completionStatus = 'pending';

    if (updated.matchType === 'player_to_team') {
      allConfirmed = updated.coachConfirmed && updated.playerConfirmed;
    } else if (updated.matchType === 'child_to_team') {
      allConfirmed = updated.coachConfirmed && updated.parentConfirmed;
    }

    if (allConfirmed) {
      completionStatus = 'confirmed';
      await db.query(
        'UPDATE match_completions SET completionStatus = ?, completedAt = ? WHERE id = ?',
        ['confirmed', new Date().toISOString(), completionId]
      );

      // Mark related vacancy/availability as filled/inactive
      if (updated.vacancyId) {
        await db.query(
          'UPDATE team_vacancies SET status = ? WHERE id = ?',
          ['filled', updated.vacancyId]
        );
      }
      if (updated.availabilityId) {
        await db.query(
          'UPDATE player_availability SET status = ? WHERE id = ?',
          ['inactive', updated.availabilityId]
        );
      }
      if (updated.childAvailabilityId) {
        await db.query(
          'UPDATE child_player_availability SET status = ? WHERE id = ?',
          ['inactive', updated.childAvailabilityId]
        );
      }
    }

    res.json({
      message: 'Confirmation updated successfully',
      completionStatus,
      allConfirmed
    });
  } catch (error) {
    console.error('Confirm match completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get match completions for a user
app.get('/api/match-completions', authenticateToken, async (req, res) => {
  try {
    let query = '';
    let params = [];

    if (req.user.role === 'Coach') {
      query = 'SELECT * FROM match_completions WHERE coachId = ? ORDER BY createdAt DESC';
      params = [req.user.userId];
    } else if (req.user.role === 'Player') {
      query = 'SELECT * FROM match_completions WHERE playerId = ? ORDER BY createdAt DESC';
      params = [req.user.userId];
    } else if (req.user.role === 'Parent/Guardian') {
      query = 'SELECT * FROM match_completions WHERE parentId = ? ORDER BY createdAt DESC';
      params = [req.user.userId];
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const completionsResult = await db.query(query, params);

    res.json({
      completions: completionsResult.rows || []
    });
  } catch (error) {
    console.error('Get match completions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add success story and rating to a completion
app.put('/api/match-completions/:completionId/story', [
  authenticateToken,
  body('successStory').optional().isLength({ max: 1000 }).withMessage('Success story must be under 1000 characters'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isLength({ max: 500 }).withMessage('Feedback must be under 500 characters'),
  body('publicStory').optional().isBoolean().withMessage('Public story flag must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { completionId } = req.params;
    const { successStory, rating, feedback, publicStory } = req.body;

    // Verify user has access to this completion
    const completionResult = await db.query(
      `SELECT * FROM match_completions WHERE id = ? AND 
       (coachId = ? OR playerId = ? OR parentId = ?)`,
      [completionId, req.user.userId, req.user.userId, req.user.userId]
    );

    if (!completionResult.rows || completionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match completion not found or access denied' });
    }

    const completion = completionResult.rows[0];

    // Only allow adding story if completion is confirmed
    if (completion.completionStatus !== 'confirmed') {
      return res.status(400).json({ error: 'Can only add success story to confirmed matches' });
    }

    const updateFields = [];
    const updateValues = [];

    if (successStory !== undefined) {
      updateFields.push('successStory = ?');
      updateValues.push(successStory);
    }
    if (rating !== undefined) {
      updateFields.push('rating = ?');
      updateValues.push(rating);
    }
    if (feedback !== undefined) {
      updateFields.push('feedback = ?');
      updateValues.push(feedback);
    }
    if (publicStory !== undefined) {
      updateFields.push('publicStory = ?');
      updateValues.push(publicStory);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updatedAt = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(completionId);

    await db.query(
      `UPDATE match_completions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Success story updated successfully' });
  } catch (error) {
    console.error('Update success story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public success stories
app.get('/api/success-stories', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const storiesResult = await db.query(
      `SELECT 
        playerName, teamName, position, ageGroup, league, successStory, 
        rating, createdAt, completedAt
       FROM match_completions 
       WHERE completionStatus = 'confirmed' AND publicStory = true AND successStory IS NOT NULL
       ORDER BY completedAt DESC 
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM match_completions 
       WHERE completionStatus = 'confirmed' AND publicStory = true AND successStory IS NOT NULL`
    );

    res.json({
      stories: storiesResult.rows || [],
      total: countResult.rows[0]?.total || 0
    });
  } catch (error) {
    console.error('Get success stories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== MESSAGING & CONVERSATION ENDPOINTS =====

// Get user's conversations
app.get('/api/conversations', authenticateToken, async (req, res) => {
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
app.get('/api/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
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

// Send message in conversation
app.post('/api/messages', authenticateToken, [
  body('message').isLength({ min: 1, max: 2000 }).withMessage('Message is required (max 2000 characters)'),
  body('conversationId').optional().isString().withMessage('Valid conversation ID required'),
  body('recipientId').optional().isInt().withMessage('Valid recipient ID required'),
  body('messageType').optional().isIn(['general', 'vacancy_interest', 'player_inquiry', 'training_invitation', 'match_update', 'system']).withMessage('Valid message type required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const senderId = req.user.userId;
    const { message, conversationId, recipientId, messageType = 'general', subject } = req.body;
    
    let actualRecipientId = recipientId;
    
    // If conversationId is provided, extract recipient from it
    if (conversationId && !recipientId) {
      const participantIds = conversationId.split('_').map(id => parseInt(id));
      actualRecipientId = participantIds.find(id => id !== parseInt(senderId));
    }
    
    if (!actualRecipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    // Insert the message
    const result = await db.query(
      `INSERT INTO messages (senderId, recipientId, subject, message, messageType, isRead)
       VALUES (?, ?, ?, ?, ?, false)`,
      [senderId, actualRecipientId, subject || 'Message', message, messageType]
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      messageId: result.lastID
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get match progress for user
app.get('/api/match-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Mock match progress data based on recent conversations and match completions
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
      conversationId: `mock_${match.id}`, // Mock conversation ID
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

// Leagues API endpoints

// Admin leagues endpoints
app.get('/api/admin/leagues', authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const leaguesResult = await db.query(
      'SELECT id, name, description, isactive, createdat FROM leagues ORDER BY name'
    );

    res.json({ leagues: leaguesResult.rows || [] });
  } catch (error) {
    console.error('Get admin leagues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/leagues', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const existingLeague = await db.query('SELECT id FROM leagues WHERE name = ?', [name]);
    if (existingLeague.rows && existingLeague.rows.length > 0) {
      return res.status(400).json({ error: 'League name already exists' });
    }

    const leagueResult = await db.query(
      'INSERT INTO leagues (name, description, createdby) VALUES (?, ?, ?) RETURNING *',
      [name, description || '', req.user.userId]
    );

    res.status(201).json({
      message: 'League created successfully',
      league: leagueResult.rows[0]
    });
  } catch (error) {
    console.error('Create admin league error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/leagues/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const existingLeague = await db.query('SELECT id FROM leagues WHERE id = ?', [id]);
    if (!existingLeague.rows || existingLeague.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (name) {
      const nameConflict = await db.query('SELECT id FROM leagues WHERE name = ? AND id != ?', [name, id]);
      if (nameConflict.rows && nameConflict.rows.length > 0) {
        return res.status(400).json({ error: 'League name already exists' });
      }
    }

    await db.query(
      'UPDATE leagues SET name = ?, description = ? WHERE id = ?',
      [name, description || '', id]
    );

    res.json({ message: 'League updated successfully' });
  } catch (error) {
    console.error('Update admin league error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/leagues/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const existingLeague = await db.query('SELECT id FROM leagues WHERE id = ?', [id]);
    if (!existingLeague.rows || existingLeague.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    await db.query('DELETE FROM leagues WHERE id = ?', [id]);

    res.json({ message: 'League deleted successfully' });
  } catch (error) {
    console.error('Delete admin league error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users for admin
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    console.log('[Admin Users] ===== REQUEST RECEIVED =====');
    console.log('[Admin Users] User ID:', req.user?.userId);
    console.log('[Admin Users] User role:', req.user?.role);
    
    // Check if user is admin
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    console.log('[Admin Users] Admin check result:', adminCheck);
    
    if (!adminCheck.rows || adminCheck.rows.length === 0) {
      console.log('[Admin Users] User not found in database');
      return res.status(403).json({ error: 'Admin access required - user not found' });
    }
    
    const userRole = adminCheck.rows[0].role;
    console.log('[Admin Users] User role from DB:', userRole);
    
    if (userRole !== 'Admin') {
      console.log('[Admin Users] User is not admin, role is:', userRole);
      return res.status(403).json({ error: 'Admin access required - not admin' });
    }

    // Fetch all users
    console.log('[Admin Users] Fetching all users...');
    const result = await db.query(`
      SELECT 
        id, 
        email, 
        firstname as firstName, 
        lastname as lastName, 
        role, 
        createdat as createdAt,
        isemailverified as isEmailVerified,
        isblocked as isBlocked
      FROM users 
      ORDER BY createdat DESC
    `);
    
    console.log('[Admin Users] Query result:', result);
    console.log(`[Admin Users] Found ${result.rows ? result.rows.length : 0} users`);
    console.log('[Admin Users] Users data:', JSON.stringify(result.rows, null, 2));
    
    const responseData = { users: result.rows || [] };
    console.log('[Admin Users] Sending response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (error) {
    console.error('[Admin Users] ERROR:', error);
    console.error('[Admin Users] Stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get users for beta access management (admin only)
app.get('/api/admin/users/beta-access', authenticateToken, async (req, res) => {
  try {
    console.log('[Beta Access] Checking admin access for user:', req.user?.userId);
    
    // Check if user is admin
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if betaaccess column exists in postgres information schema
    const columnCheck = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'betaaccess'
    `).catch(() => ({ rows: [] }));
    
    const columnExists = columnCheck.rows && columnCheck.rows.length > 0;
    console.log('[Beta Access] betaaccess column exists:', columnExists);

    // Fetch all users with beta access info
    console.log('[Beta Access] Fetching users with beta access...');
    
    let result;
    if (columnExists) {
      // Column exists - fetch with actual value
      result = await db.query(`
        SELECT 
          id, 
          email, 
          firstname as firstName, 
          lastname as lastName, 
          role, 
          betaaccess as betaAccess,
          createdat as createdAt,
          isemailverified as isEmailVerified,
          isblocked as isBlocked
        FROM users 
        ORDER BY createdat DESC
      `);
      console.log('[Beta Access] Query successful with betaaccess column');
    } else {
      // Column doesn't exist - add it first
      console.log('[Beta Access] betaaccess column does not exist - adding it now...');
      try {
        await db.query('ALTER TABLE users ADD COLUMN betaaccess BOOLEAN DEFAULT FALSE');
        console.log('[Beta Access] Successfully added betaaccess column');
      } catch (alterError) {
        console.error('[Beta Access] Error adding column:', alterError.message);
        // If column already exists, this is fine
      }
      
      // Now fetch with the column
      result = await db.query(`
        SELECT 
          id, 
          email, 
          firstname as firstName, 
          lastname as lastName, 
          role, 
          betaaccess as betaAccess,
          createdat as createdAt,
          isemailverified as isEmailVerified,
          isblocked as isBlocked
        FROM users 
        ORDER BY createdat DESC
      `);
      console.log('[Beta Access] Query successful after adding betaaccess column');
    }
    
    console.log(`[Beta Access] Found ${result.rows ? result.rows.length : 0} users`);
    console.log('[Beta Access] Sample user data:', result.rows?.[0]);
    
    // Ensure betaAccess is a boolean for all users
    const usersWithBetaAccess = (result.rows || []).map(user => {
      const rawBetaAccess = user.betaAccess ?? user.betaaccess;
      console.log('[Beta Access] User', user.id, 'betaAccess:', rawBetaAccess, 'Type:', typeof rawBetaAccess);
      return {
        ...user,
        betaAccess: Boolean(rawBetaAccess)
      };
    });
    
    res.json(usersWithBetaAccess);
  } catch (error) {
    console.error('[Beta Access] ERROR:', error);
    console.error('[Beta Access] Error message:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Prevent self-deletion
    if (req.user.userId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete user
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[Admin Users] Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Block/Unblock user (admin only)
app.post('/api/admin/users/:id/block', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Toggle blocked status
    const userResult = await db.query('SELECT isblocked FROM users WHERE id = ?', [id]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newBlockedStatus = !userResult.rows[0].isblocked;
    await db.query('UPDATE users SET isblocked = ? WHERE id = ?', [newBlockedStatus, id]);
    
    res.json({ 
      message: newBlockedStatus ? 'User blocked successfully' : 'User unblocked successfully',
      isblocked: newBlockedStatus
    });
  } catch (error) {
    console.error('[Admin Users] Block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message to user (admin only)
app.post('/api/admin/users/:id/message', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    // Check if user is admin
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Send message (could integrate with messaging system)
    console.log(`[Admin Users] Message to user ${id}: ${message}`);
    
    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('[Admin Users] Message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Promote user to admin (admin only)
app.post('/api/admin/users/:id/promote', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Update user role to Admin
    await db.query('UPDATE users SET role = ? WHERE id = ?', ['Admin', id]);
    
    res.json({ message: 'User promoted to admin successfully' });
  } catch (error) {
    console.error('[Admin Users] Promote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle beta access for user (admin only)
app.post('/api/admin/users/:id/beta-access', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { betaAccess } = req.body;
    
    // Check if user is admin
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get current beta access status
    const userCheck = await db.query('SELECT betaaccess FROM users WHERE id = ?', [id]);
    if (!userCheck.rows || userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBetaAccess = userCheck.rows[0].betaaccess;
    const newBetaAccess = betaAccess !== undefined ? betaAccess : !currentBetaAccess;

    // Update beta access with boolean value (PostgreSQL native type)
    console.log('[Beta Access POST] Updating user', id, 'to betaAccess:', newBetaAccess);
    const updateResult = await db.query('UPDATE users SET betaaccess = ? WHERE id = ?', 
      [newBetaAccess, parseInt(id)]
    );
    console.log('[Beta Access POST] Update result rowCount:', updateResult.rowCount);

    // Verify the update
    const verifyResult = await db.query('SELECT betaaccess FROM users WHERE id = ?', [parseInt(id)]);
    const savedValue = verifyResult.rows?.[0]?.betaaccess;
    console.log('[Beta Access POST] Verified saved value:', savedValue, 'Type:', typeof savedValue);
    
    res.json({ 
      message: newBetaAccess ? 'Beta access granted' : 'Beta access revoked',
      betaAccess: newBetaAccess
    });
  } catch (error) {
    console.error('[Beta Access POST] Toggle error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update beta access for user (admin only) - PATCH handler
app.patch('/api/admin/users/:id/beta-access', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { betaAccess } = req.body;
    
    console.log('[Beta Access PATCH] Request - ID:', id, 'BetaAccess:', betaAccess, 'Type:', typeof betaAccess);
    
    // Check if user is admin
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get current beta access status
    const userCheck = await db.query('SELECT betaaccess FROM users WHERE id = ?', [id]);
    if (!userCheck.rows || userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBetaAccess = userCheck.rows[0].betaaccess;
    const newBetaAccess = betaAccess !== undefined ? betaAccess : !currentBetaAccess;

    console.log('[Beta Access PATCH] Current:', currentBetaAccess, 'Type:', typeof currentBetaAccess, 'New:', newBetaAccess);

    // Update beta access with boolean value (PostgreSQL native type)
    const updateResult = await db.query('UPDATE users SET betaaccess = ? WHERE id = ?', 
      [newBetaAccess, parseInt(id)]
    );
    
    console.log('[Beta Access PATCH] Update result:', updateResult, 'rowCount:', updateResult.rowCount);
    if (!updateResult.rowCount || updateResult.rowCount === 0) {
      console.warn('[Beta Access PATCH] WARNING: UPDATE did not affect any rows!');
    }

    // Verify the update by reading back
    const verifyResult = await db.query('SELECT betaaccess FROM users WHERE id = ?', [parseInt(id)]);
    const actualNewValue = verifyResult.rows?.[0]?.betaaccess;
    
    console.log('[Beta Access PATCH] Verified value in DB:', actualNewValue, 'Type:', typeof actualNewValue);
    console.log('[Beta Access PATCH] Full verified row:', verifyResult.rows?.[0]);
    
    // Return the actual value from database (should be boolean for PostgreSQL)
    const boolValue = Boolean(actualNewValue);
    
    res.json({ 
      message: boolValue ? 'Beta access granted' : 'Beta access revoked',
      betaAccess: boolValue,
      debug: { savedValue: actualNewValue, returnedValue: boolValue }
    });
  } catch (error) {
    console.error('[Beta Access PATCH] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Create new league (admin only)
app.post('/api/leagues', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if league name already exists
    const existingLeague = await db.query('SELECT id FROM leagues WHERE name = ?', [name]);
    if (existingLeague.rows && existingLeague.rows.length > 0) {
      return res.status(400).json({ error: 'League name already exists' });
    }

    // Create league
    const leagueResult = await db.query(
      'INSERT INTO leagues (name, description, createdBy) VALUES (?, ?, ?) RETURNING *',
      [name, description || '', req.user.id]
    );

    res.status(201).json({
      message: 'League created successfully',
      league: leagueResult.rows[0]
    });
  } catch (error) {
    console.error('Create league error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update league (admin only)
app.put('/api/leagues/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if league exists
    const existingLeague = await db.query('SELECT id FROM leagues WHERE id = ?', [id]);
    if (!existingLeague.rows || existingLeague.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if new name conflicts with existing league (excluding current league)
    if (name) {
      const nameConflict = await db.query('SELECT id FROM leagues WHERE name = ? AND id != ?', [name, id]);
      if (nameConflict.rows && nameConflict.rows.length > 0) {
        return res.status(400).json({ error: 'League name already exists' });
      }
    }

    // Update league
    await db.query(
      'UPDATE leagues SET name = ?, description = ? WHERE id = ?',
      [name, description || '', id]
    );

    res.json({ message: 'League updated successfully' });
  } catch (error) {
    console.error('Update league error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete league (admin only)
app.delete('/api/leagues/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if league exists
    const existingLeague = await db.query('SELECT id FROM leagues WHERE id = ?', [id]);
    if (!existingLeague.rows || existingLeague.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Soft delete - mark as inactive instead of actual delete to preserve data integrity
    await db.query('UPDATE leagues SET isActive = false WHERE id = ?', [id]);

    res.json({ message: 'League deleted successfully' });
  } catch (error) {
    console.error('Delete league error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics API endpoints (admin only)

// Get dashboard analytics overview
app.get('/api/analytics/overview', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get total counts
    const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const totalTeams = await db.query('SELECT COUNT(*) as count FROM team_vacancies');
    const totalPlayers = await db.query('SELECT COUNT(*) as count FROM player_availability');
    const totalMatches = await db.query("SELECT COUNT(*) as count FROM match_completions WHERE completionstatus = 'confirmed'");

    // Get today's stats
    const todayUsers = await db.query('SELECT COUNT(*) as count FROM users WHERE DATE(createdat) = ?', [today]);
    const todayTeams = await db.query('SELECT COUNT(*) as count FROM team_vacancies WHERE DATE(createdat) = ?', [today]);
    const todayPlayers = await db.query('SELECT COUNT(*) as count FROM player_availability WHERE DATE(createdat) = ?', [today]);

    // Get active sessions (last 15 minutes)
    const last15Minutes = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const activeSessions = await db.query(
      'SELECT COUNT(DISTINCT sessionid) as count FROM user_sessions WHERE lastactivity > ?',
      [last15Minutes]
    );

    // Get page views today
    const todayPageViews = await db.query(
      'SELECT COUNT(*) as count FROM page_views WHERE DATE(timestamp) = ?', [today]
    );

    // Get unique visitors today
    const todayUniqueVisitors = await db.query(
      'SELECT COUNT(DISTINCT sessionid) as count FROM page_views WHERE DATE(timestamp) = ?', [today]
    );

    // Get user types breakdown
    const roleBreakdown = await db.query(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );

    // Get popular pages (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const popularPages = await db.query(
      `SELECT page, COUNT(*) as views FROM page_views 
       WHERE DATE(timestamp) >= ? 
       GROUP BY page 
       ORDER BY views DESC 
       LIMIT 10`,
      [sevenDaysAgo]
    );

    res.json({
      overview: {
        totalUsers: totalUsers.rows[0]?.count || 0,
        totalTeams: totalTeams.rows[0]?.count || 0,
        totalPlayers: totalPlayers.rows[0]?.count || 0,
        totalMatches: totalMatches.rows[0]?.count || 0,
        todayUsers: todayUsers.rows[0]?.count || 0,
        todayTeams: todayTeams.rows[0]?.count || 0,
        todayPlayers: todayPlayers.rows[0]?.count || 0,
        activeSessions: activeSessions.rows[0]?.count || 0,
        todayPageViews: todayPageViews.rows[0]?.count || 0,
        todayUniqueVisitors: todayUniqueVisitors.rows[0]?.count || 0
      },
      roleBreakdown: roleBreakdown.rows || [],
      popularPages: popularPages.rows || []
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get daily stats for charts
app.get('/api/analytics/daily-stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get daily user registrations
    const dailyUsers = await db.query(
      `SELECT DATE(createdat) as date, COUNT(*) as count 
       FROM users 
       WHERE DATE(createdat) >= ? 
       GROUP BY DATE(createdat) 
       ORDER BY date`,
      [startDate]
    );

    // Get daily page views and unique visitors
    const dailyPageViews = await db.query(
      `SELECT DATE(timestamp) as date, 
              COUNT(*) as page_views,
              COUNT(DISTINCT sessionId) as unique_visitors
       FROM page_views 
       WHERE DATE(timestamp) >= ? 
       GROUP BY DATE(timestamp) 
       ORDER BY date`,
      [startDate]
    );

    // Get daily team creations
    const dailyTeams = await db.query(
      `SELECT DATE(createdat) as date, COUNT(*) as count 
       FROM team_vacancies 
       WHERE DATE(createdat) >= ? 
       GROUP BY DATE(createdat) 
       ORDER BY date`,
      [startDate]
    );

    // Get daily player availability posts
    const dailyPlayers = await db.query(
      `SELECT DATE(createdat) as date, COUNT(*) as count 
       FROM player_availability 
       WHERE DATE(createdat) >= ? 
       GROUP BY DATE(createdat) 
       ORDER BY date`,
      [startDate]
    );

    // Get daily match completions
    const dailyMatches = await db.query(
      `SELECT DATE(completedat) as date, COUNT(*) as count 
       FROM match_completions 
       WHERE DATE(completedat) >= ? AND completionstatus = 'confirmed'
       GROUP BY DATE(completedat) 
       ORDER BY date`,
      [startDate]
    );

    res.json({
      dailyUsers: dailyUsers.rows,
      dailyPageViews: dailyPageViews.rows,
      dailyTeams: dailyTeams.rows,
      dailyPlayers: dailyPlayers.rows,
      dailyMatches: dailyMatches.rows
    });
  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user activity analytics
app.get('/api/analytics/user-activity', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get most active users (by page views in last 30 days)
    const activeUsers = await db.query(
      `SELECT u.firstName, u.lastName, u.email, u.role, COUNT(pv.id) as page_views
       FROM users u
       LEFT JOIN page_views pv ON u.id = pv.userId
       WHERE pv.timestamp > datetime('now', '-30 days')
       GROUP BY u.id
       ORDER BY page_views DESC
       LIMIT 20`
    );

    // Get user registration trends by type
    const registrationTrends = await db.query(
      `SELECT DATE(createdAt) as date, role, COUNT(*) as count
       FROM users 
       WHERE DATE(createdAt) >= date('now', '-30 days')
       GROUP BY DATE(createdAt), role
       ORDER BY date, role`
    );

    // Get session duration stats
    const sessionStats = await db.query(
      `SELECT 
         AVG((julianday(lastActivity) - julianday(startTime)) * 24 * 60) as avg_session_minutes,
         COUNT(*) as total_sessions,
         COUNT(DISTINCT userId) as unique_users
       FROM user_sessions 
       WHERE startTime > datetime('now', '-7 days')`
    );

    res.json({
      activeUsers: activeUsers.rows,
      registrationTrends: registrationTrends.rows,
      sessionStats: sessionStats.rows[0]
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get site stats for performance analytics dashboard
app.get('/api/analytics/site-stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get total visits (all page views, excluding admin users)
    const totalVisits = await db.query(
      `SELECT COUNT(*) as count FROM page_views pv
       LEFT JOIN users u ON pv.userId = u.id
       WHERE u.id IS NULL OR u.role != 'Admin'`
    );
    
    // Get unique visitors (distinct session IDs, excluding admin users)
    const uniqueVisitors = await db.query(
      `SELECT COUNT(DISTINCT pv.sessionId) as count FROM page_views pv
       LEFT JOIN users u ON pv.userId = u.id
       WHERE u.id IS NULL OR u.role != 'Admin'`
    );
    
    // Get new users (registered in last 30 days, excluding admins)
    const newUsers = await db.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE createdAt >= datetime("now", "-30 days")
       AND (role IS NULL OR role != 'Admin')`
    );
    
    // Get searches performed (from analytics_events if available, otherwise estimate, excluding admins)
    let searchesPerformed = { rows: [{ count: 0 }] };
    try {
      searchesPerformed = await db.query(
        `SELECT COUNT(*) as count FROM analytics_events ae
         LEFT JOIN users u ON ae.user_id = u.id
         WHERE (event = 'search' OR action LIKE '%search%')
         AND (u.id IS NULL OR u.role != 'Admin')`
      );
    } catch (err) {
      // If analytics_events table doesn't exist, use page_views as estimate
      searchesPerformed = await db.query(
        `SELECT COUNT(*) as count FROM page_views pv
         LEFT JOIN users u ON pv.userId = u.id
         WHERE (page LIKE '%search%' OR page LIKE '%explore%')
         AND (u.id IS NULL OR u.role != 'Admin')`
      );
    }
    
    // Get successful matches (confirmed match completions)
    const successfulMatches = await db.query(
      'SELECT COUNT(*) as count FROM match_completions WHERE completionStatus = "confirmed"'
    );
    
    // Get active listings (team vacancies + player availability)
    const activeTeamVacancies = await db.query('SELECT COUNT(*) as count FROM team_vacancies');
    const activePlayerListings = await db.query('SELECT COUNT(*) as count FROM player_availability');
    const activeListings = activeTeamVacancies.rows[0].count + activePlayerListings.rows[0].count;

    res.json({
      totalVisits: totalVisits.rows[0].count,
      uniqueVisitors: uniqueVisitors.rows[0].count,
      newUsers: newUsers.rows[0].count,
      searchesPerformed: searchesPerformed.rows[0].count,
      successfulMatches: successfulMatches.rows[0].count,
      activeListings: activeListings
    });
  } catch (error) {
    console.error('Get site stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get weekly traffic data for performance analytics
app.get('/api/analytics/weekly-traffic', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get last 7 days of traffic data (excluding admin users)
    const trafficData = await db.query(
      `SELECT 
         CASE CAST(strftime('%w', DATE(timestamp)) AS INTEGER)
           WHEN 0 THEN 'Sun'
           WHEN 1 THEN 'Mon'
           WHEN 2 THEN 'Tue'
           WHEN 3 THEN 'Wed'
           WHEN 4 THEN 'Thu'
           WHEN 5 THEN 'Fri'
           WHEN 6 THEN 'Sat'
         END as date,
         COUNT(*) as visits,
         COUNT(DISTINCT pv.sessionId) as uniqueUsers
       FROM page_views pv
       LEFT JOIN users u ON pv.userId = u.id
       WHERE DATE(timestamp) >= date('now', '-7 days')
       AND (u.id IS NULL OR u.role != 'Admin')
       GROUP BY DATE(timestamp)
       ORDER BY DATE(timestamp)`
    );

    res.json(trafficData.rows);
  } catch (error) {
    console.error('Get weekly traffic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly matches data for performance analytics
app.get('/api/analytics/monthly-matches', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get last 6 months of successful matches
    const matchData = await db.query(
      `SELECT 
         CASE CAST(strftime('%m', DATE(completedAt)) AS INTEGER)
           WHEN 1 THEN 'Jan'
           WHEN 2 THEN 'Feb'
           WHEN 3 THEN 'Mar'
           WHEN 4 THEN 'Apr'
           WHEN 5 THEN 'May'
           WHEN 6 THEN 'Jun'
           WHEN 7 THEN 'Jul'
           WHEN 8 THEN 'Aug'
           WHEN 9 THEN 'Sep'
           WHEN 10 THEN 'Oct'
           WHEN 11 THEN 'Nov'
           WHEN 12 THEN 'Dec'
         END as month,
         COUNT(*) as matches
       FROM match_completions
       WHERE completionStatus = 'confirmed' 
         AND DATE(completedAt) >= date('now', '-6 months')
       GROUP BY strftime('%Y-%m', DATE(completedAt))
       ORDER BY DATE(completedAt)`
    );

    res.json(matchData.rows);
  } catch (error) {
    console.error('Get monthly matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI-powered analytics insights
app.post('/api/analytics/insights', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const insights = [];

    // Insight 1: User engagement trend
    const sessionStats = await db.query(
      `SELECT 
         AVG((julianday(lastActivity) - julianday(startTime)) * 24 * 60) as avg_minutes,
         COUNT(*) as total_sessions
       FROM user_sessions 
       WHERE startTime > datetime('now', '-7 days')`
    );

    const prevWeekSessions = await db.query(
      `SELECT 
         AVG((julianday(lastActivity) - julianday(startTime)) * 24 * 60) as avg_minutes
       FROM user_sessions 
       WHERE startTime BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days')`
    );

    if (sessionStats.rows[0] && prevWeekSessions.rows[0]) {
      const currentAvg = sessionStats.rows[0].avg_minutes || 0;
      const prevAvg = prevWeekSessions.rows[0].avg_minutes || 0;
      const change = prevAvg > 0 ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0;

      if (Math.abs(change) > 10) {
        insights.push({
          id: 'insight_engagement_' + Date.now(),
          type: change > 0 ? 'trend' : 'warning',
          title: change > 0 ? 'Increasing User Engagement' : 'Declining User Engagement',
          description: `User session duration has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(0)}% over the past week (${currentAvg.toFixed(0)} mins vs ${prevAvg.toFixed(0)} mins).`,
          confidence: 85,
          impact: 'high',
          category: 'User Behavior',
          actionable: true,
          timestamp: Date.now()
        });
      }
    }

    // Insight 2: New user registrations trend
    const newUsersThisWeek = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE createdAt >= datetime('now', '-7 days')`
    );
    const newUsersLastWeek = await db.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE createdAt BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days')`
    );

    if (newUsersThisWeek.rows[0] && newUsersLastWeek.rows[0]) {
      const thisWeek = newUsersThisWeek.rows[0].count;
      const lastWeek = newUsersLastWeek.rows[0].count;
      const change = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

      if (Math.abs(change) > 20) {
        insights.push({
          id: 'insight_registrations_' + Date.now(),
          type: 'trend',
          title: change > 0 ? 'Registration Growth' : 'Registration Slowdown',
          description: `New user registrations ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(0)}% this week (${thisWeek} vs ${lastWeek} users).`,
          confidence: 92,
          impact: 'high',
          category: 'Growth',
          actionable: true,
          timestamp: Date.now()
        });
      }
    }

    // Insight 3: Match completion success rate
    const totalMatches = await db.query('SELECT COUNT(*) as count FROM match_completions');
    const confirmedMatches = await db.query(
      'SELECT COUNT(*) as count FROM match_completions WHERE completionStatus = "confirmed"'
    );

    if (totalMatches.rows[0] && confirmedMatches.rows[0]) {
      const successRate = (confirmedMatches.rows[0].count / totalMatches.rows[0].count) * 100;
      
      insights.push({
        id: 'insight_matches_' + Date.now(),
        type: 'recommendation',
        title: 'Match Success Rate',
        description: `${successRate.toFixed(0)}% of match attempts are successfully confirmed. ${successRate < 60 ? 'Consider improving match quality or follow-up process.' : 'Strong match quality indicates good platform fit.'}`,
        confidence: 88,
        impact: successRate < 60 ? 'high' : 'medium',
        category: 'Product',
        actionable: successRate < 60,
        timestamp: Date.now()
      });
    }

    // Insight 4: Active listings trend
    const activeVacancies = await db.query('SELECT COUNT(*) as count FROM team_vacancies');
    const activeAvailability = await db.query('SELECT COUNT(*) as count FROM player_availability');
    
    const totalListings = activeVacancies.rows[0].count + activeAvailability.rows[0].count;
    
    if (totalListings > 0) {
      const ratio = activeVacancies.rows[0].count / activeAvailability.rows[0].count;
      
      if (ratio > 2 || ratio < 0.5) {
        insights.push({
          id: 'insight_balance_' + Date.now(),
          type: 'anomaly',
          title: 'Supply/Demand Imbalance',
          description: `There are ${activeVacancies.rows[0].count} team vacancies vs ${activeAvailability.rows[0].count} player listings. ${ratio > 2 ? 'More teams seeking players.' : 'More players seeking teams.'}`,
          confidence: 90,
          impact: 'medium',
          category: 'Marketplace',
          actionable: true,
          timestamp: Date.now()
        });
      }
    }

    // Insight 5: Peak traffic times
    const peakHours = await db.query(
      `SELECT strftime('%H', timestamp) as hour, COUNT(*) as visits
       FROM page_views
       WHERE DATE(timestamp) >= date('now', '-7 days')
       GROUP BY hour
       ORDER BY visits DESC
       LIMIT 3`
    );

    if (peakHours.rows && peakHours.rows.length > 0) {
      const topHours = peakHours.rows.map(r => `${r.hour}:00`).join(', ');
      insights.push({
        id: 'insight_traffic_' + Date.now(),
        type: 'recommendation',
        title: 'Peak Traffic Hours',
        description: `Highest traffic occurs at ${topHours}. Consider scheduling important updates or communications outside these hours to minimize disruption.`,
        confidence: 85,
        impact: 'low',
        category: 'Traffic',
        actionable: true,
        timestamp: Date.now()
      });
    }

    res.json(insights);
  } catch (error) {
    console.error('Get analytics insights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversion funnel analysis
app.post('/api/analytics/funnel', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Calculate funnel metrics based on actual user journey
    const totalVisitors = await db.query(
      'SELECT COUNT(DISTINCT sessionId) as count FROM page_views WHERE DATE(timestamp) >= date("now", "-30 days")'
    );

    const registeredUsers = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE DATE(createdAt) >= date("now", "-30 days")'
    );

    const profilesCompleted = await db.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE DATE(createdAt) >= date("now", "-30 days")
       AND (firstName IS NOT NULL AND firstName != '')`
    );

    const firstActionUsers = await db.query(
      `SELECT COUNT(DISTINCT userId) as count FROM page_views 
       WHERE userId IS NOT NULL 
       AND DATE(timestamp) >= date("now", "-30 days")
       AND page NOT IN ('/login', '/register', '/dashboard')`
    );

    const returningUsers = await db.query(
      `SELECT COUNT(DISTINCT userId) as count FROM user_sessions
       WHERE userId IS NOT NULL
       AND startTime >= datetime("now", "-30 days")
       GROUP BY userId
       HAVING COUNT(*) > 1`
    );

    const visitors = totalVisitors.rows[0].count || 1;
    const registered = registeredUsers.rows[0].count || 0;
    const profiles = profilesCompleted.rows[0].count || 0;
    const firstAction = firstActionUsers.rows[0].count || 0;
    const returning = returningUsers.rows.length || 0;

    const funnelData = [
      { 
        name: 'Landing Page', 
        users: visitors, 
        conversionRate: 100, 
        dropoffRate: 0 
      },
      { 
        name: 'Registration', 
        users: registered, 
        conversionRate: ((registered / visitors) * 100).toFixed(1), 
        dropoffRate: (((visitors - registered) / visitors) * 100).toFixed(1)
      },
      { 
        name: 'Profile Setup', 
        users: profiles, 
        conversionRate: registered > 0 ? ((profiles / registered) * 100).toFixed(1) : 0, 
        dropoffRate: registered > 0 ? (((registered - profiles) / registered) * 100).toFixed(1) : 0
      },
      { 
        name: 'First Action', 
        users: firstAction, 
        conversionRate: profiles > 0 ? ((firstAction / profiles) * 100).toFixed(1) : 0, 
        dropoffRate: profiles > 0 ? (((profiles - firstAction) / profiles) * 100).toFixed(1) : 0
      },
      { 
        name: 'Return Visit', 
        users: returning, 
        conversionRate: firstAction > 0 ? ((returning / firstAction) * 100).toFixed(1) : 0, 
        dropoffRate: firstAction > 0 ? (((firstAction - returning) / firstAction) * 100).toFixed(1) : 0
      }
    ];

    res.json(funnelData);
  } catch (error) {
    console.error('Get funnel analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cohort retention analysis
app.post('/api/analytics/cohort', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Calculate weekly cohort retention
    const cohorts = [];
    
    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      const cohortStart = await db.query(
        `SELECT COUNT(*) as size FROM users 
         WHERE DATE(createdAt) BETWEEN date('now', '-${(weekOffset + 1) * 7} days') AND date('now', '-${weekOffset * 7} days')`
      );

      const cohortSize = cohortStart.rows[0].size;
      if (cohortSize === 0) continue;

      const retention = [100]; // Week 0 is always 100%

      // Calculate retention for each subsequent week
      for (let retentionWeek = 1; retentionWeek <= 7; retentionWeek++) {
        const activeUsers = await db.query(
          `SELECT COUNT(DISTINCT us.userId) as count
           FROM user_sessions us
           JOIN users u ON us.userId = u.id
           WHERE DATE(u.createdAt) BETWEEN date('now', '-${(weekOffset + 1) * 7} days') AND date('now', '-${weekOffset * 7} days')
           AND DATE(us.startTime) BETWEEN date('now', '-${weekOffset * 7 + retentionWeek * 7} days') AND date('now', '-${weekOffset * 7 + (retentionWeek - 1) * 7} days')`
        );

        const retentionRate = cohortSize > 0 ? Math.round((activeUsers.rows[0].count / cohortSize) * 100) : 0;
        retention.push(retentionRate);
      }

      cohorts.push({
        cohort: `Week ${weekOffset + 1}`,
        size: cohortSize,
        retention: retention
      });
    }

    res.json(cohorts.reverse()); // Most recent first
  } catch (error) {
    console.error('Get cohort analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user segmentation analysis
app.post('/api/analytics/segments', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const segments = [];

    // Power Users: 5+ sessions, avg session > 5 minutes
    const powerUsers = await db.query(
      `SELECT 
         COUNT(DISTINCT userId) as size,
         AVG((julianday(lastActivity) - julianday(startTime)) * 24 * 60) as avg_minutes
       FROM user_sessions
       WHERE userId IS NOT NULL
       GROUP BY userId
       HAVING COUNT(*) >= 5 AND avg_minutes > 5`
    );

    const powerUserCount = powerUsers.rows.length;
    const powerUserAvgSession = powerUsers.rows.length > 0 
      ? powerUsers.rows.reduce((sum, r) => sum + (r.avg_minutes || 0), 0) / powerUsers.rows.length 
      : 0;

    segments.push({
      name: 'Power Users',
      size: powerUserCount,
      characteristics: ['High activity', 'Long sessions', 'Feature adopters'],
      conversionRate: 85,
      avgSessionDuration: Math.round(powerUserAvgSession),
      topPages: ['/dashboard', '/search', '/teams']
    });

    // Casual Users: 2-4 sessions, moderate engagement
    const casualUsers = await db.query(
      `SELECT 
         COUNT(DISTINCT userId) as size,
         AVG((julianday(lastActivity) - julianday(startTime)) * 24 * 60) as avg_minutes
       FROM user_sessions
       WHERE userId IS NOT NULL
       GROUP BY userId
       HAVING COUNT(*) BETWEEN 2 AND 4`
    );

    const casualUserCount = casualUsers.rows.length;
    const casualUserAvgSession = casualUsers.rows.length > 0 
      ? casualUsers.rows.reduce((sum, r) => sum + (r.avg_minutes || 0), 0) / casualUsers.rows.length 
      : 0;

    segments.push({
      name: 'Casual Users',
      size: casualUserCount,
      characteristics: ['Moderate activity', 'Browse-focused', 'Mobile-first'],
      conversionRate: 45,
      avgSessionDuration: Math.round(casualUserAvgSession),
      topPages: ['/search', '/teams', '/players']
    });

    // New Users: Registered in last 7 days, 1 session or less
    const newUsers = await db.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE createdAt >= datetime('now', '-7 days')`
    );

    segments.push({
      name: 'New Users',
      size: newUsers.rows[0].count,
      characteristics: ['First-time visitors', 'Exploration phase', 'High bounce risk'],
      conversionRate: 25,
      avgSessionDuration: 90,
      topPages: ['/home', '/about', '/register']
    });

    res.json(segments);
  } catch (error) {
    console.error('Get user segmentation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calendar Events Endpoints

// Get calendar events for a user
app.get('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, eventType } = req.query;
    
    let query = `
      SELECT ce.*, u.firstName, u.lastName, u.email as creatorEmail,
             (SELECT COUNT(*) FROM event_participants WHERE eventId = ce.id) as participantCount
      FROM calendar_events ce
      JOIN users u ON ce.createdBy = u.id
      WHERE (ce.createdBy = ? OR ce.id IN (
        SELECT eventId FROM event_participants WHERE userId = ?
      ) OR ce.id IN (
        SELECT eventId FROM trial_invitations WHERE playerId = ?
      ))
    `;
    
    const queryParams = [req.user.userId, req.user.userId, req.user.userId];
    
    if (startDate && endDate) {
      query += ' AND ce.date BETWEEN ? AND ?';
      queryParams.push(startDate, endDate);
    }
    
    if (eventType) {
      query += ' AND ce.eventType = ?';
      queryParams.push(eventType);
    }
    
    query += ' ORDER BY ce.date ASC, ce.startTime ASC';
    
    const events = await db.query(query, queryParams);
    res.json({ events: events.rows || [] });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set up recurring training schedule (creates calendar events for the season)
app.post('/api/calendar/training-schedule', [
  authenticateToken,
  body('teamName').notEmpty().withMessage('Team name is required'),
  body('dayOfWeek').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).withMessage('Valid day is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('weeksAhead').isInt({ min: 1, max: 52 }).withMessage('Weeks ahead must be between 1 and 52')
], async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can set up training schedules' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamName, dayOfWeek, startTime, endTime, location, weeksAhead, description, latitude, longitude, locationData, hasVacancies } = req.body;

    // Calculate dates for the next X weeks on the specified day
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = daysOfWeek.indexOf(dayOfWeek);
    const today = new Date();
    const trainingDates = [];

    for (let week = 0; week < weeksAhead; week++) {
      const date = new Date(today);
      date.setDate(today.getDate() + (targetDay - today.getDay() + 7) % 7 + (week * 7));
      
      // Only add future dates
      if (date > today) {
        trainingDates.push(date.toISOString().split('T')[0]);
      }
    }

    // Create calendar events for each training session
    let createdCount = 0;
    for (const date of trainingDates) {
      try {
        const result = await db.query(
          `INSERT INTO calendar_events 
           (title, description, eventType, date, startTime, endTime, location, createdBy, isRecurring, latitude, longitude, locationData, teamName, hasVacancies) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `${teamName} Training`,
            description || `Regular training session for ${teamName}`,
            'training',
            date,
            startTime,
            endTime,
            location,
            req.user.userId,
            true,
            latitude || null,
            longitude || null,
            locationData ? JSON.stringify(locationData) : null,
            teamName,
            hasVacancies === true || hasVacancies === 1 ? 1 : 0
          ]
        );

        // Add creator as organizer
        await db.query(
          'INSERT INTO event_participants (eventId, userId, role) VALUES (?, ?, ?)',
          [result.lastID, req.user.userId, 'organizer']
        );

        createdCount++;
      } catch (err) {
        console.error(`Error creating event for ${date}:`, err);
      }
    }

    res.status(201).json({
      message: `Training schedule created: ${createdCount} sessions added`,
      eventsCreated: createdCount,
      schedule: {
        teamName,
        dayOfWeek,
        startTime,
        endTime,
        location
      }
    });
  } catch (error) {
    console.error('Create training schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create calendar event
app.post('/api/calendar/events', [
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required'),
  body('eventType').isIn(['training', 'match', 'trial', 'open_trial']).withMessage('Valid event type is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      eventType,
      date,
      startTime,
      endTime,
      location,
      teamId,
      isRecurring,
      recurringPattern,
      maxParticipants,
      latitude,
      longitude,
      locationData,
      teamName,
      hasVacancies
    } = req.body;

    const result = await db.query(
      `INSERT INTO calendar_events 
       (title, description, eventType, date, startTime, endTime, location, 
        createdBy, teamId, isRecurring, recurringPattern, maxParticipants, 
        latitude, longitude, locationData, teamName, hasVacancies) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, eventType, date, startTime, endTime, location,
       req.user.userId, teamId, isRecurring || false, recurringPattern, maxParticipants,
       latitude || null, longitude || null, locationData ? JSON.stringify(locationData) : null,
       teamName, hasVacancies === true || hasVacancies === 1 ? 1 : 0]
    );

    const eventId = result.lastID;
    
    // Add creator as organizer participant
    await db.query(
      'INSERT INTO event_participants (eventId, userId, role) VALUES (?, ?, ?)',
      [eventId, req.user.userId, 'organizer']
    );

    res.status(201).json({
      message: 'Calendar event created successfully',
      eventId,
      event: {
        id: eventId,
        title,
        description,
        eventType,
        date,
        startTime,
        endTime,
        location,
        createdBy: req.user.userId,
        teamId,
        isRecurring: isRecurring || false,
        recurringPattern,
        maxParticipants,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update calendar event
app.put('/api/calendar/events/:eventId', [
  authenticateToken,
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('eventType').optional().isIn(['training', 'match', 'trial', 'open_trial']).withMessage('Valid event type is required')
], async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists and user is creator
    const eventResult = await db.query(
      'SELECT * FROM calendar_events WHERE id = ?',
      [eventId]
    );

    if (!eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventResult.rows[0].createdBy !== req.user.userId) {
      return res.status(403).json({ error: 'Only event creator can update this event' });
    }

    const updateFields = [];
    const updateValues = [];
    
    ['title', 'description', 'eventType', 'date', 'startTime', 'endTime', 
     'location', 'maxParticipants', 'status'].forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(req.body[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(eventId);

    await db.query(
      `UPDATE calendar_events SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete calendar event
app.delete('/api/calendar/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists and user is creator
    const eventResult = await db.query(
      'SELECT * FROM calendar_events WHERE id = ?',
      [eventId]
    );

    if (!eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventResult.rows[0].createdBy !== req.user.userId) {
      return res.status(403).json({ error: 'Only event creator can delete this event' });
    }

    await db.query('DELETE FROM calendar_events WHERE id = ?', [eventId]);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get nearby training locations with vacancies (for map view)
app.get('/api/calendar/training-locations', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, radius, hasVacancies } = req.query;
    
    // Get all training events with coordinates
    let query = `
      SELECT ce.*, u.firstName, u.lastName, u.email as contactEmail,
             (SELECT COUNT(*) FROM event_participants WHERE eventId = ce.id) as participantCount
      FROM calendar_events ce
      JOIN users u ON ce.createdBy = u.id
      WHERE ce.eventType = 'training' 
        AND ce.latitude IS NOT NULL 
        AND ce.longitude IS NOT NULL
        AND ce.date >= date('now')
    `;
    
    const queryParams = [];
    
    // Filter by vacancy status if requested
    if (hasVacancies === 'true') {
      query += ' AND ce.hasVacancies = 1';
    }
    
    query += ' ORDER BY ce.date ASC, ce.startTime ASC';
    
    const events = await db.query(query, queryParams);
    
    // If location provided, calculate distances and filter by radius
    if (latitude && longitude && events.rows) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      const maxRadius = radius ? parseFloat(radius) : 50; // Default 50km radius
      
      // Calculate distance for each event using Haversine formula
      const eventsWithDistance = events.rows.map(event => {
        const eventLat = event.latitude;
        const eventLon = event.longitude;
        
        // Haversine formula to calculate distance in km
        const R = 6371; // Earth's radius in km
        const dLat = (eventLat - userLat) * Math.PI / 180;
        const dLon = (eventLon - userLon) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLat * Math.PI / 180) * Math.cos(eventLat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return {
          ...event,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          locationData: event.locationData ? JSON.parse(event.locationData) : null
        };
      })
      .filter(event => event.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance);
      
      res.json({ 
        trainingLocations: eventsWithDistance,
        userLocation: { latitude: userLat, longitude: userLon },
        radius: maxRadius
      });
    } else {
      // Return all events without distance calculation
      res.json({ 
        trainingLocations: events.rows.map(event => ({
          ...event,
          locationData: event.locationData ? JSON.parse(event.locationData) : null
        }))
      });
    }
  } catch (error) {
    console.error('Get training locations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite player to trial
app.post('/api/calendar/events/:eventId/invite', [
  authenticateToken,
  body('playerId').isInt().withMessage('Valid player ID is required'),
  body('message').optional()
], async (req, res) => {
  try {
    const { eventId } = req.params;
    const { playerId, message } = req.body;
    
    // Verify event exists and is a trial
    const eventResult = await db.query(
      'SELECT ce.*, u.firstName, u.lastName FROM calendar_events ce JOIN users u ON ce.createdBy = u.id WHERE ce.id = ? AND ce.eventType IN (?, ?)',
      [eventId, 'trial', 'open_trial']
    );

    if (!eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trial event not found' });
    }

    const event = eventResult.rows[0];

    if (event.createdBy !== req.user.userId) {
      return res.status(403).json({ error: 'Only event creator can invite players' });
    }

    // Check if invitation already exists
    const existingInvite = await db.query(
      'SELECT * FROM trial_invitations WHERE eventId = ? AND playerId = ?',
      [eventId, playerId]
    );

    if (existingInvite.rows && existingInvite.rows.length > 0) {
      return res.status(400).json({ error: 'Player already invited to this trial' });
    }

    // Create invitation
    await db.query(
      'INSERT INTO trial_invitations (eventId, playerId, invitedBy, message) VALUES (?, ?, ?, ?)',
      [eventId, playerId, req.user.userId, message]
    );

    // Create notification for player
    await db.query(
      `INSERT INTO notifications (userId, type, title, message, relatedId, relatedType) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        playerId,
        'trial_invitation',
        'Trial Invitation',
        `${event.firstName} ${event.lastName} has invited you to "${event.title}" on ${event.date}`,
        eventId,
        'trial'
      ]
    );

    res.status(201).json({ message: 'Player invited successfully' });
  } catch (error) {
    console.error('Invite player error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to trial invitation
app.put('/api/calendar/invitations/:invitationId/respond', [
  authenticateToken,
  body('status').isIn(['accepted', 'declined']).withMessage('Status must be accepted or declined')
], async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { status } = req.body;
    
    // Verify invitation exists and belongs to user
    const inviteResult = await db.query(
      `SELECT ti.*, ce.title, ce.date, u.firstName, u.lastName 
       FROM trial_invitations ti
       JOIN calendar_events ce ON ti.eventId = ce.id
       JOIN users u ON u.id = ?
       WHERE ti.id = ? AND ti.playerId = ?`,
      [req.user.userId, invitationId, req.user.userId]
    );

    if (!inviteResult.rows || inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = inviteResult.rows[0];

    await db.query(
      'UPDATE trial_invitations SET status = ?, responseDate = ? WHERE id = ?',
      [status, new Date().toISOString(), invitationId]
    );

    // If accepted, add to event participants
    if (status === 'accepted') {
      const eventId = invitation.eventId;
      await db.query(
        'INSERT OR IGNORE INTO event_participants (eventId, userId, role) VALUES (?, ?, ?)',
        [eventId, req.user.userId, 'participant']
      );
    }

    // Notify coach of response
    await db.query(
      `INSERT INTO notifications (userId, type, title, message, relatedId, relatedType) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        invitation.invitedBy,
        status === 'accepted' ? 'invitation_accepted' : 'invitation_declined',
        `Trial Invitation ${status === 'accepted' ? 'Accepted' : 'Declined'}`,
        `${invitation.firstName} ${invitation.lastName} has ${status} your invitation to "${invitation.title}"`,
        invitation.eventId,
        'trial'
      ]
    );

    res.json({ message: 'Response recorded successfully' });
  } catch (error) {
    console.error('Respond to invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trial invitations for user
app.get('/api/calendar/invitations', authenticateToken, async (req, res) => {
  try {
    const invitations = await db.query(
      `SELECT ti.*, ce.title, ce.date, ce.startTime, ce.endTime, ce.location,
              u.firstName as inviterFirstName, u.lastName as inviterLastName
       FROM trial_invitations ti
       JOIN calendar_events ce ON ti.eventId = ce.id
       JOIN users u ON ti.invitedBy = u.id
       WHERE ti.playerId = ?
       ORDER BY ce.date ASC`,
      [req.user.userId]
    );

    res.json({ invitations: invitations.rows || [] });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join/leave open event
app.post('/api/calendar/events/:eventId/join', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists
    const eventResult = await db.query(
      'SELECT * FROM calendar_events WHERE id = ?',
      [eventId]
    );

    if (!eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Check if event is full
    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Check if already joined
    const existingParticipant = await db.query(
      'SELECT * FROM event_participants WHERE eventId = ? AND userId = ?',
      [eventId, req.user.userId]
    );

    if (existingParticipant.rows && existingParticipant.rows.length > 0) {
      return res.status(400).json({ error: 'Already joined this event' });
    }

    await db.query(
      'INSERT INTO event_participants (eventId, userId, role) VALUES (?, ?, ?)',
      [eventId, req.user.userId, 'participant']
    );

    await db.query(
      'UPDATE calendar_events SET currentParticipants = currentParticipants + 1 WHERE id = ?',
      [eventId]
    );

    res.json({ message: 'Joined event successfully' });
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/calendar/events/:eventId/leave', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    await db.query(
      'DELETE FROM event_participants WHERE eventId = ? AND userId = ?',
      [eventId, req.user.userId]
    );

    await db.query(
      'UPDATE calendar_events SET currentParticipants = currentParticipants - 1 WHERE id = ? AND currentParticipants > 0',
      [eventId]
    );

    res.json({ message: 'Left event successfully' });
  } catch (error) {
    console.error('Leave event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to create recurring training events
async function createRecurringTrainingEvents(teamId, coachId, trainingDays, startTime, endTime, location, weeksAhead = 12) {
  try {
    const today = new Date();
    const daysOfWeek = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 
      'Friday': 5, 'Saturday': 6, 'Sunday': 0
    };

    for (const day of trainingDays) {
      const targetDay = daysOfWeek[day];
      
      // Find next occurrence of this day
      let currentDate = new Date(today);
      const currentDay = currentDate.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      currentDate.setDate(currentDate.getDate() + daysUntilTarget);

      // Create events for the next X weeks
      for (let week = 0; week < weeksAhead; week++) {
        const eventDate = new Date(currentDate);
        eventDate.setDate(eventDate.getDate() + (week * 7));
        
        const dateString = eventDate.toISOString().split('T')[0];
        
        await db.query(
          `INSERT INTO calendar_events 
           (title, description, eventType, date, startTime, endTime, location, 
            createdBy, teamId, isRecurring, recurringPattern, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `Training - ${day}`,
            'Regular team training session',
            'training',
            dateString,
            startTime,
            endTime,
            location,
            coachId,
            teamId,
            true,
            `Weekly on ${day}`,
            'scheduled'
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error creating recurring training events:', error);
    throw error;
  }
}

// Set up team training schedule
app.post('/api/team/training-schedule', [
  authenticateToken,
  body('trainingDays').isArray({ min: 1 }).withMessage('At least one training day required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can set training schedules' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId, trainingDays, startTime, endTime, location } = req.body;

    // Verify coach owns this team (if teamId provided)
    if (teamId) {
      const teamResult = await db.query(
        'SELECT * FROM team_rosters WHERE id = ? AND coachId = ?',
        [teamId, req.user.userId]
      );

      if (!teamResult.rows || teamResult.rows.length === 0) {
        return res.status(403).json({ error: 'Team not found or access denied' });
      }
    }

    // Delete existing future training events for this team/coach
    await db.query(
      `DELETE FROM calendar_events 
       WHERE createdBy = ? AND eventType = ? AND isRecurring = ? AND date >= ? ${teamId ? 'AND teamId = ?' : ''}`,
      teamId 
        ? [req.user.userId, 'training', true, new Date().toISOString().split('T')[0], teamId]
        : [req.user.userId, 'training', true, new Date().toISOString().split('T')[0]]
    );

    // Create new recurring training events
    await createRecurringTrainingEvents(
      teamId,
      req.user.userId,
      trainingDays,
      startTime,
      endTime,
      location
    );

    res.status(201).json({ 
      message: 'Training schedule created successfully',
      eventsCreated: trainingDays.length * 12 // days * weeks
    });
  } catch (error) {
    console.error('Set training schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invitation responses for a trial (coach view)
app.get('/api/calendar/events/:eventId/responses', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify user is the event creator
    const eventResult = await db.query(
      'SELECT * FROM calendar_events WHERE id = ? AND createdBy = ?',
      [eventId, req.user.userId]
    );

    if (!eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or access denied' });
    }

    const responses = await db.query(
      `SELECT ti.*, u.firstName, u.lastName, u.email, up.preferredPosition
       FROM trial_invitations ti
       JOIN users u ON ti.playerId = u.id
       LEFT JOIN user_profiles up ON u.id = up.userId
       WHERE ti.eventId = ?
       ORDER BY ti.status ASC, u.lastName ASC`,
      [eventId]
    );

    res.json({ responses: responses.rows || [] });
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Notification Endpoints

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    
    let query = 'SELECT * FROM notifications WHERE userId = ?';
    const params = [req.user.userId];
    
    if (unreadOnly === 'true') {
      query += ' AND isRead = ?';
      params.push(false);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT 50';
    
    const notifications = await db.query(query, params);
    
    res.json({ notifications: notifications.rows || [] });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await db.query(
      'UPDATE notifications SET isRead = ? WHERE id = ? AND userId = ?',
      [true, notificationId, req.user.userId]
    );
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET isRead = ? WHERE userId = ? AND isRead = ?',
      [true, req.user.userId, false]
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread notification count
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = ?',
      [req.user.userId, false]
    );
    
    res.json({ count: result.rows[0]?.count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Real-time analytics endpoints
app.get('/api/analytics/real-time/metrics', authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const range = req.query.range || '1h';
    const timeAgo = range === '1h' ? '-1 hours' : range === '24h' ? '-24 hours' : '-7 days';

    // Get active users (sessions in last time period)
    const activeUsers = await db.query(
      `SELECT COUNT(DISTINCT userid) as count FROM user_sessions 
       WHERE lastactivity > datetime('now', ?)`,
      [timeAgo]
    );

    // Get page views
    const pageViews = await db.query(
      `SELECT COUNT(*) as count FROM page_views 
       WHERE timestamp > datetime('now', ?)`,
      [timeAgo]
    );

    // Get new signups
    const newSignups = await db.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE createdat > datetime('now', ?)`,
      [timeAgo]
    );

    // Get error rate (estimate from failed requests - would need error logging table in production)
    const errorRate = 0.5; // Placeholder

    // Get API response time (would need performance tracking in production)
    const apiResponseTime = 85; // Placeholder

    res.json({
      activeUsers: activeUsers.rows[0]?.count || 0,
      pageViews: pageViews.rows[0]?.count || 0,
      conversionRate: 2.5, // Placeholder
      avgSessionDuration: 180, // Placeholder
      bounceRate: 25, // Placeholder
      errorRate: errorRate,
      apiResponseTime: apiResponseTime,
      newSignups: newSignups.rows[0]?.count || 0
    });
  } catch (error) {
    console.error('Get real-time metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/analytics/real-time/events', authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const limit = req.query.limit || 50;

    // Get recent page views
    const events = await db.query(
      `SELECT 
        id,
        page,
        userid,
        timestamp
       FROM page_views 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );

    const formattedEvents = (events.rows || []).map((event, index) => ({
      id: `event_${event.id}`,
      type: 'pageview',
      user: event.userid ? `User ${event.userid}` : 'Anonymous',
      action: `Visited ${event.page}`,
      timestamp: new Date(event.timestamp).getTime()
    }));

    res.json(formattedEvents);
  } catch (error) {
    console.error('Get real-time events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown (only in development)
if (process.env.NODE_ENV !== 'production') {
  process.on('SIGINT', () => {
    db.close((err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Database connection closed.');
      process.exit(0);
    });
  });
}

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Mount league requests router
app.use('/api/league-requests', leagueRequestsRouter);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Export the app for use in other servers (like railway-server.js)
module.exports = app;

// Start server (only if this file is run directly, not when required as a module)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} with postgresql database`);
  });
}
