const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

// Get ALL player availability records
const allRecords = db.prepare('SELECT id, title, postedBy, locationAddress, locationLatitude, locationLongitude, status FROM player_availability ORDER BY id DESC LIMIT 50').all();

console.log(`\n=== ALL Player Availability Records (${allRecords.length} total) ===\n`);
allRecords.forEach(r => {
  const hasLoc = r.locationAddress && r.locationLatitude && r.locationLongitude ? 'YES' : 'NO';
  const address = r.locationAddress || 'NULL';
  const lat = r.locationLatitude || 'NULL';
  const lng = r.locationLongitude || 'NULL';
  console.log(`ID: ${r.id.toString().padEnd(3)} | Status: ${r.status.padEnd(8)} | User: ${r.postedBy.toString().padEnd(2)} | HasLoc: ${hasLoc} | Title: "${r.title.substring(0, 50)}"`);
  if (hasLoc === 'NO') {
    console.log(`       └─ Missing: Address="${address}", Lat=${lat}, Lng=${lng}`);
  }
});

// Count by status
const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM player_availability GROUP BY status').all();
console.log('\n=== Records by Status ===');
byStatus.forEach(s => console.log(`  ${s.status || 'NULL'}: ${s.count}`));

// Count with/without location
const withLoc = db.prepare('SELECT COUNT(*) as count FROM player_availability WHERE locationAddress IS NOT NULL AND locationLatitude IS NOT NULL AND locationLongitude IS NOT NULL').get();
const withoutLoc = db.prepare('SELECT COUNT(*) as count FROM player_availability WHERE locationAddress IS NULL OR locationLatitude IS NULL OR locationLongitude IS NULL').get();
console.log('\n=== Location Data ===');
console.log(`  With location data: ${withLoc.count}`);
console.log(`  Without location data: ${withoutLoc.count}`);

db.close();
