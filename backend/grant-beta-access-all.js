/**
 * One-time script to grant beta access to all existing users
 * Run this with: node backend/grant-beta-access-all.js
 */

const Database = require('./db/database.js');
require('dotenv').config();

async function grantBetaAccessToAll() {
  const db = new Database();
  
  try {
    console.log('🔄 Granting beta access to all existing users...');
    
    // Update all users to have beta access
    const result = await db.query(
      'UPDATE users SET betaAccess = ? WHERE betaAccess IS NULL OR betaAccess = ?',
      [1, 0]
    );
    
    console.log(`✅ Beta access granted to ${result.rowCount || 'all'} users`);
    
    // Show user count
    const count = await db.query('SELECT COUNT(*) as total FROM users WHERE betaAccess = ?', [1]);
    console.log(`📊 Total users with beta access: ${count.rows[0].total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error granting beta access:', error);
    process.exit(1);
  }
}

grantBetaAccessToAll();
