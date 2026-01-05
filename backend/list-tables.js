const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking all tables in database...');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Tables in database:');
    tables.forEach(table => console.log('- ' + table.name));
  }
  db.close();
});