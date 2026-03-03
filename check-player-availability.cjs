const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

const all = db.prepare('SELECT COUNT(*) as count FROM player_availability').get();
const withLocation = db.prepare("SELECT COUNT(*) as count FROM player_availability WHERE locationAddress IS NOT NULL AND locationAddress != ''").get();
const byUser = db.prepare('SELECT postedBy, COUNT(*) as count FROM player_availability GROUP BY postedBy').all();

console.log('Total player_availability records:', all.count);
console.log('With location data:', withLocation.count);
console.log('\nRecords by user:');
byUser.forEach(u => console.log(`  User ${u.postedBy}: ${u.count} records`));

// Get a few sample records to see structure
const samples = db.prepare('SELECT id, title, postedBy, locationAddress, locationLatitude, locationLongitude, status FROM player_availability LIMIT 12').all();
console.log('\nSample records:');
samples.forEach(s => {
  const hasLoc = s.locationAddress && s.locationLatitude && s.locationLongitude;
  console.log(`  [${s.id}] ${s.title.substring(0, 40)} - Posted by: ${s.postedBy}, Location: ${hasLoc ? 'YES' : 'NO'}, Status: ${s.status}`);
});

db.close();
