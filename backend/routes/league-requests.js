const Database = require('../db/database.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// User endpoints (require authentication)
router.use(authenticateToken);

// Submit a new league request
router.post('/', [
  body('name').notEmpty().withMessage('League name is required').isLength({ max: 255 }).withMessage('League name too long'),
  body('region').optional().isLength({ max: 100 }).withMessage('Region name too long'),
  body('ageGroups').optional().isArray().withMessage('Age groups must be an array'),
  body('ageGroups.*').optional().isString().isLength({ max: 50 }).withMessage('Age group too long'),
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
      hasAgeGroups: !!req.body.ageGroups
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('League request validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      region,
      ageGroups,
      url,
      description,
      contactName,
      contactEmail,
      contactPhone
    } = req.body;

    // Check if league name already exists in approved leagues
    const existingLeague = await db.query(
      'SELECT id FROM leagues WHERE name = ? AND isActive = 1',
      [name]
    );

    if (existingLeague.rows.length > 0) {
      return res.status(400).json({ error: 'A league with this name already exists' });
    }

    // Check if there's already a pending request for this league
    const existingRequest = await db.query(
      'SELECT id FROM league_requests WHERE name = ? AND status = "pending"',
      [name]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'A request for this league is already pending approval' });
    }

    // Insert the league request
    console.log('💾 Inserting league request into database...');
    
    // First check if table exists and has correct structure
    try {
      const tableCheck = await db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='league_requests'");
      if (tableCheck.rows.length > 0) {
        console.log('📋 Table schema:', tableCheck.rows[0].sql);
      } else {
        console.log('❌ league_requests table does not exist!');
      }
    } catch (checkError) {
      console.error('Error checking table:', checkError);
    }
    
    const result = await db.query(`
      INSERT INTO league_requests (
        name, region, ageGroups, url, description, 
        contactName, contactEmail, contactPhone, 
        submittedBy, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      name, region, JSON.stringify(ageGroups), url, description,
      contactName, contactEmail, contactPhone,
      req.user.userId
    ]);
    console.log('✅ League request inserted successfully, ID:', result.lastID);

    res.status(201).json({
      message: 'League request submitted successfully. It will be reviewed by an administrator.',
      request: {
        id: result.lastID,
        name,
        region,
        ageGroups,
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
      ageGroups: request.ageGroups ? JSON.parse(request.ageGroups) : [],
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
      ageGroups: request.ageGroups ? JSON.parse(request.ageGroups) : [],
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
      'SELECT * FROM league_requests WHERE id = ? AND status = "pending"',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'League request not found or already processed' });
    }

    const request = requestResult.rows[0];

    // Create the league in the main leagues table
    const leagueInsertResult = await db.query(`
      INSERT INTO leagues (
        name, region, ageGroups, url, description, 
        hits, isActive, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `, [
      leagueData?.name || request.name,
      leagueData?.region || request.region,
      JSON.stringify(leagueData?.ageGroups || (request.ageGroups ? JSON.parse(request.ageGroups) : [])),
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
        id: leagueInsertResult.lastID,
        name: leagueData?.name || request.name,
        region: leagueData?.region || request.region,
        ageGroups: leagueData?.ageGroups || (request.ageGroups ? JSON.parse(request.ageGroups) : [])
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