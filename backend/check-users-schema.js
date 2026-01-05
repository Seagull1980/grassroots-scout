const Database = require('./db/database.js');

async function checkUsersSchema() {
  const db = new Database();
  
  try {
    console.log('🔍 Checking users table schema...');
    
    const result = await db.query("PRAGMA table_info(users)");
    console.log('\n📊 Users table columns:');
    result.rows.forEach(col => {
      console.log(`   ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'nullable'}`);
    });
    
    // Also check a sample user to see what verification field exists
    const sampleUser = await db.query('SELECT * FROM users WHERE email LIKE "%@test.com" LIMIT 1');
    if (sampleUser.rows.length > 0) {
      console.log('\n📋 Sample user fields:');
      console.log(Object.keys(sampleUser.rows[0]));
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkUsersSchema();
