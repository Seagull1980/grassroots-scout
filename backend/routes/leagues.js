const Database = require('../db/database.js');
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Get all leagues with optional filtering (includes pending requests for current user)
router.get('/', async (req, res) => {
  try {
    const { region, ageGroup, search, limit = 50, offset = 0, includePending = false } = req.query;
    
    // Get approved leagues
    let query = 'SELECT id, name, region, ageGroup, url, hits, description, "approved" as status FROM leagues WHERE isActive IS TRUE';
    let params = [];
    
    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }
    
    if (ageGroup) {
      query += ' AND ageGroup = ?';
      params.push(ageGroup);
    }
    
    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    // If user wants pending leagues included and is authenticated
    if (includePending === 'true' && req.user) {
      query += ` 
        UNION ALL 
        SELECT 
          CAST(('pending_' || id) as TEXT) as id, 
          name, 
          region, 
          ageGroup, 
          url, 
          0 as hits, 
          description, 
          "pending" as status 
        FROM league_requests 
        WHERE status = 'pending' AND submittedBy = ?
      `;
      params.push(req.user.userId);
    }
    
    query += ' ORDER BY status, hits DESC, name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    const leagues = result.rows.map(league => ({
      id: league.id,
      name: league.name,
      region: league.region,
      ageGroup: league.ageGroup,
      url: league.url,
      hits: league.hits || 0,
      description: league.description,
      status: league.status || 'approved',
      isPending: league.status === 'pending'
    }));
    
    res.json({ leagues, total: leagues.length });
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// Get league by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM leagues WHERE id = ? AND isActive = 1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    const league = result.rows[0];
    res.json({
      id: league.id,
      name: league.name,
      region: league.region,
      ageGroup: league.ageGroup,
      url: league.url,
      hits: league.hits || 0,
      description: league.description,
      createdAt: league.createdAt
    });
  } catch (error) {
    console.error('Error fetching league:', error);
    res.status(500).json({ error: 'Failed to fetch league' });
  }
});

// Admin endpoints (require authentication)
router.use(authenticateToken);

// Create new league (Admin only)
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, region, ageGroup, url, description, hits = 0 } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'League name is required' });
    }

    const result = await db.query(
      'INSERT INTO leagues (name, region, ageGroup, url, description, hits, isActive, createdBy) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      [name, region, ageGroup, url, description, hits, req.user.userId]
    );

    res.status(201).json({ 
      message: 'League created successfully',
      league: {
        id: result.lastID,
        name,
        region,
        ageGroup,
        url,
        description,
        hits
      }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'League name already exists' });
    }
    console.error('Error creating league:', error);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// Update league (Admin only)
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, region, ageGroup, url, description, hits } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'League name is required' });
    }

    const updateResult = await db.query(
      'UPDATE leagues SET name = ?, region = ?, ageGroup = ?, url = ?, description = ?, hits = ? WHERE id = ? AND isActive = 1',
      [name, region, ageGroup, url, description, hits, id]
    );

    if (updateResult.changes === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({ 
      message: 'League updated successfully',
      league: { id, name, region, ageGroup, url, description, hits }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'League name already exists' });
    }
    console.error('Error updating league:', error);
    res.status(500).json({ error: 'Failed to update league' });
  }
});

// Delete league (Admin only) - soft delete
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    
    const deleteResult = await db.query(
      'UPDATE leagues SET isActive = 0 WHERE id = ?',
      [id]
    );

    if (deleteResult.changes === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({ message: 'League deleted successfully' });
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ error: 'Failed to delete league' });
  }
});

// Get all regions
router.get('/meta/regions', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT region FROM leagues WHERE isActive = 1 AND region IS NOT NULL ORDER BY region'
    );
    const regions = result.rows.map(row => row.region);
    res.json({ regions });
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// Get all age groups
router.get('/meta/agegroups', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT ageGroup FROM leagues WHERE isActive = 1 AND ageGroup IS NOT NULL ORDER BY ageGroup'
    );
    const ageGroups = result.rows.map(row => row.ageGroup);
    res.json({ ageGroups });
  } catch (error) {
    console.error('Error fetching age groups:', error);
    res.status(500).json({ error: 'Failed to fetch age groups' });
  }
});

// Bulk import leagues (Admin only)
router.post('/bulk-import', async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { leagues } = req.body;
    
    if (!Array.isArray(leagues)) {
      return res.status(400).json({ error: 'Leagues must be an array' });
    }

    let insertedCount = 0;
    let skippedCount = 0;
    let errors = [];

    for (const league of leagues) {
      try {
        if (!league.name) {
          errors.push(`League missing name: ${JSON.stringify(league)}`);
          continue;
        }

        await db.query(
          'INSERT INTO leagues (name, region, ageGroup, url, description, hits, isActive, createdBy) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
          [league.name, league.region, league.ageGroup, league.url, league.description, league.hits || 0, req.user.userId]
        );
        insertedCount++;
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          skippedCount++;
        } else {
          errors.push(`Error with league ${league.name}: ${error.message}`);
        }
      }
    }

    res.json({ 
      message: 'Bulk import completed',
      inserted: insertedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      total: leagues.length
    });
  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: 'Failed to import leagues' });
  }
});

module.exports = router;