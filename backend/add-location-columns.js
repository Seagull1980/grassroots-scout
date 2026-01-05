const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Adding location columns...\n');

db.serialize(() => {
  // Add columns to team_vacancies
  db.run(`ALTER TABLE team_vacancies ADD COLUMN locationLatitude REAL`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding locationLatitude to team_vacancies:', err.message);
    } else {
      console.log('✅ Added locationLatitude to team_vacancies');
    }
  });
  
  db.run(`ALTER TABLE team_vacancies ADD COLUMN locationLongitude REAL`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding locationLongitude to team_vacancies:', err.message);
    } else {
      console.log('✅ Added locationLongitude to team_vacancies');
    }
  });
  
  db.run(`ALTER TABLE team_vacancies ADD COLUMN locationAddress TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding locationAddress to team_vacancies:', err.message);
    } else {
      console.log('✅ Added locationAddress to team_vacancies');
    }
  });
  
  db.run(`ALTER TABLE team_vacancies ADD COLUMN locationPlaceId TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding locationPlaceId to team_vacancies:', err.message);
    } else {
      console.log('✅ Added locationPlaceId to team_vacancies');
    }
  });
  
  // Add columns to player_availability
  db.run(`ALTER TABLE player_availability ADD COLUMN locationLatitude REAL`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding locationLatitude to player_availability:', err.message);
    } else {
      console.log('✅ Added locationLatitude to player_availability');
    }
  });
  
  db.run(`ALTER TABLE player_availability ADD COLUMN locationLongitude REAL`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding locationLongitude to player_availability:', err.message);
    } else {
      console.log('✅ Added locationLongitude to player_availability');
    }
  });
  
  db.run(`ALTER TABLE player_availability ADD COLUMN locationAddress TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding locationAddress to player_availability:', err.message);
    } else {
      console.log('✅ Added locationAddress to player_availability');
    }
  });
  
  db.run(`ALTER TABLE player_availability ADD COLUMN locationPlaceId TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding locationPlaceId to player_availability:', err.message);
    } else {
      console.log('✅ Added locationPlaceId to player_availability');
    }
    
    console.log('\n✅ Migration complete!');
    db.close();
  });
});
