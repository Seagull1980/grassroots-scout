const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const expressValidator = require('express-validator');
const { body, validationResult } = expressValidator;
const DatabaseUtils = require('./utils/dbUtils.js');
require('dotenv').config();

const app = express();
const PORT = process.env.TEAM_ROSTER_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
// const db = new DatabaseUtils();

// Test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'test get' });
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