const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const helmet = require('helmet');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Force Railway redeploy - v2
const DatabaseUtils = require('./db/database');
const leagueRequestsRouter = require('./routes/league-requests');
const emailService = require('./services/emailService');
const alertService = require('./services/alertService');
const cronService = require('./services/cronService');
const { messageLimiter, validateMessageContent } = require('./middleware/security');

const app = express();
app.set('trust proxy', 1); // Trust Railway/Vercel reverse proxy for correct IP resolution
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

// Initialize Forum database (using better-sqlite3 for forum features)
const forumDb = new Database(path.join(__dirname, 'forum.db'));
forumDb.pragma('journal_mode = WAL');
forumDb.pragma('foreign_keys = OFF');

// Create forum tables
forumDb.exec(`
  CREATE TABLE IF NOT EXISTS forum_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_role TEXT NOT NULL,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General Discussions',
    is_locked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
  )
`);

forumDb.exec(`
  CREATE TABLE IF NOT EXISTS forum_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    parent_reply_id INTEGER,
    user_id INTEGER NOT NULL,
    user_role TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
  )
`);

forumDb.exec(`
  CREATE TABLE IF NOT EXISTS content_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type TEXT NOT NULL,
    content_id INTEGER NOT NULL,
    flagged_by_user_id INTEGER NOT NULL,
    flagged_by_name TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by_user_id INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Forum database tables initialized');

// Create feedback tables for admin feedback system
const initFeedbackTables = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        feedbackType VARCHAR NOT NULL,
        title VARCHAR NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR DEFAULT 'general',
        priority VARCHAR DEFAULT 'medium',
        status VARCHAR DEFAULT 'new',
        adminNotes TEXT,
        attachmentUrl VARCHAR,
        browserInfo TEXT,
        pageUrl VARCHAR,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolvedAt TIMESTAMP,
        resolvedBy INTEGER
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feedbackId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        comment TEXT NOT NULL,
        isAdminComment BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Feedback system tables initialized');
  } catch (error) {
    console.log('⚠️  Feedback tables may already exist or error occurred:', error.message);
  }
};

// Initialize feedback tables on startup
initFeedbackTables();

// Create support messages table for contact form
const initSupportMessagesTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        userId INTEGER,
        userAgent TEXT,
        pageUrl VARCHAR(500),
        status VARCHAR(20) DEFAULT 'new',
        priority VARCHAR(20) DEFAULT 'normal',
        assignedTo INTEGER,
        adminNotes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        respondedAt TIMESTAMP,
        resolvedAt TIMESTAMP
      )
    `);
    
    console.log('✅ Support messages table initialized');
  } catch (error) {
    console.log('⚠️  Support messages table may already exist or error occurred:', error.message);
  }
};

// Initialize support messages table on startup
initSupportMessagesTable();

// Create open training registrations table to support capped open sessions and waitlists
const initOpenTrainingRegistrationsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS open_training_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending_confirmation',
        paymentStatus VARCHAR(20) NOT NULL DEFAULT 'not_required',
        paymentDueAt TIMESTAMP,
        confirmedBy INTEGER,
        confirmedAt TIMESTAMP,
        droppedAt TIMESTAMP,
        dropReason TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(eventId, userId)
      )
    `);

    await db.query('CREATE INDEX IF NOT EXISTS idx_open_training_regs_event ON open_training_registrations(eventId)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_open_training_regs_user ON open_training_registrations(userId)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_open_training_regs_status ON open_training_registrations(status)');

    console.log('✅ Open training registrations table initialized');
  } catch (error) {
    console.log('⚠️  Open training registrations table may already exist or error occurred:', error.message);
  }
};

initOpenTrainingRegistrationsTable();

// Bootstrap alert-system tables so notification features work without running a separate migration
const initAlertSystemTables = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_alert_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL UNIQUE,
        emailNotifications BOOLEAN DEFAULT TRUE,
        newVacancyAlerts BOOLEAN DEFAULT TRUE,
        newPlayerAlerts BOOLEAN DEFAULT TRUE,
        trialInvitations BOOLEAN DEFAULT TRUE,
        weeklyDigest BOOLEAN DEFAULT TRUE,
        instantAlerts BOOLEAN DEFAULT FALSE,
        preferredLeagues TEXT DEFAULT '[]',
        ageGroups TEXT DEFAULT '[]',
        positions TEXT DEFAULT '[]',
        maxDistance INTEGER DEFAULT 50,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS alert_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        alertType VARCHAR(50) NOT NULL,
        targetId INTEGER,
        targetType VARCHAR(50),
        sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        notificationType VARCHAR(50) NOT NULL,
        priority INTEGER DEFAULT 1,
        data TEXT NOT NULL,
        scheduledFor TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processedAt TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('\u2705 Alert system tables initialized');
  } catch (error) {
    console.log('\u26a0\ufe0f  Alert system table initialization error:', error.message);
  }
};

initAlertSystemTables();

const OPEN_TRAINING_SPOT_CONSUMING_STATUSES = new Set(['pending_confirmation', 'confirmed', 'payment_pending']);

const statusConsumesSpot = (status) => OPEN_TRAINING_SPOT_CONSUMING_STATUSES.has(String(status || '').toLowerCase());

const createNotification = async (userId, type, title, message, relatedId, relatedType) => {
  await db.query(
    `INSERT INTO notifications (userId, type, title, message, relatedId, relatedType)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, message, relatedId || null, relatedType || null]
  );
};

const promoteNextWaitlistedRegistrant = async (eventId) => {
  const waitlistResult = await db.query(
    `SELECT otr.id, otr.userId, ce.title
     FROM open_training_registrations otr
     JOIN calendar_events ce ON ce.id = otr.eventId
     WHERE otr.eventId = ? AND otr.status = 'waitlisted'
     ORDER BY otr.createdAt ASC
     LIMIT 1`,
    [eventId]
  );

  if (!waitlistResult.rows || waitlistResult.rows.length === 0) {
    return null;
  }

  const nextUp = waitlistResult.rows[0];

  const capacityUpdate = await db.query(
    `UPDATE calendar_events
     SET currentParticipants = currentParticipants + 1
     WHERE id = ?
       AND (maxParticipants IS NULL OR currentParticipants < maxParticipants)`,
    [eventId]
  );

  if (!capacityUpdate.rowCount) {
    return null;
  }

  const now = new Date().toISOString();
  await db.query(
    `UPDATE open_training_registrations
     SET status = ?, updatedAt = ?
     WHERE id = ?`,
    ['pending_confirmation', now, nextUp.id]
  );

  await createNotification(
    nextUp.userId,
    'training_waitlist_promoted',
    'You have been promoted from the waitlist',
    `A spot has opened for "${nextUp.title}". Please confirm your attendance.`,
    eventId,
    'open_training'
  );

  emailOpenTrainingStatusChange(nextUp.userId, nextUp.title, 'pending_confirmation');

  return nextUp.userId;
};

// Send a brief email to a user when their open-training registration status changes
const emailOpenTrainingStatusChange = async (userId, eventTitle, status) => {
  try {
    if (!emailTransporter) return;
    const userResult = await db.query('SELECT email, firstName FROM users WHERE id = ?', [userId]);
    if (!userResult.rows?.length) return;
    const { email, firstName } = userResult.rows[0];

    const subjects = {
      confirmed: `You're confirmed for ${eventTitle}!`,
      waitlisted: `You've been added to the waitlist for ${eventTitle}`,
      pending_confirmation: `Registration received for ${eventTitle}`,
      payment_overdue: `Spot released due to missed payment — ${eventTitle}`,
      dropped_out: `Your registration for ${eventTitle} has been cancelled`,
    };
    const bodies = {
      confirmed: `<p>Great news, ${firstName}! Your place on <strong>${eventTitle}</strong> has been confirmed. We look forward to seeing you there.</p>`,
      waitlisted: `<p>Hi ${firstName}, you have been added to the waiting list for <strong>${eventTitle}</strong>. We will let you know as soon as a spot opens up.</p>`,
      pending_confirmation: `<p>Hi ${firstName}, your registration for <strong>${eventTitle}</strong> has been received and is awaiting coach confirmation.</p>`,
      payment_overdue: `<p>Hi ${firstName}, your spot on <strong>${eventTitle}</strong> has been released because payment was not received by the deadline. Please re-register if you are still interested.</p>`,
      dropped_out: `<p>Hi ${firstName}, your registration for <strong>${eventTitle}</strong> has been cancelled. Contact the coach if this was unexpected.</p>`,
    };

    const subject = subjects[status] || `Registration update for ${eventTitle}`;
    const body = bodies[status] || `<p>Hi ${firstName}, your registration status for <strong>${eventTitle}</strong> has been updated to "${status}".</p>`;

    await sendEmailWithTimeout(
      emailTransporter.sendMail({
        from: process.env.EMAIL_USER || 'thegrassrootsupp@gmail.com',
        to: email,
        subject,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#2E7D32;">The Grassroots Hub</h2>
          ${body}
          <p style="color:#666;font-size:12px;">This is an automated message from The Grassroots Hub.</p>
        </div>`
      }),
      10000
    );
  } catch (err) {
    console.warn('Open training email notification skipped:', err.message);
  }
};

// Scheduled job: release spots for registrations past their payment deadline
const runPaymentDueCheck = async () => {
  try {
    const now = new Date().toISOString();
    const overdueResult = await db.query(
      `SELECT otr.id, otr.eventId, otr.userId, ce.title
       FROM open_training_registrations otr
       JOIN calendar_events ce ON ce.id = otr.eventId
       WHERE otr.status = 'payment_pending'
         AND otr.paymentDueAt IS NOT NULL
         AND otr.paymentDueAt < ?`,
      [now]
    );

    if (!overdueResult.rows?.length) return;

    for (const reg of overdueResult.rows) {
      await db.query(
        `UPDATE open_training_registrations
         SET status = 'payment_overdue', paymentStatus = 'overdue', updatedAt = ?
         WHERE id = ?`,
        [now, reg.id]
      );
      await db.query(
        'UPDATE calendar_events SET currentParticipants = currentParticipants - 1 WHERE id = ? AND currentParticipants > 0',
        [reg.eventId]
      );
      await createNotification(
        reg.userId,
        'payment_overdue',
        'Spot released — payment deadline missed',
        `Your spot on "${reg.title}" has been released because payment was not received in time.`,
        reg.eventId,
        'open_training'
      );
      emailOpenTrainingStatusChange(reg.userId, reg.title, 'payment_overdue');
      await promoteNextWaitlistedRegistrant(reg.eventId);
      console.log(`\u23f0 Released overdue spot: registration ${reg.id} for event ${reg.eventId}`);
    }
  } catch (err) {
    console.error('Payment due check error:', err);
  }
};

// Run payment-due check every 10 minutes and once at startup
setInterval(runPaymentDueCheck, 10 * 60 * 1000);
setTimeout(runPaymentDueCheck, 8000);

// Profanity filter for forum content
const profanityList = [
  'damn', 'hell', 'crap', 'bastard', 'bitch', 'ass', 'asshole',
  'shit', 'fuck', 'fucking', 'motherfucker', 'dick', 'cock', 
  'pussy', 'cunt', 'whore', 'slut', 'piss', 'nigger', 'nigga',
  'fag', 'faggot', 'retard', 'retarded', 'idiot', 'moron',
  'kill yourself', 'kys', 'die', 'hate you', 'loser', 'pathetic'
];

function containsProfanity(text) {
  const lowerText = text.toLowerCase();
  for (const word of profanityList) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) return true;
    const pattern = word.split('').join('[*@!#$%^&]?');
    const variationRegex = new RegExp(pattern, 'i');
    if (variationRegex.test(lowerText)) return true;
  }
  return false;
}

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

// Auth email helpers — delegate to emailService so delivery is audit-logged
const sendVerificationEmail = (email, firstName, verificationToken) =>
  emailService.sendVerificationEmail(email, firstName, verificationToken);

const sendPasswordResetEmail = (email, firstName, resetToken) =>
  emailService.sendPasswordResetEmail(email, firstName, resetToken);

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

    emailService.setAuditLogger(async (entry) => {
      const metadataJson = entry.metadata ? JSON.stringify(entry.metadata) : null;
      await db.query(
        `INSERT INTO email_delivery_logs
         (recipientEmail, templateName, subject, status, messageId, errorCode, errorMessage, provider, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.recipientEmail,
          entry.templateName || null,
          entry.subject || null,
          entry.status,
          entry.messageId || null,
          entry.errorCode || null,
          entry.errorMessage || null,
          entry.provider || 'smtp',
          metadataJson
        ]
      );
    });

    cronService.setDatabase(db);
    cronService.init();
    cronService.start();

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
    const frozenFilterClause = db.dbType === 'postgresql'
      ? '(tv.isFrozen = FALSE OR tv.isFrozen IS NULL)'
      : '(tv.isFrozen = 0 OR tv.isFrozen IS NULL)';

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
        AND ${frozenFilterClause}
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

// Create a new team vacancy (Coach or Admin)
app.post('/api/vacancies', [
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('league').notEmpty().withMessage('League is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('position').notEmpty().withMessage('Position is required')
], async (req, res) => {
  try {
    if (!['Coach', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only coaches can post team vacancies' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title, description, league, ageGroup, position,
      teamGender, location, locationData, contactInfo,
      hasMatchRecording, hasPathwayToSenior, teamId
    } = req.body;

    const result = await db.query(
      `INSERT INTO team_vacancies
         (title, description, league, ageGroup, position, teamGender,
          location, locationData, contactInfo, postedBy, teamId,
          hasMatchRecording, hasPathwayToSenior, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
      [
        title, description, league, ageGroup, position,
        teamGender || 'Mixed',
        location || null,
        locationData ? JSON.stringify(locationData) : null,
        contactInfo || null,
        req.user.userId,
        teamId || null,
        hasMatchRecording ? 1 : 0,
        hasPathwayToSenior ? 1 : 0
      ]
    );

    const vacancyId = result.lastID || result.insertId;

    alertService.sendNewVacancyAlerts({
      id: vacancyId, title, description, league, ageGroup, position,
      location: location || ''
    }).catch((alertError) => {
      console.error('Failed to send new vacancy alerts:', alertError);
    });

    res.status(201).json({ message: 'Vacancy posted successfully', vacancyId });
  } catch (error) {
    console.error('Create vacancy error:', error);
    res.status(500).json({ error: 'Failed to post vacancy' });
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
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['Coach', 'Player', 'Parent/Guardian']).withMessage('Valid role is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required for players'),
  body('teamName').optional({ checkFalsy: true }).isLength({ max: 120 }).withMessage('Team name must be 120 characters or less'),
  body('businessName').optional({ checkFalsy: true }).isLength({ max: 120 }).withMessage('Business name must be 120 characters or less')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, dateOfBirth, teamName, businessName } = req.body;

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

    const normalizedTeamName = typeof teamName === 'string' ? teamName.trim() : '';
    const normalizedBusinessName = typeof businessName === 'string' ? businessName.trim() : '';

    // Create user profile when registration includes profile fields
    if ((dateOfBirth && role === 'Player') || (role === 'Coach' && (normalizedTeamName || normalizedBusinessName))) {
      try {
        const profileColumns = ['userId'];
        const profileValues = [userId];

        if (dateOfBirth && role === 'Player') {
          profileColumns.push('dateOfBirth');
          profileValues.push(dateOfBirth);
        }

        if (role === 'Coach' && normalizedTeamName) {
          profileColumns.push('coachTeamName');
          profileValues.push(normalizedTeamName);
        }

        if (role === 'Coach' && normalizedBusinessName) {
          profileColumns.push('coachingBusinessName');
          profileValues.push(normalizedBusinessName);
        }

        const placeholders = profileColumns.map(() => '?').join(', ');
        await db.query(
          `INSERT INTO user_profiles (${profileColumns.join(', ')}) VALUES (${placeholders})`,
          profileValues
        );
      } catch (profileError) {
        console.warn('Failed to create user profile during registration:', profileError.message);
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
    const genericResponse = {
      message: 'If an account with that email exists and is not yet verified, a verification email has been sent.'
    };

    // Find user
    const userResult = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.json(genericResponse);
    }

    const user = userResult.rows[0];

    if (user.isEmailVerified) {
      return res.json(genericResponse);
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

    res.json(genericResponse);
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

    const isBlocked = user.isblocked ?? user.isBlocked;
    const isDeleted = user.isdeleted ?? user.isDeleted;

    if (isDeleted) {
      return res.status(403).json({ error: 'Account has been deleted. Please contact support if this is a mistake.' });
    }

    if (isBlocked) {
      return res.status(403).json({ error: 'Account is blocked. Please contact support.' });
    }

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
        firstName: user.firstName || user.firstname || '',
        lastName: user.lastName || user.lastname || '',
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
        firstName: user.firstName || user.firstname || '',
        lastName: user.lastName || user.lastname || '',
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
    
    // Get user profile data (database uses camelCase column names)
    const profileResult = await db.query('SELECT * FROM user_profiles WHERE userId = ?', [userId]);
    const dbProfile = profileResult.rows && profileResult.rows.length > 0 ? profileResult.rows[0] : {};
    
    console.log('Profile data retrieved:', {
      userId,
      profileExists: !!dbProfile.userId,
      profileKeys: Object.keys(dbProfile),
      dateOfBirth: dbProfile.dateOfBirth,
      phone: dbProfile.phone
    });
    
    // Map database camelCase columns to lowercase for frontend response
    const profile = {
      phone: dbProfile.phone,
      dateofbirth: dbProfile.dateOfBirth,
      location: dbProfile.location,
      bio: dbProfile.bio,
      position: dbProfile.position,
      preferredfoot: dbProfile.preferredFoot,
      preferredteamgender: dbProfile.preferredTeamGender,
      height: dbProfile.height,
      weight: dbProfile.weight,
      experiencelevel: dbProfile.experienceLevel,
      availability: dbProfile.availability,
      coachinglicense: dbProfile.coachingLicense,
      yearsexperience: dbProfile.yearsExperience,
      specializations: dbProfile.specializations,
      traininglocation: dbProfile.trainingLocation,
      matchlocation: dbProfile.matchLocation,
      trainingdays: dbProfile.trainingDays,
      agegroupscoached: dbProfile.ageGroupsCoached,
      emergencycontact: dbProfile.emergencyContact,
      emergencyphone: dbProfile.emergencyPhone,
      medicalinfo: dbProfile.medicalInfo,
      profilepicture: dbProfile.profilePicture,
      isprofilecomplete: dbProfile.isProfileComplete,
      lastupdated: dbProfile.lastUpdated
    };
    
    // Return combined profile
    res.json({
      profile: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        createdat: user.createdat,
        ...profile
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
    
    // normalize incoming keys to lowercase so we can map them reliably
    const normalizedBody = {};
    Object.entries(req.body).forEach(([k, v]) => {
      normalizedBody[k.toLowerCase()] = v;
    });
    
    // Map lowercase keys from frontend to proper camelCase column names in database
    const columnMapping = {
      phone: 'phone',
      dateofbirth: 'dateOfBirth',
      location: 'location',
      bio: 'bio',
      position: 'position',
      preferredfoot: 'preferredFoot',
      preferredteamgender: 'preferredTeamGender',
      height: 'height',
      weight: 'weight',
      experiencelevel: 'experienceLevel',
      availability: 'availability',
      coachinglicense: 'coachingLicense',
      yearsexperience: 'yearsExperience',
      specializations: 'specializations',
      traininglocation: 'trainingLocation',
      matchlocation: 'matchLocation',
      trainingdays: 'trainingDays',
      agegroupscoached: 'ageGroupsCoached',
      emergencycontact: 'emergencyContact',
      emergencyphone: 'emergencyPhone',
      medicalinfo: 'medicalInfo',
      profilepicture: 'profilePicture',
      isprofilecomplete: 'isProfileComplete'
    };
    
    console.log('Profile update request body:', {
      userId,
      bodyKeys: Object.keys(normalizedBody),
      phone: normalizedBody.phone,
      dateofbirth: normalizedBody.dateofbirth,
      location: normalizedBody.location
    });
    
    // Check if profile exists
    const existingProfile = await db.query('SELECT * FROM user_profiles WHERE userId = ?', [userId]);
    
    if (!existingProfile.rows || existingProfile.rows.length === 0) {
      // Create new profile – build using normalizedBody so keys may be lowercased
      const insertCols = [];
      const insertValues = [];
      const insertPlaceholders = [];

      insertCols.push('userId');
      insertValues.push(userId);
      insertPlaceholders.push('?');

      // helper to convert user-friendly experience levels into values allowed by the database
      const mapExperience = (val) => {
        if (typeof val !== 'string') return val;
        switch (val) {
          case 'Grassroots': return 'Beginner';
          case 'Amateur': return 'Intermediate';
          case 'Semi-Pro': return 'Advanced';
          default: return val;
        }
      };

      for (const [key, value] of Object.entries(normalizedBody)) {
        if (value !== undefined && columnMapping[key]) {
          const dbColName = columnMapping[key];
          insertCols.push(dbColName);
          let finalVal = value;
          if (dbColName === 'experienceLevel') {
            finalVal = mapExperience(value);
          }
          // Handle JSON fields
          if (['availability', 'specializations', 'trainingDays', 'ageGroupsCoached'].includes(dbColName)) {
            insertValues.push(JSON.stringify(Array.isArray(finalVal) ? finalVal : [finalVal]));
          } else {
            insertValues.push(finalVal);
          }
          insertPlaceholders.push('?');
        }
      }

      insertCols.push('lastUpdated');
      // use CURRENT_TIMESTAMP for compatibility with SQLite and Postgres
      insertPlaceholders.push('CURRENT_TIMESTAMP');

      // Attempt upsert when using PostgreSQL to avoid race/constraint errors
      let insertQuery = `INSERT INTO user_profiles (${insertCols.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`;
      if (db.dbType === 'postgresql') {
        const conflictCols = insertCols.filter(c => c !== 'userId');
        if (conflictCols.length > 0) {
          const updates = conflictCols.map(c => `${c}=EXCLUDED.${c}`).join(', ');
          insertQuery += ` ON CONFLICT (userId) DO UPDATE SET ${updates}`;
        }
      }

      console.log('INSERT/UPSERT Query:', insertQuery);
      console.log('INSERT Values:', insertValues);
      
      await db.query(insertQuery, insertValues);
    } else {
      // Update existing profile  
      const updates = [];
      const values = [];

      const mapExperience = (val) => {
        if (typeof val !== 'string') return val;
        switch (val) {
          case 'Grassroots': return 'Beginner';
          case 'Amateur': return 'Intermediate';
          case 'Semi-Pro': return 'Advanced';
          default: return val;
        }
      };

      for (const [key, value] of Object.entries(normalizedBody)) {
        if (value !== undefined && columnMapping[key]) {
          const dbColName = columnMapping[key];
          updates.push(`${dbColName} = ?`);
          let finalVal = value;
          if (dbColName === 'experienceLevel') {
            finalVal = mapExperience(value);
          }
          // Handle JSON fields
          if (['availability', 'specializations', 'trainingDays', 'ageGroupsCoached'].includes(dbColName)) {
            values.push(JSON.stringify(Array.isArray(finalVal) ? finalVal : [finalVal]));
          } else {
            values.push(finalVal);
          }
        }
      }
      
      // Always update lastUpdated (CURRENT_TIMESTAMP works in both SQLite and Postgres)
      updates.push('lastUpdated = CURRENT_TIMESTAMP');

      if (updates.length === 1) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(userId);
      const query = `UPDATE user_profiles SET ${updates.join(', ')} WHERE userId = ?`;

      console.log('UPDATE Query:', query);
      console.log('UPDATE Values:', values);
      
      await db.query(query, values);
      
      // Verify what was saved
      const verifyResult = await db.query('SELECT dateOfBirth, location FROM user_profiles WHERE userId = ?', [userId]);
      console.log('After UPDATE - data in DB:', verifyResult.rows[0]);
    }

    console.log(`✅ Profile updated successfully for user ID: ${userId}`);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Profile request body at failure:', req.body);
    if (error.stack) console.error(error.stack);
    // In case of duplicate key constraint we can retry as update
    if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
      console.warn('Duplicate profile insert detected, attempting update instead');
      try {
        // try running the update logic without selecting again
        const updates = [];
        const values = [];
        for (const [key, value] of Object.entries(normalizedBody)) {
          if (value !== undefined && columnMapping[key]) {
            const dbColName = columnMapping[key];
            updates.push(`${dbColName} = ?`);
            if (['availability', 'specializations', 'trainingDays', 'ageGroupsCoached'].includes(dbColName)) {
              values.push(JSON.stringify(Array.isArray(value) ? value : [value]));
            } else {
              values.push(value);
            }
          }
        }
        updates.push('lastUpdated = CURRENT_TIMESTAMP');
        if (updates.length > 0) {
          values.push(userId);
          const query = `UPDATE user_profiles SET ${updates.join(', ')} WHERE userId = ?`;
          console.log('Retry UPDATE Query after conflict:', query);
          console.log('Retry UPDATE Values:', values);
          await db.query(query, values);
          console.log(`⚠️ Conflict recovery: profile updated successfully for user ID: ${userId}`);
        }
      } catch (err2) {
        console.error('Conflict recovery update failed:', err2);
      }
    }
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

// ============================================================================
// Child Co-Owner Management - Multiple Parents for Same Child
// ============================================================================

// Request another parent to manage the same child
app.post('/api/children/:childId/request-co-parent', [
  authenticateToken,
  body('otherParentId').isInt().withMessage('Valid parent ID is required'),
  body('relationshipType').optional().isIn(['mother', 'father', 'step_parent', 'guardian']).withMessage('Valid relationship type is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can manage children' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { childId } = req.params;
    const { otherParentId } = req.body;

    // Verify this child belongs to the requesting parent
    const childResult = await db.query(
      'SELECT * FROM children WHERE id = ? AND parentId = ?',
      [childId, req.user.userId]
    );

    if (!childResult.rows || childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    // Verify the other parent exists and is a Parent/Guardian
    const otherParentResult = await db.query(
      'SELECT id, firstName, lastName, email FROM users WHERE id = ? AND role = ?',
      [otherParentId, 'Parent/Guardian']
    );

    if (!otherParentResult.rows || otherParentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Other parent not found or is not a Parent/Guardian' });
    }

    // Check if request already exists
    const existingRequest = await db.query(
      'SELECT * FROM child_co_owners WHERE childId = ? AND parentId = ? AND status = ?',
      [childId, otherParentId, 'pending']
    );

    if (existingRequest.rows && existingRequest.rows.length > 0) {
      return res.status(409).json({ error: 'Request already pending for this parent' });
    }

    // Check if co-owner already approved
    const approvedRequest = await db.query(
      'SELECT * FROM child_co_owners WHERE childId = ? AND parentId = ? AND status = ?',
      [childId, otherParentId, 'approved']
    );

    if (approvedRequest.rows && approvedRequest.rows.length > 0) {
      return res.status(409).json({ error: 'This parent already co-owns this child' });
    }

    // Create the request
    const result = await db.query(
      `INSERT INTO child_co_owners (childId, parentId, requestedByParentId, status, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [childId, otherParentId, req.user.userId, 'pending', new Date().toISOString(), new Date().toISOString()]
    );

    res.status(201).json({
      message: 'Co-parent request sent successfully',
      request: {
        id: result.lastID,
        childId,
        parentId: otherParentId,
        requestedByParentId: req.user.userId,
        status: 'pending',
        otherParent: {
          id: otherParentResult.rows[0].id,
          firstName: otherParentResult.rows[0].firstName,
          lastName: otherParentResult.rows[0].lastName,
          email: otherParentResult.rows[0].email
        }
      }
    });
  } catch (error) {
    console.error('Request co-parent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get co-owners for a child
app.get('/api/children/:childId/co-owners', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can view co-owners' });
    }

    const { childId } = req.params;

    // Verify this child belongs to or is shared with the requesting parent
    const childResult = await db.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM child_co_owners WHERE childId = ? AND status = 'approved') as coOwnerCount
       FROM children c 
       WHERE c.id = ? AND (c.parentId = ? OR EXISTS(
         SELECT 1 FROM child_co_owners WHERE childId = ? AND parentId = ? AND status = 'approved'
       ))`,
      [childId, childId, req.user.userId, childId, req.user.userId]
    );

    if (!childResult.rows || childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    // Get all co-owner requests and approvals
    const coOwnersResult = await db.query(
      `SELECT cco.*, u.firstName, u.lastName, u.email
       FROM child_co_owners cco
       JOIN users u ON cco.parentId = u.id
       WHERE cco.childId = ?
       ORDER BY cco.status DESC, cco.createdAt DESC`,
      [childId]
    );

    res.json({
      coOwners: coOwnersResult.rows || [],
      childInfo: {
        id: childResult.rows[0].id,
        firstName: childResult.rows[0].firstName,
        lastName: childResult.rows[0].lastName,
        coOwnerCount: childResult.rows[0].coOwnerCount || 0
      }
    });
  } catch (error) {
    console.error('Get co-owners error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or decline a co-parent request
app.post('/api/children/:childId/approve-co-parent/:requestId', [
  authenticateToken,
  body('approved').isBoolean().withMessage('Approved field must be boolean'),
  body('declineReason').optional().isString().withMessage('Decline reason must be a string')
], async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can approve co-parent requests' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { childId, requestId } = req.params;
    const { approved, declineReason } = req.body;

    // Get the request
    const requestResult = await db.query(
      'SELECT * FROM child_co_owners WHERE id = ? AND childId = ?',
      [requestId, childId]
    );

    if (!requestResult.rows || requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Verify the requesting parent owns the child or is an approved co-owner
    const childResult = await db.query(
      `SELECT * FROM children WHERE id = ? AND (parentId = ? OR EXISTS(
        SELECT 1 FROM child_co_owners WHERE childId = ? AND parentId = ? AND status = 'approved'
      ))`,
      [childId, req.user.userId, childId, req.user.userId]
    );

    if (!childResult.rows || childResult.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to manage this child' });
    }

    if (approved) {
      // Approve the request
      await db.query(
        'UPDATE child_co_owners SET status = ?, approvedAt = ?, updatedAt = ? WHERE id = ?',
        ['approved', new Date().toISOString(), new Date().toISOString(), requestId]
      );

      res.json({
        message: 'Co-parent request approved',
        status: 'approved'
      });
    } else {
      // Decline the request
      await db.query(
        'UPDATE child_co_owners SET status = ?, declinedAt = ?, declineReason = ?, updatedAt = ? WHERE id = ?',
        ['declined', new Date().toISOString(), declineReason || null, new Date().toISOString(), requestId]
      );

      res.json({
        message: 'Co-parent request declined',
        status: 'declined'
      });
    }
  } catch (error) {
    console.error('Approve co-parent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a co-parent
app.delete('/api/children/:childId/remove-co-parent/:parentId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can manage co-parents' });
    }

    const { childId, parentId } = req.params;

    // Verify this child belongs to the requesting parent or is shared with them
    const childResult = await db.query(
      `SELECT * FROM children WHERE id = ? AND (parentId = ? OR EXISTS(
        SELECT 1 FROM child_co_owners WHERE childId = ? AND parentId = ? AND status = 'approved'
      ))`,
      [childId, req.user.userId, childId, req.user.userId]
    );

    if (!childResult.rows || childResult.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to manage this child' });
    }

    // Delete the co-owner relationship
    await db.query(
      'DELETE FROM child_co_owners WHERE childId = ? AND parentId = ?',
      [childId, parentId]
    );

    res.json({ message: 'Co-parent removed successfully' });
  } catch (error) {
    console.error('Remove co-parent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link to an existing child record instead of creating a duplicate
app.post('/api/children/link-to-existing', [
  authenticateToken,
  body('existingChildId').isInt().withMessage('Valid existing child ID is required'),
  body('relationshipType').optional().isIn(['mother', 'father', 'step_parent', 'guardian']).withMessage('Valid relationship type is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'Parent/Guardian') {
      return res.status(403).json({ error: 'Only parents/guardians can link children' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { existingChildId } = req.body;

    // Verify the existing child exists
    const existingChildResult = await db.query(
      'SELECT * FROM children WHERE id = ?',
      [existingChildId]
    );

    if (!existingChildResult.rows || existingChildResult.rows.length === 0) {
      return res.status(404).json({ error: 'Existing child not found' });
    }

    const existingChild = existingChildResult.rows[0];

    // Check if this parent already has this child linked
    const existingLink = await db.query(
      'SELECT * FROM child_co_owners WHERE childId = ? AND parentId = ? AND status = ?',
      [existingChildId, req.user.userId, 'approved']
    );

    if (existingLink.rows && existingLink.rows.length > 0) {
      return res.status(409).json({ error: 'You already have this child linked' });
    }

    // Create a co-owner request to the original parent
    const result = await db.query(
      `INSERT INTO child_co_owners (childId, parentId, requestedByParentId, status, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [existingChildId, req.user.userId, req.user.userId, 'pending', new Date().toISOString(), new Date().toISOString()]
    );

    res.status(201).json({
      message: 'Link request sent to the primary parent for approval',
      request: {
        id: result.lastID,
        childId: existingChildId,
        childName: `${existingChild.firstName} ${existingChild.lastName}`,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Link to existing child error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Player Availability Endpoints (for adult players)

// Get authenticated player's own availability
app.get('/api/player-availability', authenticateToken, async (req, res) => {
  try {
    // Allow Coach, Player, and Admin roles to view available players
    if (req.user.role !== 'Coach' && req.user.role !== 'Player' && req.user.role !== 'Admin') {
      console.log(`Access denied for role: ${req.user.role}`);
      return res.status(403).json({ error: 'Unauthorized to access player availability' });
    }

    // If user is a Player, return only their own records; Coaches see all records
    const userQuery = req.user.role === 'Player' 
      ? 'WHERE postedBy = ? AND status != \'inactive\''
      : 'WHERE status != \'inactive\'';

    const availabilityResult = await db.query(
      `SELECT * FROM player_availability 
       ${userQuery}
       ORDER BY createdAt DESC`,
      req.user.role === 'Player' ? [req.user.userId] : []
    );

    const availability = (availabilityResult.rows || []).map(row => {
      let preferredLeagues = [];
      let positions = [];
      
      try {
        preferredLeagues = row.preferredLeagues ? JSON.parse(row.preferredLeagues) : [];
        if (!Array.isArray(preferredLeagues)) {
          preferredLeagues = [row.preferredLeagues];
        }
      } catch (e) {
        // If parsing fails, treat as string array
        preferredLeagues = row.preferredLeagues ? [row.preferredLeagues] : [];
      }
      
      try {
        // Database column is 'positions' (plural), stored as JSON string array
        positions = row.positions ? JSON.parse(row.positions) : [];
        if (!Array.isArray(positions)) {
          positions = [row.positions];
        }
      } catch (e) {
        // If parsing fails, treat as string array
        positions = row.positions ? [row.positions] : [];
      }
      
      const locationAddress =
        row.locationAddress ??
        row.locationaddress ??
        row.location_address ??
        row.location ??
        '';

      const latitudeRaw =
        row.locationLatitude ??
        row.locationlatitude ??
        row.location_latitude ??
        row.latitude;

      const longitudeRaw =
        row.locationLongitude ??
        row.locationlongitude ??
        row.location_longitude ??
        row.longitude;

      const latitude = latitudeRaw !== undefined && latitudeRaw !== null ? Number(latitudeRaw) : null;
      const longitude = longitudeRaw !== undefined && longitudeRaw !== null ? Number(longitudeRaw) : null;

      const hasValidCoordinates =
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;

      return {
        ...row,
        preferredLeagues,
        positions,
        locationData: hasValidCoordinates
          ? {
              address: locationAddress,
              latitude,
              longitude,
              placeId: row.locationPlaceId ?? row.locationplaceid ?? row.location_place_id ?? null
            }
          : null
      };
    });

    const withLocation = availability.filter(a => a.locationData !== null).length;
    const withoutLocation = availability.length - withLocation;
    console.log(`[Player Availability] User: ${req.user.email} (${req.user.role}), Returning: ${availability.length} records, With location: ${withLocation}, Without location: ${withoutLocation}`);
    
    // Debug: Log first record's location data if available
    if (availability.length > 0) {
      const sample = availability[0];
      console.log(`[Player Availability] Sample record: title="${sample.title}", hasLocationData=${sample.locationData ? 'YES' : 'NO'}, address="${sample.locationData?.address || 'N/A'}"`);
    }
    
    res.json({ availability });
  } catch (error) {
    console.error('Get player availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new player availability
app.post('/api/player-availability', [
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('positions').isArray({ min: 1 }).withMessage('At least one position is required')
], async (req, res) => {
  try {
    // Allow Player role and Admin role (for testing)
    if (req.user.role !== 'Player' && req.user.role !== 'Admin') {
      return res.status(403).json({ 
        error: 'Only players can create player availability. Parents/Guardians should use the child player availability feature.' 
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      preferredLeagues,
      ageGroup,
      positions,
      preferredTeamGender,
      location,
      locationData
    } = req.body;

    // Extract location details from locationData if available
    const locationAddress = locationData?.address || location || '';
    const locationLatitude = locationData?.latitude || null;
    const locationLongitude = locationData?.longitude || null;
    const locationPlaceId = locationData?.placeId || null;

    const result = await db.query(
      `INSERT INTO player_availability 
       (title, description, preferredLeagues, ageGroup, positions, 
        preferredTeamGender, location, locationAddress, locationLatitude, 
        locationLongitude, locationPlaceId, postedBy, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        title,
        description,
        JSON.stringify(preferredLeagues ||[]),
        ageGroup,
        JSON.stringify(positions),
        preferredTeamGender || 'Mixed',
        location,
        locationAddress,
        locationLatitude,
        locationLongitude,
        locationPlaceId,
        req.user.userId
      ]
    );

    const availabilityId = result.lastID;
    const createdAvailability = {
      id: availabilityId,
      title,
      description,
      preferredLeagues: Array.isArray(preferredLeagues) ? preferredLeagues : [],
      ageGroup,
      positions: Array.isArray(positions) ? positions : [],
      preferredTeamGender: preferredTeamGender || 'Mixed',
      location,
      locationData: locationData || null,
      postedBy: req.user.userId,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    alertService.sendNewPlayerAlerts(createdAvailability).catch((alertError) => {
      console.error('Failed to send new player availability alerts:', alertError);
    });

    res.status(201).json({
      message: 'Player availability created successfully',
      availabilityId,
      availability: createdAvailability
    });
  } catch (error) {
    console.error('Create player availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update player availability
app.put('/api/player-availability/:availabilityId', [
  authenticateToken,
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('ageGroup').optional().notEmpty().withMessage('Age group cannot be empty'),
  body('positions').optional().isArray({ min: 1 }).withMessage('At least one position is required')
], async (req, res) => {
  try {
    // Allow Player role and Admin role (for testing)
    if (req.user.role !== 'Player' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only players can update player availability' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { availabilityId } = req.params;
    
    // Verify availability belongs to this player
    const availabilityResult = await db.query(
      'SELECT * FROM player_availability WHERE id = ? AND postedBy = ?',
      [availabilityId, req.user.userId]
    );

    if (!availabilityResult.rows || availabilityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player availability not found or access denied' });
    }

    const updateFields = [];
    const updateValues = [];
    
    // Handle locationData separately to extract into individual columns
    if (req.body.locationData) {
      const locationData = req.body.locationData;
      if (locationData.address) {
        updateFields.push('locationAddress = ?');
        updateValues.push(locationData.address);
      }
      if (locationData.latitude !== undefined) {
        updateFields.push('locationLatitude = ?');
        updateValues.push(locationData.latitude);
      }
      if (locationData.longitude !== undefined) {
        updateFields.push('locationLongitude = ?');
        updateValues.push(locationData.longitude);
      }
      if (locationData.placeId) {
        updateFields.push('locationPlaceId = ?');
        updateValues.push(locationData.placeId);
      }
    }
    
    // Handle other fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'locationData') {
        if (['preferredLeagues', 'positions'].includes(key)) {
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

    updateValues.push(availabilityId);

    await db.query(
      `UPDATE player_availability SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Player availability updated successfully' });
  } catch (error) {
    console.error('Update player availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete player availability
app.delete('/api/player-availability/:availabilityId', authenticateToken, async (req, res) => {
  try {
    // Allow Player role and Admin role (for testing)
    if (req.user.role !== 'Player' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only players can delete player availability' });
    }

    const { availabilityId } = req.params;
    
    // Verify availability belongs to this player
    const availabilityResult = await db.query(
      'SELECT * FROM player_availability WHERE id = ? AND postedBy = ?',
      [availabilityId, req.user.userId]
    );

    if (!availabilityResult.rows || availabilityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player availability not found or access denied' });
    }

    // Soft delete - set status to inactive
    await db.query(
      'UPDATE player_availability SET status = ? WHERE id = ?',
      ['inactive', availabilityId]
    );

    res.json({ message: 'Player availability deleted successfully' });
  } catch (error) {
    console.error('Delete player availability error:', error);
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

    const availability = (availabilityResult.rows || []).map(row => {
      let preferredLeagues = [];
      let positions = [];
      let locationData = null;
      let availability = null;
      
      try {
        preferredLeagues = row.preferredLeagues ? JSON.parse(row.preferredLeagues) : [];
        if (!Array.isArray(preferredLeagues)) preferredLeagues = [];
      } catch (e) {
        preferredLeagues = [];
      }
      
      try {
        positions = row.positions ? JSON.parse(row.positions) : [];
        if (!Array.isArray(positions)) positions = [];
      } catch (e) {
        positions = [];
      }
      
      try {
        locationData = row.locationData ? JSON.parse(row.locationData) : null;
      } catch (e) {
        locationData = null;
      }
      
      try {
        availability = row.availability ? JSON.parse(row.availability) : null;
      } catch (e) {
        availability = null;
      }
      
      return {
        ...row,
        preferredLeagues,
        positions,
        locationData,
        availability
      };
    });

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

    // Notify coaches who have player alerts enabled for this age group / league
    alertService.sendNewPlayerAlerts({
      id: availabilityId,
      title,
      description,
      preferredLeagues: JSON.stringify(preferredLeagues || []),
      ageGroup,
      positions,
      location: location || ''
    }).catch((alertError) => {
      console.error('Failed to send child player availability alerts:', alertError);
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
      SELECT cpa.*, c."firstName", c."lastName", c."dateOfBirth"
      FROM child_player_availability cpa 
      JOIN children c ON cpa."childId" = c.id 
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

    const availability = (availabilityResult.rows || []).map(row => {
      let preferredLeagues = [];
      let positions = [];
      let locationData = null;
      let availability = null;
      
      try {
        preferredLeagues = row.preferredLeagues ? JSON.parse(row.preferredLeagues) : [];
        if (!Array.isArray(preferredLeagues)) preferredLeagues = [];
      } catch (e) {
        preferredLeagues = [];
      }
      
      try {
        positions = row.positions ? JSON.parse(row.positions) : [];
        if (!Array.isArray(positions)) positions = [];
      } catch (e) {
        positions = [];
      }
      
      try {
        locationData = row.locationData ? JSON.parse(row.locationData) : null;
      } catch (e) {
        locationData = null;
      }
      
      try {
        availability = row.availability ? JSON.parse(row.availability) : null;
      } catch (e) {
        availability = null;
      }
      
      return {
        ...row,
        preferredLeagues,
        positions,
        locationData,
        availability
      };
    });

    res.json({ availability });
  } catch (error) {
    console.error('Get public child player availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FAMILY RELATIONSHIPS ENDPOINTS ====================

// Get all family relationships for the current user
app.get('/api/family-relationships', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get relationships where user is the parent/primary
    const relationshipsResult = await db.query(`
      SELECT 
        fr.id,
        fr.userId,
        fr.relatedUserId,
        fr.childId,
        fr.relationship,
        fr.verifiedBy,
        fr.verifiedAt,
        fr.notes,
        fr.isActive,
        fr.createdAt,
        CASE 
          WHEN fr.relatedUserId IS NOT NULL THEN 
            (SELECT CONCAT(u.firstName, ' ', u.lastName) FROM users u WHERE u.id = fr.relatedUserId)
          WHEN fr.childId IS NOT NULL THEN 
            (SELECT CONCAT(c.firstName, ' ', c.lastName) FROM children c WHERE c.id = fr.childId)
        END as relatedName,
        CASE 
          WHEN fr.childId IS NOT NULL THEN 
            (SELECT c.dateOfBirth FROM children c WHERE c.id = fr.childId)
        END as relatedDateOfBirth
      FROM family_relationships fr
      WHERE fr.userId = ? AND fr.isActive = true
      ORDER BY fr.createdAt DESC
    `, [userId]);

    res.json({
      relationships: relationshipsResult.rows || []
    });
  } catch (error) {
    console.error('Get family relationships error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new family relationship
app.post('/api/family-relationships', [
  authenticateToken,
  body('childId').optional().isInt().withMessage('Valid child ID is required'),
  body('relatedUserId').optional().isInt().withMessage('Valid user ID is required'),
  body('relationship').isIn(['parent', 'child', 'sibling', 'guardian']).withMessage('Valid relationship type is required'),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { childId, relatedUserId, relationship, notes } = req.body;

    // Validate that exactly one of childId or relatedUserId is provided
    if ((childId && relatedUserId) || (!childId && !relatedUserId)) {
      return res.status(400).json({ 
        error: 'Must provide either childId OR relatedUserId, not both' 
      });
    }

    // If childId is provided, verify it exists and belongs to current user
    if (childId) {
      const childCheck = await db.query(
        'SELECT * FROM children WHERE id = ? AND parentId = ?',
        [childId, userId]
      );

      if (!childCheck.rows || childCheck.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Child not found or you do not have permission to link this child' 
        });
      }
    }

    // If relatedUserId is provided, verify user exists
    if (relatedUserId) {
      const userCheck = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [relatedUserId]
      );

      if (!userCheck.rows || userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Related user not found' });
      }
    }

    // Check if relationship already exists
    const existingCheck = await db.query(
      'SELECT * FROM family_relationships WHERE userId = ? AND (childId = ? OR relatedUserId = ?)',
      [userId, childId || null, relatedUserId || null]
    );

    if (existingCheck.rows && existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This relationship already exists' });
    }

    // Create the relationship
    const result = await db.query(
      `INSERT INTO family_relationships (userId, childId, relatedUserId, relationship, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, childId || null, relatedUserId || null, relationship, notes || null]
    );

    const newRelationship = await db.query(
      'SELECT * FROM family_relationships WHERE id = ?',
      [result.lastID || result.insertId]
    );

    res.json({
      message: 'Family relationship created successfully',
      relationship: newRelationship.rows[0]
    });
  } catch (error) {
    console.error('Create family relationship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a family relationship
app.delete('/api/family-relationships/:relationshipId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { relationshipId } = req.params;

    // Verify ownership
    const relationship = await db.query(
      'SELECT * FROM family_relationships WHERE id = ? AND userId = ?',
      [relationshipId, userId]
    );

    if (!relationship.rows || relationship.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found or you do not have permission' });
    }

    // Soft delete by setting isActive to false
    await db.query(
      'UPDATE family_relationships SET isActive = false WHERE id = ?',
      [relationshipId]
    );

    res.json({ message: 'Family relationship removed successfully' });
  } catch (error) {
    console.error('Delete family relationship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== COACH CHILDREN ENDPOINTS ====================

// Get coach's children (for coaches who are also parents)
app.get('/api/coach-children', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can access this endpoint' });
    }

    const coachId = req.user.userId;

    // Get all registered children relationships for this coach
    const coachChildrenResult = await db.query(`
      SELECT 
        cc.id,
        cc.coachId,
        cc.childId,
        cc.relationshipType,
        cc.relationshipVerified,
        cc.inSameTeam,
        cc.teamId,
        cc.notes,
        cc.createdAt,
        c.firstName,
        c.lastName,
        c.dateOfBirth,
        c.gender,
        c.preferredPosition,
        c.preferredTeamGender,
        t.teamName as currentTeamName,
        t.ageGroup as currentTeamAgeGroup
      FROM coach_children cc
      JOIN children c ON cc.childId = c.id
      LEFT JOIN teams t ON cc.teamId = t.id
      WHERE cc.coachId = ?
      ORDER BY c.firstName, c.lastName
    `, [coachId]);

    res.json({
      children: coachChildrenResult.rows || []
    });
  } catch (error) {
    console.error('Get coach children error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link a child to a coach (for coaches who are parents)
app.post('/api/coach-children', [
  authenticateToken,
  body('childId').isInt().withMessage('Valid child ID is required'),
  body('relationshipType').isIn(['parent', 'guardian', 'step_parent']).withMessage('Valid relationship type is required'),
  body('teamId').optional().isInt().withMessage('Valid team ID is required'),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can access this endpoint' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const coachId = req.user.userId;
    const { childId, relationshipType, teamId, notes } = req.body;

    // Verify child exists
    const childCheck = await db.query(
      'SELECT * FROM children WHERE id = ?',
      [childId]
    );

    if (!childCheck.rows || childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // If teamId provided, verify coach owns that team
    if (teamId) {
      const teamCheck = await db.query(
        'SELECT * FROM teams WHERE id = ? AND coachId = ?',
        [teamId, coachId]
      );

      if (!teamCheck.rows || teamCheck.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Team not found or you do not have permission to manage this team' 
        });
      }
    }

    // Check if relationship already exists
    const existingCheck = await db.query(
      'SELECT * FROM coach_children WHERE coachId = ? AND childId = ?',
      [coachId, childId]
    );

    if (existingCheck.rows && existingCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'This child is already linked to your coach account' 
      });
    }

    // Determine if child is in same team as coach
    const inSameTeam = teamId ? true : false;

    // Create the coach-child relationship
    const result = await db.query(
      `INSERT INTO coach_children (coachId, childId, relationshipType, inSameTeam, teamId, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [coachId, childId, relationshipType, inSameTeam, teamId || null, notes || null]
    );

    const newRelationship = await db.query(
      'SELECT * FROM coach_children WHERE id = ?',
      [result.lastID || result.insertId]
    );

    res.json({
      message: 'Child linked to coach account successfully',
      relationship: newRelationship.rows[0]
    });
  } catch (error) {
    console.error('Link coach child error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update coach-child relationship (e.g., when child joins/leaves coach's team)
app.put('/api/coach-children/:relationshipId', [
  authenticateToken,
  body('teamId').optional().isInt().withMessage('Valid team ID is required'),
  body('inSameTeam').optional().isBoolean().withMessage('Valid boolean required'),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can access this endpoint' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const coachId = req.user.userId;
    const { relationshipId } = req.params;
    const { teamId, inSameTeam, notes } = req.body;

    // Verify ownership
    const relationship = await db.query(
      'SELECT * FROM coach_children WHERE id = ? AND coachId = ?',
      [relationshipId, coachId]
    );

    if (!relationship.rows || relationship.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Relationship not found or you do not have permission' 
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (teamId !== undefined) {
      updates.push('teamId = ?');
      values.push(teamId);
    }

    if (inSameTeam !== undefined) {
      updates.push('inSameTeam = ?');
      values.push(inSameTeam);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    updates.push('updatedAt = NOW()');

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(relationshipId);

    await db.query(
      `UPDATE coach_children SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updatedRelationship = await db.query(
      'SELECT * FROM coach_children WHERE id = ?',
      [relationshipId]
    );

    res.json({
      message: 'Coach-child relationship updated successfully',
      relationship: updatedRelationship.rows[0]
    });
  } catch (error) {
    console.error('Update coach-child relationship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove coach-child relationship
app.delete('/api/coach-children/:relationshipId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can access this endpoint' });
    }

    const coachId = req.user.userId;
    const { relationshipId } = req.params;

    // Verify ownership
    const relationship = await db.query(
      'SELECT * FROM coach_children WHERE id = ? AND coachId = ?',
      [relationshipId, coachId]
    );

    if (!relationship.rows || relationship.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Relationship not found or you do not have permission' 
      });
    }

    // Delete the relationship
    await db.query(
      'DELETE FROM coach_children WHERE id = ?',
      [relationshipId]
    );

    res.json({ message: 'Coach-child relationship removed successfully' });
  } catch (error) {
    console.error('Delete coach-child relationship error:', error);
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
    const { includePending } = req.query;
    
    // Get active leagues
    const leaguesResult = await db.query(
      'SELECT id, name, region, country, url, description, hits FROM leagues WHERE isActive = true ORDER BY name'
    );

    let leagues = leaguesResult.rows || [];

    // If includePending is true and user is authenticated, include their pending league requests
    if (includePending === 'true') {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, JWT_SECRET);
          
          // Get user's pending league requests
          const pendingRequests = await db.query(
            `SELECT id, name, region, '' as country, url, description, 0 as hits, 
             'pending' as status, submittedBy as userId
             FROM league_requests 
             WHERE submittedBy = ? AND status = 'pending'
             ORDER BY name`,
            [decoded.userId]
          );

          // Add pending requests to leagues with a flag
          const pendingLeagues = (pendingRequests.rows || []).map(req => ({
            ...req,
            isPending: true,
            isActive: false
          }));

          leagues = [...leagues, ...pendingLeagues];
        } catch (jwtError) {
          // If token is invalid, just return active leagues
          console.log('Invalid token for includePending, returning only active leagues');
        }
      }
    }

    res.json({ leagues });
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

    if (req.user.role === 'Admin') {
      // Admins can see all match completions
      query = 'SELECT * FROM match_completions ORDER BY createdAt DESC';
      params = [];
    } else if (req.user.role === 'Coach') {
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

// Submit success story for admin approval
app.post(
  '/api/success-stories/submit',
  authenticateToken,
  [
    body('story').trim().isLength({ min: 20, max: 1000 }).withMessage('Story must be 20-1000 characters'),
    body('displayName').optional().isLength({ max: 100 }).withMessage('Name must be under 100 characters'),
    body('teamName').optional().isLength({ max: 120 }).withMessage('Team name must be under 120 characters'),
    body('position').optional().isLength({ max: 50 }).withMessage('Position must be under 50 characters'),
    body('ageGroup').optional().isLength({ max: 50 }).withMessage('Age group must be under 50 characters'),
    body('league').optional().isLength({ max: 120 }).withMessage('League must be under 120 characters'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('isAnonymous').optional().isBoolean().withMessage('Anonymous must be true/false'),
    body('role').optional().isLength({ max: 30 }).withMessage('Role must be under 30 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.userId;
      const {
        story,
        displayName,
        isAnonymous = false,
        role,
        teamName,
        position,
        ageGroup,
        league,
        rating
      } = req.body;

      const userResult = await db.query('SELECT firstName, lastName, email, role FROM users WHERE id = ?', [userId]);
      const user = userResult.rows?.[0];
      const fallbackName = user?.firstName || user?.lastName
        ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
        : (user?.email ? user.email.split('@')[0] : 'Community Member');

      const resolvedName = isAnonymous ? 'Anonymous' : (displayName && displayName.trim() ? displayName.trim() : fallbackName);
      const resolvedRole = role || user?.role || null;

      await db.query(
        `INSERT INTO success_story_submissions
          (userId, displayName, isAnonymous, role, teamName, position, ageGroup, league, rating, story, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          userId,
          resolvedName,
          !!isAnonymous,
          resolvedRole,
          teamName || null,
          position || null,
          ageGroup || null,
          league || null,
          rating || null,
          story.trim(),
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      res.json({ message: 'Success story submitted for review' });
    } catch (error) {
      console.error('Submit success story error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Admin: list success story submissions
app.get('/api/admin/success-story-submissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const submissionsResult = await db.query(
      `SELECT id, userId, displayName, isAnonymous, role, teamName, position, ageGroup, league,
              rating, story, status, adminNotes, createdAt, approvedAt
       FROM success_story_submissions
       WHERE status = ?
       ORDER BY createdAt DESC`,
      [status]
    );

    res.json({ submissions: submissionsResult.rows || [] });
  } catch (error) {
    console.error('Get success story submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: update success story submission status
app.patch('/api/admin/success-story-submissions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { status, adminNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateFields = ['status = ?', 'adminNotes = ?', 'updatedAt = ?'];
    const updateValues = [status, adminNotes || null, new Date().toISOString()];

    if (status === 'approved') {
      updateFields.push('approvedAt = ?', 'approvedBy = ?');
      updateValues.push(new Date().toISOString(), req.user.userId);
    }

    updateValues.push(submissionId);

    await db.query(
      `UPDATE success_story_submissions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Submission updated' });
  } catch (error) {
    console.error('Update success story submission error:', error);
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
       UNION ALL
       SELECT
        displayName as playerName,
        COALESCE(teamName, '') as teamName,
        COALESCE(position, '') as position,
        COALESCE(ageGroup, '') as ageGroup,
        COALESCE(league, '') as league,
        story as successStory,
        rating as rating,
        createdAt,
        COALESCE(approvedAt, createdAt) as completedAt
       FROM success_story_submissions
       WHERE status = 'approved'
       ORDER BY completedAt DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );

    const countStoriesResult = await db.query(
      `SELECT COUNT(*) as total FROM match_completions 
       WHERE completionStatus = 'confirmed' AND publicStory = true AND successStory IS NOT NULL`
    );

    const countSubmissionsResult = await db.query(
      `SELECT COUNT(*) as total FROM success_story_submissions WHERE status = 'approved'`
    );

    const total = (countStoriesResult.rows[0]?.total || 0) + (countSubmissionsResult.rows[0]?.total || 0);

    res.json({
      stories: storiesResult.rows || [],
      total
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
app.post('/api/messages', authenticateToken, messageLimiter, [
  body('message').isLength({ min: 1, max: 2000 }).withMessage('Message is required (max 2000 characters)'),
  body('conversationId').optional().isString().withMessage('Valid conversation ID required'),
  body('recipientId').optional().isInt().withMessage('Valid recipient ID required'),
  body('messageType').optional().isIn(['general', 'vacancy_interest', 'player_inquiry', 'training_invitation', 'match_update', 'availability_interest', 'system']).withMessage('Valid message type required'),
  body('relatedPlayerAvailabilityId').optional().isInt().withMessage('Valid availability ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const senderId = req.user.userId;
    const { message, conversationId, recipientId, messageType = 'general', subject, relatedPlayerAvailabilityId } = req.body;
    
    let actualRecipientId = recipientId;
    
    // If conversationId is provided, extract recipient from it
    if (conversationId && !recipientId) {
      const participantIds = conversationId.split('_').map(id => parseInt(id));
      actualRecipientId = participantIds.find(id => id !== parseInt(senderId));
    }
    
    if (!actualRecipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    // P0 SAFEGUARD: Check if recipient is blocked by sender
    const blockCheck = await db.query(
      'SELECT id FROM user_blocks WHERE blockerId = ? AND blockedUserId = ?',
      [actualRecipientId, senderId]
    );
    if (blockCheck.rows && blockCheck.rows.length > 0) {
      return res.status(403).json({ error: 'You have blocked this user' });
    }

    // P0 SAFEGUARD: If this is a child player availability, ensure sender is parent
    let isChildContext = false;
    if (relatedPlayerAvailabilityId) {
      const childAvailCheck = await db.query(
        `SELECT cpa."parentId", c."isActive"
         FROM child_player_availability cpa
         JOIN children c ON cpa."childId" = c.id
         WHERE cpa.id = ?`,
        [relatedPlayerAvailabilityId]
      );
      
      if (childAvailCheck.rows && childAvailCheck.rows.length > 0) {
        const { parentId } = childAvailCheck.rows[0];
        isChildContext = true;
        // Only the registered parent can message about this child
        if (senderId != parentId) {
          return res.status(403).json({ 
            error: 'Only the registered parent/guardian can message about this child availability' 
          });
        }
      }
    }

    // P2: Content safety validation
    const contentValidation = validateMessageContent(message, isChildContext);
    if (!contentValidation.safe) {
      return res.status(400).json({ error: contentValidation.violation });
    }

    // Insert the message
    const result = await db.query(
      `INSERT INTO messages (senderId, recipientId, subject, message, messageType, relatedPlayerAvailabilityId, isRead)
       VALUES (?, ?, ?, ?, ?, ?, false)`,
      [senderId, actualRecipientId, subject || 'Message', message, messageType, relatedPlayerAvailabilityId || null]
    );

    const messageId = result.lastID;

    // P3: Scan message against keyword alert rules
    try {
      const rulesResult = await db.query(
        'SELECT id, keyword, severity FROM keyword_alert_rules WHERE enabled = true'
      );

      if (rulesResult.rows && rulesResult.rows.length > 0) {
        const messageLower = message.toLowerCase();
        const matchedRules = rulesResult.rows.filter(rule => 
          messageLower.includes(rule.keyword.toLowerCase())
        );

        // Create alerts for matched rules
        for (const rule of matchedRules) {
          await db.query(
            `INSERT INTO message_alerts (messageId, ruleId, severity, status)
             VALUES (?, ?, ?, 'open')`,
            [messageId, rule.id, rule.severity]
          );
        }
      }
    } catch (alertError) {
      console.warn('Error processing keyword alerts:', alertError);
      // Don't fail the message send if keyword scanning fails
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      messageId: messageId
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

// =====================================================
// P2: MESSAGE SOFT DELETE & ADMIN MODERATION
// =====================================================

// P2: Delete message (soft delete - mark as deleted)
app.delete('/api/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Check if message exists and belongs to sender
    const messageCheck = await db.query(
      'SELECT senderId FROM messages WHERE id = ?',
      [messageId]
    );

    if (!messageCheck.rows || messageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (messageCheck.rows[0].senderId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Soft delete: mark as deleted
    await db.query(
      `UPDATE messages SET isDeleted = true, deletedReason = ? WHERE id = ?`,
      ['User deleted', messageId]
    );

    // Log moderation event
    await db.query(
      `INSERT INTO message_moderation_events (messageId, action, actorId, actorRole, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [messageId, 'message_deleted', userId, req.user.role, 'User-initiated deletion']
    );

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// P2: Admin - Get message reports (moderation queue)
app.get('/api/admin/message-reports', authenticateToken, async (req, res) => {
  try {
    // Check admin role
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status = 'open', limit = 50, offset = 0 } = req.query;

    // Get reports with message context
    const reportsQuery = `
      SELECT 
        mr.id, mr.messageId, mr.reporterId, mr.reason, mr.details, 
        mr.status, mr.moderatorNotes, mr.resolutionAction, mr.createdAt, mr.updatedAt, mr.resolvedAt,
        m.senderId, m.message, m.createdAt as messageCreatedAt,
        u_reporter.firstName as reporterName, u_reporter.email as reporterEmail,
        u_sender.firstName as senderName, u_sender.email as senderEmail
      FROM message_reports mr
      JOIN messages m ON mr.messageId = m.id
      JOIN users u_reporter ON mr.reporterId = u_reporter.id
      JOIN users u_sender ON m.senderId = u_sender.id
      WHERE mr.status = ?
      ORDER BY mr.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const reportsResult = await db.query(
      reportsQuery,
      [status, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM message_reports WHERE status = ?',
      [status]
    );

    res.json({
      reports: reportsResult.rows || [],
      total: countResult.rows[0]?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get message reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// P2: Admin - Update report status and add moderator notes
app.put('/api/admin/message-reports/:reportId', authenticateToken, [
  body('status').optional().isIn(['open', 'investigating', 'resolved', 'dismissed']),
  body('moderatorNotes').optional().isString().trim(),
  body('resolutionAction').optional().isString().trim()
], async (req, res) => {
  try {
    // Check admin role
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reportId } = req.params;
    const { status, moderatorNotes, resolutionAction } = req.body;

    // Check if report exists
    const reportCheck = await db.query('SELECT id FROM message_reports WHERE id = ?', [reportId]);
    if (!reportCheck.rows || reportCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update report
    const updateFields = [];
    const updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (moderatorNotes !== undefined) {
      updateFields.push('moderatorNotes = ?');
      updateValues.push(moderatorNotes);
    }
    if (resolutionAction !== undefined) {
      updateFields.push('resolutionAction = ?');
      updateValues.push(resolutionAction);
    }
    if (status === 'resolved' || status === 'dismissed') {
      updateFields.push('resolvedAt = CURRENT_TIMESTAMP');
    }

    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(reportId);

    await db.query(
      `UPDATE message_reports SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Log moderation event
    await db.query(
      `INSERT INTO message_moderation_events (action, actorId, actorRole, reason)
       VALUES (?, ?, ?, ?)`,
      ['report_updated', req.user.userId, req.user.role, `Status: ${status || 'N/A'}`]
    );

    res.json({ success: true, message: 'Report updated' });
  } catch (error) {
    console.error('Update message report error:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// =====================================================
// P3: AUTOMATED KEYWORD ALERT RULES
// =====================================================

// P3: Admin - Get all keyword alert rules
app.get('/api/admin/keyword-rules', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const rulesResult = await db.query(
      'SELECT * FROM keyword_alert_rules ORDER BY severity DESC, keyword ASC'
    );

    res.json({ rules: rulesResult.rows || [] });
  } catch (error) {
    console.error('Get keyword rules error:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// P3: Admin - Create new keyword alert rule
app.post('/api/admin/keyword-rules', authenticateToken, [
  body('keyword').notEmpty().isLength({ min: 2, max: 100 }).trim(),
  body('severity').optional().isIn(['low', 'medium', 'high']),
  body('description').optional().isString().trim(),
  body('enabled').optional().isBoolean()
], async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { keyword, severity = 'medium', description, enabled = true } = req.body;

    // Check if keyword already exists
    const existingCheck = await db.query(
      'SELECT id FROM keyword_alert_rules WHERE keyword = ?',
      [keyword]
    );
    if (existingCheck.rows && existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Keyword rule already exists' });
    }

    const result = await db.query(
      `INSERT INTO keyword_alert_rules (keyword, severity, description, enabled)
       VALUES (?, ?, ?, ?)`,
      [keyword, severity, description || null, enabled]
    );

    res.status(201).json({ success: true, ruleId: result.lastID });
  } catch (error) {
    console.error('Create keyword rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// P3: Admin - Update keyword alert rule
app.put('/api/admin/keyword-rules/:ruleId', authenticateToken, [
  body('severity').optional().isIn(['low', 'medium', 'high']),
  body('enabled').optional().isBoolean(),
  body('description').optional().isString().trim()
], async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ruleId } = req.params;
    const { severity, enabled, description } = req.body;

    const updates = [];
    const values = [];

    if (severity) {
      updates.push('severity = ?');
      values.push(severity);
    }
    if (enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(enabled);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(ruleId);

    await db.query(
      `UPDATE keyword_alert_rules SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update keyword rule error:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// P3: Admin - Delete keyword alert rule
app.delete('/api/admin/keyword-rules/:ruleId', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ruleId } = req.params;

    await db.query('DELETE FROM keyword_alert_rules WHERE id = ?', [ruleId]);

    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    console.error('Delete keyword rule error:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// P3: Get message alerts (admin)
app.get('/api/admin/message-alerts', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status = 'open', limit = 50, offset = 0 } = req.query;

    const alertsResult = await db.query(
      `SELECT ma.*, m.senderId, m.message, kar.keyword, kar.severity as ruleSeverity,
              u.firstName, u.lastName, u.email
       FROM message_alerts ma
       JOIN messages m ON ma.messageId = m.id
       JOIN keyword_alert_rules kar ON ma.ruleId = kar.id
       JOIN users u ON m.senderId = u.id 
       WHERE ma.status = ?
       ORDER BY ma.createdAt DESC
       LIMIT ? OFFSET ?`,
      [status, parseInt(limit), parseInt(offset)]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM message_alerts WHERE status = ?',
      [status]
    );

    res.json({
      alerts: alertsResult.rows || [],
      total: countResult.rows[0]?.count || 0
    });
  } catch (error) {
    console.error('Get message alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
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
      'INSERT INTO leagues (name, description, createdby, isactive) VALUES (?, ?, ?, true) RETURNING *',
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
    // Verify admin role
    if (!req.user || req.user.role !== 'Admin') {
      console.log('[Admin Users] Access denied - not admin. User role:', req.user?.role);
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    console.log('[Admin Users] Admin request from user:', req.user.userId);
    
    const result = await db.query(`
      SELECT
        id,
        email,
        firstname as "firstName",
        lastname as "lastName",
        role,
        betaaccess as "betaAccess",
        createdat as "createdAt",
        isemailverified as "isEmailVerified",
        isblocked as "isBlocked"
      FROM users
      ORDER BY createdat DESC
      LIMIT 100
    `);

    const users = (result.rows || []).map((user) => ({
      ...user,
      betaAccess: Boolean(user.betaAccess ?? user.betaaccess),
      isEmailVerified: Boolean(user.isEmailVerified ?? user.isemailverified),
      isBlocked: Boolean(user.isBlocked ?? user.isblocked),
    }));

    console.log(`[Admin Users] Query successful, found ${users.length} users`);
    res.json({ users });
  } catch (error) {
    console.error('[Admin Users] Query failed:', error.message);
    console.error('[Admin Users] Error details:', error);
    res.status(500).json({ error: error.message });
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
    // Check admin role inline
    if (!req.user || req.user.role !== 'Admin') {
      console.log('[Delete User] Not admin, role:', req.user?.role);
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const targetUserId = parseInt(id, 10);
    const adminUserId = parseInt(req.user.userId, 10);

    console.log('[Delete User] Admin:', adminUserId, 'Target:', targetUserId);

    // Prevent self-deletion
    if (adminUserId === targetUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Handle foreign key constraints - delete/clear related records first
    try {
      // Delete trial invitations created by this user
      await db.query('DELETE FROM trial_invitations WHERE invitedBy = ?', [targetUserId]);
      console.log('[Delete User] Deleted trial invitations');

      // Delete calendar events created by this user
      await db.query('DELETE FROM calendar_events WHERE createdBy = ?', [targetUserId]);
      console.log('[Delete User] Deleted calendar events');

      // Delete/update success stories
      await db.query('DELETE FROM success_stories WHERE submittedBy = ? OR reviewedBy = ?', [targetUserId, targetUserId]);
      console.log('[Delete User] Deleted success stories');

      // Delete team vacancies (or clear postedBy)
      await db.query('DELETE FROM team_vacancies WHERE postedBy = ?', [targetUserId]);
      console.log('[Delete User] Deleted team vacancies');

      // Delete player availability
      await db.query('DELETE FROM player_availability WHERE postedBy = ?', [targetUserId]);
      console.log('[Delete User] Deleted player availability');

      // Delete other related data
      await db.query('DELETE FROM team_rosters WHERE userId = ?', [targetUserId]);
      await db.query('DELETE FROM child_players WHERE parentId = ?', [targetUserId]);
      await db.query('DELETE FROM messages WHERE senderId = ? OR recipientId = ?', [targetUserId, targetUserId]);
      await db.query('DELETE FROM notifications WHERE userId = ?', [targetUserId]);
      console.log('[Delete User] Deleted other related data');

    } catch (cleanupError) {
      console.warn('[Delete User] Warning during cleanup:', cleanupError.message);
      // Continue - try to delete user anyway
    }

    // Now delete the user record
    const result = await db.query(
      'DELETE FROM users WHERE id = ?', 
      [targetUserId]
    );

    console.log('[Delete User] User deleted, rows affected:', result.rowCount);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[Delete User] Error:', error.message);
    console.error('[Delete User] Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// Frozen adverts search (admin only)
app.get('/api/admin/frozen-adverts', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type, search } = req.query;
    const term = typeof search === 'string' ? search.trim().toLowerCase() : '';

    const results = {
      vacancies: [],
      playerAvailability: []
    };

    if (!type || type === 'vacancy') {
      let vacancyQuery = `
        SELECT 
          tv.id,
          tv.title,
          tv.description,
          tv.league,
          tv.ageGroup,
          tv.position,
          tv.teamGender,
          tv.location,
          tv.contactInfo,
          tv.postedBy,
          tv.createdAt,
          tv.status,
          tv.isFrozen,
          u.email,
          u.firstname as firstName,
          u.lastname as lastName
        FROM team_vacancies tv
        LEFT JOIN users u ON tv.postedBy = u.id
        WHERE tv.isFrozen = 1
      `;

      const vacancyParams = [];
      if (term) {
        vacancyQuery += ` AND (
          LOWER(tv.title) LIKE ? OR
          LOWER(tv.description) LIKE ? OR
          LOWER(tv.location) LIKE ? OR
          LOWER(tv.league) LIKE ? OR
          LOWER(u.email) LIKE ?
        )`;
        const likeTerm = `%${term}%`;
        vacancyParams.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm);
      }

      vacancyQuery += ' ORDER BY tv.createdAt DESC';

      const vacancyResult = await db.query(vacancyQuery, vacancyParams);
      results.vacancies = vacancyResult.rows || [];
    }

    if (!type || type === 'player') {
      let availabilityQuery = `
        SELECT 
          pa.id,
          pa.title,
          pa.description,
          pa.ageGroup,
          pa.positions,
          pa.preferredTeamGender,
          pa.location,
          pa.contactInfo,
          pa.postedBy,
          pa.createdAt,
          pa.status,
          pa.isFrozen,
          u.email,
          u.firstname as firstName,
          u.lastname as lastName
        FROM player_availability pa
        LEFT JOIN users u ON pa.postedBy = u.id
        WHERE pa.isFrozen = 1
      `;

      const availabilityParams = [];
      if (term) {
        availabilityQuery += ` AND (
          LOWER(pa.title) LIKE ? OR
          LOWER(pa.description) LIKE ? OR
          LOWER(pa.location) LIKE ? OR
          LOWER(u.email) LIKE ?
        )`;
        const likeTerm = `%${term}%`;
        availabilityParams.push(likeTerm, likeTerm, likeTerm, likeTerm);
      }

      availabilityQuery += ' ORDER BY pa.createdAt DESC';

      const availabilityResult = await db.query(availabilityQuery, availabilityParams);
      results.playerAvailability = availabilityResult.rows || [];
    }

    res.json(results);
  } catch (error) {
    console.error('[Admin Frozen Adverts] Error:', error);
    res.status(500).json({ error: 'Failed to fetch frozen adverts' });
  }
});

// Delete adverts (admin only)
app.delete('/api/admin/adverts/:type/:id', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type, id } = req.params;

    if (type === 'vacancy') {
      await db.query('DELETE FROM team_vacancies WHERE id = ?', [id]);
    } else if (type === 'player') {
      await db.query('DELETE FROM player_availability WHERE id = ?', [id]);
    } else {
      return res.status(400).json({ error: 'Invalid advert type' });
    }

    res.json({ message: 'Advert deleted successfully' });
  } catch (error) {
    console.error('[Admin Adverts] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete advert' });
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
    const { subject, message } = req.body;
    
    // Check if user is admin
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const targetResult = await db.query('SELECT email, firstName FROM users WHERE id = ?', [id]);
    if (!targetResult.rows || targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = targetResult.rows[0];
    const messageSubject = (subject && String(subject).trim()) || 'Message from The Grassroots Hub Admin';

    let emailDelivery = 'sent';
    try {
      await emailService.sendAdminMessage(targetUser.email, targetUser.firstName || 'there', messageSubject, message || '');
    } catch (emailError) {
      console.error('[Admin Users] Email delivery failed:', emailError.message);
      emailDelivery = 'failed';
    }

    res.json({ message: 'Message sent successfully', emailDelivery });
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
    const userCheck = await db.query('SELECT betaaccess, email, firstName FROM users WHERE id = ?', [id]);
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

    if (!currentBetaAccess && Boolean(savedValue)) {
      emailService
        .sendBetaAccessGranted(userCheck.rows[0].email, userCheck.rows[0].firstName || 'there')
        .catch((emailError) => {
          console.error('[Beta Access POST] Failed to send beta access email:', emailError.message);
        });
    }
    
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
    const userCheck = await db.query('SELECT betaaccess, email, firstName FROM users WHERE id = ?', [id]);
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

    if (!currentBetaAccess && boolValue) {
      emailService
        .sendBetaAccessGranted(userCheck.rows[0].email, userCheck.rows[0].firstName || 'there')
        .catch((emailError) => {
          console.error('[Beta Access PATCH] Failed to send beta access email:', emailError.message);
        });
    }
    
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
      'INSERT INTO leagues (name, description, createdBy, isActive) VALUES (?, ?, ?, true) RETURNING *',
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
    
    // Get active listings only (exclude filled/expired/inactive records)
    const activeTeamVacancies = await db.query("SELECT COUNT(*) as count FROM team_vacancies WHERE status = 'active'");
    const activePlayerListings = await db.query("SELECT COUNT(*) as count FROM player_availability WHERE status = 'active'");
    const activeListings = Number(activeTeamVacancies.rows[0].count || 0) + Number(activePlayerListings.rows[0].count || 0);

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

    // Get last 7 days of traffic data (including today, excluding admin users)
    const trafficData = await db.query(
      `SELECT 
         DATE(timestamp) as dayKey,
         COUNT(*) as visits,
         COUNT(DISTINCT pv.sessionId) as uniqueUsers
       FROM page_views pv
       LEFT JOIN users u ON pv.userId = u.id
       WHERE DATE(timestamp) >= date('now', '-6 days')
       AND (u.id IS NULL OR u.role != 'Admin')
       GROUP BY DATE(timestamp)
       ORDER BY DATE(timestamp)`
    );

    const trafficLookup = new Map(
      (trafficData.rows || []).map((row) => [
        row.dayKey,
        {
          visits: Number(row.visits || 0),
          uniqueUsers: Number(row.uniqueUsers || 0),
        },
      ])
    );

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const toLocalDateKey = (dateObj) => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const now = new Date();
    const weeklySeries = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const current = new Date(now);
      current.setDate(now.getDate() - offset);
      const key = toLocalDateKey(current);
      const values = trafficLookup.get(key) || { visits: 0, uniqueUsers: 0 };
      weeklySeries.push({
        date: dayLabels[current.getDay()],
        visits: values.visits,
        uniqueUsers: values.uniqueUsers,
      });
    }

    res.json(weeklySeries);
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

    // Get last 6 months of successful matches (including current month)
    const matchData = await db.query(
      `SELECT 
         strftime('%Y-%m', DATE(completedAt)) as monthKey,
         COUNT(*) as matches
       FROM match_completions
       WHERE completionStatus = 'confirmed' 
         AND DATE(completedAt) >= date('now', 'start of month', '-5 months')
       GROUP BY monthKey
       ORDER BY monthKey`
    );

    const matchesLookup = new Map(
      (matchData.rows || []).map((row) => [row.monthKey, Number(row.matches || 0)])
    );

    const monthlySeries = [];
    const start = new Date();
    start.setDate(1);
    start.setMonth(start.getMonth() - 5);

    for (let i = 0; i < 6; i += 1) {
      const monthDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      monthlySeries.push({
        month: monthDate.toLocaleString('en-US', { month: 'short' }),
        matches: matchesLookup.get(monthKey) || 0,
      });
    }

    res.json(monthlySeries);
  } catch (error) {
    console.error('Get monthly matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// ADMIN FEEDBACK ENDPOINTS
// ===========================

// Get all feedback for admin dashboard
app.get('/api/admin/feedback', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { feedbackType, status, priority, category } = req.query;

    // Build query with proper filtering
    let query = `
      SELECT uf.*,
        COALESCE((SELECT COUNT(*) FROM feedback_comments WHERE feedbackId = uf.id), 0) as commentCount
      FROM user_feedback uf
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

    const feedbackResult = await db.query(query, params);
    const feedback = feedbackResult.rows || [];

    // Get summary stats
    const statsResult = await db.query(`
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
    const stats = statsResult.rows && statsResult.rows.length > 0 ? statsResult.rows[0] : {
      total: 0,
      bugs: 0,
      improvements: 0,
      newItems: 0,
      inProgress: 0,
      completed: 0,
      critical: 0
    };

    res.json({ feedback, stats });
  } catch (error) {
    console.error('Error fetching admin feedback:', error);
    // Return empty data instead of 500 if table doesn't exist yet
    res.json({ 
      feedback: [], 
      stats: {
        total: 0,
        bugs: 0,
        improvements: 0,
        newItems: 0,
        inProgress: 0,
        completed: 0,
        critical: 0
      }
    });
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

    await db.query(`
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

    await db.query('DELETE FROM user_feedback WHERE id = ?', [feedbackId]);

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// ===========================
// USER FEEDBACK ENDPOINTS
// ===========================

// Get user's own feedback submissions
app.get('/api/feedback/my-submissions', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        uf.id,
        uf.category,
        uf.title as subject,
        uf.description,
        uf.status,
        uf.priority,
        uf.createdat as createdAt,
        uf.updatedat as updatedAt,
        COUNT(fc.id) as commentCount
      FROM user_feedback uf
      LEFT JOIN feedback_comments fc ON uf.id = fc.feedbackid
      WHERE uf.userid = ?
      GROUP BY uf.id
      ORDER BY uf.createdat DESC
    `, [req.user.userId]);

    res.json({ feedback: result.rows || [] });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get specific feedback with comments
app.get('/api/feedback/:feedbackId', authenticateToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;

    // Get feedback
    const feedbackResult = await db.query(`
      SELECT 
        uf.id,
        uf.userid,
        uf.category,
        uf.title as subject,
        uf.description,
        uf.status,
        uf.priority,
        uf.createdat as createdAt,
        uf.updatedat as updatedAt,
        u.email,
        u.firstname,
        u.lastname
      FROM user_feedback uf
      JOIN users u ON uf.userid = u.id
      WHERE uf.id = ?
    `, [feedbackId]);

    if (!feedbackResult.rows || feedbackResult.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const feedback = feedbackResult.rows[0];

    // Check access: only owner or admin can view
    if (feedback.userid !== req.user.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get comments
    const commentsResult = await db.query(`
      SELECT 
        fc.id,
        fc.comment,
        fc.isadmincomment as isAdminComment,
        fc.createdat as createdAt,
        u.email,
        u.firstname,
        u.lastname
      FROM feedback_comments fc
      JOIN users u ON fc.userid = u.id
      WHERE fc.feedbackid = ?
      ORDER BY fc.createdat ASC
    `, [feedbackId]);

    feedback.comments = commentsResult.rows || [];

    res.json(feedback);
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
    const feedbackResult = await db.query('SELECT * FROM user_feedback WHERE id = ?', [feedbackId]);
    if (!feedbackResult.rows || feedbackResult.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const feedback = feedbackResult.rows[0];

    // Only allow feedback owner or admins to comment
    if (feedback.userid !== req.user.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isAdminComment = req.user.role === 'Admin';

    await db.query(`
      INSERT INTO feedback_comments (feedbackid, userid, comment, isadmincomment)
      VALUES (?, ?, ?, ?)
    `, [feedbackId, req.user.userId, comment.trim(), isAdminComment]);

    // Update the feedback's updatedAt timestamp
    await db.query('UPDATE user_feedback SET updatedat = CURRENT_TIMESTAMP WHERE id = ?', [feedbackId]);

    res.status(201).json({ message: 'Comment added successfully' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ===========================
// SUPPORT MESSAGES ENDPOINTS
// ===========================

// Submit support message (public endpoint - no auth required for contact form)
app.post('/api/support/submit', async (req, res) => {
  try {
    const { name, email, subject, message, userId, userAgent, pageUrl } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject, and message are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Insert support message
    await db.query(`
      INSERT INTO support_messages 
      (name, email, subject, message, userId, userAgent, pageUrl, status, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'new', 'normal')
    `, [
      name.trim(),
      email.trim().toLowerCase(),
      subject.trim(),
      message.trim(),
      userId || null,
      userAgent || null,
      pageUrl || null
    ]);

    res.status(201).json({ 
      message: 'Your message has been sent successfully. We will respond as soon as possible.',
      success: true 
    });
  } catch (error) {
    console.error('Error submitting support message:', error);
    res.status(500).json({ error: 'Failed to submit message. Please try again.' });
  }
});

// Get all support messages (Admin only)
app.get('/api/admin/support', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, priority } = req.query;

    let query = `
      SELECT 
        sm.id,
        sm.name,
        sm.email,
        sm.subject,
        sm.message,
        sm.userId,
        sm.userAgent,
        sm.pageUrl,
        sm.status,
        sm.priority,
        sm.assignedTo,
        sm.adminNotes,
        sm.createdAt,
        sm.respondedAt,
        sm.resolvedAt,
        u.firstname,
        u.lastname
      FROM support_messages sm
      LEFT JOIN users u ON sm.userId = u.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND sm.status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND sm.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY sm.createdAt DESC';

    const result = await db.query(query, params);

    res.json({ messages: result.rows || [] });
  } catch (error) {
    console.error('Error fetching support messages:', error);
    res.status(500).json({ error: 'Failed to fetch support messages' });
  }
});

// Update support message status (Admin only)
app.patch('/api/admin/support/:messageId', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { messageId } = req.params;
    const { status, priority, adminNotes, assignedTo } = req.body;

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);

      // Set timestamps based on status
      if (status === 'in_progress' || status === 'responded') {
        updates.push('respondedAt = CURRENT_TIMESTAMP');
      } else if (status === 'resolved' || status === 'closed') {
        updates.push('resolvedAt = CURRENT_TIMESTAMP');
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

    if (assignedTo !== undefined) {
      updates.push('assignedTo = ?');
      params.push(assignedTo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(messageId);

    await db.query(
      `UPDATE support_messages SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Support message updated successfully' });
  } catch (error) {
    console.error('Error updating support message:', error);
    res.status(500).json({ error: 'Failed to update support message' });
  }
});

// Get email delivery logs (Admin only)
app.get('/api/admin/email-delivery-logs', authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0 || userResult.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const requestedStatus = typeof req.query.status === 'string' ? req.query.status.toLowerCase() : 'failed';
    const status = requestedStatus === 'sent' || requestedStatus === 'failed' ? requestedStatus : 'failed';
    const recipient = typeof req.query.recipient === 'string' ? req.query.recipient.trim().toLowerCase() : '';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const sinceDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();

    let query = `
      SELECT id, recipientEmail, templateName, subject, status, messageId, errorCode, errorMessage, provider, metadata, createdAt
      FROM email_delivery_logs
      WHERE createdAt >= ?
    `;
    const params = [sinceDate];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (recipient) {
      query += ' AND LOWER(recipientEmail) LIKE ?';
      params.push(`%${recipient}%`);
    }

    query += ' ORDER BY createdAt DESC LIMIT ?';
    params.push(limit);

    const logsResult = await db.query(query, params);
    const summaryResult = await db.query(
      `SELECT status, COUNT(*) as count
       FROM email_delivery_logs
       WHERE createdAt >= ?
       GROUP BY status`,
      [sinceDate]
    );

    const logs = (logsResult.rows || []).map((row) => {
      let parsedMetadata = null;
      const metadata = row.metadata;

      if (typeof metadata === 'string' && metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (error) {
          parsedMetadata = { raw: metadata };
        }
      } else if (metadata && typeof metadata === 'object') {
        parsedMetadata = metadata;
      }

      return {
        id: row.id,
        recipientEmail: row.recipientEmail || row.recipientemail,
        templateName: row.templateName || row.templatename,
        subject: row.subject,
        status: row.status,
        messageId: row.messageId || row.messageid,
        errorCode: row.errorCode || row.errorcode,
        errorMessage: row.errorMessage || row.errormessage,
        provider: row.provider,
        metadata: parsedMetadata,
        createdAt: row.createdAt || row.createdat
      };
    });

    const summary = {
      sent: 0,
      failed: 0
    };

    (summaryResult.rows || []).forEach((entry) => {
      const key = String(entry.status || '').toLowerCase();
      const count = Number(entry.count || 0);
      if (key === 'sent' || key === 'failed') {
        summary[key] = count;
      }
    });

    res.json({
      logs,
      summary,
      filters: {
        status,
        recipient,
        limit,
        days
      }
    });
  } catch (error) {
    console.error('Error fetching email delivery logs:', error);
    res.status(500).json({ error: 'Failed to fetch email delivery logs' });
  }
});

// ===========================
// ANALYTICS ENDPOINTS
// ===========================

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
    const { latitude, longitude, radius, hasVacancies, locationType = 'training' } = req.query;
    
    // Get all training events with coordinates
    // Use database-agnostic date comparison (both SQLite and PostgreSQL support CAST)
    let query = `
      SELECT ce.*, u.firstName, u.lastName, u.email as contactEmail,
             (SELECT COUNT(*) FROM event_participants WHERE eventId = ce.id) as participantCount
      FROM calendar_events ce
      JOIN users u ON ce.createdBy = u.id
      WHERE ce.eventType = ?
        AND ce.latitude IS NOT NULL 
        AND ce.longitude IS NOT NULL
        AND CAST(ce.date AS DATE) >= CAST(NOW() AS DATE)
    `;
    
    const queryParams = [locationType];
    
    // Filter by vacancy status if requested
    if (hasVacancies === 'true') {
      query += ' AND ce.hasVacancies = TRUE';
    }
    
    query += ' ORDER BY ce.date ASC, ce.startTime ASC';
    
    const events = await db.query(query, queryParams);
    const eventRows = events.rows || events || [];
    
    // If location provided, calculate distances and filter by radius
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      const maxRadius = radius ? parseFloat(radius) : 50; // Default 50km radius
      
      // Calculate distance for each event using Haversine formula
      const eventsWithDistance = eventRows.map(event => {
        if (!event.latitude || !event.longitude) {
          return null;
        }
        
        const eventLat = parseFloat(event.latitude);
        const eventLon = parseFloat(event.longitude);
        
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
        
        let locationData = null;
        if (event.locationData) {
          try {
            locationData = JSON.parse(event.locationData);
          } catch (parseErr) {
            console.error('Error parsing locationData for event', event.id, parseErr.message);
            locationData = null;
          }
        }
        
        return {
          ...event,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          locationData: locationData
        };
      })
      .filter(event => event !== null && event.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance);
      
      res.json({ 
        trainingLocations: eventsWithDistance,
        userLocation: { latitude: userLat, longitude: userLon },
        radius: maxRadius
      });
    } else {
      // Return all events without distance calculation
      res.json({ 
        trainingLocations: eventRows.map(event => ({
          ...event,
          locationData: event.locationData ? JSON.parse(event.locationData) : null
        }))
      });
    }
  } catch (error) {
    console.error('Get training locations error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Email Alerts endpoints
// Create a new email alert
app.post('/api/email-alerts', authenticateToken, async (req, res) => {
  try {
    const { alertType, filters, searchRegion } = req.body;
    
    const result = await db.query(
      `INSERT INTO email_alerts (userId, email, alertType, filters, searchRegion) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        req.user.email,
        alertType || 'saved_search',
        JSON.stringify(filters || {}),
        JSON.stringify(searchRegion || null)
      ]
    );

    res.status(201).json({
      message: 'Email alert created successfully',
      alertId: result.lastID || result.insertId
    });
  } catch (error) {
    console.error('Create email alert error:', error);
    res.status(500).json({ error: 'Failed to create email alert' });
  }
});

// Get all email alerts for the current user
app.get('/api/email-alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await db.query(
      'SELECT * FROM email_alerts WHERE userId = ? ORDER BY createdAt DESC',
      [req.user.userId]
    );

    const alertRows = alerts.rows || alerts || [];
    const parsedAlerts = alertRows.map(alert => ({
      ...alert,
      filters: alert.filters ? JSON.parse(alert.filters) : {},
      searchRegion: alert.searchRegion ? JSON.parse(alert.searchRegion) : null
    }));

    res.json({ alerts: parsedAlerts });
  } catch (error) {
    console.error('Get email alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch email alerts' });
  }
});

// Update an email alert
app.put('/api/email-alerts/:alertId', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { isActive, filters, searchRegion } = req.body;

    // Verify the alert belongs to the user
    const alert = await db.query(
      'SELECT * FROM email_alerts WHERE id = ? AND userId = ?',
      [alertId, req.user.userId]
    );

    if (!alert.rows || alert.rows.length === 0) {
      return res.status(404).json({ error: 'Email alert not found' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (typeof isActive !== 'undefined') {
      updates.push('isActive = ?');
      params.push(isActive ? 1 : 0);
    }

    if (filters) {
      updates.push('filters = ?');
      params.push(JSON.stringify(filters));
    }

    if (searchRegion) {
      updates.push('searchRegion = ?');
      params.push(JSON.stringify(searchRegion));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(alertId, req.user.userId);

    await db.query(
      `UPDATE email_alerts SET ${updates.join(', ')} WHERE id = ? AND userId = ?`,
      params
    );

    res.json({ message: 'Email alert updated successfully' });
  } catch (error) {
    console.error('Update email alert error:', error);
    res.status(500).json({ error: 'Failed to update email alert' });
  }
});

// Delete an email alert
app.delete('/api/email-alerts/:alertId', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;

    const result = await db.query(
      'DELETE FROM email_alerts WHERE id = ? AND userId = ?',
      [alertId, req.user.userId]
    );

    if (result.affectedRows === 0 && result.changes === 0) {
      return res.status(404).json({ error: 'Email alert not found' });
    }

    res.json({ message: 'Email alert deleted successfully' });
  } catch (error) {
    console.error('Delete email alert error:', error);
    res.status(500).json({ error: 'Failed to delete email alert' });
  }
});

// Test an email alert by sending a sample notification
app.post('/api/email-alerts/:alertId/test', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;

    const alertResult = await db.query(
      'SELECT * FROM email_alerts WHERE id = ? AND userId = ? AND isActive = 1',
      [alertId, req.user.userId]
    );

    if (!alertResult.rows || alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active email alert not found' });
    }

    const userResult = await db.query('SELECT firstName, email FROM users WHERE id = ?', [req.user.userId]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const testVacancy = {
      id: 'test-alert',
      title: 'Test Vacancy Alert',
      position: 'Midfielder',
      league: 'Local League',
      ageGroup: 'U16',
      location: 'Your Area',
      description: 'This is a test alert email to confirm your notification setup is working.'
    };

    await emailService.sendNewVacancyAlert(user.email, user.firstName || 'there', testVacancy);

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email alert error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Alert preferences — GET and PUT
app.get('/api/alerts/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await alertService.getAlertPreferences(req.user.userId);
    res.json({ preferences });
  } catch (error) {
    console.error('Get alert preferences error:', error);
    res.status(500).json({ error: 'Failed to load alert preferences' });
  }
});

app.put('/api/alerts/preferences', authenticateToken, async (req, res) => {
  try {
    await alertService.setAlertPreferences(req.user.userId, req.body);
    res.json({ message: 'Alert preferences saved successfully' });
  } catch (error) {
    console.error('Set alert preferences error:', error);
    res.status(500).json({ error: 'Failed to save alert preferences' });
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

    alertService.sendTrialInvitationAlert(
      playerId,
      `${event.firstName} ${event.lastName}`,
      event,
      message
    ).catch((emailError) => {
      console.error('Failed to send trial invitation email alert:', emailError);
    });

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

    // Notify coach of response (in-app)
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

    // Also send email to coach
    db.query('SELECT email, firstName FROM users WHERE id = ?', [invitation.invitedBy])
      .then((coachResult) => {
        if (coachResult.rows && coachResult.rows.length > 0) {
          const coach = coachResult.rows[0];
          const coachEmail = encryptionService.decrypt(coach.email);
          emailService.sendTrialResponse(
            coachEmail,
            coach.firstName || 'Coach',
            `${invitation.firstName} ${invitation.lastName}`,
            invitation.title,
            status
          ).catch((emailError) => {
            console.error('Failed to send trial response email to coach:', emailError);
          });
        }
      })
      .catch((lookupError) => {
        console.error('Failed to look up coach for trial response email:', lookupError);
      });

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

// ─── Training Sessions (open / pay-to-join sessions created by coaches) ──────
// Backed by calendar_events (eventType='training'). Extra fields (price, etc.)
// are JSON-encoded in the locationData column.

app.get('/api/training/sessions', authenticateToken, async (req, res) => {
  try {
    const isCoach = req.user.role === 'Coach' || req.user.role === 'Admin';
    let rows;

    if (isCoach) {
      const result = await db.query(
        `SELECT ce.*, u.firstName, u.lastName
         FROM calendar_events ce
         JOIN users u ON ce.createdBy = u.id
         WHERE ce.eventType = 'training' AND ce.createdBy = ?
         ORDER BY ce.date DESC, ce.startTime ASC`,
        [req.user.userId]
      );
      rows = result.rows || [];
    } else {
      // Players see all scheduled training sessions; include their own registration
      const result = await db.query(
        `SELECT ce.*, u.firstName, u.lastName,
                otr.id AS reg_id, otr.status AS reg_status,
                otr.paymentStatus AS reg_payment_status
         FROM calendar_events ce
         JOIN users u ON ce.createdBy = u.id
         LEFT JOIN open_training_registrations otr
           ON otr.eventId = ce.id AND otr.userId = ?
         WHERE ce.eventType = 'training' AND ce.status = 'scheduled'
         ORDER BY ce.date ASC, ce.startTime ASC`,
        [req.user.userId]
      );
      rows = result.rows || [];
    }

    const sessions = rows.map(row => {
      let extras = {};
      try { extras = JSON.parse(row.locationData || '{}'); } catch {}
      return {
        id: row.id,
        coach_id: row.createdBy,
        title: row.title,
        description: row.description || '',
        date: row.date,
        time: row.startTime,
        location: row.location || '',
        max_spaces: row.maxParticipants || 0,
        current_participants: row.currentParticipants || 0,
        price: extras.price || 0,
        price_type: extras.price_type || 'per_session',
        includes_equipment: extras.includes_equipment || false,
        includes_facilities: extras.includes_facilities || false,
        payment_methods: extras.payment_methods || 'cash,bank_transfer',
        refund_policy: extras.refund_policy || '',
        special_offers: extras.special_offers || '',
        coach_name: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
        created_at: row.createdAt,
        updated_at: row.createdAt,
        // Player's own registration (null if not registered / coach view)
        my_registration: row.reg_id
          ? { id: row.reg_id, status: row.reg_status, paymentStatus: row.reg_payment_status }
          : null,
      };
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get training sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch training sessions' });
  }
});

app.post('/api/training/sessions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only coaches can create training sessions' });
    }
    const { title, description, date, time, location, max_spaces,
            price, price_type, includes_equipment, includes_facilities,
            payment_methods, refund_policy, special_offers } = req.body;

    if (!title || !date || !time || !location) {
      return res.status(400).json({ error: 'Title, date, time and location are required' });
    }

    const extraData = JSON.stringify({
      price: price || 0,
      price_type: price_type || 'per_session',
      includes_equipment: !!includes_equipment,
      includes_facilities: !!includes_facilities,
      payment_methods: payment_methods || 'cash,bank_transfer',
      refund_policy: refund_policy || '',
      special_offers: special_offers || '',
    });

    const result = await db.query(
      `INSERT INTO calendar_events
         (title, description, eventType, date, startTime, endTime, location,
          locationData, createdBy, maxParticipants, hasVacancies, status, createdAt)
       VALUES (?, ?, 'training', ?, ?, ?, ?, ?, ?, ?, TRUE, 'scheduled', CURRENT_TIMESTAMP)`,
      [title, description || '', date, time, time, location,
       extraData, req.user.userId, max_spaces || null]
    );

    res.status(201).json({ id: result.lastID, message: 'Training session created successfully' });
  } catch (error) {
    console.error('Create training session error:', error);
    res.status(500).json({ error: 'Failed to create training session' });
  }
});

app.put('/api/training/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const owned = await db.query(
      `SELECT id, createdBy, locationData FROM calendar_events WHERE id = ? AND eventType = 'training'`,
      [sessionId]
    );
    if (!owned.rows?.length) return res.status(404).json({ error: 'Session not found' });
    if (String(owned.rows[0].createdBy) !== String(req.user.userId) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized to edit this session' });
    }

    const { title, description, date, time, location, max_spaces,
            price, price_type, includes_equipment, includes_facilities,
            payment_methods, refund_policy, special_offers } = req.body;

    let existingExtras = {};
    try { existingExtras = JSON.parse(owned.rows[0].locationData || '{}'); } catch {}

    const updatedExtras = JSON.stringify({
      ...existingExtras,
      ...(price !== undefined && { price }),
      ...(price_type && { price_type }),
      ...(includes_equipment !== undefined && { includes_equipment: !!includes_equipment }),
      ...(includes_facilities !== undefined && { includes_facilities: !!includes_facilities }),
      ...(payment_methods && { payment_methods }),
      ...(refund_policy !== undefined && { refund_policy }),
      ...(special_offers !== undefined && { special_offers }),
    });

    await db.query(
      `UPDATE calendar_events
       SET title = ?, description = ?, date = ?, startTime = ?, endTime = ?,
           location = ?, locationData = ?, maxParticipants = ?
       WHERE id = ?`,
      [title, description || '', date, time, time, location,
       updatedExtras, max_spaces || null, sessionId]
    );

    res.json({ message: 'Training session updated successfully' });
  } catch (error) {
    console.error('Update training session error:', error);
    res.status(500).json({ error: 'Failed to update training session' });
  }
});

app.delete('/api/training/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const owned = await db.query(
      `SELECT id, createdBy FROM calendar_events WHERE id = ? AND eventType = 'training'`,
      [sessionId]
    );
    if (!owned.rows?.length) return res.status(404).json({ error: 'Session not found' });
    if (String(owned.rows[0].createdBy) !== String(req.user.userId) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized to delete this session' });
    }

    await db.query('DELETE FROM calendar_events WHERE id = ?', [sessionId]);
    res.json({ message: 'Training session deleted successfully' });
  } catch (error) {
    console.error('Delete training session error:', error);
    res.status(500).json({ error: 'Failed to delete training session' });
  }
});

// Player's own registration for a specific training session
app.get('/api/calendar/events/:eventId/open-training/my-registration', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await db.query(
      `SELECT id, status, paymentStatus, paymentDueAt, createdAt, updatedAt
       FROM open_training_registrations
       WHERE eventId = ? AND userId = ?`,
      [eventId, req.user.userId]
    );
    const registration = result.rows?.length ? result.rows[0] : null;
    res.json({ registration });
  } catch (error) {
    console.error('Get my-registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Open training registrations (capacity-safe + waitlist support)
app.post('/api/calendar/events/:eventId/open-training/register', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { paymentDueAt, paymentStatus = 'not_required', allowWaitlist = true } = req.body || {};
    const userId = req.user.userId;

    const eventResult = await db.query(
      'SELECT id, title, eventType, status, createdBy FROM calendar_events WHERE id = ?',
      [eventId]
    );

    if (!eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    if (event.status === 'cancelled' || event.status === 'completed') {
      return res.status(400).json({ error: 'This event is no longer accepting registrations' });
    }

    const existing = await db.query(
      'SELECT id, status FROM open_training_registrations WHERE eventId = ? AND userId = ?',
      [eventId, userId]
    );

    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ error: `Already registered with status: ${existing.rows[0].status}` });
    }

    let registrationStatus = 'pending_confirmation';
    let consumedSpot = false;

    const claimSpotResult = await db.query(
      `UPDATE calendar_events
       SET currentParticipants = currentParticipants + 1
       WHERE id = ?
         AND (maxParticipants IS NULL OR currentParticipants < maxParticipants)`,
      [eventId]
    );

    if (claimSpotResult.rowCount) {
      consumedSpot = true;
    } else if (allowWaitlist) {
      registrationStatus = 'waitlisted';
    } else {
      return res.status(400).json({ error: 'Event is full' });
    }

    try {
      const now = new Date().toISOString();
      const insertResult = await db.query(
        `INSERT INTO open_training_registrations
         (eventId, userId, status, paymentStatus, paymentDueAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [eventId, userId, registrationStatus, paymentStatus, paymentDueAt || null, now, now]
      );

      await createNotification(
        event.createdBy,
        'open_training_registration',
        'New open training registration',
        `A player requested a place on "${event.title}" (${registrationStatus}).`,
        eventId,
        'open_training'
      );

      return res.status(201).json({
        message: registrationStatus === 'waitlisted' ? 'Added to waitlist' : 'Registration submitted',
        registration: {
          id: insertResult.lastID,
          status: registrationStatus,
          paymentStatus,
          consumedSpot
        }
      });
    } catch (insertError) {
      if (consumedSpot) {
        await db.query(
          'UPDATE calendar_events SET currentParticipants = currentParticipants - 1 WHERE id = ? AND currentParticipants > 0',
          [eventId]
        );
      }

      const msg = String(insertError?.message || '').toLowerCase();
      if (msg.includes('unique')) {
        return res.status(400).json({ error: 'Already registered for this event' });
      }
      throw insertError;
    }
  } catch (error) {
    console.error('Open training registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/calendar/events/:eventId/open-training/registrations', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventResult = await db.query(
      'SELECT id, createdBy, maxParticipants, currentParticipants FROM calendar_events WHERE id = ?',
      [eventId]
    );
    if (!eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    const isOwner = String(event.createdBy) === String(req.user.userId);
    const isAdmin = req.user.role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only event owner can view registrations' });
    }

    const registrationsResult = await db.query(
      `SELECT otr.*, u.firstName, u.lastName, u.email
       FROM open_training_registrations otr
       JOIN users u ON u.id = otr.userId
       WHERE otr.eventId = ?
       ORDER BY otr.createdAt ASC`,
      [eventId]
    );

    const registrations = registrationsResult.rows || [];
    const counts = registrations.reduce((acc, row) => {
      const key = row.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      registrations,
      counts,
      capacity: {
        maxParticipants: event.maxParticipants,
        currentParticipants: event.currentParticipants,
        remaining: event.maxParticipants == null ? null : Math.max(0, event.maxParticipants - event.currentParticipants)
      }
    });
  } catch (error) {
    console.error('Get open training registrations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/calendar/events/:eventId/open-training/registrations/:registrationId', [
  authenticateToken,
  body('status').optional().isIn(['pending_confirmation', 'confirmed', 'waitlisted', 'declined', 'dropped_out', 'payment_pending', 'payment_overdue', 'cancelled']),
  body('paymentStatus').optional().isIn(['not_required', 'pending', 'paid', 'overdue'])
], async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;
    const { status, paymentStatus, paymentDueAt, dropReason } = req.body || {};
    const now = new Date().toISOString();

    const eventResult = await db.query('SELECT id, title, createdBy FROM calendar_events WHERE id = ?', [eventId]);
    if (!eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventResult.rows[0];

    if (String(event.createdBy) !== String(req.user.userId) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only event owner can update registrations' });
    }

    const regResult = await db.query(
      'SELECT * FROM open_training_registrations WHERE id = ? AND eventId = ?',
      [registrationId, eventId]
    );
    if (!regResult.rows || regResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const existing = regResult.rows[0];
    const nextStatus = status || existing.status;
    const prevConsumes = statusConsumesSpot(existing.status);
    const nextConsumes = statusConsumesSpot(nextStatus);
    const spotFreed = prevConsumes && !nextConsumes;

    if (!prevConsumes && nextConsumes) {
      const claimSpotResult = await db.query(
        `UPDATE calendar_events
         SET currentParticipants = currentParticipants + 1
         WHERE id = ?
           AND (maxParticipants IS NULL OR currentParticipants < maxParticipants)`,
        [eventId]
      );

      if (!claimSpotResult.rowCount) {
        return res.status(400).json({ error: 'Cannot confirm: event is already full' });
      }
    }

    if (spotFreed) {
      await db.query(
        'UPDATE calendar_events SET currentParticipants = currentParticipants - 1 WHERE id = ? AND currentParticipants > 0',
        [eventId]
      );
    }

    const updateFields = ['updatedAt = ?'];
    const updateValues = [now];

    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(nextStatus);
    }
    if (paymentStatus !== undefined) {
      updateFields.push('paymentStatus = ?');
      updateValues.push(paymentStatus);
    }
    if (paymentDueAt !== undefined) {
      updateFields.push('paymentDueAt = ?');
      updateValues.push(paymentDueAt || null);
    }
    if (nextStatus === 'confirmed') {
      updateFields.push('confirmedBy = ?');
      updateValues.push(req.user.userId);
      updateFields.push('confirmedAt = ?');
      updateValues.push(now);
    }
    if (nextStatus === 'dropped_out' || nextStatus === 'cancelled') {
      updateFields.push('droppedAt = ?');
      updateValues.push(now);
      updateFields.push('dropReason = ?');
      updateValues.push(dropReason || null);
    }

    updateValues.push(registrationId, eventId);
    await db.query(
      `UPDATE open_training_registrations
       SET ${updateFields.join(', ')}
       WHERE id = ? AND eventId = ?`,
      updateValues
    );

    await createNotification(
      existing.userId,
      'open_training_status_updated',
      'Training registration updated',
      `Your registration for "${event.title}" is now "${nextStatus}".`,
      eventId,
      'open_training'
    );

    // Email player when their status changes to a notable state
    if (['confirmed', 'waitlisted', 'dropped_out', 'payment_overdue'].includes(nextStatus)) {
      emailOpenTrainingStatusChange(existing.userId, event.title, nextStatus);
    }

    let promotedUserId = null;
    if (spotFreed) {
      promotedUserId = await promoteNextWaitlistedRegistrant(eventId);
    }

    res.json({
      message: 'Registration updated successfully',
      status: nextStatus,
      promotedUserId
    });
  } catch (error) {
    console.error('Update open training registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/calendar/events/:eventId/open-training/registrations/:registrationId/cancel', authenticateToken, async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;
    const { reason } = req.body || {};
    const now = new Date().toISOString();

    const registrationResult = await db.query(
      `SELECT otr.*, ce.title, ce.createdBy
       FROM open_training_registrations otr
       JOIN calendar_events ce ON ce.id = otr.eventId
       WHERE otr.id = ? AND otr.eventId = ?`,
      [registrationId, eventId]
    );

    if (!registrationResult.rows || registrationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const registration = registrationResult.rows[0];
    const isOwner = String(registration.userId) === String(req.user.userId);
    const isCoach = String(registration.createdBy) === String(req.user.userId) || req.user.role === 'Admin';
    if (!isOwner && !isCoach) {
      return res.status(403).json({ error: 'Not allowed to cancel this registration' });
    }

    const prevConsumes = statusConsumesSpot(registration.status);
    await db.query(
      `UPDATE open_training_registrations
       SET status = ?, droppedAt = ?, dropReason = ?, updatedAt = ?
       WHERE id = ? AND eventId = ?`,
      ['dropped_out', now, reason || null, now, registrationId, eventId]
    );

    if (prevConsumes) {
      await db.query(
        'UPDATE calendar_events SET currentParticipants = currentParticipants - 1 WHERE id = ? AND currentParticipants > 0',
        [eventId]
      );
    }

    let promotedUserId = null;
    if (prevConsumes) {
      promotedUserId = await promoteNextWaitlistedRegistrant(eventId);
    }

    if (isOwner) {
      await createNotification(
        registration.createdBy,
        'open_training_dropout',
        'Player dropped out',
        `A player dropped out from "${registration.title}".${reason ? ` Reason: ${reason}` : ''}`,
        eventId,
        'open_training'
      );
    }

    res.json({ message: 'Registration cancelled', promotedUserId });
  } catch (error) {
    console.error('Cancel open training registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join/leave open event (legacy endpoint retained for compatibility)
app.post('/api/calendar/events/:eventId/join', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventResult = await db.query(
      'SELECT id, title, eventType, maxParticipants, currentParticipants FROM calendar_events WHERE id = ?',
      [eventId]
    );

    if (!eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // For training/open sessions, create an open training registration
    if (event.eventType === 'training' || event.eventType === 'open_trial') {
      const existingRegistration = await db.query(
        'SELECT id, status FROM open_training_registrations WHERE eventId = ? AND userId = ?',
        [eventId, req.user.userId]
      );

      if (existingRegistration.rows && existingRegistration.rows.length > 0) {
        return res.status(400).json({ error: `Already registered with status: ${existingRegistration.rows[0].status}` });
      }

      let registrationStatus = 'pending_confirmation';
      let consumedSpot = false;

      const claimTrainingSpotResult = await db.query(
        `UPDATE calendar_events
         SET currentParticipants = currentParticipants + 1
         WHERE id = ?
           AND (maxParticipants IS NULL OR currentParticipants < maxParticipants)`,
        [eventId]
      );

      if (claimTrainingSpotResult.rowCount) {
        consumedSpot = true;
      } else {
        registrationStatus = 'waitlisted';
      }

      try {
        const now = new Date().toISOString();
        await db.query(
          `INSERT INTO open_training_registrations
           (eventId, userId, status, paymentStatus, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [eventId, req.user.userId, registrationStatus, 'not_required', now, now]
        );
      } catch (insertError) {
        if (consumedSpot) {
          await db.query(
            'UPDATE calendar_events SET currentParticipants = currentParticipants - 1 WHERE id = ? AND currentParticipants > 0',
            [eventId]
          );
        }
        throw insertError;
      }

      return res.json({
        message: registrationStatus === 'waitlisted' ? 'Added to waitlist' : 'Registration submitted',
        status: registrationStatus
      });
    }

    const existingParticipant = await db.query(
      'SELECT id FROM event_participants WHERE eventId = ? AND userId = ?',
      [eventId, req.user.userId]
    );

    if (existingParticipant.rows && existingParticipant.rows.length > 0) {
      return res.status(400).json({ error: 'Already joined this event' });
    }

    const claimSpotResult = await db.query(
      `UPDATE calendar_events
       SET currentParticipants = currentParticipants + 1
       WHERE id = ?
         AND (maxParticipants IS NULL OR currentParticipants < maxParticipants)`,
      [eventId]
    );

    if (!claimSpotResult.rowCount) {
      return res.status(400).json({ error: 'Event is full' });
    }

    try {
      await db.query(
        'INSERT INTO event_participants (eventId, userId, role) VALUES (?, ?, ?)',
        [eventId, req.user.userId, 'participant']
      );
    } catch (insertError) {
      await db.query(
        'UPDATE calendar_events SET currentParticipants = currentParticipants - 1 WHERE id = ? AND currentParticipants > 0',
        [eventId]
      );
      throw insertError;
    }

    res.json({ message: 'Joined event successfully' });
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/calendar/events/:eventId/leave', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const participantResult = await db.query(
      'SELECT id FROM event_participants WHERE eventId = ? AND userId = ?',
      [eventId, req.user.userId]
    );

    if (!participantResult.rows || participantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not joined to this event' });
    }

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

// ===========================
// FORUM ROUTES
// ===========================

// GET /api/forum/posts - Get all posts (not deleted)
app.get('/api/forum/posts', (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT *
      FROM forum_posts
      WHERE is_deleted = 0
    `;
    
    const params = [];
    
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const posts = forumDb.prepare(query).all(...params);
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/forum/posts/:id - Get single post
app.get('/api/forum/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const post = forumDb.prepare(`
      SELECT *
      FROM forum_posts
      WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST /api/forum/posts - Create new post
app.post('/api/forum/posts', (req, res) => {
  try {
    const { user_id, user_role, author_name, title, content, category } = req.body;
    
    // Validate required fields
    if (!user_id || !user_role || !author_name || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate category
    const validCategories = ['General Discussions', 'Website Discussions', 'Grassroots Discussions'];
    const postCategory = category && validCategories.includes(category) ? category : 'General Discussions';
    
    // Check for profanity
    if (containsProfanity(title) || containsProfanity(content)) {
      return res.status(400).json({ 
        error: 'Your post contains inappropriate language. Please revise and try again.',
        profanityDetected: true
      });
    }
    
    // Insert post
    const result = forumDb.prepare(`
      INSERT INTO forum_posts (user_id, user_role, author_name, title, content, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user_id, user_role, author_name, title, content, postCategory);
    
    // Get the created post
    const newPost = forumDb.prepare(`
      SELECT * FROM forum_posts WHERE id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// PUT /api/forum/posts/:id - Update post
app.put('/api/forum/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, user_id, category } = req.body;
    
    // Check if post exists and belongs to user
    const existingPost = forumDb.prepare(`
      SELECT * FROM forum_posts WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (existingPost.user_id !== user_id) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }
    
    // Validate category if provided
    const validCategories = ['General Discussions', 'Website Discussions', 'Grassroots Discussions'];
    const postCategory = category && validCategories.includes(category) ? category : existingPost.category;
    
    // Check for profanity
    if (containsProfanity(title) || containsProfanity(content)) {
      return res.status(400).json({ 
        error: 'Your post contains inappropriate language. Please revise and try again.',
        profanityDetected: true
      });
    }
    
    // Update post
    forumDb.prepare(`
      UPDATE forum_posts 
      SET title = ?, content = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, postCategory, id);
    
    // Get updated post
    const updatedPost = forumDb.prepare(`
      SELECT * FROM forum_posts WHERE id = ?
    `).get(id);
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /api/forum/posts/:id - Soft delete post
app.delete('/api/forum/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_role } = req.body;
    
    // Check if post exists
    const existingPost = forumDb.prepare(`
      SELECT * FROM forum_posts WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Allow deletion if user is admin OR post owner
    if (user_role !== 'Admin' && existingPost.user_id !== user_id) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }
    
    // Soft delete
    forumDb.prepare(`
      UPDATE forum_posts 
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PATCH /api/forum/posts/:id/lock - Lock/unlock thread (admin only)
app.patch('/api/forum/posts/:id/lock', (req, res) => {
  try {
    const { id } = req.params;
    const { user_role, is_locked } = req.body;
    
    // Check if user is admin
    if (user_role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can lock/unlock threads' });
    }
    
    // Check if post exists
    const existingPost = forumDb.prepare(`
      SELECT * FROM forum_posts WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Update locked status
    forumDb.prepare(`
      UPDATE forum_posts 
      SET is_locked = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(is_locked ? 1 : 0, id);
    
    // Get updated post
    const updatedPost = forumDb.prepare(`
      SELECT * FROM forum_posts WHERE id = ?
    `).get(id);
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error locking/unlocking thread:', error);
    res.status(500).json({ error: 'Failed to lock/unlock thread' });
  }
});

// GET /api/forum/posts/user/:userId - Get posts by user
app.get('/api/forum/posts/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const posts = forumDb.prepare(`
      SELECT * FROM forum_posts 
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
    `).all(userId);
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// GET /api/forum/posts/:postId/replies - Get all replies for a post
app.get('/api/forum/posts/:postId/replies', (req, res) => {
  try {
    const { postId } = req.params;
    
    const replies = forumDb.prepare(`
      SELECT 
        r.*,
        parent.author_name as parent_author_name
      FROM forum_replies r
      LEFT JOIN forum_replies parent ON r.parent_reply_id = parent.id
      WHERE r.post_id = ? AND r.is_deleted = 0
      ORDER BY r.created_at ASC
    `).all(postId);
    
    res.json(replies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// POST /api/forum/posts/:postId/replies - Create a reply
app.post('/api/forum/posts/:postId/replies', (req, res) => {
  try {
    const { postId } = req.params;
    const { user_id, user_role, author_name, content, parent_reply_id } = req.body;
    
    // Validate required fields
    if (!user_id || !user_role || !author_name || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if post exists and is not locked
    const post = forumDb.prepare(`
      SELECT id, is_locked FROM forum_posts WHERE id = ? AND is_deleted = 0
    `).get(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if thread is locked
    if (post.is_locked) {
      return res.status(403).json({ error: 'This thread has been locked by an administrator' });
    }
    
    // If replying to a reply, check if parent reply exists
    if (parent_reply_id) {
      const parentReply = forumDb.prepare(`
        SELECT id FROM forum_replies WHERE id = ? AND post_id = ? AND is_deleted = 0
      `).get(parent_reply_id, postId);
      
      if (!parentReply) {
        return res.status(404).json({ error: 'Parent reply not found' });
      }
    }
    
    // Check for profanity
    if (containsProfanity(content)) {
      return res.status(400).json({ 
        error: 'Your reply contains inappropriate language. Please revise and try again.',
        profanityDetected: true
      });
    }
    
    // Insert reply
    const result = forumDb.prepare(`
      INSERT INTO forum_replies (post_id, parent_reply_id, user_id, user_role, author_name, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(postId, parent_reply_id || null, user_id, user_role, author_name, content);
    
    // Get the created reply with parent info
    const newReply = forumDb.prepare(`
      SELECT 
        r.*,
        parent.author_name as parent_author_name
      FROM forum_replies r
      LEFT JOIN forum_replies parent ON r.parent_reply_id = parent.id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(newReply);
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// DELETE /api/forum/replies/:id - Delete a reply
app.delete('/api/forum/replies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_role } = req.body;
    
    // Check if reply exists and belongs to user
    const existingReply = forumDb.prepare(`
      SELECT * FROM forum_replies WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!existingReply) {
      return res.status(404).json({ error: 'Reply not found' });
    }
    
    // Allow deletion if admin or if it's the user's own reply
    if (user_role !== 'Admin' && existingReply.user_id !== user_id) {
      return res.status(403).json({ error: 'You can only delete your own replies' });
    }
    
    // Soft delete
    forumDb.prepare(`
      UPDATE forum_replies 
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    res.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ error: 'Failed to delete reply' });
  }
});

// POST /api/forum/flag - Flag content as inappropriate
app.post('/api/forum/flag', (req, res) => {
  try {
    const { content_type, content_id, user_id, user_name, reason } = req.body;
    
    // Validate required fields
    if (!content_type || !content_id || !user_id || !user_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate content_type
    if (!['post', 'reply'].includes(content_type)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }
    
    // Check if content exists
    if (content_type === 'post') {
      const post = forumDb.prepare('SELECT id FROM forum_posts WHERE id = ? AND is_deleted = 0').get(content_id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
    } else {
      const reply = forumDb.prepare('SELECT id FROM forum_replies WHERE id = ? AND is_deleted = 0').get(content_id);
      if (!reply) {
        return res.status(404).json({ error: 'Reply not found' });
      }
    }
    
    // Check if user already flagged this content
    const existingFlag = forumDb.prepare(`
      SELECT id FROM content_flags 
      WHERE content_type = ? AND content_id = ? AND flagged_by_user_id = ?
    `).get(content_type, content_id, user_id);
    
    if (existingFlag) {
      return res.status(400).json({ error: 'You have already flagged this content' });
    }
    
    // Create flag
    const result = forumDb.prepare(`
      INSERT INTO content_flags (content_type, content_id, flagged_by_user_id, flagged_by_name, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(content_type, content_id, user_id, user_name, reason || 'No reason provided');
    
    const newFlag = forumDb.prepare('SELECT * FROM content_flags WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({ message: 'Content flagged successfully', flag: newFlag });
  } catch (error) {
    console.error('Error flagging content:', error);
    res.status(500).json({ error: 'Failed to flag content' });
  }
});

// GET /api/forum/flags - Get all flags (admin only)
app.get('/api/forum/flags', (req, res) => {
  try {
    const { user_role, status } = req.query;
    
    // Check if user is admin
    if (user_role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can view flags' });
    }
    
    let query = `
      SELECT 
        f.*,
        CASE 
          WHEN f.content_type = 'post' THEN p.title
          WHEN f.content_type = 'reply' THEN SUBSTR(r.content, 1, 100)
        END as content_preview,
        CASE 
          WHEN f.content_type = 'post' THEN p.author_name
          WHEN f.content_type = 'reply' THEN r.author_name
        END as content_author,
        CASE 
          WHEN f.content_type = 'post' THEN p.user_id
          WHEN f.content_type = 'reply' THEN r.user_id
        END as content_author_id
      FROM content_flags f
      LEFT JOIN forum_posts p ON f.content_type = 'post' AND f.content_id = p.id
      LEFT JOIN forum_replies r ON f.content_type = 'reply' AND f.content_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND f.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY f.created_at DESC`;
    
    const flags = forumDb.prepare(query).all(...params);
    
    res.json(flags);
  } catch (error) {
    console.error('Error fetching flags:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

// PATCH /api/forum/flags/:id - Update flag status (admin only)
app.patch('/api/forum/flags/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_role, user_id, status, action } = req.body;
    
    // Check if user is admin
    if (user_role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can review flags' });
    }
    
    // Validate status
    if (!['pending', 'reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get the flag to check content
    const flag = forumDb.prepare('SELECT * FROM content_flags WHERE id = ?').get(id);
    
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    
    // If action is 'delete', delete the flagged content
    if (action === 'delete') {
      if (flag.content_type === 'post') {
        forumDb.prepare('UPDATE forum_posts SET is_deleted = 1 WHERE id = ?').run(flag.content_id);
      } else {
        forumDb.prepare('UPDATE forum_replies SET is_deleted = 1 WHERE id = ?').run(flag.content_id);
      }
    }
    
    // Update flag status
    forumDb.prepare(`
      UPDATE content_flags 
      SET status = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, user_id, id);
    
    const updatedFlag = forumDb.prepare('SELECT * FROM content_flags WHERE id = ?').get(id);
    
    res.json({ message: 'Flag updated successfully', flag: updatedFlag });
  } catch (error) {
    console.error('Error updating flag:', error);
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

// ============================================================================
// MY ADVERTS ENDPOINTS - For user to manage their posted adverts
// ============================================================================

// Get user's posted adverts (both vacancies and player availability)
app.get('/api/my-adverts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let vacancies = [];
    let playerAvailabilities = [];

    // Get team vacancies if user is a Coach
    if (userRole === 'Coach') {
      try {
        const vacancyResult = await db.query(`
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
            tv.createdAt,
            tv.status,
            tv.postedBy,
            t.teamName,
            COALESCE(tv.paused, 0) as paused,
            COALESCE(tv.closed_reason, NULL) as closed_reason,
            COALESCE(tv.views, 0) as views,
            COALESCE(tv.saved_count, 0) as saved_count,
            COALESCE(tv.inquiries_count, 0) as inquiries_count
          FROM team_vacancies tv
          LEFT JOIN teams t ON tv.teamId = t.id
          WHERE tv.postedBy = ? AND (tv.isFrozen = 0 OR tv.isFrozen IS NULL)
          ORDER BY tv.createdAt DESC
        `, [userId]);

        vacancies = (vacancyResult.rows || []).map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          league: row.league,
          ageGroup: row.ageGroup,
          position: row.position,
          teamGender: row.teamGender,
          location: row.location,
          teamName: row.teamName,
          createdAt: row.createdAt,
          status: row.status,
          postedBy: row.postedBy,
          paused: Boolean(row.paused),
          closed_reason: row.closed_reason,
          views: row.views || 0,
          saved_count: row.saved_count || 0,
          inquiries_count: row.inquiries_count || 0
        }));
      } catch (error) {
        console.error('Error fetching user vacancies:', error);
      }
    }

    // Get player availability if user is a Player or Parent/Guardian
    if (userRole === 'Player' || userRole === 'Parent/Guardian') {
      try {
        const query = userRole === 'Parent/Guardian' 
          ? `
            SELECT 
              cpa.id,
              cpa.title,
              cpa.description,
              cpa.preferredLeagues,
              cpa.ageGroup,
              cpa.positions,
              cpa.preferredTeamGender,
              cpa.location,
              cpa.createdAt,
              cpa.status,
              cpa.postedBy,
              COALESCE(cpa.paused, 0) as paused,
              COALESCE(cpa.closed_reason, NULL) as closed_reason,
              COALESCE(cpa.views, 0) as views,
              COALESCE(cpa.saved_count, 0) as saved_count,
              COALESCE(cpa.inquiries_count, 0) as inquiries_count
            FROM child_player_availability cpa
            WHERE cpa.postedBy = ?
            ORDER BY cpa.createdAt DESC
          `
          : `
            SELECT 
              pa.id,
              pa.title,
              pa.description,
              pa.preferredLeagues,
              pa.ageGroup,
              pa.positions,
              pa.preferredTeamGender,
              pa.location,
              pa.createdAt,
              pa.status,
              pa.postedBy,
              COALESCE(pa.paused, 0) as paused,
              COALESCE(pa.closed_reason, NULL) as closed_reason,
              COALESCE(pa.views, 0) as views,
              COALESCE(pa.saved_count, 0) as saved_count,
              COALESCE(pa.inquiries_count, 0) as inquiries_count
            FROM player_availability pa
            WHERE pa.postedBy = ?
            ORDER BY pa.createdAt DESC
          `;

        const availResult = await db.query(query, [userId]);
        playerAvailabilities = (availResult.rows || []).map(row => {
          let preferredLeagues = [];
          let positions = [];
          
          try {
            preferredLeagues = row.preferredLeagues ? JSON.parse(row.preferredLeagues) : [];
            if (!Array.isArray(preferredLeagues)) preferredLeagues = [];
          } catch (e) {
            preferredLeagues = [];
          }
          
          try {
            positions = row.positions ? JSON.parse(row.positions) : [];
            if (!Array.isArray(positions)) positions = [];
          } catch (e) {
            positions = [];
          }

          return {
            id: row.id,
            title: row.title,
            description: row.description,
            preferredLeagues,
            positions,
            ageGroup: row.ageGroup,
            preferredTeamGender: row.preferredTeamGender,
            location: row.location,
            createdAt: row.createdAt,
            status: row.status,
            postedBy: row.postedBy,
            paused: Boolean(row.paused),
            closed_reason: row.closed_reason,
            views: row.views || 0,
            saved_count: row.saved_count || 0,
            inquiries_count: row.inquiries_count || 0
          };
        });
      } catch (error) {
        console.error('Error fetching user player availability:', error);
      }
    }

    res.json({
      vacancies,
      playerAvailabilities
    });
  } catch (error) {
    console.error('Error fetching user adverts:', error);
    res.status(500).json({ error: 'Failed to fetch your adverts' });
  }
});

// Update advert status (pause/resume)
app.put('/api/adverts/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paused } = req.body;
    const userId = req.user.userId;

    if (typeof paused !== 'boolean') {
      return res.status(400).json({ error: 'paused must be a boolean' });
    }

    // Check if it's a vacancy or player availability
    const vacancyCheck = await db.query('SELECT postedBy FROM team_vacancies WHERE id = ?', [id]);
    const availCheck = await db.query('SELECT postedBy FROM player_availability WHERE id = ?', [id]);
    const childAvailCheck = await db.query('SELECT postedBy FROM child_player_availability WHERE id = ?', [id]);

    let isAuthorized = false;
    let isVacancy = false;
    let isChildAvail = false;

    if (vacancyCheck.rows && vacancyCheck.rows.length > 0) {
      isAuthorized = vacancyCheck.rows[0].postedBy === userId;
      isVacancy = true;
    } else if (childAvailCheck.rows && childAvailCheck.rows.length > 0) {
      isAuthorized = childAvailCheck.rows[0].postedBy === userId;
      isChildAvail = true;
    } else if (availCheck.rows && availCheck.rows.length > 0) {
      isAuthorized = availCheck.rows[0].postedBy === userId;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to update this advert' });
    }

    const table = isVacancy ? 'team_vacancies' : (isChildAvail ? 'child_player_availability' : 'player_availability');
    await db.query(`UPDATE ${table} SET paused = ? WHERE id = ?`, [paused ? 1 : 0, id]);

    res.json({ message: paused ? 'Advert paused' : 'Advert resumed', paused });
  } catch (error) {
    console.error('Error updating advert status:', error);
    res.status(500).json({ error: 'Failed to update advert status' });
  }
});

// Close advert (mark as closed)
app.post('/api/adverts/:id/close', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'reason is required' });
    }

    // Check if it's a vacancy or player availability
    const vacancyCheck = await db.query('SELECT postedBy FROM team_vacancies WHERE id = ?', [id]);
    const availCheck = await db.query('SELECT postedBy FROM player_availability WHERE id = ?', [id]);
    const childAvailCheck = await db.query('SELECT postedBy FROM child_player_availability WHERE id = ?', [id]);

    let isAuthorized = false;
    let isVacancy = false;
    let isChildAvail = false;

    if (vacancyCheck.rows && vacancyCheck.rows.length > 0) {
      isAuthorized = vacancyCheck.rows[0].postedBy === userId;
      isVacancy = true;
    } else if (childAvailCheck.rows && childAvailCheck.rows.length > 0) {
      isAuthorized = childAvailCheck.rows[0].postedBy === userId;
      isChildAvail = true;
    } else if (availCheck.rows && availCheck.rows.length > 0) {
      isAuthorized = availCheck.rows[0].postedBy === userId;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to close this advert' });
    }

    const table = isVacancy ? 'team_vacancies' : (isChildAvail ? 'child_player_availability' : 'player_availability');
    await db.query(
      `UPDATE ${table} SET closed_reason = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [reason, id]
    );

    res.json({ message: 'Advert closed successfully', closed_reason: reason });
  } catch (error) {
    console.error('Error closing advert:', error);
    res.status(500).json({ error: 'Failed to close advert' });
  }
});

// Delete advert
app.delete('/api/adverts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const userId = req.user.userId;

    if (!type || !['vacancy', 'player', 'child'].includes(type)) {
      return res.status(400).json({ error: 'Invalid advert type' });
    }

    const tables = {
      vacancy: 'team_vacancies',
      player: 'player_availability',
      child: 'child_player_availability'
    };

    const table = tables[type];
    if (!table) {
      return res.status(400).json({ error: 'Invalid advert type' });
    }

    // Verify ownership
    const result = await db.query(`SELECT postedBy FROM ${table} WHERE id = ?`, [id]);
    if (!result.rows || result.rows.length === 0 || result.rows[0].postedBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this advert' });
    }

    await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ message: 'Advert deleted successfully' });
  } catch (error) {
    console.error('Error deleting advert:', error);
    res.status(500).json({ error: 'Failed to delete advert' });
  }
});

// ============================================================================
// ENHANCED ADVERT FEATURES - Edit, Repost, Analytics, Bulk Actions, Export
// ============================================================================

// Update/Edit advert (PUT)
app.put('/api/adverts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
      title,
      description,
      league,
      ageGroup,
      position,
      positions,
      location,
      locationData,
      playingTimePolicy,
      hasMatchRecording,
      hasPathwayToSenior,
      teamGender
    } = req.body;

    // Determine table and verify ownership
    const vacancyCheck = await db.query('SELECT postedBy FROM team_vacancies WHERE id = ?', [id]);
    const availCheck = await db.query('SELECT postedBy FROM player_availability WHERE id = ?', [id]);
    const childAvailCheck = await db.query('SELECT postedBy FROM child_player_availability WHERE id = ?', [id]);

    let isAuthorized = false;
    let table = '';
    let isVacancy = false;

    if (vacancyCheck.rows && vacancyCheck.rows.length > 0) {
      isAuthorized = vacancyCheck.rows[0].postedBy === userId;
      table = 'team_vacancies';
      isVacancy = true;
    } else if (childAvailCheck.rows && childAvailCheck.rows.length > 0) {
      isAuthorized = childAvailCheck.rows[0].postedBy === userId;
      table = 'child_player_availability';
    } else if (availCheck.rows && availCheck.rows.length > 0) {
      isAuthorized = availCheck.rows[0].postedBy === userId;
      table = 'player_availability';
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to edit this advert' });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (league !== undefined) {
      updates.push('league = ?');
      values.push(league);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }
    if (locationData !== undefined) {
      updates.push('locationData = ?');
      values.push(typeof locationData === 'string' ? locationData : JSON.stringify(locationData));
    }
    if (ageGroup !== undefined) {
      updates.push('ageGroup = ?');
      values.push(ageGroup);
    }

    // Table-specific fields
    if (isVacancy) {
      if (position !== undefined) {
        updates.push('position = ?');
        values.push(position);
      }
      if (playingTimePolicy !== undefined) {
        updates.push('playingTimePolicy = ?');
        values.push(playingTimePolicy);
      }
      if (hasMatchRecording !== undefined) {
        updates.push('hasMatchRecording = ?');
        values.push(hasMatchRecording ? 1 : 0);
      }
      if (hasPathwayToSenior !== undefined) {
        updates.push('hasPathwayToSenior = ?');
        values.push(hasPathwayToSenior ? 1 : 0);
      }
      if (teamGender !== undefined) {
        updates.push('teamGender = ?');
        values.push(teamGender);
      }
    } else {
      if (positions !== undefined && Array.isArray(positions)) {
        updates.push('positions = ?');
        values.push(JSON.stringify(positions));
      }
      if (teamGender !== undefined) {
        updates.push('preferredTeamGender = ?');
        values.push(teamGender);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const updateQuery = `UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`;
    await db.query(updateQuery, values);

    res.json({ message: 'Advert updated successfully' });
  } catch (error) {
    console.error('Error updating advert:', error);
    res.status(500).json({ error: 'Failed to update advert' });
  }
});

// Repost an advert (duplicate with new dates)
app.post('/api/adverts/:id/repost', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Determine table and get original advert
    const vacancyCheck = await db.query('SELECT * FROM team_vacancies WHERE id = ? AND postedBy = ?', [id, userId]);
    const availCheck = await db.query('SELECT * FROM player_availability WHERE id = ? AND postedBy = ?', [id, userId]);

    let original = null;
    let table = '';
    let isVacancy = false;

    if (vacancyCheck.rows && vacancyCheck.rows.length > 0) {
      original = vacancyCheck.rows[0];
      table = 'team_vacancies';
      isVacancy = true;
    } else if (availCheck.rows && availCheck.rows.length > 0) {
      original = availCheck.rows[0];
      table = 'player_availability';
    }

    if (!original) {
      return res.status(404).json({ error: 'Advert not found or not authorized' });
    }

    // Create new advert with same content but new timestamps
    const columns = Object.keys(original).filter(key => key !== 'id');
    const placeholders = columns.map(() => '?').join(', ');
    const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    const values = columns.map(col => {
      if (col === 'createdAt') return new Date().toISOString();
      if (col === 'status') return 'active';
      if (col === 'paused') return 0;
      if (col === 'closed_reason') return null;
      if (col === 'closed_at') return null;
      return original[col];
    });

    const result = await db.query(insertQuery, values);
    const newAdvertId = result.lastID || result.insertId;

    res.json({ 
      message: 'Advert reposted successfully',
      newAdvertId,
      advertUrl: `/advert/${newAdvertId}`
    });
  } catch (error) {
    console.error('Error reposting advert:', error);
    res.status(500).json({ error: 'Failed to repost advert' });
  }
});

// Get advert analytics (views, saves, engagement metrics)
app.get('/api/adverts/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find and verify ownership
    const vacancyCheck = await db.query('SELECT * FROM team_vacancies WHERE id = ?', [id]);
    const availCheck = await db.query('SELECT * FROM player_availability WHERE id = ?', [id]);
    const childAvailCheck = await db.query('SELECT * FROM child_player_availability WHERE id = ?', [id]);

    let advert = null;
    if (vacancyCheck.rows && vacancyCheck.rows.length > 0) {
      advert = vacancyCheck.rows[0];
    } else if (childAvailCheck.rows && childAvailCheck.rows.length > 0) {
      advert = childAvailCheck.rows[0];
    } else if (availCheck.rows && availCheck.rows.length > 0) {
      advert = availCheck.rows[0];
    }

    if (!advert || advert.postedBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to view analytics' });
    }

    // Calculate metrics
    const createdDate = new Date(advert.createdAt);
    const today = new Date();
    const daysActive = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24)) + 1;
    const viewsPerDay = advert.views ? (advert.views / daysActive).toFixed(2) : 0;
    const engagementRate = advert.views > 0 ? ((advert.saved_count / advert.views) * 100).toFixed(2) : 0;

    res.json({
      title: advert.title,
      status: advert.status,
      createdAt: advert.createdAt,
      metrics: {
        views: advert.views || 0,
        saves: advert.saved_count || 0,
        inquiries: advert.inquiries_count || 0,
        daysActive,
        viewsPerDay: parseFloat(viewsPerDay),
        engagementRate: parseFloat(engagementRate),
        averageTimeOnPage: 45 // Placeholder
      },
      recommendations: generateAnalyticsRecommendations(advert, parseFloat(viewsPerDay), parseFloat(engagementRate))
    });
  } catch (error) {
    console.error('Error fetching advert analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Helper function for analytics recommendations
function generateAnalyticsRecommendations(advert, viewsPerDay, engagementRate) {
  const recommendations = [];

  if (viewsPerDay < 1) {
    recommendations.push({
      type: 'visibility',
      message: 'Your advert is getting low visibility. Consider reposting or updating the title.',
      priority: 'high'
    });
  }

  if (engagementRate < 5) {
    recommendations.push({
      type: 'content',
      message: 'Engagement is low. Add more details or photos to increase saves.',
      priority: 'medium'
    });
  }

  if (!advert.location) {
    recommendations.push({
      type: 'location',
      message: 'Adding a location can increase visibility by 40%.',
      priority: 'medium'
    });
  }

  if (advert.views > 50 && advert.inquiries_count === 0) {
    recommendations.push({
      type: 'messaging',
      message: 'You have good visibility but no inquiries. Check your contact info.',
      priority: 'medium'
    });
  }

  return recommendations;
}

// Track advert view
app.post('/api/adverts/:id/track-view', async (req, res) => {
  try {
    const { id } = req.params;

    // Update views count (can be called by any user)
    // First try vacancy table
    let result = await db.query('UPDATE team_vacancies SET views = views + 1, last_viewed_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      // Try player availability
      result = await db.query('UPDATE player_availability SET views = views + 1, last_viewed_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }
    
    if (result.changes === 0) {
      // Try child player availability
      result = await db.query('UPDATE child_player_availability SET views = views + 1, last_viewed_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }

    res.json({ message: 'View tracked' });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// Bulk close adverts
app.post('/api/adverts/bulk/close', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { advertIds, reason } = req.body;

    if (!Array.isArray(advertIds) || advertIds.length === 0) {
      return res.status(400).json({ error: 'advertIds must be a non-empty array' });
    }

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'reason is required' });
    }

    let closedCount = 0;

    for (const advertId of advertIds) {
      // Check and close vacancies
      const vacancyCheck = await db.query('SELECT postedBy FROM team_vacancies WHERE id = ?', [advertId]);
      if (vacancyCheck.rows && vacancyCheck.rows.length > 0 && vacancyCheck.rows[0].postedBy === userId) {
        await db.query('UPDATE team_vacancies SET closed_reason = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?', [reason, advertId]);
        closedCount++;
        continue;
      }

      // Check and close player availability
      const availCheck = await db.query('SELECT postedBy FROM player_availability WHERE id = ?', [advertId]);
      if (availCheck.rows && availCheck.rows.length > 0 && availCheck.rows[0].postedBy === userId) {
        await db.query('UPDATE player_availability SET closed_reason = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?', [reason, advertId]);
        closedCount++;
        continue;
      }

      // Check and close child player availability
      const childCheck = await db.query('SELECT postedBy FROM child_player_availability WHERE id = ?', [advertId]);
      if (childCheck.rows && childCheck.rows.length > 0 && childCheck.rows[0].postedBy === userId) {
        await db.query('UPDATE child_player_availability SET closed_reason = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?', [reason, advertId]);
        closedCount++;
      }
    }

    res.json({ message: `${closedCount} adverts closed successfully`, closedCount });
  } catch (error) {
    console.error('Error bulk closing adverts:', error);
    res.status(500).json({ error: 'Failed to close adverts' });
  }
});

// Bulk pause/resume adverts
app.post('/api/adverts/bulk/pause', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { advertIds, paused } = req.body;

    if (!Array.isArray(advertIds) || advertIds.length === 0) {
      return res.status(400).json({ error: 'advertIds must be a non-empty array' });
    }

    if (typeof paused !== 'boolean') {
      return res.status(400).json({ error: 'paused must be a boolean' });
    }

    let updatedCount = 0;

    for (const advertId of advertIds) {
      // Check and update vacancies
      const vacancyCheck = await db.query('SELECT postedBy FROM team_vacancies WHERE id = ?', [advertId]);
      if (vacancyCheck.rows && vacancyCheck.rows.length > 0 && vacancyCheck.rows[0].postedBy === userId) {
        await db.query('UPDATE team_vacancies SET paused = ? WHERE id = ?', [paused ? 1 : 0, advertId]);
        updatedCount++;
        continue;
      }

      // Check and update player availability
      const availCheck = await db.query('SELECT postedBy FROM player_availability WHERE id = ?', [advertId]);
      if (availCheck.rows && availCheck.rows.length > 0 && availCheck.rows[0].postedBy === userId) {
        await db.query('UPDATE player_availability SET paused = ? WHERE id = ?', [paused ? 1 : 0, advertId]);
        updatedCount++;
        continue;
      }

      // Check and update child player availability
      const childCheck = await db.query('SELECT postedBy FROM child_player_availability WHERE id = ?', [advertId]);
      if (childCheck.rows && childCheck.rows.length > 0 && childCheck.rows[0].postedBy === userId) {
        await db.query('UPDATE child_player_availability SET paused = ? WHERE id = ?', [paused ? 1 : 0, advertId]);
        updatedCount++;
      }
    }

    res.json({ 
      message: `${updatedCount} adverts ${paused ? 'paused' : 'resumed'} successfully`,
      updatedCount 
    });
  } catch (error) {
    console.error('Error bulk pausing adverts:', error);
    res.status(500).json({ error: 'Failed to update adverts' });
  }
});

// Set auto-extend for advert
app.put('/api/adverts/:id/auto-extend', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { autoExtend } = req.body;
    const userId = req.user.userId;

    if (typeof autoExtend !== 'boolean') {
      return res.status(400).json({ error: 'autoExtend must be a boolean' });
    }

    // Find and verify ownership
    let table = '';
    const vacancyCheck = await db.query('SELECT postedBy FROM team_vacancies WHERE id = ?', [id]);
    const availCheck = await db.query('SELECT postedBy FROM player_availability WHERE id = ?', [id]);
    const childCheck = await db.query('SELECT postedBy FROM child_player_availability WHERE id = ?', [id]);

    if (vacancyCheck.rows && vacancyCheck.rows.length > 0) {
      if (vacancyCheck.rows[0].postedBy !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      table = 'team_vacancies';
    } else if (childCheck.rows && childCheck.rows.length > 0) {
      if (childCheck.rows[0].postedBy !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      table = 'child_player_availability';
    } else if (availCheck.rows && availCheck.rows.length > 0) {
      if (availCheck.rows[0].postedBy !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      table = 'player_availability';
    } else {
      return res.status(404).json({ error: 'Advert not found' });
    }

    await db.query(`UPDATE ${table} SET auto_extend = ? WHERE id = ?`, [autoExtend ? 1 : 0, id]);

    res.json({ 
      message: autoExtend ? 'Auto-extend enabled' : 'Auto-extend disabled',
      autoExtend 
    });
  } catch (error) {
    console.error('Error setting auto-extend:', error);
    res.status(500).json({ error: 'Failed to update auto-extend setting' });
  }
});

// Export adverts as CSV
app.get('/api/adverts/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { format = 'csv' } = req.query;

    // Get all user's adverts
    const vacancies = await db.query(
      `SELECT id, title, description, league, ageGroup, status, createdAt, views, saved_count FROM team_vacancies WHERE postedBy = ?`,
      [userId]
    );

    const availability = await db.query(
      `SELECT id, title, description, ageGroup, status, createdAt, views, saved_count FROM player_availability WHERE postedBy = ?`,
      [userId]
    );

    const allAdverts = [
      ...(vacancies.rows || []).map(v => ({ ...v, type: 'Vacancy' })),
      ...(availability.rows || []).map(a => ({ ...a, type: 'Player Availability' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (format === 'csv') {
      // Generate CSV
      const headers = ['ID', 'Type', 'Title', 'Description', 'Category', 'Status', 'Posted Date', 'Views', 'Saves'];
      const rows = allAdverts.map(a => [
        a.id,
        a.type,
        `"${a.title}"`,
        `"${(a.description || '').substring(0, 50)}"`,
        a.league || a.ageGroup || 'N/A',
        a.status,
        new Date(a.createdAt).toLocaleDateString(),
        a.views || 0,
        a.saved_count || 0
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="adverts_export.csv"');
      res.send(csv);
    } else {
      // Return as JSON
      res.json({ adverts: allAdverts, totalCount: allAdverts.length });
    }
  } catch (error) {
    console.error('Error exporting adverts:', error);
    res.status(500).json({ error: 'Failed to export adverts' });
  }
});

// Subscribe to advert notifications (when expiring soon, responses, etc)
app.post('/api/advert-notifications/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { advertId, notificationType, enabled } = req.body;

    if (!advertId || !notificationType) {
      return res.status(400).json({ error: 'advertId and notificationType are required' });
    }

    const validTypes = ['expiring_soon', 'new_inquiry', 'low_engagement', 'bulk_updates'];
    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    // This would normally be stored in an advert_notifications table
    // For now, return success to enable frontend functionality
    res.json({
      message: enabled ? 'Notification enabled' : 'Notification disabled',
      notificationType,
      advertId
    });
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    res.status(500).json({ error: 'Failed to manage notification settings' });
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

// ============================================
// TEAM MANAGEMENT ENDPOINTS
// ============================================

// Create a new team
app.post('/api/teams', authenticateToken, [
  body('teamName').notEmpty().withMessage('Team name is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('league').notEmpty().withMessage('League is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (req.user.role !== 'Coach') {
    return res.status(403).json({ error: 'Only coaches can create teams' });
  }

  try {
    const { teamName, clubName, ageGroup, league, teamGender, playingTimePolicy, location, locationData, contactEmail, website, socialMedia, teamBio, trainingLocation, homePitchLocation, honours } = req.body;

    // Create the team with RETURNING clause for PostgreSQL compatibility
    const teamResult = await db.query(`
      INSERT INTO teams (teamName, clubName, ageGroup, league, teamGender, playingTimePolicy, location, locationData, contactEmail, website, socialMedia, teamBio, trainingLocation, homePitchLocation, honours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [teamName, clubName || null, ageGroup, league, teamGender || 'Mixed', playingTimePolicy || null, location || null, locationData ? JSON.stringify(locationData) : null, contactEmail || null, website || null, socialMedia ? JSON.stringify(socialMedia) : null, teamBio || null, trainingLocation || null, homePitchLocation || null, honours || null]);

    const teamId = teamResult.lastID || teamResult.rows?.[0]?.id;
    if (!teamId) {
      return res.status(500).json({ error: 'Failed to create team - no ID returned' });
    }

    // Add creator as Head Coach
    await db.query(`
      INSERT INTO team_members (teamId, userId, role, permissions)
      VALUES (?, ?, ?, ?)
    `, [teamId, req.user.userId, 'Head Coach', JSON.stringify({
      canPostVacancies: true,
      canManageRoster: true,
      canEditTeam: true,
      canDeleteTeam: true,
      canInviteMembers: true
    })]);

    // Create default roster for the team
    await db.query(`
      INSERT INTO team_rosters (teamId, maxSquadSize)
      VALUES (?, ?)
    `, [teamId, 20]); // Default max squad size

    res.status(201).json({
      message: 'Team created successfully',
      teamId,
      team: {
        id: teamId,
        teamName,
        clubName,
        ageGroup,
        league,
        teamGender: teamGender || 'Mixed',
        userRole: 'Head Coach'
      }
    });
  } catch (error) {
    console.error('❌ Error creating team:', error);
    res.status(500).json({ error: error.message || 'Failed to create team' });
  }
});

// Get teams for the authenticated user
app.get('/api/teams', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only coaches and admins can view teams' });
    }

    const teams = req.user.role === 'Admin'
      ? await db.query(`
        SELECT 
          t.id,
          t.teamname as "teamName",
          t.clubname as "clubName",
          t.agegroup as "ageGroup",
          t.league,
          t.teamgender as "teamGender",
          t.location,
          t.locationdata as "locationData",
          t.contactemail as "contactEmail",
          t.website,
          t.socialmedia as "socialMedia",
          t.teambio as "teamBio",
          t.traininglocation as "trainingLocation",
          t.homepitchlocation as "homePitchLocation",
          t.honours as "honours",
          t.createdat as "createdAt",
          t.updatedat as "updatedAt",
          'Admin' as "userRole",
          '{}' as permissions
        FROM teams t
        ORDER BY t.createdAt DESC
      `)
      : await db.query(`
        SELECT 
          t.id,
          t.teamname as "teamName",
          t.clubname as "clubName",
          t.agegroup as "ageGroup",
          t.league,
          t.teamgender as "teamGender",
          t.location,
          t.locationdata as "locationData",
          t.contactemail as "contactEmail",
          t.website,
          t.socialmedia as "socialMedia",
          t.teambio as "teamBio",
          t.traininglocation as "trainingLocation",
          t.homepitchlocation as "homePitchLocation",
          t.honours as "honours",
          t.createdat as "createdAt",
          t.updatedat as "updatedAt",
          tm.role as "userRole",
          tm.permissions
        FROM teams t
        JOIN team_members tm ON t.id = tm.teamId
        WHERE tm.userId = ?
        ORDER BY t.createdAt DESC
      `, [req.user.userId]);

    const teamsList = (teams.rows || teams || []).map(team => {
      try {
        team.permissions = team.permissions ? JSON.parse(team.permissions) : {};
      } catch (e) {
        console.error('Error parsing team permissions:', e);
        team.permissions = {};
      }
      return team;
    });
    res.json({ teams: teamsList });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team details
app.get('/api/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if user is a member of the team
    const membership = await db.query(`
      SELECT 
        tm.role,
        tm.permissions,
        t.id,
        t.teamname as "teamName",
        t.clubname as "clubName",
        t.agegroup as "ageGroup",
        t.league,
        t.teamgender as "teamGender",
        t.location,
        t.locationdata as "locationData",
        t.contactemail as "contactEmail",
        t.website,
        t.socialmedia as "socialMedia",
        t.teambio as "teamBio",
        t.traininglocation as "trainingLocation",
        t.homepitchlocation as "homePitchLocation",
        t.honours as "honours",
        t.createdat as "createdAt",
        t.updatedat as "updatedAt"
      FROM team_members tm
      JOIN teams t ON tm.teamId = t.id
      WHERE tm.teamId = ? AND tm.userId = ?
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }

    const team = membership.rows[0];
    try {
      team.permissions = team.permissions ? JSON.parse(team.permissions) : {};
    } catch (e) {
      console.error('Error parsing permissions:', e);
      team.permissions = {};
    }

    // Get all team members
    const members = await db.query(`
      SELECT 
        tm.id,
        tm.teamid as "teamId",
        tm.userid as "userId",
        tm.role,
        tm.permissions,
        tm.joinedat as "joinedAt",
        u.firstname as "firstName",
        u.lastname as "lastName",
        u.email
      FROM team_members tm
      JOIN users u ON tm.userId = u.id
      WHERE tm.teamId = ?
      ORDER BY tm.joinedAt ASC
    `, [teamId]);

    team.members = members.rows || members || [];

    res.json({ team });
  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// Update team details
app.put('/api/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if user has permission to edit team.
    // Avoid JSON_EXTRACT in SQL since PostgreSQL does not support it.
    const membership = await db.query(`
      SELECT permissions FROM team_members
      WHERE teamId = ? AND userId = ?
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to edit this team' });
    }

    const rawPermissions = membership.rows[0].permissions;
    let parsedPermissions = {};
    try {
      parsedPermissions = typeof rawPermissions === 'string'
        ? JSON.parse(rawPermissions)
        : (rawPermissions || {});
    } catch (e) {
      parsedPermissions = {};
    }

    const canEditTeam =
      parsedPermissions.canEditTeam === true ||
      parsedPermissions.canEditTeam === 1 ||
      parsedPermissions.canEditTeam === '1';

    if (!canEditTeam) {
      return res.status(403).json({ error: 'You do not have permission to edit this team' });
    }

    const { teamName, clubName, ageGroup, league, teamGender, playingTimePolicy, location, locationData, contactEmail, website, socialMedia, teamBio, trainingLocation, homePitchLocation, honours } = req.body;

    await db.query(`
      UPDATE teams SET
        teamName = ?, clubName = ?, ageGroup = ?, league = ?, teamGender = ?, playingTimePolicy = ?,
        location = ?, locationData = ?, contactEmail = ?, website = ?, socialMedia = ?,
        teamBio = ?, trainingLocation = ?, homePitchLocation = ?, honours = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [teamName, clubName, ageGroup, league, teamGender, playingTimePolicy || null, location, locationData ? JSON.stringify(locationData) : null, contactEmail, website, socialMedia ? JSON.stringify(socialMedia) : null, teamBio || null, trainingLocation || null, homePitchLocation || null, honours || null, teamId]);

    res.json({ message: 'Team updated successfully' });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// ============================================
// TEAM PROFILE ENDPOINTS
// ============================================

// Get coach's team profile
app.get('/api/team-profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can access team profiles' });
    }

    const profile = await db.query(`
      SELECT * FROM team_profiles WHERE coachId = ?
    `, [req.user.userId]);

    if (!profile.rows || profile.rows.length === 0) {
      return res.status(404).json({ error: 'Team profile not found' });
    }

    res.json(profile.rows[0]);
  } catch (error) {
    console.error('Error fetching team profile:', error);
    res.status(500).json({ error: 'Failed to fetch team profile' });
  }
});

// Create or update coach's team profile
app.post('/api/team-profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can create team profiles' });
    }

    const {
      teamName, clubName, establishedYear, teamDescription, homeGroundName,
      homeGroundAddress, trainingSchedule, hasRegularSocialEvents, socialEventsDescription,
      welcomesParentInvolvement, parentInvolvementDetails, attendsSummerTournaments,
      tournamentDetails, hasPathwayProgram, pathwayDescription, linkedAdultTeam,
      academyAffiliation, coachingPhilosophy, trainingFocus, developmentAreas,
      coachingStaff, teamAchievements, specialRequirements, equipmentProvided,
      seasonalFees, contactPreferences
    } = req.body;

    // Check if profile already exists
    const existing = await db.query(`
      SELECT id FROM team_profiles WHERE coachId = ?
    `, [req.user.userId]);

    if (existing.rows && existing.rows.length > 0) {
      // Update existing profile
      await db.query(`
        UPDATE team_profiles SET
          teamName = ?, clubName = ?, establishedYear = ?, teamDescription = ?,
          homeGroundName = ?, homeGroundAddress = ?, trainingSchedule = ?,
          hasRegularSocialEvents = ?, socialEventsDescription = ?, welcomesParentInvolvement = ?,
          parentInvolvementDetails = ?, attendsSummerTournaments = ?, tournamentDetails = ?,
          hasPathwayProgram = ?, pathwayDescription = ?, linkedAdultTeam = ?,
          academyAffiliation = ?, coachingPhilosophy = ?, trainingFocus = ?,
          developmentAreas = ?, coachingStaff = ?, teamAchievements = ?,
          specialRequirements = ?, equipmentProvided = ?, seasonalFees = ?,
          contactPreferences = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE coachId = ?
      `, [
        teamName, clubName, establishedYear, teamDescription, homeGroundName,
        homeGroundAddress, trainingSchedule, hasRegularSocialEvents, socialEventsDescription,
        welcomesParentInvolvement, parentInvolvementDetails, attendsSummerTournaments,
        tournamentDetails, hasPathwayProgram, pathwayDescription, linkedAdultTeam,
        academyAffiliation, coachingPhilosophy, trainingFocus, developmentAreas,
        coachingStaff, teamAchievements, specialRequirements, equipmentProvided,
        seasonalFees, contactPreferences, req.user.userId
      ]);

      res.json({ message: 'Team profile updated successfully' });
    } else {
      // Create new profile
      await db.query(`
        INSERT INTO team_profiles (
          coachId, teamName, clubName, establishedYear, teamDescription,
          homeGroundName, homeGroundAddress, trainingSchedule,
          hasRegularSocialEvents, socialEventsDescription, welcomesParentInvolvement,
          parentInvolvementDetails, attendsSummerTournaments, tournamentDetails,
          hasPathwayProgram, pathwayDescription, linkedAdultTeam,
          academyAffiliation, coachingPhilosophy, trainingFocus,
          developmentAreas, coachingStaff, teamAchievements,
          specialRequirements, equipmentProvided, seasonalFees,
          contactPreferences
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.userId, teamName, clubName, establishedYear, teamDescription,
        homeGroundName, homeGroundAddress, trainingSchedule,
        hasRegularSocialEvents, socialEventsDescription, welcomesParentInvolvement,
        parentInvolvementDetails, attendsSummerTournaments, tournamentDetails,
        hasPathwayProgram, pathwayDescription, linkedAdultTeam,
        academyAffiliation, coachingPhilosophy, trainingFocus,
        developmentAreas, coachingStaff, teamAchievements,
        specialRequirements, equipmentProvided, seasonalFees,
        contactPreferences
      ]);

      res.status(201).json({ message: 'Team profile created successfully' });
    }
  } catch (error) {
    console.error('Error saving team profile:', error);
    res.status(500).json({ error: 'Failed to save team profile' });
  }
});

// Delete coach's team profile
app.delete('/api/team-profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Coach') {
      return res.status(403).json({ error: 'Only coaches can delete team profiles' });
    }

    await db.query(`
      DELETE FROM team_profiles WHERE coachId = ?
    `, [req.user.userId]);

    res.json({ message: 'Team profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting team profile:', error);
    res.status(500).json({ error: 'Failed to delete team profile' });
  }
});

// Get team vacancies
app.get('/api/teams/:teamId/vacancies', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if user is a member of the team
    const membership = await db.query(`
      SELECT id FROM team_members WHERE teamId = ? AND userId = ?
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }

    const vacancies = await db.query(`
      SELECT tv.*, u.firstName, u.lastName
      FROM team_vacancies tv
      JOIN users u ON tv.postedBy = u.id
      WHERE tv.teamId = ? AND tv.status = 'active'
      ORDER BY tv.createdAt DESC
    `, [teamId]);

    res.json({ vacancies: vacancies.rows || vacancies });
  } catch (error) {
    console.error('Error fetching team vacancies:', error);
    res.status(500).json({ error: 'Failed to fetch team vacancies' });
  }
});

// Search for coaches by name or email
app.get('/api/coaches/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ coaches: [] });
    }

    const searchTerm = `%${q}%`;
    const coaches = await db.query(`
      SELECT id, firstName, lastName, email
      FROM users
      WHERE role = 'Coach' 
      AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)
      LIMIT 10
    `, [searchTerm, searchTerm, searchTerm]);

    const coachesList = coaches.rows || coaches || [];
    const results = coachesList.map(coach => ({
      id: coach.id,
      name: `${coach.firstName} ${coach.lastName}`,
      email: coach.email
    }));

    res.json({ coaches: results });
  } catch (error) {
    console.error('Error searching coaches:', error);
    res.status(500).json({ error: 'Failed to search coaches' });
  }
});

// Search for existing clubs
app.get('/api/clubs/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    let query = `
      SELECT DISTINCT clubName
      FROM teams
      WHERE clubName IS NOT NULL 
      AND clubName != ''
    `;
    let params = [];

    if (q && q.length >= 1) {
      query += ` AND clubName LIKE ?`;
      params.push(`%${q}%`);
    }

    query += ` ORDER BY clubName ASC LIMIT 20`;

    const clubs = await db.query(query, params);
    const clubsList = clubs.rows || clubs || [];
    const results = clubsList.map(row => row.clubName);

    res.json({ clubs: results });
  } catch (error) {
    console.error('Error searching clubs:', error);
    res.status(500).json({ error: 'Failed to search clubs' });
  }
});

// Send team invitation (creates pending invitation)
app.post('/api/teams/:teamId/invite-coach', authenticateToken, [
  body('coachId').notEmpty().withMessage('Coach ID is required'),
  body('role').isIn(['Head Coach', 'Assistant Coach', 'Youth Coach', 'Goalkeeper Coach', 'Fitness Coach']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { teamId } = req.params;
    const { coachId, role } = req.body;

    // Check if user has permission to invite members.
    // Avoid JSON_EXTRACT in SQL since PostgreSQL does not support it.
    const membership = await db.query(`
      SELECT permissions, t.teamName FROM team_members tm
      JOIN teams t ON tm.teamId = t.id
      WHERE tm.teamId = ? AND tm.userId = ?
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to invite members' });
    }

    const rawPermissions = membership.rows[0].permissions;
    let parsedPermissions = {};
    try {
      parsedPermissions = typeof rawPermissions === 'string'
        ? JSON.parse(rawPermissions)
        : (rawPermissions || {});
    } catch (e) {
      parsedPermissions = {};
    }

    const canInviteMembers =
      parsedPermissions.canInviteMembers === true ||
      parsedPermissions.canInviteMembers === 1 ||
      parsedPermissions.canInviteMembers === '1';

    if (!canInviteMembers) {
      return res.status(403).json({ error: 'You do not have permission to invite members' });
    }

    const teamName = membership.rows[0].teamName;

    // Get the coach being invited
    const coachUser = await db.query('SELECT id, firstName, lastName, email FROM users WHERE id = ?', [coachId]);
    if (!coachUser.rows || coachUser.rows.length === 0) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    const coach = coachUser.rows[0];

    // Check if user is already a member
    const existingMember = await db.query(`
      SELECT id FROM team_members WHERE teamId = ? AND userId = ?
    `, [teamId, coachId]);

    if (existingMember.rows && existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'This coach is already a member of this team' });
    }

    // Check if invitation already exists
    const existingInvitation = await db.query(`
      SELECT id FROM team_invitations 
      WHERE teamId = ? AND invitedUserId = ? AND status = 'pending'
    `, [teamId, coachId]);

    if (existingInvitation.rows && existingInvitation.rows.length > 0) {
      return res.status(400).json({ error: 'An invitation is already pending for this coach' });
    }

    // Create invitation
    const invitationToken = uuidv4();
    const invResult = await db.query(`
      INSERT INTO team_invitations (teamId, invitedUserId, invitedByUserId, invitedEmail, role, invitationToken, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [teamId, coachId, req.user.userId, coach.email, role, invitationToken]);

    const invId = invResult.lastID || invResult.rows[0]?.id;

    // Get inviter name
    const inviterResult = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [req.user.userId]);
    const inviterName = inviterResult.rows ? `${inviterResult.rows[0].firstName} ${inviterResult.rows[0].lastName}` : 'A teammate';

    // Send invitation email
    const acceptLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invitations/${invitationToken}`;
    const invitationEmailResult = await emailService.sendTeamInvitation(coach.email, inviterName, teamName, acceptLink);

    if (!invitationEmailResult.success) {
      return res.status(201).json({
        message: 'Invitation created, but email delivery failed. The invited coach can still accept in-app.',
        emailDelivery: 'failed',
        invitationId: invId,
        invitedCoach: {
          id: coach.id,
          name: `${coach.firstName} ${coach.lastName}`,
          email: coach.email,
          role,
          status: 'pending'
        }
      });
    }

    res.status(201).json({
      message: 'Invitation sent successfully',
      emailDelivery: 'sent',
      invitationId: invId,
      invitedCoach: {
        id: coach.id,
        name: `${coach.firstName} ${coach.lastName}`,
        email: coach.email,
        role,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Get pending invitations for current user
app.get('/api/invitations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.error('⚠️  No userId in request');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`📨 Fetching invitations for user ${userId}`);

    const invitations = await db.query(`
      SELECT ti.*, t.teamName, u.firstName as inviterFirstName, u.lastName as inviterLastName
      FROM team_invitations ti
      LEFT JOIN teams t ON ti.teamId = t.id
      LEFT JOIN users u ON ti.invitedByUserId = u.id
      WHERE ti.invitedUserId = ? AND ti.status = 'pending'
      ORDER BY ti.createdAt DESC
    `, [userId]);

    const invitationsList = invitations?.rows || invitations || [];
    const result = invitationsList.map(inv => ({
      id: inv.id,
      teamId: inv.teamId,
      teamName: inv.teamName || 'Unknown Team',
      role: inv.role,
      invitedBy: inv.inviterFirstName && inv.inviterLastName ? `${inv.inviterFirstName} ${inv.inviterLastName}` : 'Unknown User',
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      invitationToken: inv.invitationToken
    }));

    res.json({ invitations: result });
  } catch (error) {
    console.error('❌ Error fetching invitations:', error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch invitations' });
  }
});

// Accept team invitation
app.post('/api/invitations/:invitationToken/accept', authenticateToken, async (req, res) => {
  try {
    const { invitationToken } = req.params;
    const isNumericId = /^[0-9]+$/.test(invitationToken);

    // Get the invitation (by id for in-app flow, or by token for email links)
    const invitation = await db.query(`
      SELECT * FROM team_invitations 
      WHERE ${isNumericId ? 'id' : 'invitationToken'} = ? AND status = 'pending'
    `, [invitationToken]);

    if (!invitation.rows || invitation.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already responded' });
    }

    const inv = invitation.rows[0];

    // Verify it belongs to current user
    if (inv.invitedUserId !== req.user.userId) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    // Check expiration
    if (new Date(inv.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired' });
    }

    // Add user to team
    const permissions = getDefaultPermissions(inv.role);
    await db.query(`
      INSERT INTO team_members (teamId, userId, role, permissions)
      VALUES (?, ?, ?, ?)
    `, [inv.teamId, inv.invitedUserId, inv.role, JSON.stringify(permissions)]);

    // Update invitation status
    await db.query(`
      UPDATE team_invitations 
      SET status = 'accepted', respondedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [inv.id]);

    // Get team and inviter details for notification
    const teamResult = await db.query('SELECT teamName FROM teams WHERE id = ?', [inv.teamId]);
    const inviterResult = await db.query('SELECT firstName, lastName, email FROM users WHERE id = ?', [inv.invitedByUserId]);
    
    const teamName = teamResult.rows ? teamResult.rows[0].teamName : 'the team';
    const inviterEmail = inviterResult.rows ? inviterResult.rows[0].email : null;
    const inviterName = inviterResult.rows ? `${inviterResult.rows[0].firstName} ${inviterResult.rows[0].lastName}` : 'The team';

    // Send acceptance notification to inviter
    let notificationDelivery = 'not_sent';
    if (inviterEmail) {
      const responderResult = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [req.user.userId]);
      const responderName = (responderResult.rows && responderResult.rows.length > 0)
        ? `${responderResult.rows[0].firstName} ${responderResult.rows[0].lastName}`
        : 'A coach';

      const responseEmailResult = await emailService.sendInvitationResponse(inviterEmail, inviterName, teamName, responderName, 'accepted');
      notificationDelivery = responseEmailResult.success ? 'sent' : 'failed';
    }

    res.json({ message: 'Invitation accepted successfully', notificationDelivery });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Reject team invitation
app.post('/api/invitations/:invitationToken/reject', authenticateToken, async (req, res) => {
  try {
    const { invitationToken } = req.params;
    const isNumericId = /^[0-9]+$/.test(invitationToken);

    // Get the invitation (by id for in-app flow, or by token for email links)
    const invitation = await db.query(`
      SELECT * FROM team_invitations 
      WHERE ${isNumericId ? 'id' : 'invitationToken'} = ? AND status = 'pending'
    `, [invitationToken]);

    if (!invitation.rows || invitation.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already responded' });
    }

    const inv = invitation.rows[0];

    // Verify it belongs to current user
    if (inv.invitedUserId !== req.user.userId) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    // Update invitation status
    await db.query(`
      UPDATE team_invitations 
      SET status = 'rejected', respondedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [inv.id]);

    // Get team and inviter details for notification
    const teamResult = await db.query('SELECT teamName FROM teams WHERE id = ?', [inv.teamId]);
    const inviterResult = await db.query('SELECT firstName, lastName, email FROM users WHERE id = ?', [inv.invitedByUserId]);
    
    const teamName = teamResult.rows ? teamResult.rows[0].teamName : 'the team';
    const inviterEmail = inviterResult.rows ? inviterResult.rows[0].email : null;
    const inviterName = inviterResult.rows ? `${inviterResult.rows[0].firstName} ${inviterResult.rows[0].lastName}` : 'The team';

    // Send rejection notification to inviter
    let notificationDelivery = 'not_sent';
    if (inviterEmail) {
      const responderResult = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [req.user.userId]);
      const responderName = (responderResult.rows && responderResult.rows.length > 0)
        ? `${responderResult.rows[0].firstName} ${responderResult.rows[0].lastName}`
        : 'A coach';

      const responseEmailResult = await emailService.sendInvitationResponse(inviterEmail, inviterName, teamName, responderName, 'rejected');
      notificationDelivery = responseEmailResult.success ? 'sent' : 'failed';
    }

    res.json({ message: 'Invitation rejected', notificationDelivery });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    res.status(500).json({ error: 'Failed to reject invitation' });
  }
});

// Remove team member
app.delete('/api/teams/:teamId/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    // Check if requester has permission to remove members.
    // Avoid JSON_EXTRACT in SQL since PostgreSQL does not support it.
    const membership = await db.query(`
      SELECT permissions FROM team_members
      WHERE teamId = ? AND userId = ?
    `, [teamId, req.user.userId]);

    if (!membership.rows || membership.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to remove members' });
    }

    const rawPermissions = membership.rows[0].permissions;
    let parsedPermissions = {};
    try {
      parsedPermissions = typeof rawPermissions === 'string'
        ? JSON.parse(rawPermissions)
        : (rawPermissions || {});
    } catch (e) {
      parsedPermissions = {};
    }

    const canEditTeam =
      parsedPermissions.canEditTeam === true ||
      parsedPermissions.canEditTeam === 1 ||
      parsedPermissions.canEditTeam === '1';

    if (!canEditTeam) {
      return res.status(403).json({ error: 'You do not have permission to remove members' });
    }

    // Check if member exists
    const memberToRemove = await db.query(`
      SELECT tm.*, u.firstName, u.lastName, u.email
      FROM team_members tm
      JOIN users u ON tm.userId = u.id
      WHERE tm.teamId = ? AND tm.userId = ?
    `, [teamId, userId]);

    if (!memberToRemove.rows || memberToRemove.rows.length === 0) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    const member = memberToRemove.rows[0];

    // Remove the member
    await db.query('DELETE FROM team_members WHERE teamId = ? AND userId = ?', [teamId, userId]);

    // Get team and remover details
    const teamResult = await db.query('SELECT teamName FROM teams WHERE id = ?', [teamId]);
    const removerResult = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [req.user.userId]);

    const teamName = teamResult.rows ? teamResult.rows[0].teamName : 'the team';
    const removerName = removerResult.rows ? `${removerResult.rows[0].firstName} ${removerResult.rows[0].lastName}` : 'A team manager';

    // Send removal notification
    const removalEmailResult = await emailService.sendCoachRemovalNotification(
      member.email,
      `${member.firstName} ${member.lastName}`,
      teamName,
      removerName
    );

    res.json({
      message: 'Team member removed successfully',
      notificationDelivery: removalEmailResult.success ? 'sent' : 'failed'
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// ============= Team Rosters Endpoints =============

// Get all rosters for authenticated coach
app.get('/api/team-rosters', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT tr.id, tr.teamId, tr.maxSquadSize, tr.createdAt, tr.updatedAt,
             t.teamname as "teamName", t.clubname as "clubName", 
             t.agegroup as "ageGroup", t.league
      FROM team_rosters tr
      LEFT JOIN teams t ON tr.teamId = t.id
      WHERE t.createdby = ?
      ORDER BY tr.createdAt DESC
    `;
    const result = await db.query(query, [req.user.userId]);
    const rosters = result.rows || [];

    // Get players for each roster
    const rostersWithPlayers = await Promise.all(
      rosters.map(async (roster) => {
        const playersQuery = `
          SELECT id, playerName, bestPosition, alternativePositions, 
                 preferredFoot, age, contactInfo, notes, isActive, 
                 addedAt, updatedAt
          FROM team_players
          WHERE teamId = ?
          ORDER BY playerName
        `;
        const playersResult = await db.query(playersQuery, [roster.id]);
        return {
          ...roster,
          players: playersResult.rows || []
        };
      })
    );

    res.json({ rosters: rostersWithPlayers });
  } catch (error) {
    console.error('Error fetching rosters:', error);
    res.status(500).json({ error: 'Failed to fetch rosters' });
  }
});

// Create a new team roster
app.post('/api/team-rosters', authenticateToken, [
  body('teamName').notEmpty().withMessage('Team name is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('league').notEmpty().withMessage('League is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamName, clubName, ageGroup, league, maxSquadSize } = req.body;

    // Create team first
    const teamQuery = `
      INSERT INTO teams (teamName, clubName, ageGroup, league, createdBy)
      VALUES (?, ?, ?, ?, ?)
    `;
    const teamResult = await db.query(teamQuery, [
      teamName,
      clubName || null,
      ageGroup,
      league,
      req.user.userId
    ]);

    const teamId = teamResult.lastID || teamResult.rows[0].id;

    // Create roster linked to team
    const rosterQuery = `
      INSERT INTO team_rosters (teamId, maxSquadSize)
      VALUES (?, ?)
    `;
    const rosterResult = await db.query(rosterQuery, [
      teamId,
      maxSquadSize || null
    ]);

    const roster = {
      id: rosterResult.lastID || rosterResult.rows[0].id,
      teamId,
      teamName,
      clubName: clubName || '',
      ageGroup,
      league,
      maxSquadSize: maxSquadSize || null,
      players: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json({ message: 'Team roster created successfully', roster });
  } catch (error) {
    console.error('Error creating roster:', error);
    res.status(500).json({ error: 'Failed to create roster' });
  }
});

// Get a specific roster with players
app.get('/api/team-rosters/:rosterId', authenticateToken, async (req, res) => {
  try {
    const rosterId = req.params.rosterId;

    const query = `
      SELECT tr.id, tr.teamId, tr.maxSquadSize, tr.createdAt, tr.updatedAt,
             t.teamname as "teamName", t.clubname as "clubName", 
             t.agegroup as "ageGroup", t.league
      FROM team_rosters tr
      LEFT JOIN teams t ON tr.teamId = t.id
      WHERE tr.id = ? AND t.createdby = ?
    `;
    const result = await db.query(query, [rosterId, req.user.userId]);

    const rows = result.rows || result || [];
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    const roster = rows[0];

    // Get players
    const playersQuery = `
      SELECT id, playerName, bestPosition, alternativePositions, 
             preferredFoot, age, contactInfo, notes, isActive, 
             addedAt, updatedAt
      FROM team_players
      WHERE teamId = ?
      ORDER BY playerName
    `;
    const playersResult = await db.query(playersQuery, [roster.id]);

    roster.players = playersResult.rows || [];

    res.json({ roster });
  } catch (error) {
    console.error('Error fetching roster:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// Update team roster details
app.put('/api/team-rosters/:rosterId', authenticateToken, async (req, res) => {
  try {
    const rosterId = req.params.rosterId;
    const { teamName, clubName, ageGroup, league, maxSquadSize } = req.body;

    // Verify ownership
    const verifyQuery = `
      SELECT tr.id, tr.teamId FROM team_rosters tr
      LEFT JOIN teams t ON tr.teamId = t.id
      WHERE tr.id = ? AND t.createdby = ?
    `;
    const verifyResult = await db.query(verifyQuery, [rosterId, req.user.userId]);
    const verifyRows = verifyResult.rows || verifyResult || [];

    if (verifyRows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to update this roster' });
    }

    // Update roster
    const updateQuery = `
      UPDATE team_rosters
      SET maxSquadSize = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await db.query(updateQuery, [maxSquadSize || null, rosterId]);

    // Update team info if provided
    if (teamName || clubName || ageGroup || league) {
      const teamUpdateQuery = `
        UPDATE teams
        SET ${teamUpdateFields.join(', ')}
        WHERE id = ?
      `;
      const params = [];
      if (teamName) params.push(teamName);
      if (clubName) params.push(clubName);
      if (ageGroup) params.push(ageGroup);
      if (league) params.push(league);
      params.push(verifyRows[0].teamId);

      if (params.length > 1) {
        await db.query(teamUpdateQuery, params);
      }
    }

    // Fetch updated roster data
    const fetchQuery = `
      SELECT tr.id, tr.teamId, tr.maxSquadSize, tr.createdAt, tr.updatedAt,
             t.teamname as "teamName", t.clubname as "clubName", 
             t.agegroup as "ageGroup", t.league
      FROM team_rosters tr
      LEFT JOIN teams t ON tr.teamId = t.id
      WHERE tr.id = ?
    `;
    const fetchResult = await db.query(fetchQuery, [rosterId]);
    const fetchRows = fetchResult.rows || fetchResult || [];
    const updatedRoster = fetchRows[0];

    res.json({ message: 'Roster updated successfully', roster: updatedRoster });
  } catch (error) {
    console.error('Error updating roster:', error);
    res.status(500).json({ error: 'Failed to update roster' });
  }
});

// Delete a team roster
app.delete('/api/team-rosters/:rosterId', authenticateToken, async (req, res) => {
  try {
    const rosterId = req.params.rosterId;

    // Verify ownership
    const verifyQuery = `
      SELECT tr.teamId FROM team_rosters tr
      LEFT JOIN teams t ON tr.teamId = t.id
      WHERE tr.id = ? AND t.createdby = ?
    `;
    const verifyResult = await db.query(verifyQuery, [rosterId, req.user.userId]);
    const verifyRows = verifyResult.rows || verifyResult || [];

    if (verifyRows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to delete this roster' });
    }

    const teamId = verifyRows[0].teamId;

    // Delete associated players first (cascade handled by DB)
    await db.query('DELETE FROM team_players WHERE teamId = ?', [rosterId]);

    // Delete roster
    await db.query('DELETE FROM team_rosters WHERE id = ?', [rosterId]);

    // Also delete the associated team
    await db.query('DELETE FROM teams WHERE id = ?', [teamId]);

    res.json({ message: 'Roster deleted successfully' });
  } catch (error) {
    console.error('Error deleting roster:', error);
    res.status(500).json({ error: 'Failed to delete roster' });
  }
});

// Add a player to the roster
app.post('/api/team-rosters/:rosterId/players', authenticateToken, [
  body('playerName').notEmpty().withMessage('Player name is required'),
  body('bestPosition').notEmpty().withMessage('Best position is required'),
  body('preferredFoot').isIn(['Left', 'Right', 'Both']).withMessage('Invalid preferred foot')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const rosterId = req.params.rosterId;
    const { playerName, bestPosition, alternativePositions, preferredFoot, age, contactInfo, notes } = req.body;

    // Verify ownership
    const verifyQuery = `
      SELECT tr.id FROM team_rosters tr
      LEFT JOIN teams t ON tr.teamId = t.id
      WHERE tr.id = ? AND t.createdby = ?
    `;
    const verifyResult = await db.query(verifyQuery, [rosterId, req.user.userId]);
    const verifyRows = verifyResult.rows || verifyResult || [];

    if (verifyRows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to add players to this roster' });
    }

    // Add player
    const addQuery = `
      INSERT INTO team_players (teamId, playerName, bestPosition, alternativePositions, preferredFoot, age, contactInfo, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.query(addQuery, [
      rosterId,
      playerName,
      bestPosition,
      JSON.stringify(alternativePositions || []),
      preferredFoot,
      age || null,
      contactInfo || null,
      notes || null
    ]);

    const player = {
      id: result.lastID || result.rows[0].id,
      playerName,
      bestPosition,
      alternativePositions: alternativePositions || [],
      preferredFoot,
      age: age || null,
      contactInfo: contactInfo || null,
      notes: notes || null,
      isActive: true
    };

    res.status(201).json({ message: 'Player added successfully', player });
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: 'Failed to add player' });
  }
});

// Update player details
app.put('/api/team-rosters/:rosterId/players/:playerId', authenticateToken, async (req, res) => {
  try {
    const { rosterId, playerId } = req.params;
    const { playerName, bestPosition, alternativePositions, preferredFoot, age, contactInfo, notes, isActive } = req.body;

    // Verify ownership
    const verifyQuery = `
      SELECT tp.id FROM team_players tp
      JOIN team_rosters tr ON tp.teamId = tr.id
      LEFT JOIN teams t ON tr.teamId = t.id
      WHERE tp.id = ? AND tp.teamId = ? AND t.createdby = ?
    `;
    const verifyResult = await db.query(verifyQuery, [playerId, rosterId, req.user.userId]);
    const verifyRows = verifyResult.rows || verifyResult || [];

    if (verifyRows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to update this player' });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (playerName) {
      updateFields.push('playerName = ?');
      updateValues.push(playerName);
    }
    if (bestPosition) {
      updateFields.push('bestPosition = ?');
      updateValues.push(bestPosition);
    }
    if (alternativePositions) {
      updateFields.push('alternativePositions = ?');
      updateValues.push(JSON.stringify(alternativePositions));
    }
    if (preferredFoot) {
      updateFields.push('preferredFoot = ?');
      updateValues.push(preferredFoot);
    }
    if (age !== undefined) {
      updateFields.push('age = ?');
      updateValues.push(age);
    }
    if (contactInfo) {
      updateFields.push('contactInfo = ?');
      updateValues.push(contactInfo);
    }
    if (notes) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }
    if (isActive !== undefined) {
      updateFields.push('isActive = ?');
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(playerId);

    const updateQuery = `
      UPDATE team_players
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    await db.query(updateQuery, updateValues);

    // Fetch updated player
    const fetchQuery = `
      SELECT id, playerName, bestPosition, alternativePositions, 
             preferredFoot, age, contactInfo, notes, isActive, 
             addedAt, updatedAt
      FROM team_players
      WHERE id = ?
    `;
    const fetchResult = await db.query(fetchQuery, [playerId]);
    const fetchRows = fetchResult.rows || fetchResult || [];
    const player = fetchRows[0];

    res.json({ message: 'Player updated successfully', player });
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Remove player from roster
app.delete('/api/team-rosters/:rosterId/players/:playerId', authenticateToken, async (req, res) => {
  try {
    const { rosterId, playerId } = req.params;

    // Verify ownership
    const verifyQuery = `
      SELECT tp.id FROM team_players tp
      JOIN team_rosters tr ON tp.teamId = tr.id
      LEFT JOIN teams t ON tr.teamId = t.id
      WHERE tp.id = ? AND tp.teamId = ? AND t.createdby = ?
    `;
    const verifyResult = await db.query(verifyQuery, [playerId, rosterId, req.user.userId]);
    const verifyRows = verifyResult.rows || verifyResult || [];

    if (verifyRows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to remove this player' });
    }

    // Delete player
    await db.query('DELETE FROM team_players WHERE id = ?', [playerId]);

    res.json({ message: 'Player removed successfully' });
  } catch (error) {
    console.error('Error removing player:', error);
    res.status(500).json({ error: 'Failed to remove player' });
  }
});

// Get position analysis for roster (squad gaps)
app.get('/api/team-rosters/:rosterId/position-analysis', authenticateToken, async (req, res) => {
  try {
    const rosterId = req.params.rosterId;

    // Verify ownership
    const verifyQuery = `
      SELECT tr.id FROM team_rosters tr
      LEFT JOIN teams t ON tr.teamId = t.id
      WHERE tr.id = ? AND t.createdby = ?
    `;
    const verifyResult = await db.query(verifyQuery, [rosterId, req.user.userId]);
    const verifyRows = verifyResult.rows || verifyResult || [];

    if (verifyRows.length === 0) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    // Get position counts
    const positionQuery = `
      SELECT bestPosition, COUNT(*) as count
      FROM team_players
      WHERE teamId = ? AND isActive = true
      GROUP BY bestPosition
      ORDER BY bestPosition
    `;
    const positionResult = await db.query(positionQuery, [rosterId]);
    const positions = positionResult.rows || positionResult || [];

    // Define ideal squad composition
    const idealComposition = {
      'Goalkeeper': 2,
      'Defender': 6,
      'Midfielder': 5,
      'Forward': 3
    };

    // Calculate gaps
    const gaps = Object.entries(idealComposition).map(([position, ideal]) => {
      const current = positions.find(p => p.bestPosition === position)?.count || 0;
      const gap = ideal - current;
      const priority = gap > 2 ? 'high' : gap > 0 ? 'medium' : 'low';

      return {
        position,
        currentCount: current,
        idealCount: ideal,
        gap: Math.max(0, gap),
        priority
      };
    });

    res.json({ analysis: gaps });
  } catch (error) {
    console.error('Error analyzing roster positions:', error);
    res.status(500).json({ error: 'Failed to analyze roster positions' });
  }
});

// Helper function to get default permissions for a role
function getDefaultPermissions(role) {
  const permissionMap = {
    'Head Coach': {
      canPostVacancies: true,
      canManageRoster: true,
      canEditTeam: true,
      canDeleteTeam: true,
      canInviteMembers: true
    },
    'Assistant Coach': {
      canPostVacancies: true,
      canManageRoster: true,
      canEditTeam: false,
      canDeleteTeam: false,
      canInviteMembers: false
    },
    'Youth Coach': {
      canPostVacancies: false,
      canManageRoster: true,
      canEditTeam: false,
      canDeleteTeam: false,
      canInviteMembers: false
    },
    'Goalkeeper Coach': {
      canPostVacancies: false,
      canManageRoster: true,
      canEditTeam: false,
      canDeleteTeam: false,
      canInviteMembers: false
    },
    'Fitness Coach': {
      canPostVacancies: false,
      canManageRoster: true,
      canEditTeam: false,
      canDeleteTeam: false,
      canInviteMembers: false
    }
  };

  return permissionMap[role] || permissionMap['Assistant Coach'];
}

// ============================================================================
// TEST DATA MANAGEMENT API ENDPOINTS (Admin only)
// ============================================================================

// Create test team vacancies
app.post('/api/admin/test-team-vacancies', authenticateToken, async (req, res) => {
  try {
    // Check admin permissions
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const midlandsLocations = [
      { city: 'Birmingham', lat: 52.4862, lng: -1.8904, postcode: 'B1 1AA' },
      { city: 'Coventry', lat: 52.4068, lng: -1.5197, postcode: 'CV1 1AA' },
      { city: 'Leicester', lat: 52.6369, lng: -1.1398, postcode: 'LE1 1AA' },
      { city: 'Nottingham', lat: 52.9548, lng: -1.1581, postcode: 'NG1 1AA' },
      { city: 'Derby', lat: 52.9225, lng: -1.4746, postcode: 'DE1 1AA' },
      { city: 'Wolverhampton', lat: 52.5867, lng: -2.1286, postcode: 'WV1 1AA' }
    ];

    const positions = [
      'Goalkeeper', 'Centre-back', 'Left-back', 'Right-back',
      'Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder',
      'Left Wing', 'Right Wing', 'Striker', 'Centre Forward'
    ];

    const teamNames = [
      'United FC', 'City FC', 'Rangers FC', 'Rovers FC',
      'Athletic FC', 'Town FC', 'Wanderers FC', 'Borough FC',
      'County FC', 'Vale FC', 'Albion FC', 'Hotspur FC'
    ];

    // Fetch active leagues
    const leaguesResult = await db.query('SELECT id, name, region FROM leagues WHERE isActive = true OR isActive = 1 ORDER BY name LIMIT 10');
    const leagues = leaguesResult.rows || [];

    if (leagues.length === 0) {
      return res.status(400).json({ error: 'No active leagues found' });
    }

    const selectedLeagues = leagues.slice(0, 3);
    const ageGroups = ['U9', 'U11', 'U14', 'U16'];
    const createdVacancies = [];

    // Create 2 vacancies per age group (8 total)
    for (const ageGroup of ageGroups) {
      for (let i = 0; i < 2; i++) {
        const location = midlandsLocations[(ageGroups.indexOf(ageGroup) * 2 + i) % midlandsLocations.length];
        const teamName = teamNames[Math.floor(Math.random() * teamNames.length)];
        const position = positions[Math.floor(Math.random() * positions.length)];
        const league = selectedLeagues[Math.floor(Math.random() * selectedLeagues.length)];
        
        const hasMatchRecording = Math.random() > 0.5;
        const hasPathwayToSenior = Math.random() > 0.6;

        const title = `${location.city} ${teamName} - ${ageGroup} ${position} Wanted`;
        const description = `${location.city} ${teamName} are looking for a talented ${position} to join our ${ageGroup} team. We compete in ${league.name} and train twice a week with matches on weekends. Great coaching, friendly environment, and a focus on player development.${hasMatchRecording ? ' We record all matches for performance review.' : ''}${hasPathwayToSenior ? ' Clear pathway to senior team.' : ''} This is test data created via Admin panel.`;

        const result = await db.query(
          `INSERT INTO team_vacancies (
            title, description, league, ageGroup, position,
            location, locationLatitude, locationLongitude, locationAddress,
            contactInfo, postedBy, hasMatchRecording, hasPathwayToSenior,
            status, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            title, description, league.name, ageGroup, position,
            location.city, location.lat, location.lng,
            `${location.city}, ${location.postcode}`,
            'test@grassrootshub.com', req.user.userId,
            hasMatchRecording ? 1 : 0, hasPathwayToSenior ? 1 : 0,
            'active'
          ]
        );

        createdVacancies.push({
          id: result.lastID || result.insertId,
          title,
          ageGroup,
          position,
          league: league.name,
          location: location.city
        });

        alertService.sendNewVacancyAlerts({
          id: result.lastID || result.insertId,
          title,
          description,
          league: league.name,
          ageGroup,
          position,
          location: location.city
        }).catch((alertError) => {
          console.error('Failed to send new vacancy alerts:', alertError);
        });
      }
    }

    res.json({
      message: `Successfully created ${createdVacancies.length} test team vacancies`,
      vacancies: createdVacancies
    });
  } catch (error) {
    console.error('Error creating test team vacancies:', error);
    res.status(500).json({ error: 'Failed to create test team vacancies' });
  }
});

// Delete test team vacancies
app.delete('/api/admin/test-team-vacancies', authenticateToken, async (req, res) => {
  try {
    // Check admin permissions
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Find all test team vacancies
    const testVacancies = await db.query(
      `SELECT id, title FROM team_vacancies WHERE description LIKE ?`,
      ['%This is test data created via Admin panel%']
    );

    const vacancies = testVacancies.rows || [];

    if (vacancies.length === 0) {
      return res.json({ message: 'No test team vacancies found to delete', count: 0 });
    }

    // Delete all test vacancies
    await db.query(
      `DELETE FROM team_vacancies WHERE description LIKE ?`,
      ['%This is test data created via Admin panel%']
    );

    res.json({
      message: `Successfully deleted ${vacancies.length} test team vacancies`,
      count: vacancies.length
    });
  } catch (error) {
    console.error('Error deleting test team vacancies:', error);
    res.status(500).json({ error: 'Failed to delete test team vacancies' });
  }
});

// Get count of test team vacancies
app.get('/api/admin/test-team-vacancies/count', authenticateToken, async (req, res) => {
  try {
    // Check admin permissions
    const adminCheck = await db.query('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!adminCheck.rows || adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      `SELECT COUNT(*) as count FROM team_vacancies WHERE description LIKE ?`,
      ['%This is test data created via Admin panel%']
    );

    const count = result.rows ? result.rows[0].count : result[0].count;    
    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error counting test team vacancies:', error);
    res.status(500).json({ count: 0 });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// =====================================================
// P0 & P1: MESSAGE SAFETY & USER PROTECTION ENDPOINTS
// =====================================================

// P1: User-level blocking (allow users to block each other)
app.post('/api/users/:targetUserId/block', authenticateToken, [
  body('reason').optional().isString().trim()
], async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const blockerId = req.user.userId;
    const { reason } = req.body;

    if (parseInt(blockerId) === parseInt(targetUserId)) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    // Check if target exists
    const targetCheck = await db.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (!targetCheck.rows || targetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Insert or ignore duplicate
    await db.query(
      `INSERT INTO user_blocks (blockerId, blockedUserId, reason)
       VALUES (?, ?, ?)
       ON CONFLICT(blockerId, blockedUserId) DO NOTHING`,
      [blockerId, targetUserId, reason || null]
    );

    // Log moderation event
    await db.query(
      `INSERT INTO message_moderation_events (action, actorId, actorRole, reason)
       VALUES (?, ?, ?, ?)`,
      ['user_blocked', blockerId, req.user.role, reason || 'User initiated block']
    );

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// P1: Unblock user
app.post('/api/users/:targetUserId/unblock', authenticateToken, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const blockerId = req.user.userId;

    const result = await db.query(
      'DELETE FROM user_blocks WHERE blockerId = ? AND blockedUserId = ?',
      [blockerId, targetUserId]
    );

    // Log moderation event
    await db.query(
      `INSERT INTO message_moderation_events (action, actorId, actorRole)
       VALUES (?, ?, ?)`,
      ['user_unblocked', blockerId, req.user.role]
    );

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// P1: Get blocked users list
app.get('/api/users/blocked-list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const blockedUsers = await db.query(
      `SELECT ub.blockedUserId, u.firstName, u.lastName, u.email, u.role, ub.reason, ub.createdAt
       FROM user_blocks ub
       JOIN users u ON ub.blockedUserId = u.id
       WHERE ub.blockerId = ?
       ORDER BY ub.createdAt DESC`,
      [userId]
    );

    res.json({ blockedUsers: blockedUsers.rows || [] });
  } catch (error) {
    console.error('Get blocked list error:', error);
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
});

// P1: Report a message
app.post('/api/messages/:messageId/report', authenticateToken, [
  body('reason').notEmpty().withMessage('Reason is required'),
  body('details').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const reporterId = req.user.userId;
    const { reason, details } = req.body;

    // Check if message exists
    const messageCheck = await db.query('SELECT id FROM messages WHERE id = ?', [messageId]);
    if (!messageCheck.rows || messageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Prevent duplicate reports by same user
    const existingReport = await db.query(
      'SELECT id FROM message_reports WHERE messageId = ? AND reporterId = ?',
      [messageId, reporterId]
    );

    if (existingReport.rows && existingReport.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reported this message' });
    }

    // Insert report
    const result = await db.query(
      `INSERT INTO message_reports (messageId, reporterId, reason, details, status)
       VALUES (?, ?, ?, ?, 'open')`,
      [messageId, reporterId, reason, details || null]
    );

    // Log moderation event
    await db.query(
      `INSERT INTO message_moderation_events (messageId, action, actorId, actorRole, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [messageId, 'message_reported', reporterId, req.user.role, reason]
    );

    res.status(201).json({ success: true, reportId: result.lastID });
  } catch (error) {
    console.error('Report message error:', error);
    res.status(500).json({ error: 'Failed to report message' });
  }
});

// P1: Get user privacy settings
app.get('/api/users/privacy-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    let settings = await db.query(
      'SELECT * FROM user_privacy_settings WHERE userId = ?',
      [userId]
    );

    // Create default settings if none exist
    if (!settings.rows || settings.rows.length === 0) {
      await db.query(
        `INSERT INTO user_privacy_settings (userId, allowsMessagesFromCoaches, allowsMessagesFromPlayers, allowsMessagesFromParents, useAnonymousName)
         VALUES (?, TRUE, TRUE, TRUE, FALSE)`,
        [userId]
      );

      settings = await db.query(
        'SELECT * FROM user_privacy_settings WHERE userId = ?',
        [userId]
      );
    }

    res.json({ settings: settings.rows[0] });
  } catch (error) {
    console.error('Get privacy settings error:', error);
    res.status(500).json({ error: 'Failed to fetch privacy settings' });
  }
});

// P1: Update user privacy settings
app.put('/api/users/privacy-settings', authenticateToken, [
  body('allowsMessagesFromCoaches').optional().isBoolean(),
  body('allowsMessagesFromPlayers').optional().isBoolean(),
  body('allowsMessagesFromParents').optional().isBoolean(),
  body('useAnonymousName').optional().isBoolean(),
  body('anonymousDisplayName').optional().isString().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { allowsMessagesFromCoaches, allowsMessagesFromPlayers, allowsMessagesFromParents, useAnonymousName, anonymousDisplayName } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (allowsMessagesFromCoaches !== undefined) {
      updates.push('allowsMessagesFromCoaches = ?');
      values.push(allowsMessagesFromCoaches);
    }
    if (allowsMessagesFromPlayers !== undefined) {
      updates.push('allowsMessagesFromPlayers = ?');
      values.push(allowsMessagesFromPlayers);
    }
    if (allowsMessagesFromParents !== undefined) {
      updates.push('allowsMessagesFromParents = ?');
      values.push(allowsMessagesFromParents);
    }
    if (useAnonymousName !== undefined) {
      updates.push('useAnonymousName = ?');
      values.push(useAnonymousName);
    }
    if (anonymousDisplayName !== undefined) {
      updates.push('anonymousDisplayName = ?');
      values.push(anonymousDisplayName);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No settings to update' });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(userId);

    await db.query(
      `UPDATE user_privacy_settings SET ${updates.join(', ')} WHERE userId = ?`,
      values
    );

    res.json({ success: true, message: 'Privacy settings updated' });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// Export the app for use in other servers (like railway-server.js)
module.exports = app;

// Start server (only if this file is run directly, not when required as a module)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} with postgresql database`);
  });
}
