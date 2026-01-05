const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get user's saved searches
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT 
      id,
      name,
      filters,
      createdAt,
      lastUsed,
      useCount
    FROM saved_searches
    WHERE userId = ?
    ORDER BY lastUsed DESC, createdAt DESC
  `;
  
  req.db.all(query, [userId], (err, searches) => {
    if (err) {
      console.error('Error fetching saved searches:', err);
      return res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
    
    // Parse JSON filters
    const parsedSearches = searches.map(search => ({
      ...search,
      filters: JSON.parse(search.filters || '{}')
    }));
    
    res.json({ searches: parsedSearches });
  });
});

// Save a new search
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { name, filters } = req.body;
  
  if (!name || !filters) {
    return res.status(400).json({ error: 'Name and filters are required' });
  }
  
  const query = `
    INSERT INTO saved_searches (userId, name, filters, createdAt, lastUsed, useCount)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
  `;
  
  req.db.run(query, [userId, name, JSON.stringify(filters)], function(err) {
    if (err) {
      console.error('Error saving search:', err);
      return res.status(500).json({ error: 'Failed to save search' });
    }
    
    res.json({
      success: true,
      searchId: this.lastID,
      message: 'Search saved successfully'
    });
  });
});

// Update saved search (rename or update filters)
router.put('/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, filters } = req.body;
  
  const query = `
    UPDATE saved_searches
    SET name = ?, filters = ?
    WHERE id = ? AND userId = ?
  `;
  
  req.db.run(query, [name, JSON.stringify(filters), id, userId], function(err) {
    if (err) {
      console.error('Error updating saved search:', err);
      return res.status(500).json({ error: 'Failed to update search' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Search not found' });
    }
    
    res.json({
      success: true,
      message: 'Search updated successfully'
    });
  });
});

// Delete saved search
router.delete('/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  const query = `DELETE FROM saved_searches WHERE id = ? AND userId = ?`;
  
  req.db.run(query, [id, userId], function(err) {
    if (err) {
      console.error('Error deleting saved search:', err);
      return res.status(500).json({ error: 'Failed to delete search' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Search not found' });
    }
    
    res.json({
      success: true,
      message: 'Search deleted successfully'
    });
  });
});

// Update search usage (track when search is used)
router.post('/:id/use', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  const query = `
    UPDATE saved_searches
    SET lastUsed = CURRENT_TIMESTAMP, useCount = useCount + 1
    WHERE id = ? AND userId = ?
  `;
  
  req.db.run(query, [id, userId], function(err) {
    if (err) {
      console.error('Error updating search usage:', err);
      return res.status(500).json({ error: 'Failed to update search usage' });
    }
    
    res.json({ success: true });
  });
});

module.exports = router;
