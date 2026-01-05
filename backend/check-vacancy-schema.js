const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

console.log('\n=== TEAM_VACANCIES TABLE SCHEMA ===');
const schema = db.prepare("PRAGMA table_info(team_vacancies)").all();
console.log('Columns:', schema.map(c => `${c.name} (${c.type})`).join(', '));

console.log('\n=== TEAM VACANCIES DATA ===');
const vacancies = db.prepare('SELECT * FROM team_vacancies LIMIT 5').all();
console.log(`Found ${vacancies.length} vacancies`);
if (vacancies.length > 0) {
  console.log('First vacancy:', JSON.stringify(vacancies[0], null, 2));
}

// Count vacancies with coordinates
const withCoords = db.prepare('SELECT COUNT(*) as count FROM team_vacancies WHERE latitude IS NOT NULL AND longitude IS NOT NULL').get();
console.log(`\nVacancies with coordinates: ${withCoords.count}`);

db.close();
