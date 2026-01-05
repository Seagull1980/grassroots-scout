const Database = require('./db/database.js');

async function addSimpleMapData() {
  const db = new Database();
  
  try {
    // Add a team vacancy
    await db.query(
      `INSERT INTO team_vacancies (
        title, description, league, ageGroup, position,
        location, locationData, contactInfo, postedBy, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'U12 Striker Needed',
        'Looking for talented striker for competitive team',
        'London Youth League',
        'U12',
        'Striker',
        'London',
        JSON.stringify({
          address: 'Hyde Park, London, UK',
          latitude: 51.5074,
          longitude: -0.1278
        }),
        'coach@team.com',
        1,
        'active'
      ]
    );
    console.log('✅ Added team vacancy');
    
    // Add a player availability
    await db.query(
      `INSERT INTO player_availability (
        title, description, preferredLeagues, ageGroup, positions,
        location, locationData, contactInfo, postedBy, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'U13 Striker Available',
        'Experienced striker looking for team',
        'London Youth League',
        'U13',
        'Striker',
        'London',
        JSON.stringify({
          address: 'Victoria Park, London, UK',
          latitude: 51.5341,
          longitude: -0.0384
        }),
        'player@email.com',
        1,
        'active'
      ]
    );
    console.log('✅ Added player availability');
    
    console.log('\n✅ Map test data added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

addSimpleMapData();
