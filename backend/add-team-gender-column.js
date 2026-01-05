const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding teamGender column to team_vacancies table...');

// Add teamGender column to team_vacancies table
db.run("ALTER TABLE team_vacancies ADD COLUMN teamGender TEXT DEFAULT 'Mixed'", function(err) {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✅ teamGender column already exists');
    } else {
      console.error('❌ Error adding teamGender column:', err.message);
    }
  } else {
    console.log('✅ Added teamGender column to team_vacancies table');
  }
  
  // Update existing records to have default values
  db.run("UPDATE team_vacancies SET teamGender = 'Mixed' WHERE teamGender IS NULL", function(err) {
    if (err) {
      console.error('❌ Error updating existing records:', err.message);
    } else {
      console.log(`✅ Updated ${this.changes} existing records with default teamGender value`);
    }
    
    // Add teamGender column to player_availability table as well
    db.run("ALTER TABLE player_availability ADD COLUMN preferredTeamGender TEXT DEFAULT 'Mixed'", function(err) {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log('✅ preferredTeamGender column already exists in player_availability');
        } else {
          console.error('❌ Error adding preferredTeamGender column to player_availability:', err.message);
        }
      } else {
        console.log('✅ Added preferredTeamGender column to player_availability table');
      }
      
      // Update existing player availability records
      db.run("UPDATE player_availability SET preferredTeamGender = 'Mixed' WHERE preferredTeamGender IS NULL", function(err) {
        if (err) {
          console.error('❌ Error updating existing player_availability records:', err.message);
        } else {
          console.log(`✅ Updated ${this.changes} existing player_availability records with default preferredTeamGender value`);
        }
        
        console.log('🎉 Migration completed!');
        db.close();
      });
    });
  });
});
