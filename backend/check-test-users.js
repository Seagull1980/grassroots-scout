const Database = require('./db/database.js');

console.log('🔍 Checking test users in database...');

async function checkUsers() {
  try {
    const db = new Database();
    
    // Wait a bit for database to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check what columns exist in users table
    const tableInfo = db.db.prepare("PRAGMA table_info(users)").all();
    console.log('\n📋 Users table columns:', tableInfo.map(col => col.name).join(', '));
    
    // Check for test users (simplified query)
    const testUsers = db.db.prepare(`
      SELECT email, role, firstName, lastName
      FROM users 
      WHERE email LIKE '%test.com' OR email = 'admin@grassrootshub.com'
      ORDER BY email
    `).all();
    
    console.log('\n📧 Test users found:');
    console.log('===================');
    
    if (!testUsers || testUsers.length === 0) {
      console.log('❌ No test users found!');
      console.log('➡️  You need to create test users first.');
    } else {
      testUsers.forEach(user => {
        console.log(`✅ ${user.email} (${user.role}) - ${user.firstName} ${user.lastName}`);
      });
    }
    
    // Check total user count
    const totalUsers = db.db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`\n👥 Total users in database: ${totalUsers.count}`);
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }
}

checkUsers();
