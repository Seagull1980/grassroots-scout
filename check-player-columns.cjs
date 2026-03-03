const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking player_availability table structure...\n');

db.all(`PRAGMA table_info(player_availability)`, [], (err, columns) => {
  if (err) {
    console.error('Error checking table structure:', err);
    db.close();
    return;
  }
  
  console.log('Column structure:');
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  console.log('\nSample record (ID 1):');
  db.get(`SELECT * FROM player_availability WHERE id = 1`, [], (err, row) => {
    if (err) {
      console.error('Error fetching record:', err);
    } else {
      console.log(JSON.stringify(row, null, 2));
    }
    db.close();
  });
});
