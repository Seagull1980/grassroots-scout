const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
console.log('Using database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  
  console.log('Connected to database');
  
  // Add team vacancy
  db.run(
    `INSERT INTO team_vacancies (
      title, description, league, ageGroup, position,
      location, locationLatitude, locationLongitude, locationAddress,
      contactInfo, postedBy, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'U12 Striker Needed',
      'Looking for talented striker for competitive team',
      'London Youth League',
      'U12',
      'Striker',
      'London',
      51.5074,
      -0.1278,
      'Hyde Park, London, UK',
      'coach@team.com',
      1,
      'active'
    ],
    function(err) {
      if (err) {
        console.error('Error adding vacancy:', err.message);
      } else {
        console.log('✅ Added team vacancy (ID:', this.lastID, ')');
      }
      
      // Add player availability
      db.run(
        `INSERT INTO player_availability (
          title, description, preferredLeagues, ageGroup, position,
          location, locationLatitude, locationLongitude, locationAddress,
          contactInfo, postedBy, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'U13 Striker Available',
          'Experienced striker looking for team',
          'London Youth League',
          'U13',
          'Striker',
          'London',
          51.5341,
          -0.0384,
          'Victoria Park, London, UK',
          'player@email.com',
          1,
          'active'
        ],
        function(err) {
          if (err) {
            console.error('Error adding player:', err.message);
          } else {
            console.log('✅ Added player availability (ID:', this.lastID, ')');
          }
          
          db.close();
          console.log('\n✅ Done!');
        }
      );
    }
  );
});
