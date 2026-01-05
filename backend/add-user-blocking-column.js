const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Adding isBlocked column to users table...');

db.run(`ALTER TABLE users ADD COLUMN isBlocked BOOLEAN DEFAULT 0`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✅ Column isBlocked already exists');
    } else {
      console.error('❌ Error adding column:', err);
    }
  } else {
    console.log('✅ Successfully added isBlocked column');
  }
  
  db.close();
});
