const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('All player availability records:\n');

db.all(`
  SELECT id, title, ageGroup, position, location, locationLatitude, locationLongitude, locationAddress
  FROM player_availability
  ORDER BY id
`, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  console.log(`Total records: ${rows.length}\n`);
  rows.forEach(row => {
    console.log(`ID ${row.id}: ${row.ageGroup} ${row.position} - ${row.location}`);
    console.log(`  Coordinates: [${row.locationLatitude}, ${row.locationLongitude}]`);
    console.log(`  Address: ${row.locationAddress || 'N/A'}\n`);
  });
  
  const withCoords = rows.filter(r => r.locationLatitude && r.locationLongitude);
  console.log(`\n✓ ${withCoords.length} out of ${rows.length} have valid coordinates`);
  
  db.close();
});
