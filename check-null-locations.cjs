const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking for records with NULL or missing location data...\n');

db.all(`
  SELECT id, title, location, locationLatitude, locationLongitude, locationAddress
  FROM player_availability
  WHERE locationLatitude IS NULL 
     OR locationLongitude IS NULL
     OR locationLatitude = 0
     OR locationLongitude = 0
  ORDER BY id
`, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  console.log(`Found ${rows.length} records without valid location data:\n`);
  rows.forEach(row => {
    console.log(`ID ${row.id}: ${row.title}`);
    console.log(`  Location field: ${row.location}`);
    console.log(`  Lat/Lng: [${row.locationLatitude}, ${row.locationLongitude}]`);
    console.log(`  Address: ${row.locationAddress || 'null'}\n`);
  });
  
  db.close();
});
