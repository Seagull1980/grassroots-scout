const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const tableInfo = db.prepare("PRAGMA table_info(team_vacancies)").all();
console.log('team_vacancies schema:');
console.table(tableInfo);

db.close();
