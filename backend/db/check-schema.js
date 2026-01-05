// Check database schema to diagnose column issues
const Database = require('./database.js');

async function checkSchema() {
  const db = new Database();
  
  try {
    console.log('Checking users table schema...');
    const result = await db.query('PRAGMA table_info(users)');
    console.log('\nUsers table columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    const hasEmailHash = result.rows.some(row => row.name === 'emailHash');
    console.log(`\nemailHash column exists: ${hasEmailHash}`);
    
    if (!hasEmailHash) {
      console.log('\n⚠️  emailHash column is MISSING - migration failed');
      console.log('Attempting to add it now...');
      await db.query('ALTER TABLE users ADD COLUMN emailHash VARCHAR UNIQUE');
      console.log('✅ Successfully added emailHash column');
    } else {
      console.log('✅ emailHash column exists');
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();
