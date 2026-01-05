const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

console.log('\n=== TEAM_VACANCIES LOCATION DATA ===');
const schema = db.prepare("PRAGMA table_info(team_vacancies)").all();
const locationCols = schema.filter(c => c.name.toLowerCase().includes('location'));
console.log('Location-related columns:', locationCols.map(c => c.name).join(', '));

const sample = db.prepare('SELECT id, title, location, locationData FROM team_vacancies LIMIT 3').all();
console.log('\nSample vacancies:');
sample.forEach(v => {
  console.log(`\n${v.title}:`);
  console.log(`  location: ${v.location}`);
  console.log(`  locationData: ${v.locationData}`);
});

db.close();
