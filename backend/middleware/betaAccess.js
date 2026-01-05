const Database = require('../db/database.js');
const db = new Database();

/**
 * Middleware to check if user has beta access
 * Must be used AFTER authenticateToken middleware
 */
const requireBetaAccess = async (req, res, next) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      betaAccessRequired: true 
    });
  }

  try {
    const user = await db.query(
      'SELECT betaAccess, role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user || user.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        betaAccessRequired: true 
      });
    }

    // Admins always have beta access
    if (user[0].role === 'Admin') {
      return next();
    }

    // Check if user has beta access enabled
    if (!user[0].betaAccess) {
      return res.status(403).json({ 
        error: 'Beta access required',
        message: 'Your account does not have beta access. Please contact an administrator.',
        betaAccessRequired: true 
      });
    }

    next();
  } catch (error) {
    console.error('Error checking beta access:', error);
    res.status(500).json({ 
      error: 'Server error checking beta access',
      betaAccessRequired: true 
    });
  }
};

module.exports = { requireBetaAccess };
