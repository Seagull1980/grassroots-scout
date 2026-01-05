const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

const vacancies = db.prepare('SELECT id, teamName, position, location, latitude, longitude FROM team_vacancies').all();
console.log('Found', vacancies.length, 'team vacancies with location data:');
vacancies.forEach(v => {
  console.log(`  - ${v.teamName} (${v.position})`);
  console.log(`    Location: ${v.location}`);
  console.log(`    Coords: [${v.latitude}, ${v.longitude}]`);
});

db.close();
