const Database = require('../db/database.js');
const bcrypt = require('bcryptjs');

// Initialize database connection
console.log('📁 Initializing database connection...');
const db = new Database();

async function checkUser(email, password = null) {
  try {
    console.log(`🔍 Checking user: ${email}`);
    
    // Query the user from database
    const result = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No user found with that email address');
      return;
    }
    
    const user = result.rows[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Hash: ${user.emailHash}`);
    console.log(`   First Name: ${user.firstName}`);
    console.log(`   Last Name: ${user.lastName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Password Hash: ${user.password}`);
    
    if (password) {
      console.log(`\n🔐 Testing password: ${password}`);
      const passwordMatch = await bcrypt.compare(password, user.password);
      console.log(`   Password Match: ${passwordMatch ? '✅ YES' : '❌ NO'}`);
      
      if (passwordMatch) {
        console.log('\n🎯 Login should work with these credentials!');
      } else {
        console.log('\n⚠️  Password does not match - login will fail');
      }
    }
    
    return user;
  } catch (error) {
    console.error('❌ Error checking user:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email) {
    console.log('Usage: node check-user.js <email> [password]');
    process.exit(1);
  }
  
  try {
    await checkUser(email, password);
    console.log('\n✅ User check completed');
  } catch (error) {
    console.error('💥 User check failed:', error.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

main();
