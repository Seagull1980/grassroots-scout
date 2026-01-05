const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('\n=== TEAM VACANCIES DATA CHECK ===\n');

// Count vacancies with training locations
const trainingCount = db.prepare(`
  SELECT COUNT(*) as total FROM team_vacancies 
  WHERE trainingLocationData IS NOT NULL
`).get();

console.log(`Total vacancies with TRAINING locations: ${trainingCount.total}`);

// Count vacancies with match locations
const matchCount = db.prepare(`
  SELECT COUNT(*) as total FROM team_vacancies 
  WHERE matchLocationData IS NOT NULL
`).get();

console.log(`Total vacancies with MATCH locations: ${matchCount.total}`);

// Show all vacancies with locations
console.log('\nAll vacancies with location data:');
const vacancies = db.prepare(`
  SELECT id, title, 
    CASE WHEN trainingLocationData IS NOT NULL THEN 'YES' ELSE 'NO' END as hasTraining,
    CASE WHEN matchLocationData IS NOT NULL THEN 'YES' ELSE 'NO' END as hasMatch
  FROM team_vacancies 
  WHERE trainingLocationData IS NOT NULL OR matchLocationData IS NOT NULL
  ORDER BY id
`).all();

vacancies.forEach(v => {
  console.log(`${v.id}: ${v.title.substring(0, 40).padEnd(40)} | Training: ${v.hasTraining} | Match: ${v.hasMatch}`);
});

console.log(`\nTotal: ${vacancies.length} vacancies\n`);

db.close();
