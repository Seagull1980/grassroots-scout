const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Fetching sample player availability record...\n');

db.get(`
  SELECT *
  FROM player_availability
  WHERE id = 2
`, [], (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Raw database record:');
    console.log(JSON.stringify(row, null, 2));
    console.log('\n--- Field Analysis ---');
    console.log('ageGroup:', row.ageGroup);
    console.log('position:', row.position);
    console.log('preferredLeagues:', row.preferredLeagues);
    
    if (row.position) {
      console.log('\nTrying to parse position...');
      try {
        const parsed = JSON.parse(row.position);
        console.log('✓ position parsed successfully:', parsed);
        console.log('  Type:', Array.isArray(parsed) ? 'Array' : typeof parsed);
      } catch (e) {
        console.log('✗ position parse failed:', e.message);
      }
    }
    
    if (row.preferredLeagues) {
      console.log('\nTrying to parse preferredLeagues...');
      try {
        const parsed = JSON.parse(row.preferredLeagues);
        console.log('✓ preferredLeagues parsed successfully:', parsed);
        console.log('  Type:', Array.isArray(parsed) ? 'Array' : typeof parsed);
      } catch (e) {
        console.log('✗ preferredLeagues parse failed:', e.message);
      }
    }
  }
  db.close();
});
