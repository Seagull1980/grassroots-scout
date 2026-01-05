const Database = require('better-sqlite3');

const db = new Database('./db/database.sqlite');

console.log('Checking team_rosters columns:');
const columns = db.prepare('PRAGMA table_info(team_rosters)').all();
console.log(JSON.stringify(columns, null, 2));

const hasMaxSquadSize = columns.some(row => row.name === 'maxSquadSize');
console.log('\nHas maxSquadSize column:', hasMaxSquadSize);

db.close();
