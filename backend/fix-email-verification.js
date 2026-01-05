const Database = require('./db/database.js');

async function checkAndFixEmailVerification(email) {
  const db = new Database();
  
  try {
    console.log('🔍 Checking email verification for:', email);
    
    // Find user by email
    const userResult = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (userResult.rows.length === 0) {
      console.error('❌ User not found with email:', email);
      return false;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:', user.firstName, user.lastName);
    console.log('📧 Email verified:', user.isEmailVerified);
    
    if (!user.isEmailVerified) {
      console.log('🔧 Updating email verification status...');
      
      // Update email verification
      const updateResult = await db.query(
        'UPDATE users SET isEmailVerified = 1 WHERE id = ?',
        [user.id]
      );
      
      if (updateResult.rowCount > 0) {
        console.log('✅ Email verification updated successfully!');
        return true;
      } else {
        console.error('❌ Failed to update email verification');
        return false;
      }
    } else {
      console.log('✅ Email already verified - no action needed');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error checking email verification:', error.message);
    return false;
  } finally {
    if (db.db) {
      db.db.close();
    }
  }
}

// Main execution
async function main() {
  const email = 'cgill1980@hotmail.com';
  
  console.log('🚀 Checking email verification status for:', email);
  const success = await checkAndFixEmailVerification(email);
  
  if (success) {
    console.log('🎉 Email verification check completed!');
    console.log('📧 You can now login with:', email);
  } else {
    console.log('❌ Email verification check failed!');
  }
  
  process.exit(0);
}

main().catch(console.error);
