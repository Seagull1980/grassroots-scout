const bcrypt = require('bcryptjs');
const Database = require('./db/database.js');

async function resetPassword(email, newPassword) {
  const db = new Database();
  
  try {
    console.log('🔍 Looking for user:', email);
    
    // Find user by email (try direct match first, then encrypted search)
    let userResult = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (userResult.rows.length === 0) {
      console.log('📧 Trying encrypted email search...');
      // If encryption is working, we could try that here
      // For now, let's try a simpler approach - search by ID or other identifier
      console.error('❌ User not found with email:', email);
      return false;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:', user.firstName || 'Unknown', user.lastName || 'User');
    
    // Hash the new password
    console.log('🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the password (remove lastUpdated since it might not exist)
    const updateResult = await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, user.id]
    );
    
    if (updateResult.rowCount > 0) {
      console.log('✅ Password reset successful for:', email);
      console.log('🔑 New password:', newPassword);
      return true;
    } else {
      console.error('❌ Failed to update password');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    return false;
  } finally {
    // Close database connection
    if (db.db) {
      db.db.close();
    }
    if (db.pool) {
      await db.pool.end();
    }
  }
}

// Main execution
async function main() {
  const email = 'cgill1980@hotmail.com';
  const newPassword = 'admin123';
  
  console.log('🚀 Starting password reset for:', email);
  const success = await resetPassword(email, newPassword);
  
  if (success) {
    console.log('🎉 Password reset completed successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 New Password:', newPassword);
  } else {
    console.log('❌ Password reset failed!');
  }
  
  process.exit(0);
}

// Run the script
main().catch(console.error);
