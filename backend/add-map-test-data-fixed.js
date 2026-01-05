const Database = require('./db/database.js');

async function addMapTestData() {
  const db = new Database();
  
  try {
    console.log('📁 Adding map test data...');
    
    // Get existing users
    const users = await db.query('SELECT id, role FROM users');
    console.log('Found users:', users.rows);
    
    const coachUser = users.rows.find(u => u.role === 'Coach') || users.rows[0];
    const playerUser = users.rows.find(u => u.role === 'Player') || users.rows[0];
    
    console.log('Using coach ID:', coachUser.id);
    console.log('Using player ID:', playerUser.id);
    
    // Clear existing test data
    await db.query('DELETE FROM team_vacancies');
    await db.query('DELETE FROM player_availability');
    
    // Add team vacancies with location data (London area)
    const vacancies = [
      {
        title: 'U12 Striker Needed',
        description: 'Looking for a talented striker to join our competitive U12 team',
        league: 'London Youth League',
        ageGroup: 'U12',
        position: 'Striker',
        location: 'London, UK',
        locationAddress: 'Hyde Park, London, UK',
        locationLatitude: 51.5074,
        locationLongitude: -0.1278,
        contactInfo: 'coach@team.com',
        postedBy: coachUser.id
      },
      {
        title: 'U14 Midfielder Wanted',
        description: 'Need midfielder for weekend matches',
        league: 'South London League',
        ageGroup: 'U14',
        position: 'Midfielder',
        location: 'South London, UK',
        locationAddress: 'Clapham Common, London, UK',
        locationLatitude: 51.4618,
        locationLongitude: -0.1384,
        contactInfo: 'coach@team.com',
        postedBy: coachUser.id
      },
      {
        title: 'U16 Goalkeeper Required',
        description: 'Experienced goalkeeper needed for competitive team',
        league: 'North London League',
        ageGroup: 'U16',
        position: 'Goalkeeper',
        location: 'North London, UK',
        locationAddress: 'Hampstead Heath, London, UK',
        locationLatitude: 51.5556,
        locationLongitude: -0.1656,
        contactInfo: 'coach@team.com',
        postedBy: coachUser.id
      }
    ];
    
    for (const vacancy of vacancies) {
      await db.query(
        `INSERT INTO team_vacancies (
          title, description, league, ageGroup, position, location,
          locationData, contactInfo, postedBy, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          vacancy.title, vacancy.description, vacancy.league,
          vacancy.ageGroup, vacancy.position, vacancy.location,
          JSON.stringify({
            address: vacancy.locationAddress,
            latitude: vacancy.locationLatitude,
            longitude: vacancy.locationLongitude
          }),
          vacancy.contactInfo, vacancy.postedBy
        ]
      );
      console.log('✅ Added vacancy:', vacancy.title);
    }
    
    // Add player availability with location data
    const availabilities = [
      {
        title: 'U13 Striker Available',
        description: 'Experienced striker looking for weekend team',
        preferredLeagues: 'London Youth League,South London League',
        ageGroup: 'U13',
        positions: 'Striker,Winger',
        location: 'West London, UK',
        locationAddress: 'Kensington Gardens, London, UK',
        locationLatitude: 51.5075,
        locationLongitude: -0.1812,
        contactInfo: 'player@email.com',
        postedBy: playerUser.id
      },
      {
        title: 'U15 Defender Seeking Team',
        description: 'Strong defender available immediately',
        preferredLeagues: 'North London League',
        ageGroup: 'U15',
        positions: 'Defender,Centre-back',
        location: 'East London, UK',
        locationAddress: 'Victoria Park, London, UK',
        locationLatitude: 51.5341,
        locationLongitude: -0.0384,
        contactInfo: 'player@email.com',
        postedBy: playerUser.id
      }
    ];
    
    for (const availability of availabilities) {
      await db.query(
        `INSERT INTO player_availability (
          title, description, preferredLeagues, ageGroup, positions,
          location, locationData, contactInfo, postedBy, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          availability.title, availability.description,
          availability.preferredLeagues, availability.ageGroup,
          availability.positions, availability.location,
          JSON.stringify({
            address: availability.locationAddress,
            latitude: availability.locationLatitude,
            longitude: availability.locationLongitude
          }),
          availability.contactInfo, availability.postedBy
        ]
      );
      console.log('✅ Added availability:', availability.title);
    }
    
    console.log('\n✅ Map test data added successfully!');
    console.log('📍 Test locations are all around London, UK');
    
  } catch (error) {
    console.error('❌ Error adding map test data:', error);
  } finally {
    process.exit(0);
  }
}

addMapTestData();
