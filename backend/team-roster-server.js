const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const expressValidator = require('express-validator');
const { body, validationResult } = expressValidator;
const DatabaseUtils = require('./utils/dbUtils.js');
// const EncryptionService = require('./utils/encryption.js');
require('dotenv').config();

const app = express();
const PORT = process.env.TEAM_ROSTER_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';

// Initialize encryption service
// const encryptionService = EncryptionService;

// Middleware
// app.use(cors());
// app.use(express.json());

// Test login endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Login endpoint working' });
});

// Login endpoint
app.get('/login', (req, res) => {
  const { email, password } = req.query;
  res.json({
    message: 'Login endpoint reached',
    email,
    passwordLength: password ? password.length : 0
  });
});

// Database connection
const db = new DatabaseUtils();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verification failed:', err.message, 'for token:', token.substring(0, 50) + '...');
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('JWT verified successfully for user:', user.email, 'role:', user.role);
    req.user = user;
    next();
  });
};

// Health check endpoint for deployment monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth endpoints

// Helper function to calculate age
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

// Email sending function (simplified for now)
const sendVerificationEmail = async (email, firstName, token) => {
  // This would normally send an email, but for now we'll just log it
  console.log(`Verification email would be sent to ${email} with token ${token}`);
};

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
    const emailHash = crypto.createHash('sha256').update(email).digest('hex');
    const existingUserResult = await db.query('SELECT id FROM users WHERE emailHash = ?', [emailHash]);
    if (existingUserResult.rows && existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Encrypt email for storage
    // const encryptedEmail = encryptionService.encrypt(email);
    const encryptedEmail = email; // Temporary: store plain email

    // Insert user with email verification fields
    const result = await db.query(
      'INSERT INTO users (email, emailHash, password, firstName, lastName, role, isEmailVerified, emailVerificationToken, emailVerificationExpires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [encryptedEmail, emailHash, hashedPassword, firstName, lastName, role, false, verificationToken, verificationExpires]
    );

    const userId = result.lastID;

    // Send verification email
    try {
      await sendVerificationEmail(email, firstName, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails - user can request resend
    }

    // Create user profile with date of birth if provided
    if (dateOfBirth) {
      await db.query(
        'INSERT INTO user_profiles (userId, dateOfBirth) VALUES (?, ?)',
        [userId, dateOfBirth]
      );
    }

    res.status(201).json({
      message: 'User created successfully. Please check your email to verify your account.',
      emailVerificationRequired: true,
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
    console.error('Registration error:', error);
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

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({ 
        error: 'Please verify your email before logging in. Check your email for the verification link.',
        emailVerificationRequired: true,
        canResendVerification: true
      });
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
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/test', (req, res) => {
  try {
    console.log('Test endpoint hit');
    res.json({ message: 'test get' });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Team Roster API endpoints

// Get all rosters for teams the authenticated coach is a member of
app.get('/api/team-rosters', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can manage team rosters' });
    }

    const rosters = await db.query(`
      SELECT tr.*, t.teamName, t.clubName, t.ageGroup, t.league, tm.role as userRole
      FROM team_rosters tr
      JOIN teams t ON tr.teamId = t.id
      JOIN team_members tm ON t.id = tm.teamId
      WHERE tm.userId = ? AND JSON_EXTRACT(tm.permissions, '$.canManageRoster') = true
      ORDER BY tr.createdAt DESC
    `, [req.user.userId]);

    // Get player counts for each roster
    const rostersWithCounts = (rosters.rows || rosters).map(roster => ({
      ...roster,
      playerCount: 0 // We'll calculate this properly
    }));

    // Get player counts for each roster
    for (const roster of rostersWithCounts) {
      const playerCount = await db.query(
        'SELECT COUNT(*) as count FROM team_players WHERE teamId = ? AND isActive = ?',
        [roster.id, true]
      );
      roster.playerCount = (playerCount.rows || playerCount)[0].count;
    }

    res.json({ rosters: rostersWithCounts });
  } catch (error) {
    console.error('Error fetching team rosters:', error);
    res.status(500).json({ error: 'Failed to fetch team rosters' });
  }
});

// Get a specific roster with players
app.get('/api/team-rosters/:rosterId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can view team rosters' });
    }

    const { rosterId } = req.params;

    // Get roster details with team info and check permissions
    const roster = await db.query(`
      SELECT tr.*, t.teamName, t.clubName, t.ageGroup, t.league, tm.permissions
      FROM team_rosters tr
      JOIN teams t ON tr.teamId = t.id
      JOIN team_members tm ON t.id = tm.teamId
      WHERE tr.id = ? AND tm.userId = ? AND JSON_EXTRACT(tm.permissions, '$.canManageRoster') = true
    `, [rosterId, req.user.userId]);

    if (!roster.rows || roster.rows.length === 0) {
      return res.status(404).json({ error: 'Team roster not found or access denied' });
    }

    const rosterData = roster.rows[0];

    // Get all players for this roster
    const players = await db.getAll(
      'SELECT * FROM team_players WHERE teamId = ? ORDER BY bestPosition, playerName',
      [rosterId]
    );

    // Parse alternative positions JSON
    roster.players = players.map(player => ({
      ...player,
      alternativePositions: player.alternativePositions ? JSON.parse(player.alternativePositions) : []
    }));

    res.json({ roster });
  } catch (error) {
    console.error('Error fetching team roster:', error);
    res.status(500).json({ error: 'Failed to fetch team roster' });
  }
});

// Create a new team roster
app.post('/api/team-rosters', authenticateToken, [
  body('teamName').notEmpty().withMessage('Team name is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('league').notEmpty().withMessage('League is required'),
  body('maxSquadSize').optional().isInt({ min: 1 }).withMessage('Max squad size must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can create team rosters' });
    }

    const { teamName, clubName, ageGroup, league, maxSquadSize } = req.body;

    const rosterId = await db.insert(
      'INSERT INTO team_rosters (coachId, teamName, clubName, ageGroup, league, maxSquadSize) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, teamName, clubName || null, ageGroup, league, maxSquadSize || null]
    );

    const roster = await db.getOne(
      'SELECT * FROM team_rosters WHERE id = ?',
      [rosterId]
    );

    roster.players = [];

    res.status(201).json({
      message: 'Team roster created successfully',
      roster
    });
  } catch (error) {
    console.error('Error creating team roster:', error);
    res.status(500).json({ error: 'Failed to create team roster' });
  }
});

// Update team roster details
app.put('/api/team-rosters/:rosterId', authenticateToken, [
  body('teamName').optional().notEmpty().withMessage('Team name cannot be empty'),
  body('ageGroup').optional().notEmpty().withMessage('Age group cannot be empty'),
  body('league').optional().notEmpty().withMessage('League cannot be empty'),
  body('maxSquadSize').optional().isInt({ min: 1 }).withMessage('Max squad size must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can update team rosters' });
    }

    const { rosterId } = req.params;
    const { teamName, clubName, ageGroup, league, maxSquadSize } = req.body;

    // Check if roster exists and belongs to the coach
    const existingRoster = await db.getOne(
      'SELECT * FROM team_rosters WHERE id = ? AND coachId = ?',
      [rosterId, req.user.userId]
    );

    if (!existingRoster) {
      return res.status(404).json({ error: 'Team roster not found' });
    }

    // Build update query dynamically
    const updates = {};
    const params = [];
    if (teamName !== undefined) {
      updates.teamName = teamName;
      params.push(teamName);
    }
    if (clubName !== undefined) {
      updates.clubName = clubName;
      params.push(clubName || null);
    }
    if (ageGroup !== undefined) {
      updates.ageGroup = ageGroup;
      params.push(ageGroup);
    }
    if (league !== undefined) {
      updates.league = league;
      params.push(league);
    }
    if (maxSquadSize !== undefined) {
      updates.maxSquadSize = maxSquadSize;
      params.push(maxSquadSize || null);
    }

    if (params.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    params.push(new Date().toISOString(), rosterId);

    await db.update(
      `UPDATE team_rosters SET ${setClause}, updatedAt = ? WHERE id = ?`,
      params
    );

    const updatedRoster = await db.getOne(
      'SELECT * FROM team_rosters WHERE id = ?',
      [rosterId]
    );

    res.json({
      message: 'Team roster updated successfully',
      roster: updatedRoster
    });
  } catch (error) {
    console.error('Error updating team roster:', error);
    res.status(500).json({ error: 'Failed to update team roster' });
  }
});

// Delete a team roster
app.delete('/api/team-rosters/:rosterId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can delete team rosters' });
    }

    const { rosterId } = req.params;

    // Check if roster exists and belongs to the coach
    const existingRoster = await db.getOne(
      'SELECT * FROM team_rosters WHERE id = ? AND coachId = ?',
      [rosterId, req.user.userId]
    );

    if (!existingRoster) {
      return res.status(404).json({ error: 'Team roster not found' });
    }

    // Delete the roster (this will cascade delete all players)
    await db.delete('DELETE FROM team_rosters WHERE id = ?', [rosterId]);

    res.json({ message: 'Team roster deleted successfully' });
  } catch (error) {
    console.error('Error deleting team roster:', error);
    res.status(500).json({ error: 'Failed to delete team roster' });
  }
});

// Add a player to the roster
app.post('/api/team-rosters/:rosterId/players', authenticateToken, [
  body('playerName').notEmpty().withMessage('Player name is required'),
  body('bestPosition').notEmpty().withMessage('Best position is required'),
  body('alternativePositions').isArray().withMessage('Alternative positions must be an array'),
  body('preferredFoot').isIn(['Left', 'Right', 'Both']).withMessage('Invalid preferred foot'),
  body('age').optional().isInt({ min: 5, max: 50 }).withMessage('Age must be between 5 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can add players to rosters' });
    }

    const { rosterId } = req.params;
    const { playerName, bestPosition, alternativePositions, preferredFoot, age, contactInfo, notes } = req.body;

    // Check if roster exists and belongs to the coach
    const existingRoster = await db.getOne(
      'SELECT * FROM team_rosters WHERE id = ? AND coachId = ?',
      [rosterId, req.user.userId]
    );

    if (!existingRoster) {
      return res.status(404).json({ error: 'Team roster not found' });
    }

    const playerId = await db.insert(
      `INSERT INTO team_players 
       (teamId, playerName, bestPosition, alternativePositions, preferredFoot, age, contactInfo, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rosterId, 
        playerName, 
        bestPosition, 
        JSON.stringify(alternativePositions), 
        preferredFoot, 
        age || null, 
        contactInfo || null, 
        notes || null
      ]
    );

    const player = await db.getOne(
      'SELECT * FROM team_players WHERE id = ?',
      [playerId]
    );

    // Parse alternative positions
    player.alternativePositions = JSON.parse(player.alternativePositions || '[]');

    res.status(201).json({
      message: 'Player added to roster successfully',
      player
    });
  } catch (error) {
    console.error('Error adding player to roster:', error);
    res.status(500).json({ error: 'Failed to add player to roster' });
  }
});

// Update player details
app.put('/api/team-rosters/:rosterId/players/:playerId', authenticateToken, [
  body('playerName').optional().notEmpty().withMessage('Player name cannot be empty'),
  body('bestPosition').optional().notEmpty().withMessage('Best position cannot be empty'),
  body('alternativePositions').optional().isArray().withMessage('Alternative positions must be an array'),
  body('preferredFoot').optional().isIn(['Left', 'Right', 'Both']).withMessage('Invalid preferred foot'),
  body('age').optional().isInt({ min: 5, max: 50 }).withMessage('Age must be between 5 and 50'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can update players' });
    }

    const { rosterId, playerId } = req.params;
    const { playerName, bestPosition, alternativePositions, preferredFoot, age, contactInfo, notes, isActive } = req.body;

    // Check if roster exists and belongs to the coach
    const existingRoster = await db.getOne(
      'SELECT * FROM team_rosters WHERE id = ? AND coachId = ?',
      [rosterId, req.user.userId]
    );

    if (!existingRoster) {
      return res.status(404).json({ error: 'Team roster not found' });
    }

    // Check if player exists in this roster
    const existingPlayer = await db.getOne(
      'SELECT * FROM team_players WHERE id = ? AND teamId = ?',
      [playerId, rosterId]
    );

    if (!existingPlayer) {
      return res.status(404).json({ error: 'Player not found in this roster' });
    }

    // Build update query dynamically
    const updates = {};
    const params = [];
    
    if (playerName !== undefined) {
      updates.playerName = playerName;
      params.push(playerName);
    }
    if (bestPosition !== undefined) {
      updates.bestPosition = bestPosition;
      params.push(bestPosition);
    }
    if (alternativePositions !== undefined) {
      updates.alternativePositions = JSON.stringify(alternativePositions);
      params.push(JSON.stringify(alternativePositions));
    }
    if (preferredFoot !== undefined) {
      updates.preferredFoot = preferredFoot;
      params.push(preferredFoot);
    }
    if (age !== undefined) {
      updates.age = age;
      params.push(age);
    }
    if (contactInfo !== undefined) {
      updates.contactInfo = contactInfo;
      params.push(contactInfo);
    }
    if (notes !== undefined) {
      updates.notes = notes;
      params.push(notes);
    }
    if (isActive !== undefined) {
      updates.isActive = isActive;
      params.push(isActive);
    }

    if (params.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    params.push(new Date().toISOString(), playerId);

    await db.update(
      `UPDATE team_players SET ${setClause}, updatedAt = ? WHERE id = ?`,
      params
    );

    const updatedPlayer = await db.getOne(
      'SELECT * FROM team_players WHERE id = ?',
      [playerId]
    );

    // Parse alternative positions
    updatedPlayer.alternativePositions = JSON.parse(updatedPlayer.alternativePositions || '[]');

    res.json({
      message: 'Player updated successfully',
      player: updatedPlayer
    });
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Remove player from roster
app.delete('/api/team-rosters/:rosterId/players/:playerId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can remove players from rosters' });
    }

    const { rosterId, playerId } = req.params;

    // Check if roster exists and belongs to the coach
    const existingRoster = await db.getOne(
      'SELECT * FROM team_rosters WHERE id = ? AND coachId = ?',
      [rosterId, req.user.userId]
    );

    if (!existingRoster) {
      return res.status(404).json({ error: 'Team roster not found' });
    }

    // Check if player exists in this roster
    const existingPlayer = await db.getOne(
      'SELECT * FROM team_players WHERE id = ? AND teamId = ?',
      [playerId, rosterId]
    );

    if (!existingPlayer) {
      return res.status(404).json({ error: 'Player not found in this roster' });
    }

    // Delete the player
    await db.delete('DELETE FROM team_players WHERE id = ?', [playerId]);

    res.json({ message: 'Player removed from roster successfully' });
  } catch (error) {
    console.error('Error removing player from roster:', error);
    res.status(500).json({ error: 'Failed to remove player from roster' });
  }
});

// Get position analysis for squad gaps
app.get('/api/team-rosters/:rosterId/analysis', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can view position analysis' });
    }

    const { rosterId } = req.params;

    // Check if roster exists and belongs to the coach
    const existingRoster = await db.getOne(
      'SELECT * FROM team_rosters WHERE id = ? AND coachId = ?',
      [rosterId, req.user.userId]
    );

    if (!existingRoster) {
      return res.status(404).json({ error: 'Team roster not found' });
    }

    // Get all active players grouped by position
    const positionCounts = await db.getAll(
      `SELECT bestPosition, COUNT(*) as count 
       FROM team_players 
       WHERE teamId = ? AND isActive = ? 
       GROUP BY bestPosition`,
      [rosterId, true]
    );

    // Define ideal formation (4-4-2 as default)
    const idealFormation = {
      'Goalkeeper': 2,      // 1 starter + 1 backup
      'Centre-back': 4,     // 2 starters + 2 backups
      'Left-back': 2,       // 1 starter + 1 backup
      'Right-back': 2,      // 1 starter + 1 backup
      'Defensive Midfielder': 2,
      'Central Midfielder': 4,
      'Attacking Midfielder': 2,
      'Left Wing': 2,
      'Right Wing': 2,
      'Striker': 4,         // 2 starters + 2 backups
      'Centre Forward': 2
    };

    // Calculate gaps
    const gaps = [];
    const currentCounts = {};
    
    // Build current counts object
    positionCounts.forEach(pc => {
      currentCounts[pc.bestPosition] = pc.count;
    });

    // Calculate gaps for each position
    Object.entries(idealFormation).forEach(([position, ideal]) => {
      const current = currentCounts[position] || 0;
      const gap = Math.max(0, ideal - current);
      
      let priority = 'low';
      if (gap >= ideal * 0.5) priority = 'high';       // Missing 50%+ 
      else if (gap >= ideal * 0.25) priority = 'medium'; // Missing 25%+

      gaps.push({
        position,
        currentCount: current,
        idealCount: ideal,
        gap,
        priority
      });
    });

    // Sort by priority and gap size
    gaps.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.gap - a.gap;
    });

    // Calculate summary
    const totalPlayers = Object.values(currentCounts).reduce((sum, count) => sum + count, 0);
    const activePositions = Object.keys(currentCounts).length;
    const criticalGaps = gaps.filter(g => g.priority === 'high').length;

    res.json({
      gaps,
      summary: {
        totalPlayers,
        activePositions,
        criticalGaps
      }
    });
  } catch (error) {
    console.error('Error getting position analysis:', error);
    res.status(500).json({ error: 'Failed to get position analysis' });
  }
});

// Get club information - coaches and teams from the same club
app.get('/api/club-info/:clubName', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can view club information' });
    }

    const { clubName } = req.params;

    if (!clubName || clubName.trim() === '') {
      return res.status(400).json({ error: 'Club name is required' });
    }

    // Get all teams from this club
    const teams = await db.getAll(
      `SELECT tr.*, u.firstName, u.lastName, u.email,
              (SELECT COUNT(*) FROM team_players WHERE teamId = tr.id AND isActive = TRUE) as playerCount
       FROM team_rosters tr
       JOIN users u ON tr.coachId = u.id
       WHERE tr.clubName = ?
       ORDER BY tr.ageGroup, tr.teamName`,
      [clubName]
    );

    // Group by coach
    const coachesByClub = {};
    teams.forEach(team => {
      const coachKey = `${team.firstName} ${team.lastName}`;
      if (!coachesByClub[coachKey]) {
        coachesByClub[coachKey] = {
          coachId: team.coachId,
          coachName: coachKey,
          email: team.email,
          teams: []
        };
      }
      coachesByClub[coachKey].teams.push({
        id: team.id,
        teamName: team.teamName,
        ageGroup: team.ageGroup,
        league: team.league,
        playerCount: team.playerCount,
        maxSquadSize: team.maxSquadSize
      });
    });

    res.json({
      clubName,
      totalTeams: teams.length,
      coaches: Object.values(coachesByClub),
      totalCoaches: Object.keys(coachesByClub).length
    });
  } catch (error) {
    console.error('Error fetching club information:', error);
    res.status(500).json({ error: 'Failed to fetch club information' });
  }
});

// ==========================================
// CLUB DASHBOARD ENDPOINTS
// ==========================================

// Get all updates for a club
app.get('/api/club-updates/:clubName', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can view club updates' });
    }

    const { clubName } = req.params;
    
    // Verify coach has a team in this club
    const coachTeam = await db.getOne(
      'SELECT id FROM team_rosters WHERE coachId = ? AND clubName = ?',
      [req.user.userId, clubName]
    );
    
    if (!coachTeam) {
      return res.status(403).json({ error: 'You are not a member of this club' });
    }

    // Get all updates for the club with coach info
    const updates = await db.getAll(`
      SELECT cu.*, u.firstName, u.lastName, u.email,
             (SELECT COUNT(*) FROM club_update_comments WHERE updateId = cu.id) as commentCount
      FROM club_updates cu
      JOIN users u ON cu.coachId = u.id
      WHERE cu.clubName = ?
      ORDER BY cu.isPinned DESC, cu.createdAt DESC
    `, [clubName]);

    res.json({ updates });
  } catch (error) {
    console.error('Error fetching club updates:', error);
    res.status(500).json({ error: 'Failed to fetch club updates' });
  }
});

// Create a new club update
app.post('/api/club-updates', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can create club updates' });
    }

    const { clubName, title, content, updateType, isPinned } = req.body;

    if (!clubName || !title || !content) {
      return res.status(400).json({ error: 'Club name, title, and content are required' });
    }

    // Verify coach has a team in this club
    const coachTeam = await db.getOne(
      'SELECT id FROM team_rosters WHERE coachId = ? AND clubName = ?',
      [req.user.userId, clubName]
    );
    
    if (!coachTeam) {
      return res.status(403).json({ error: 'You are not a member of this club' });
    }

    const updateId = await db.insert(`
      INSERT INTO club_updates (clubName, coachId, title, content, updateType, isPinned)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [clubName, req.user.userId, title, content, updateType || 'general', isPinned || false]);

    const update = await db.getOne(`
      SELECT cu.*, u.firstName, u.lastName, u.email
      FROM club_updates cu
      JOIN users u ON cu.coachId = u.id
      WHERE cu.id = ?
    `, [updateId]);

    res.status(201).json({ 
      message: 'Update created successfully',
      update 
    });
  } catch (error) {
    console.error('Error creating club update:', error);
    res.status(500).json({ error: 'Failed to create club update' });
  }
});

// Update a club update
app.put('/api/club-updates/:updateId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can update club posts' });
    }

    const { updateId } = req.params;
    const { title, content, updateType, isPinned } = req.body;

    // Check if update exists and belongs to the coach
    const existingUpdate = await db.getOne(
      'SELECT * FROM club_updates WHERE id = ? AND coachId = ?',
      [updateId, req.user.userId]
    );

    if (!existingUpdate) {
      return res.status(404).json({ error: 'Update not found or you do not have permission to edit it' });
    }

    const updates = {};
    const params = [];
    
    if (title !== undefined) {
      updates.title = title;
      params.push(title);
    }
    if (content !== undefined) {
      updates.content = content;
      params.push(content);
    }
    if (updateType !== undefined) {
      updates.updateType = updateType;
      params.push(updateType);
    }
    if (isPinned !== undefined) {
      updates.isPinned = isPinned;
      params.push(isPinned ? 1 : 0);
    }

    if (params.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    params.push(new Date().toISOString(), updateId);

    await db.update(
      `UPDATE club_updates SET ${setClause}, updatedAt = ? WHERE id = ?`,
      params
    );

    const updated = await db.getOne(`
      SELECT cu.*, u.firstName, u.lastName, u.email
      FROM club_updates cu
      JOIN users u ON cu.coachId = u.id
      WHERE cu.id = ?
    `, [updateId]);

    res.json({ 
      message: 'Update edited successfully',
      update: updated
    });
  } catch (error) {
    console.error('Error updating club update:', error);
    res.status(500).json({ error: 'Failed to update club update' });
  }
});

// Delete a club update
app.delete('/api/club-updates/:updateId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can delete club posts' });
    }

    const { updateId } = req.params;

    // Check if update exists and belongs to the coach
    const existingUpdate = await db.getOne(
      'SELECT * FROM club_updates WHERE id = ? AND coachId = ?',
      [updateId, req.user.userId]
    );

    if (!existingUpdate) {
      return res.status(404).json({ error: 'Update not found or you do not have permission to delete it' });
    }

    await db.delete('DELETE FROM club_updates WHERE id = ?', [updateId]);

    res.json({ message: 'Update deleted successfully' });
  } catch (error) {
    console.error('Error deleting club update:', error);
    res.status(500).json({ error: 'Failed to delete club update' });
  }
});

// Get comments for an update
app.get('/api/club-updates/:updateId/comments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can view comments' });
    }

    const { updateId } = req.params;

    const comments = await db.getAll(`
      SELECT cuc.*, u.firstName, u.lastName, u.email
      FROM club_update_comments cuc
      JOIN users u ON cuc.coachId = u.id
      WHERE cuc.updateId = ?
      ORDER BY cuc.createdAt ASC
    `, [updateId]);

    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add a comment to an update
app.post('/api/club-updates/:updateId/comments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can comment' });
    }

    const { updateId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim() === '') {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    // Check if update exists
    const update = await db.getOne('SELECT * FROM club_updates WHERE id = ?', [updateId]);
    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    // Verify coach is in the same club
    const coachTeam = await db.getOne(
      'SELECT id FROM team_rosters WHERE coachId = ? AND clubName = ?',
      [req.user.userId, update.clubName]
    );
    
    if (!coachTeam) {
      return res.status(403).json({ error: 'You are not a member of this club' });
    }

    const commentId = await db.insert(`
      INSERT INTO club_update_comments (updateId, coachId, comment)
      VALUES (?, ?, ?)
    `, [updateId, req.user.userId, comment]);

    const newComment = await db.getOne(`
      SELECT cuc.*, u.firstName, u.lastName, u.email
      FROM club_update_comments cuc
      JOIN users u ON cuc.coachId = u.id
      WHERE cuc.id = ?
    `, [commentId]);

    res.status(201).json({ 
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete a comment
app.delete('/api/club-updates/:updateId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can delete comments' });
    }

    const { commentId } = req.params;

    // Check if comment exists and belongs to the coach
    const existingComment = await db.getOne(
      'SELECT * FROM club_update_comments WHERE id = ? AND coachId = ?',
      [commentId, req.user.userId]
    );

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found or you do not have permission to delete it' });
    }

    await db.delete('DELETE FROM club_update_comments WHERE id = ?', [commentId]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ============================================
// FEEDBACK SYSTEM ENDPOINTS
// ============================================

// Submit new feedback (bug report or improvement idea)
app.post('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const { feedbackType, title, description, category, browserInfo, pageUrl } = req.body;

    if (!feedbackType || !title || !description) {
      return res.status(400).json({ error: 'Feedback type, title, and description are required' });
    }

    if (!['bug', 'improvement'].includes(feedbackType)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }

    const result = await db.insert(`
      INSERT INTO user_feedback (userId, feedbackType, title, description, category, browserInfo, pageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.user.userId, feedbackType, title, description, category || 'general', browserInfo, pageUrl]);

    res.status(201).json({ 
      message: 'Feedback submitted successfully',
      feedbackId: result.lastID
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get user's own feedback submissions
app.get('/api/feedback/my-submissions', authenticateToken, async (req, res) => {
  try {
    const feedback = await db.getAll(`
      SELECT uf.*, 
        (SELECT COUNT(*) FROM feedback_comments WHERE feedbackId = uf.id) as commentCount
      FROM user_feedback uf
      WHERE uf.userId = ?
      ORDER BY uf.createdAt DESC
    `, [req.user.userId]);

    res.json({ feedback });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get specific feedback item with comments
app.get('/api/feedback/:feedbackId', authenticateToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await db.getOne(`
      SELECT uf.*, u.firstName, u.lastName, u.email, u.role as userRole
      FROM user_feedback uf
      JOIN users u ON uf.userId = u.id
      WHERE uf.id = ?
    `, [feedbackId]);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Only allow access to feedback owner or admins
    if (feedback.userId !== req.user.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get comments
    const comments = await db.getAll(`
      SELECT fc.*, u.firstName, u.lastName, u.role as userRole
      FROM feedback_comments fc
      JOIN users u ON fc.userId = u.id
      WHERE fc.feedbackId = ?
      ORDER BY fc.createdAt ASC
    `, [feedbackId]);

    res.json({ feedback, comments });
  } catch (error) {
    console.error('Error fetching feedback details:', error);
    res.status(500).json({ error: 'Failed to fetch feedback details' });
  }
});

// Add comment to feedback
app.post('/api/feedback/:feedbackId/comments', authenticateToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    // Check if feedback exists
    const feedback = await db.getOne('SELECT * FROM user_feedback WHERE id = ?', [feedbackId]);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Only allow feedback owner or admins to comment
    if (feedback.userId !== req.user.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isAdminComment = req.user.role === 'Admin';

    await db.insert(`
      INSERT INTO feedback_comments (feedbackId, userId, comment, isAdminComment)
      VALUES (?, ?, ?, ?)
    `, [feedbackId, req.user.userId, comment.trim(), isAdminComment]);

    // Update the feedback's updatedAt timestamp
    await db.update('UPDATE user_feedback SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [feedbackId]);

    res.status(201).json({ message: 'Comment added successfully' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ADMIN ENDPOINTS

// Get all feedback for admin dashboard
app.get('/api/admin/feedback', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { feedbackType, status, priority, category } = req.query;

    let query = `
      SELECT uf.*, u.firstName, u.lastName, u.email, u.role as userRole,
        (SELECT COUNT(*) FROM feedback_comments WHERE feedbackId = uf.id) as commentCount
      FROM user_feedback uf
      JOIN users u ON uf.userId = u.id
      WHERE 1=1
    `;
    const params = [];

    if (feedbackType) {
      query += ' AND uf.feedbackType = ?';
      params.push(feedbackType);
    }
    if (status) {
      query += ' AND uf.status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND uf.priority = ?';
      params.push(priority);
    }
    if (category) {
      query += ' AND uf.category = ?';
      params.push(category);
    }

    query += ' ORDER BY uf.createdAt DESC';

    const feedback = await db.getAll(query, params);

    // Get summary stats
    const stats = await db.getOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN feedbackType = 'bug' THEN 1 ELSE 0 END) as bugs,
        SUM(CASE WHEN feedbackType = 'improvement' THEN 1 ELSE 0 END) as improvements,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as newItems,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical
      FROM user_feedback
    `);

    res.json({ feedback, stats });
  } catch (error) {
    console.error('Error fetching admin feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Update feedback status, priority, or admin notes (Admin only)
app.put('/api/admin/feedback/:feedbackId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { feedbackId } = req.params;
    const { status, priority, adminNotes } = req.body;

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
      
      // If marking as completed, set resolvedAt and resolvedBy
      if (status === 'completed') {
        updates.push('resolvedAt = CURRENT_TIMESTAMP');
        updates.push('resolvedBy = ?');
        params.push(req.user.userId);
      }
    }
    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (adminNotes !== undefined) {
      updates.push('adminNotes = ?');
      params.push(adminNotes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(feedbackId);

    await db.update(`
      UPDATE user_feedback 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    res.json({ message: 'Feedback updated successfully' });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

// Delete feedback (Admin only)
app.delete('/api/admin/feedback/:feedbackId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { feedbackId } = req.params;

    await db.delete('DELETE FROM user_feedback WHERE id = ?', [feedbackId]);

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// Leagues API endpoint - Now database-driven instead of hardcoded
app.get('/api/leagues', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM leagues WHERE isActive = 1 ORDER BY hits DESC, name ASC');
    const leagues = result.rows.map(league => ({
      id: league.id,
      name: league.name,
      region: league.region,
      ageGroup: league.ageGroup,
      url: league.url,
      hits: league.hits || 0
    }));
    res.json(leagues);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// League Management CRUD Endpoints for Admin

// Get all leagues from database (for admin management)
app.get('/api/admin/leagues', authenticateToken, async (req, res) => {
  try {
    // Only admins can manage leagues
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const leagues = await db.getAll('SELECT * FROM leagues ORDER BY name');
    res.json({ leagues });
  } catch (error) {
    console.error('Error fetching admin leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// Create a new league
app.post('/api/admin/leagues', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, region, ageGroup, url, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'League name is required' });
    }

    const leagueId = await db.insert(
      'INSERT INTO leagues (name, region, ageGroup, url, description, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
      [name, region || null, ageGroup || null, url || null, description || null, req.user.userId]
    );

    const league = await db.getOne('SELECT * FROM leagues WHERE id = ?', [leagueId]);
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
app.put('/api/admin/leagues/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, region, ageGroup, url, description, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'League name is required' });
    }

    const rowCount = await db.update(
      'UPDATE leagues SET name = ?, region = ?, ageGroup = ?, url = ?, description = ?, isActive = ? WHERE id = ?',
      [name, region || null, ageGroup || null, url || null, description || null, isActive !== undefined ? isActive : true, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    const league = await db.getOne('SELECT * FROM leagues WHERE id = ?', [id]);
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
app.delete('/api/admin/leagues/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const rowCount = await db.delete('DELETE FROM leagues WHERE id = ?', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({ message: 'League deleted successfully' });
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ error: 'Failed to delete league' });
  }
});

// Populate database with FA leagues (one-time setup)
app.post('/api/admin/leagues/populate-fa-leagues', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

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
      },
      { 
        name: 'Garforth Junior Football League', 
        region: 'Yorkshire', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=13588',
        hits: 87689
      },
      { 
        name: 'Norfolk Combined Youth Football League', 
        region: 'Eastern', 
        ageGroup: 'Youth',
        url: 'https://fulltime.thefa.com/index.html?league=303322696',
        hits: 84310
      },
      { 
        name: 'Midland Junior Premier League', 
        region: 'Midlands', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=1182044',
        hits: 80725
      },
      { 
        name: 'HUDDERSFIELD FOX ENGRAVERS JUNIOR FOOTBALL LEAGUE', 
        region: 'Yorkshire', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=8747035',
        hits: 78690
      },
      { 
        name: 'BCFA Youth League', 
        region: 'Midlands', 
        ageGroup: 'Youth',
        url: 'https://fulltime.thefa.com/index.html?league=671683416',
        hits: 76263
      },
      { 
        name: 'Stourbridge & District Youth Football League', 
        region: 'Midlands', 
        ageGroup: 'Youth',
        url: 'https://fulltime.thefa.com/index.html?league=381565593',
        hits: 75263
      },
      { 
        name: 'Russell Foster Tyne & Wear Football League', 
        region: 'North East', 
        ageGroup: 'Senior',
        url: 'https://fulltime.thefa.com/index.html?league=400742710',
        hits: 70627
      },
      { 
        name: 'YEL East Midlands SATURDAY', 
        region: 'Midlands', 
        ageGroup: 'Youth',
        url: 'https://fulltime.thefa.com/index.html?league=5628447',
        hits: 70528
      },
      { 
        name: 'Mid Sussex Youth Football League', 
        region: 'South East', 
        ageGroup: 'Youth',
        url: 'https://fulltime.thefa.com/index.html?league=1375655',
        hits: 70050
      },
      { 
        name: 'West Herts Youth League', 
        region: 'South East', 
        ageGroup: 'Youth',
        url: 'https://fulltime.thefa.com/index.html?league=945817950',
        hits: 69417
      },
      { 
        name: 'Echo Junior Football League', 
        region: 'South West', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=387606494',
        hits: 68330
      },
      { 
        name: 'Bolton, Bury and District Football League', 
        region: 'North West', 
        ageGroup: 'Senior',
        url: 'https://fulltime.thefa.com/index.html?league=760017',
        hits: 67945
      },
      { 
        name: 'The FA Women\'s National League', 
        region: 'National', 
        ageGroup: 'Women\'s',
        url: 'https://fulltime.thefa.com/index.html?league=872938',
        hits: 58615
      },
      { 
        name: 'Southern Combination Football League', 
        region: 'South East', 
        ageGroup: 'Senior',
        url: 'https://fulltime.thefa.com/index.html?league=840602727',
        hits: 49762
      },
      { 
        name: 'Kent Youth League', 
        region: 'South East', 
        ageGroup: 'Youth',
        url: 'https://fulltime.thefa.com/index.html?league=286758524',
        hits: 47219
      },
      { 
        name: 'Liverpool Premier League', 
        region: 'North West', 
        ageGroup: 'Senior',
        url: 'https://fulltime.thefa.com/index.html?league=4075038',
        hits: 43702
      },
      { 
        name: 'Yorkshire Amateur Association Football League', 
        region: 'Yorkshire', 
        ageGroup: 'Amateur',
        url: 'https://fulltime.thefa.com/index.html?league=7058382',
        hits: 42853
      },
      { 
        name: 'Tamworth Junior Football League', 
        region: 'Midlands', 
        ageGroup: 'Junior',
        url: 'https://fulltime.thefa.com/index.html?league=tamworth',
        hits: 25000
      }
    ];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const league of faLeagues) {
      try {
        await db.insert(
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

// Team vacancies endpoint
app.get('/api/vacancies', async (req, res) => {
  try {
    const sampleVacancies = [
      {
        id: 1,
        title: 'Midfielder Needed - Premier League U18',
        teamName: 'Manchester United Youth',
        league: 'Premier League Under 18',
        ageGroup: 'U18',
        position: 'Midfielder',
        gender: 'Male',
        description: 'Looking for a creative midfielder to join our Premier League youth team.',
        location: 'Manchester, UK',
        requirements: ['Previous youth team experience', 'Good passing ability'],
        contactEmail: 'coach@manutyouth.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Goalkeeper - Women\'s Championship',
        teamName: 'Chelsea Women FC',
        league: 'Women\'s League',
        ageGroup: 'Open',
        position: 'Goalkeeper',
        gender: 'Female',
        description: 'Seeking experienced goalkeeper for our women\'s championship team.',
        location: 'London, UK',
        requirements: ['Goalkeeper experience', 'Good communication skills'],
        contactEmail: 'coach@chelseawomen.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        title: 'Striker Position - Local Youth League',
        teamName: 'Local FC Academy',
        league: 'Local Youth League',
        ageGroup: 'U16',
        position: 'Forward',
        gender: 'Male',
        description: 'Young striker needed for competitive local youth league.',
        location: 'Birmingham, UK',
        requirements: ['Good finishing ability', 'Team player'],
        contactEmail: 'coach@localfc.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    res.json(sampleVacancies);
  } catch (error) {
    console.error('Error fetching vacancies:', error);
    res.status(500).json({ error: 'Failed to fetch team vacancies' });
  }
});

// Player availability endpoint
app.get('/api/players', async (req, res) => {
  try {
    const samplePlayers = [
      {
        id: 1,
        name: 'James Wilson',
        age: 17,
        position: 'Midfielder',
        gender: 'Male',
        experienceLevel: 'Intermediate',
        location: 'Manchester, UK',
        description: 'Creative midfielder looking for a competitive team.',
        availability: ['Weekends', 'Weekday Evenings'],
        contactEmail: 'james.wilson@email.com',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Sarah Thompson',
        age: 19,
        position: 'Goalkeeper',
        gender: 'Female',
        experienceLevel: 'Advanced',
        location: 'London, UK',
        description: 'Experienced goalkeeper seeking women\'s team.',
        availability: ['Weekends'],
        contactEmail: 'sarah.thompson@email.com',
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Alex Rodriguez',
        age: 16,
        position: 'Forward',
        gender: 'Male',
        experienceLevel: 'Beginner',
        location: 'Birmingham, UK',
        description: 'Young striker looking to develop skills.',
        availability: ['Weekends', 'Weekday Evenings'],
        contactEmail: 'alex.rodriguez@email.com',
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json(samplePlayers);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch player availability' });
  }
});

// Analytics tracking endpoint (simple version for frontend analytics)
app.post('/api/analytics/track', async (req, res) => {
  try {
    // For now, just acknowledge the tracking event without storing
    // In the future, this could write to a separate analytics database
    const { event, category, action, label, value, userId, sessionId, metadata } = req.body;
    
    // Log analytics events for debugging (optional)
    // console.log('Analytics event:', { event, category, action, userId });
    
    res.status(200).json({ success: true, message: 'Event tracked' });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get training locations for map view (team vacancies with location data)
app.get('/api/calendar/training-locations', async (req, res) => {
  try {
    const { latitude, longitude, radius = 25, hasVacancies, locationType = 'training' } = req.query;
    
    // Determine which location field to query based on type
    const locationField = locationType === 'match' ? 'matchLocationData' : 'trainingLocationData';
    
    // Get team vacancies with location data for the specified type
    // Fall back to old locationData field if new fields are null
    let query = `
      SELECT * FROM team_vacancies 
      WHERE (${locationField} IS NOT NULL OR locationData IS NOT NULL) 
        AND status = ?
    `;
    const params = ['active'];
    
    const vacancies = await db.getAll(query, params);
    
    // Parse locationData and calculate distances
    const trainingLocations = vacancies.map(vacancy => {
      let locationData;
      try {
        // Try new field first, fall back to old field
        const dataToUse = vacancy[locationField] || vacancy.locationData;
        if (!dataToUse) return null;
        
        locationData = JSON.parse(dataToUse);
      } catch (err) {
        console.error('Error parsing location data:', err);
        return null;
      }
      
      if (!locationData.latitude || !locationData.longitude) {
        return null;
      }
      
      // Calculate distance if user location provided
      let distance = null;
      if (latitude && longitude) {
        const lat1 = parseFloat(latitude);
        const lon1 = parseFloat(longitude);
        const lat2 = locationData.latitude;
        const lon2 = locationData.longitude;
        
        // Haversine formula for distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = Math.round(R * c * 10) / 10; // Round to 1 decimal place
      }
      
      // Filter by radius if distance calculated
      if (radius && distance !== null && distance > parseFloat(radius)) {
        return null;
      }
      
      // Determine location label based on type
      const locationLabel = locationType === 'match' 
        ? `${vacancy.title} - Match Venue`
        : `${vacancy.title} - Training Ground`;
      
      return {
        id: vacancy.id,
        title: locationLabel,
        teamName: vacancy.title,
        date: vacancy.createdAt || new Date().toISOString(),
        startTime: locationType === 'match' ? '15:00' : '18:00', // Different default times
        endTime: locationType === 'match' ? '17:00' : '20:00',
        location: vacancy.location,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        distance,
        hasVacancies: true, // All team_vacancies have vacancies by definition
        contactEmail: vacancy.contactInfo || 'coach@team.com',
        description: locationType === 'match' 
          ? `Home match venue for ${vacancy.title}. ${vacancy.description || ''}`
          : `Training location for ${vacancy.title}. ${vacancy.description || ''}`,
        locationData: {
          address: locationData.address || vacancy.location,
          postcode: locationData.postcode,
          facilities: locationData.facilities
        },
        locationType,
        ageGroup: vacancy.ageGroup,
        position: vacancy.position,
        league: vacancy.league
      };
    }).filter(Boolean); // Remove null entries
    
    // Filter by hasVacancies if specified
    const filtered = hasVacancies === 'true' 
      ? trainingLocations.filter(loc => loc.hasVacancies)
      : trainingLocations;
    
    // Sort by distance if available
    const sorted = filtered.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    
    res.json({
      trainingLocations: sorted,
      count: sorted.length,
      locationType
    });
  } catch (error) {
    console.error('Error fetching training locations:', error);
    res.status(500).json({ error: 'Failed to fetch training locations' });
  }
});

// User Management Admin Endpoints

// Get all users (Admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await db.getAll(
      'SELECT id, email, firstName, lastName, role, createdAt, isEmailVerified, isBlocked FROM users ORDER BY createdAt DESC'
    );
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete user (Admin only)
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    const user = await db.getOne('SELECT email FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.update('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: `User ${user.email} deleted successfully` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Block/Unblock user (Admin only)
app.post('/api/admin/users/:id/block', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { blocked } = req.body;

    const user = await db.getOne('SELECT email FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.update('UPDATE users SET isBlocked = ? WHERE id = ?', [blocked ? 1 : 0, id]);
    res.json({ message: `User ${user.email} ${blocked ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({ error: 'Failed to block/unblock user' });
  }
});

// Send message to user (Admin only)
app.post('/api/admin/users/:id/message', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const user = await db.getOne('SELECT id, email FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Store message in database for sending
    // This is a placeholder - in production, you'd integrate with email service
    const messageId = await db.insert(
      'INSERT INTO admin_messages (userId, adminId, subject, message, sentAt) VALUES (?, ?, ?, ?, datetime("now"))',
      [id, req.user.userId, subject, message]
    );

    res.json({ message: 'Message sent successfully', messageId });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Promote user to Admin (Admin only)
app.post('/api/admin/users/:id/promote', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'Admin') {
      return res.status(400).json({ error: 'Can only promote to Admin role' });
    }

    const user = await db.getOne('SELECT email, role FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'Admin') {
      return res.status(400).json({ error: 'User is already an Admin' });
    }

    await db.update('UPDATE users SET role = ? WHERE id = ?', ['Admin', id]);
    res.json({ message: `User ${user.email} promoted to Admin successfully` });
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Get public site statistics (for homepage display)
app.get('/api/public/site-stats', async (req, res) => {
  res.json({ message: 'Site stats working' });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Team Roster Server running on port ${PORT}`);
});

module.exports = app;
