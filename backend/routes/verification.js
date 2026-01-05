const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get verification status for a user
router.get('/status/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  const query = `
    SELECT 
      id,
      firstName,
      lastName,
      role,
      isVerified,
      verifiedAt,
      verifiedBy,
      verificationNotes
    FROM users 
    WHERE id = ?
  `;
  
  req.db.get(query, [userId], (err, user) => {
    if (err) {
      console.error('Error fetching verification status:', err);
      return res.status(500).json({ error: 'Failed to fetch verification status' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      isVerified: user.isVerified === 1,
      verifiedAt: user.verifiedAt,
      verifiedBy: user.verifiedBy,
      verificationNotes: user.verificationNotes
    });
  });
});

// Verify a user (Admin only)
router.post('/verify/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { notes } = req.body;
  const adminId = req.user.id;
  
  const query = `
    UPDATE users 
    SET 
      isVerified = 1,
      verifiedAt = CURRENT_TIMESTAMP,
      verifiedBy = ?,
      verificationNotes = ?
    WHERE id = ?
  `;
  
  req.db.run(query, [adminId, notes || null, userId], function(err) {
    if (err) {
      console.error('Error verifying user:', err);
      return res.status(500).json({ error: 'Failed to verify user' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`User ${userId} verified by admin ${adminId}`);
    
    res.json({
      success: true,
      message: 'User verified successfully',
      verifiedAt: new Date().toISOString()
    });
  });
});

// Unverify a user (Admin only)
router.post('/unverify/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  
  const query = `
    UPDATE users 
    SET 
      isVerified = 0,
      verifiedAt = NULL,
      verifiedBy = NULL,
      verificationNotes = NULL
    WHERE id = ?
  `;
  
  req.db.run(query, [userId], function(err) {
    if (err) {
      console.error('Error unverifying user:', err);
      return res.status(500).json({ error: 'Failed to unverify user' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`User ${userId} unverified`);
    
    res.json({
      success: true,
      message: 'User verification removed successfully'
    });
  });
});

// Get all verified users
router.get('/verified-users', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      id,
      firstName,
      lastName,
      role,
      isVerified,
      verifiedAt
    FROM users 
    WHERE isVerified = 1
    ORDER BY verifiedAt DESC
  `;
  
  req.db.all(query, [], (err, users) => {
    if (err) {
      console.error('Error fetching verified users:', err);
      return res.status(500).json({ error: 'Failed to fetch verified users' });
    }
    
    res.json({ users });
  });
});

module.exports = router;
