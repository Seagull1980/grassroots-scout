const sqlite3 = require('sqlite3').verbose();

// Connect to database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database for migration');
  }
});

// Add new columns for team details
const alterCommands = [
  'ALTER TABLE user_profiles ADD COLUMN teamName TEXT',
  'ALTER TABLE user_profiles ADD COLUMN currentAgeGroup TEXT',
  'ALTER TABLE user_profiles ADD COLUMN trainingTime TEXT',
  'ALTER TABLE user_profiles ADD COLUMN matchDay TEXT CHECK(matchDay IN ("Saturday", "Sunday", "Midweek"))'
];

let completed = 0;

alterCommands.forEach((command, index) => {
  db.run(command, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error(`Error adding column ${index + 1}:`, err.message);
    } else if (!err) {
      console.log(`✓ Successfully added column ${index + 1}: ${command.split('COLUMN ')[1].split(' ')[0]}`);
    } else {
      console.log(`✓ Column ${index + 1} already exists: ${command.split('COLUMN ')[1].split(' ')[0]}`);
    }
    
    completed++;
    if (completed === alterCommands.length) {
      console.log('\n✓ Database migration completed successfully!');
      console.log('New team fields added: teamName, currentAgeGroup, trainingTime, matchDay');
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed.');
        }
        process.exit(0);
      });
    }
  });
});
