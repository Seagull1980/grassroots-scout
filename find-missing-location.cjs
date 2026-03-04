const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all(`
  SELECT id, title, location, locationLatitude, locationLongitude 
  FROM player_availability 
  ORDER BY id
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('All player records:\n');
    rows.forEach(r => {
      console.log(`ID ${r.id}: ${r.title || 'No title'}`);
      console.log(`  Location: ${r.location || 'N/A'}`);
      console.log(`  Coords: ${r.locationLatitude}, ${r.locationLongitude}\n`);
    });
    console.log(`Total: ${rows.length} records`);
  }
  db.close();
});
