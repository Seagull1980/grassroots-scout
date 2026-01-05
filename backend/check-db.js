const Database = require('./db/database.js');

async function checkUserTable() {
  const db = new Database();
  
  try {
    // Check table structure
    const structure = await db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
    console.log('Users table structure:');
    console.log(structure.rows[0]?.sql || 'Table not found');
    
    // Check if cgill1980@hotmail.com exists
    const users = await db.query("SELECT id, email, firstName, lastName FROM users LIMIT 5");
    console.log('\nFirst 5 users:');
    console.log(users.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (db.db) {
      db.db.close();
    }
  }
}

checkUserTable();
