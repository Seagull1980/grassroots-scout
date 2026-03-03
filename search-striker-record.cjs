const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

// Search for the record mentioned in logs
const search = db.prepare('SELECT * FROM player_availability WHERE title LIKE ?').all('%Striker Looking for new Challenge%');
console.log('Search for "Striker Looking for new Challenge":');
console.log(`  Found ${search.length} records`);
search.forEach(r => console.log(JSON.stringify(r, null, 2)));

// Check total count
const total = db.prepare('SELECT COUNT(*) as c FROM player_availability').get();
console.log(`\nTotal player_availability records in database: ${total.c}`);

// Check if there are records with empty or NULL status
const nullStatus = db.prepare('SELECT COUNT(*) as c FROM player_availability WHERE status IS NULL').get();
console.log(`Records with NULL status: ${nullStatus.c}`);

// Get the most recent 20 records
console.log('\n=== Most Recent 20 Records ===');
const recent = db.prepare('SELECT id, title, status, createdAt, locationLatitude FROM player_availability ORDER BY createdAt DESC LIMIT 20').all();
recent.forEach(r => {
  console.log(`ID:${r.id}, Created:${r.createdAt}, Status:${r.status}, Title:"${r.title.substring(0,40)}", HasLat:${r.locationLatitude ? 'YES' : 'NO'}`);
});

db.close();
