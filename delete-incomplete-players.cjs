const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Deleting player availability records without location data...');

db.run(`
  DELETE FROM player_availability 
  WHERE locationlatitude IS NULL 
     OR locationlongitude IS NULL 
     OR locationlatitude = '' 
     OR locationlongitude = ''
`, function(err) {
  if (err) {
    console.error('Error deleting records:', err);
  } else {
    console.log(`✓ Deleted ${this.changes} player availability records without location data`);
  }
  
  // Verify remaining records
  db.all(`
    SELECT id, title, location, locationlatitude, locationlongitude 
    FROM player_availability 
    WHERE status = 'active'
    ORDER BY createdat DESC
  `, (err, rows) => {
    if (err) {
      console.error('Error querying records:', err);
    } else {
      console.log(`\nRemaining active player availability records: ${rows.length}`);
      rows.forEach(row => {
        console.log(`  - ID ${row.id}: ${row.title} (${row.location || 'No location'}) [${row.locationlatitude}, ${row.locationlongitude}]`);
      });
    }
    db.close();
  });
});
