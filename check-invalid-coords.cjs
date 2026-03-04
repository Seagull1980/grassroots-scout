const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all(`
  SELECT id, title, location, locationLatitude, locationLongitude 
  FROM player_availability 
  WHERE locationLatitude = 0 OR locationLongitude = 0
     OR locationLatitude < -90 OR locationLatitude > 90
     OR locationLongitude < -180 OR locationLongitude > 180
  ORDER BY id
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    if (rows.length > 0) {
      console.log('Players with invalid coordinates:\n');
      rows.forEach(r => {
        console.log(`ID ${r.id}: ${r.title || 'No title'}`);
        console.log(`  Location: ${r.location || 'N/A'}`);
        console.log(`  Coords: ${r.locationLatitude}, ${r.locationLongitude}\n`);
      });
      console.log(`Total problematic records: ${rows.length}`);
      console.log('\nTo delete these, run:');
      console.log(`DELETE FROM player_availability WHERE id IN (${rows.map(r => r.id).join(', ')});`);
    } else {
      console.log('No players with invalid coordinates found.');
    }
  }
  db.close();
});
