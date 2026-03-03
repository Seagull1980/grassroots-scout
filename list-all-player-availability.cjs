const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

const allRecords = db.prepare('SELECT id, title, postedBy, locationAddress, locationLatitude, locationLongitude, status FROM player_availability ORDER BY id').all();
console.log(`\nTotal records in database: ${allRecords.length}\n`);
console.log('ALL player_availability records:');
allRecords.forEach(r => {
  const hasLoc = r.locationAddress && r.locationLatitude && r.locationLongitude;
  console.log(`  ID:${r.id}, User:${r.postedBy}, Status:${r.status}, HasLocation:${hasLoc ? 'YES' : 'NO'}, Title:"${r.title.substring(0, 50)}"`);
});

db.close();
