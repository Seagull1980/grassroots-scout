const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = 3001;
const JWT_SECRET = 'grassroots-hub-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

console.log('🔧 Starting simple test server...');

// Test endpoint
app.get('/api/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({ status: 'OK', message: 'Simple test server is running' });
});

// Test analytics endpoint
app.get('/api/analytics/overview', (req, res) => {
  console.log('📊 Analytics overview requested');
  res.json({
    overview: {
      totalUsers: 5,
      totalTeams: 3,
      totalPlayers: 8,
      totalMatches: 0
    },
    userTypeBreakdown: [
      { userType: 'Admin', count: 1 },
      { userType: 'Coach', count: 2 },
      { userType: 'Player', count: 2 }
    ],
    popularPages: [
      { page: '/dashboard', views: 10 },
      { page: '/analytics', views: 5 }
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Simple Test Server running on port ${PORT}`);
  console.log(`📱 Local access: http://127.0.0.1:${PORT}`);
  console.log(`📱 Local access: http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('❌ Server startup error:', error);
});

console.log('✅ Server setup complete, waiting for requests...');