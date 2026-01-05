const Database = require('./db/database.js');
const encryptionService = require('./utils/encryption.js');
const bcrypt = require('bcryptjs');

async function fixTestUsers() {
  const db = new Database();
  
  try {
    console.log('🔧 Fixing test users with proper encryption...');
    
    // Get all test users
    const result = await db.query('SELECT * FROM users WHERE email LIKE "%@test.com"');
    const users = result.rows;
    
    console.log(`Found ${users.length} test users to fix`);
    
    for (const user of users) {
      const originalEmail = user.email;
      console.log(`\n🔧 Fixing user: ${originalEmail}`);
      
      // Encrypt the email
      const encryptedEmail = encryptionService.encrypt(originalEmail);
      const emailHash = encryptionService.hashForSearch(originalEmail);
      
      // Update the user with encrypted email and hash
      await db.query(
        'UPDATE users SET email = ?, emailHash = ? WHERE id = ?',
        [encryptedEmail, emailHash, user.id]
      );
      
      console.log(`   ✅ Updated email encryption and hash`);
    }
    
    console.log('\n🎉 All test users have been fixed!');
    console.log('\n📋 Test credentials should now work:');
    console.log('   Email: coach@test.com');
    console.log('   Password: test123');
    
  } catch (error) {
    console.error('❌ Error fixing test users:', error);
  }
}

fixTestUsers();
