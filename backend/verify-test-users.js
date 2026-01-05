const Database = require('./db/database.js');

async function verifyTestUsers() {
  const db = new Database();
  
  try {
    console.log('✅ Marking all test users as verified...');
    
    // Update all test users to be verified
    const result = await db.query(
      'UPDATE users SET isEmailVerified = true WHERE email LIKE "%@test.com" OR emailHash IS NOT NULL'
    );
    
    console.log(`✅ Updated ${result.changes || 'all'} test users as verified`);
    
    // Also verify admin
    await db.query(
      'UPDATE users SET isEmailVerified = true WHERE email LIKE "%@grassrootshub.com"'
    );
    
    console.log('✅ Admin user also verified');
    console.log('\n📋 Test credentials should now work without verification:');
    console.log('   Email: coach@test.com');
    console.log('   Password: test123');
    
  } catch (error) {
    console.error('❌ Error verifying test users:', error);
  }
}

verifyTestUsers();
