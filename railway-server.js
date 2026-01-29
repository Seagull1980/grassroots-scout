import express from 'express';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import DatabaseUtils from './backend/utils/dbUtils.js';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';

// Middleware (let backend app handle its own middleware)
// app.use(cors());
// app.use(express.json());

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

// Load all API routes from backend server
process.env.RAILWAY_SERVER_MODE = 'true';
const backendApp = require('./backend/server.js');

// Initialize database tables before starting server
(async () => {
  console.log('🚀 Initializing database tables...');
  try {
    await db.db.createTables();
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    console.log('⚠️  Continuing without database initialization - some features may not work');
  }

  // Use backend routes (this includes all API endpoints)
  app.use(backendApp);

  // Remove the duplicate health check and API documentation since backend has them
  // The backend server already handles /api/health and /api routes

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
})();

