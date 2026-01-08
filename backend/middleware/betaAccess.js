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
    // Try to get betaAccess, but handle missing column gracefully
    // PostgreSQL uses lowercase column names for unquoted identifiers
    let user;
    try {
      user = await db.query(
        'SELECT betaaccess, role FROM users WHERE id = ?',
        [req.user.userId]
      );
    } catch (dbError) {
      // If betaAccess column doesn't exist yet, just check role
      if (dbError.message && dbError.message.includes('no such column') || dbError.message.includes('betaaccess')) {
        console.warn('[BetaAccess] betaaccess column missing, checking role only');
        user = await db.query(
          'SELECT role FROM users WHERE id = ?',
          [req.user.userId]
        );
        // Default to granting access during migration period
        if (user && user.rows && user.rows.length > 0) {
          user.rows[0].betaaccess = 1; // Grant access to all existing users during migration
        }
      } else {
        throw dbError;
      }
    }

    if (!user || !user.rows || user.rows.length === 0) {
      console.log('[BetaAccess] User not found in database, userId:', req.user.userId);
      return res.status(404).json({ 
        error: 'User not found',
        betaAccessRequired: true 
      });
    }

    console.log('[BetaAccess] Checking access for user:', {
      userId: req.user.userId,
      role: user.rows[0].role,
      betaAccess: user.rows[0].betaaccess,
      betaAccessType: typeof user.rows[0].betaaccess
    });

    // Admins always have beta access
    if (user.rows[0].role === 'Admin') {
      console.log('[BetaAccess] ✅ Admin access granted');
      return next();
    }

    // Check if user has beta access enabled (handle both boolean and integer values)
    const hasBetaAccess = user.rows[0].betaaccess === true || 
                          user.rows[0].betaaccess === 1 || 
                          user.rows[0].betaaccess === '1';
    
    console.log('[BetaAccess] Access check:', {
      hasBetaAccess,
      checks: {
        'strict_true': user.rows[0].betaaccess === true,
        'strict_1': user.rows[0].betaaccess === 1,
        'strict_string_1': user.rows[0].betaaccess === '1'
      }
    });
    
    if (!hasBetaAccess) {
      console.log('[BetaAccess] ❌ Access DENIED for user', req.user.userId);
      return res.status(403).json({ 
        error: 'Beta access required',
        message: 'Your account does not have beta access. Please contact an administrator.',
        betaAccessRequired: true 
      });
    }

    console.log('[BetaAccess] ✅ Access granted for user', req.user.userId);
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
