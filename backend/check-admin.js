const Database = require('./db/database.js');

async function checkAdminUsers() {
  try {
    const db = new Database();
    
    // Check what tables exist
    const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables in database:');
    console.log(tables.rows);
    
    // Try basic user query
    const allUsers = await db.query('SELECT * FROM users LIMIT 5');
    console.log('\nFirst 5 users (all columns):');
    console.log(allUsers.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdminUsers();
