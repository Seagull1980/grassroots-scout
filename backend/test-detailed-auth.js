const bcrypt = require('bcryptjs');
const Database = require('./db/database.js');
const encryptionService = require('./utils/encryption.js');

async function testDetailedAuth() {
  const db = new Database();
  
  try {
    console.log('🔍 Testing detailed authentication flow...');
    
    const email = 'coach@test.com';
    const password = 'test123';
    
    console.log(`📧 Testing with email: ${email}`);
    
    // Step 1: Create searchable hash for email lookup (as in server.js)
    const emailHash = encryptionService.hashForSearch(email);
    console.log(`🔐 Email hash: ${emailHash}`);
    
    // Step 2: Look up user by email hash
    const result = await db.query('SELECT * FROM users WHERE emailHash = ?', [emailHash]);
    const user = result.rows[0];
    
    if (!user) {
      console.log('❌ No user found with email hash');
      return;
    }
    
    console.log('✅ User found in database');
    console.log(`   ID: ${user.id}`);
    console.log(`   Role: ${user.role}`);
    
    // Step 3: Decrypt the stored email to verify
    const decryptedEmail = encryptionService.decrypt(user.email);
    console.log(`📩 Decrypted email: ${decryptedEmail}`);
    
    if (decryptedEmail !== email) {
      console.log('❌ Email mismatch after decryption');
      return;
    }
    
    console.log('✅ Email matches after decryption');
    
    // Step 4: Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log(`🔑 Password match: ${passwordMatch}`);
    
    if (passwordMatch) {
      console.log('✅ Authentication would succeed!');
      console.log('🎉 The credentials work correctly');
    } else {
      console.log('❌ Password does not match');
      console.log('🔍 Checking if password is already hashed...');
      
      // Check if the stored password is what we expect
      const testHash = await bcrypt.hash('test123', 10);
      console.log(`🔐 Test hash: ${testHash}`);
      console.log(`🔐 Stored hash: ${user.password}`);
    }
    
  } catch (error) {
    console.error('❌ Error during authentication test:', error);
  }
}

testDetailedAuth();
