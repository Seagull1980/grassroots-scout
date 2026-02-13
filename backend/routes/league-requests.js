const Database = require('../db/database.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Test endpoint to check authentication
router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Authentication successful',
    user: { userId: req.user.userId, email: req.user.email, role: req.user.role },
    dbType: db.dbType
  });
});

// User endpoints (require authentication)
router.use(authenticateToken);

// Submit a new league request
router.post('/', [
  body('name').notEmpty().withMessage('League name is required').isLength({ max: 255 }).withMessage('League name too long'),
  body('region').optional().isLength({ max: 100 }).withMessage('Region name too long'),
  body('url').optional({ checkFalsy: true }).isURL().withMessage('Invalid URL format'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
  body('contactName').optional().isLength({ max: 255 }).withMessage('Contact name too long'),
  body('contactEmail').optional().isLength({ max: 255 }).withMessage('Email too long'),
  body('contactPhone').optional().isLength({ max: 20 }).withMessage('Phone number too long')
], async (req, res) => {
  try {
    console.log('📝 League request submission attempt:', {
      userId: req.user?.userId,
      name: req.body.name,
      hasToken: !!req.headers.authorization,
      bodyKeys: Object.keys(req.body)
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('League request validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      region,
      url,
      description,
      contactName,
      contactEmail,
      contactPhone
    } = req.body;

    console.log('🔍 Checking for existing league:', name);
    // Check if league name already exists in approved leagues
    const existingLeague = await db.query(
      'SELECT id FROM leagues WHERE name = ? AND isActive IS TRUE',
      [name]
    );
    console.log('✅ League existence check result:', existingLeague.rows.length);

    if (existingLeague.rows.length > 0) {
      return res.status(400).json({ error: 'A league with this name already exists' });
    }

    console.log('🔍 Checking for existing request:', name);
    // Check if there's already a pending request for this league
    const existingRequest = await db.query(
      "SELECT id FROM league_requests WHERE name = ? AND status = 'pending'",
      [name]
    );
    console.log('✅ Existing request check result:', existingRequest.rows.length);

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'A request for this league is already pending approval' });
    }

    console.log('👤 Verifying user exists:', req.user.userId);
    // Verify the user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = ?', [req.user.userId]);
    console.log('✅ User verification result:', userCheck.rows.length);
    if (userCheck.rows.length === 0) {
      console.error('User not found in database:', req.user.userId);
      return res.status(400).json({ error: 'User account not found' });
    }

    // Insert the league request
    console.log('💾 Inserting league request into database...');
    
    // First check if table exists and has correct structure
    try {
      let tableExists = false;
      if (db.dbType === 'postgresql') {
        const tableCheck = await db.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'league_requests'");
        tableExists = tableCheck.rows.length > 0;
        if (tableExists) {
          const columnCheck = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'league_requests'");
          console.log('📋 PostgreSQL table columns:', columnCheck.rows.map(r => r.column_name));
        }
      } else {
        const tableCheck = await db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='league_requests'");
        tableExists = tableCheck.rows.length > 0;
        if (tableExists) {
          console.log('📋 SQLite table schema:', tableCheck.rows[0].sql);
        }
      }
      
      if (!tableExists) {
        console.log('❌ league_requests table does not exist!');
        return res.status(500).json({ error: 'Database table not found' });
      }
    } catch (checkError) {
      console.error('Error checking table:', checkError);
    }
    
    console.log('📝 Inserting data:', {
      name, region, url, description,
      contactName, contactEmail, contactPhone, submittedBy: req.user.userId
    });
    
    const result = await db.query(`
      INSERT INTO league_requests (
        name, region, url, description, 
        contactName, contactEmail, contactPhone, 
        submittedBy, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      RETURNING id
    `, [
      name, region, url, description,
      contactName, contactEmail, contactPhone,
      req.user.userId
    ]);
    console.log('✅ League request inserted successfully, ID:', result.lastID || result.rows[0]?.id);

    res.status(201).json({
      message: 'League request submitted successfully. It will be reviewed by an administrator.',
      request: {
        id: result.lastID || result.rows[0]?.id,
        name,
        region,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error submitting league request:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to submit league request', details: error.message });
  }
});

// Get user's own league requests
router.get('/my-requests', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        lr.*,
        u.name as submitterName,
        ra.name as reviewerName
      FROM league_requests lr
      LEFT JOIN users u ON lr.submittedBy = u.id
      LEFT JOIN users ra ON lr.reviewedBy = ra.id
      WHERE lr.submittedBy = ?
      ORDER BY lr.createdAt DESC
    `, [req.user.userId]);

    const requests = result.rows.map(request => ({
      id: request.id,
      name: request.name,
      region: request.region,
      url: request.url,
      description: request.description,
      status: request.status,
      submittedAt: request.createdAt,
      reviewedAt: request.reviewedAt,
      reviewNotes: request.reviewNotes,
      reviewerName: request.reviewerName
    }));

    res.json({ requests });

  } catch (error) {
    console.error('Error fetching user league requests:', error);
    res.status(500).json({ error: 'Failed to fetch league requests' });
  }
});

// Admin endpoints
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all league requests (Admin only)
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { status = 'all', limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        lr.*,
        u.name as submitterName,
        u.email as submitterEmail,
        ra.name as reviewerName
      FROM league_requests lr
      LEFT JOIN users u ON lr.submittedBy = u.id
      LEFT JOIN users ra ON lr.reviewedBy = ra.id
    `;
    
    let params = [];
    
    if (status !== 'all') {
      query += ' WHERE lr.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY lr.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    const requests = result.rows.map(request => ({
      id: request.id,
      name: request.name,
      region: request.region,
      url: request.url,
      description: request.description,
      contactName: request.contactName,
      contactEmail: request.contactEmail,
      contactPhone: request.contactPhone,
      status: request.status,
      submittedBy: request.submittedBy,
      submitterName: request.submitterName,
      submitterEmail: request.submitterEmail,
      submittedAt: request.createdAt,
      reviewedBy: request.reviewedBy,
      reviewerName: request.reviewerName,
      reviewedAt: request.reviewedAt,
      reviewNotes: request.reviewNotes
    }));

    // Get counts by status
    const countResult = await db.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM league_requests 
      GROUP BY status
    `);

    const statusCounts = {};
    countResult.rows.forEach(row => {
      statusCounts[row.status] = row.count;
    });

    res.json({ 
      requests,
      total: requests.length,
      statusCounts
    });

  } catch (error) {
    console.error('Error fetching admin league requests:', error);
    res.status(500).json({ error: 'Failed to fetch league requests' });
  }
});

// Approve league request (Admin only)
router.post('/admin/:id/approve', requireAdmin, [
  body('reviewNotes').optional().isLength({ max: 1000 }).withMessage('Review notes too long'),
  body('leagueData').optional().isObject().withMessage('League data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reviewNotes, leagueData } = req.body;

    // Get the league request
    const requestResult = await db.query(
      "SELECT * FROM league_requests WHERE id = ? AND status = 'pending'",
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'League request not found or already processed' });
    }

    const request = requestResult.rows[0];

    // Create the league in the main leagues table
    const leagueInsertResult = await db.query(`
      INSERT INTO leagues (
        name, region, url, description, 
        hits, isActive, createdBy
      ) VALUES (?, ?, ?, ?, ?, 1, ?)
      RETURNING id
    `, [
      leagueData?.name || request.name,
      leagueData?.region || request.region,
      leagueData?.url || request.url,
      leagueData?.description || request.description,
      leagueData?.hits || 0,
      req.user.userId
    ]);

    // Update the request status
    await db.query(`
      UPDATE league_requests 
      SET status = 'approved', 
          reviewedBy = ?, 
          reviewedAt = CURRENT_TIMESTAMP,
          reviewNotes = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.user.userId, reviewNotes, id]);

    res.json({
      message: 'League request approved and league created successfully',
      league: {
        id: leagueInsertResult.lastID || leagueInsertResult.rows[0]?.id,
        name: leagueData?.name || request.name,
        region: leagueData?.region || request.region
      }
    });

  } catch (error) {
    console.error('Error approving league request:', error);
    res.status(500).json({ error: 'Failed to approve league request' });
  }
});

// Reject league request (Admin only)
router.post('/admin/:id/reject', requireAdmin, [
  body('reviewNotes').notEmpty().withMessage('Review notes are required for rejection')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reviewNotes } = req.body;

    const updateResult = await db.query(`
      UPDATE league_requests 
      SET status = 'rejected', 
          reviewedBy = ?, 
          reviewedAt = CURRENT_TIMESTAMP,
          reviewNotes = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'
    `, [req.user.userId, reviewNotes, id]);

    if (updateResult.changes === 0) {
      return res.status(404).json({ error: 'League request not found or already processed' });
    }

    res.json({
      message: 'League request rejected',
      reviewNotes
    });

  } catch (error) {
    console.error('Error rejecting league request:', error);
    res.status(500).json({ error: 'Failed to reject league request' });
  }
});

// Get request statistics (Admin only)
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        COUNT(DISTINCT submittedBy) as uniqueSubmitters
      FROM league_requests
    `);

    const recentRequestsResult = await db.query(`
      SELECT 
        lr.name,
        lr.status,
        lr.createdAt,
        u.name as submitterName
      FROM league_requests lr
      LEFT JOIN users u ON lr.submittedBy = u.id
      ORDER BY lr.createdAt DESC
      LIMIT 5
    `);

    res.json({
      stats: statsResult.rows[0],
      recentRequests: recentRequestsResult.rows
    });

  } catch (error) {
    console.error('Error fetching league request stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;