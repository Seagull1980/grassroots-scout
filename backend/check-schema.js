const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking table schemas...\n');

db.get('SELECT sql FROM sqlite_master WHERE type="table" AND name="team_vacancies"', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else if (row) {
    console.log('team_vacancies schema:');
    console.log(row.sql);
    console.log('\n');
  } else {
    console.log('team_vacancies table does not exist\n');
  }
  
  db.get('SELECT sql FROM sqlite_master WHERE type="table" AND name="player_availability"', (err2, row2) => {
    if (err2) {
      console.error('Error:', err2);
    } else if (row2) {
      console.log('player_availability schema:');
      console.log(row2.sql);
    } else {
      console.log('player_availability table does not exist');
    }
    db.close();
  });
});