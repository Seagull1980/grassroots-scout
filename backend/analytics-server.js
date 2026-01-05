const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const DatabaseUtils = require('./utils/dbUtils.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all ngrok URLs and localhost
    if (origin.includes('ngrok') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all origins for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));
app.use(express.json());

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
      return res.status(403).json({ error: 'Invalid or expired token' });
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

// Analytics endpoints
app.get('/api/analytics/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching analytics overview...');
    
    // Get real user count from database
    const totalUsersResult = await db.runQuery('SELECT COUNT(*) as count FROM users');
    const totalTeamsResult = await db.runQuery('SELECT COUNT(DISTINCT teamName) as count FROM team_vacancies');
    const totalPlayersResult = await db.runQuery('SELECT COUNT(*) as count FROM player_availability');
    
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
    const userTypesResult = await db.runQuery('SELECT role as userType, COUNT(*) as count FROM users GROUP BY role');
    const userTypes = userTypesResult?.rows || [];
    
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

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Analytics server is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Analytics Server running on port ${PORT}`);
  console.log(`📱 Local access: http://localhost:${PORT}`);
});