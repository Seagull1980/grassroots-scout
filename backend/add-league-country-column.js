const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Adding country column to leagues table...');

db.run(`ALTER TABLE leagues ADD COLUMN country VARCHAR DEFAULT 'England'`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✅ Column country already exists');
    } else {
      console.error('❌ Error adding column:', err);
    }
  } else {
    console.log('✅ Successfully added country column');
  }
  
  db.close();
});
