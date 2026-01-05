const Database = require('../db/database.js');
require('dotenv').config();

async function testDatabase() {
  console.log('🧪 Testing database connection and abstraction...\n');
  
  const db = new Database();
  
  try {
    // Test table creation
    console.log('📋 Creating tables...');
    await db.createTables();
    console.log('✅ Tables created successfully');
    
    // Test basic query
    console.log('\n🔍 Testing basic query...');
    const result = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ User count: ${result.rows[0].count}`);
    
    // Test insert
    console.log('\n➕ Testing insert operation...');
    try {
      const insertResult = await db.query(
        'INSERT INTO users (email, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
        ['test@example.com', 'hashedpassword', 'Test', 'User', 'Player']
      );
      console.log('✅ Insert test completed');
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        console.log('ℹ️ Test user already exists (expected)');
      } else {
        throw error;
      }
    }
    
    // Test select
    console.log('\n📖 Testing select operation...');
    const users = await db.query('SELECT id, email, firstName, lastName, role FROM users LIMIT 5');
    console.log(`✅ Found ${users.rows.length} users`);
    if (users.rows.length > 0) {
      console.log('👤 Sample user:', users.rows[0]);
    }
    
    console.log('\n🎉 Database test completed successfully!');
    console.log(`🔧 Using: ${process.env.DB_TYPE || 'sqlite'} database`);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await db.close();
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabase().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = testDatabase;
