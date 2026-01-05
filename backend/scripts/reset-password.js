const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Database = require('../db/database.js');

// Initialize database
const db = new Database();

async function resetPassword(email, newPassword = null) {
  try {
    // Generate a secure random password if none provided
    const password = newPassword || crypto.randomBytes(8).toString('hex');
    
    console.log(`🔐 Resetting password for: ${email}`);
    console.log(`🔑 New password: ${password}`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user's password in the database using the Database class
    const result = await db.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );
    
    if (result.rowCount === 0) {
      console.log('⚠️  No user found with that email address');
      throw new Error('User not found');
    }
    
    console.log('✅ Password reset successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${password}`);
    console.log('\n🎯 You can now log in with these credentials');
    
    return {
      email: email,
      password: password,
      success: true
    };
  } catch (error) {
    console.error('❌ Error during password reset:', error);
    throw error;
  }
}

// Get email from command line argument
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('Usage: node reset-password.js <email> [new-password]');
  process.exit(1);
}

// Reset the password
resetPassword(email, newPassword)
  .then((result) => {
    console.log('\n🎉 Password reset completed successfully!');
    db.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Password reset failed:', error.message);
    db.close();
    process.exit(1);
  });
