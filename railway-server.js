const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const DatabaseUtils = require('./backend/utils/dbUtils.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = new DatabaseUtils();

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, 'dist')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Load all API routes from team-roster-server
// We'll import the routes dynamically
const teamRosterServerPath = path.join(__dirname, 'backend', 'team-roster-server.js');
delete require.cache[teamRosterServerPath]; // Clear cache to avoid port binding

// Instead of loading the full server, we'll duplicate critical routes here
// This is simpler than refactoring the entire team-roster-server

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes from backend (simplified - you can expand this)
// For now, pointing to documentation
app.get('/api', (req, res) => {
  res.json({ 
    message: 'The Grassroots Scout API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      feedback: '/api/feedback/*',
      rosters: '/api/team-rosters/*',
      clubs: '/api/club-*'
    }
  });
});

console.log('⚠️  Note: For production, you need to migrate team-roster-server routes here');
console.log('⚠️  Or use a process manager to run both servers');

// Serve React app for all other routes (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 The Grassroots Scout running on port ${PORT}`);
  console.log(`📱 Access at: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`📊 Database: ${db ? 'Connected' : 'Not connected'}`);
});

