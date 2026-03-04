const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all('SELECT id, ageGroup, position FROM player_availability LIMIT 10', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Sample records:');
    rows.forEach((row, idx) => {
      console.log(`\nRecord ${idx + 1}:`);
      console.log('  ID:', row.id);
      console.log('  ageGroup:', row.ageGroup);
      console.log('  position:', row.position);
    });
  }
  db.close();
});
