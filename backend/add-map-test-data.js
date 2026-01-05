const Database = require('./db/database');

async function addTestDataForMap() {
  const db = new Database();
  
  try {
    console.log('Adding test data for map view...');
    
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // First, create a test user if needed
    let testUserId = 1;
    try {
      const userResult = await db.query(
        'INSERT OR IGNORE INTO users (email, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?)',
        ['testcoach@example.com', 'hashedpassword', 'Test', 'Coach', 'Coach']
      );
      if (userResult.lastID) {
        testUserId = userResult.lastID;
      }
    } catch (error) {
      console.log('Using existing test user');
    }
    
    // Add some team vacancies with coordinates
    const teamVacancies = [
      {
        teamName: 'Manchester United FC Youth',
        position: 'Midfielder',
        ageGroup: 'Under 14',
        league: 'Manchester Youth League',
        description: 'Looking for creative midfielder to join our development squad',
        requirements: 'Must attend training twice a week',
        trainingDays: JSON.stringify(['Tuesday', 'Thursday']),
        matchDay: 'Saturday',
        contactInfo: JSON.stringify({ phone: '+44 7700 900001', email: 'coach@manunited-youth.com' }),
        location: 'Manchester, UK',
        teamGender: 'Boys',
        latitude: 53.4630,
        longitude: -2.2914
      },
      {
        teamName: 'Birmingham City Girls FC',
        position: 'Striker',
        ageGroup: 'Under 16',
        league: 'Birmingham City Football League',
        description: 'Experienced striker needed for competitive team',
        requirements: 'Previous league experience preferred',
        trainingDays: JSON.stringify(['Wednesday', 'Friday']),
        matchDay: 'Sunday',
        contactInfo: JSON.stringify({ phone: '+44 7700 900002', email: 'coach@birmingham-girls.com' }),
        location: 'Birmingham, UK',
        teamGender: 'Girls',
        latitude: 52.4862,
        longitude: -1.8904
      },
      {
        teamName: 'London Eagles FC',
        position: 'Goalkeeper',
        ageGroup: 'Under 18',
        league: 'London Metropolitan League',
        description: 'Reliable goalkeeper wanted for senior youth team',
        requirements: 'Must be available for weekend matches',
        trainingDays: JSON.stringify(['Monday', 'Wednesday']),
        matchDay: 'Saturday',
        contactInfo: JSON.stringify({ phone: '+44 7700 900003', email: 'coach@london-eagles.com' }),
        location: 'London, UK',
        teamGender: 'Mixed',
        latitude: 51.5074,
        longitude: -0.1278
      },
      {
        teamName: 'Leeds United Academy',
        position: 'Defender',
        ageGroup: 'Under 12',
        league: 'Leeds Community Football League',
        description: 'Solid defender needed for youth development program',
        requirements: 'Commitment to training and matches required',
        trainingDays: JSON.stringify(['Tuesday', 'Thursday']),
        matchDay: 'Sunday',
        contactInfo: JSON.stringify({ phone: '+44 7700 900004', email: 'coach@leeds-academy.com' }),
        location: 'Leeds, UK',
        teamGender: 'Boys',
        latitude: 53.8008,
        longitude: -1.5491
      },
      {
        teamName: 'Liverpool FC Women Youth',
        position: 'Midfielder',
        ageGroup: 'Under 17',
        league: 'Liverpool Junior League',
        description: 'Dynamic midfielder for women\'s youth team',
        requirements: 'Strong passing ability essential',
        trainingDays: JSON.stringify(['Monday', 'Friday']),
        matchDay: 'Saturday',
        contactInfo: JSON.stringify({ phone: '+44 7700 900005', email: 'coach@liverpool-women.com' }),
        location: 'Liverpool, UK',
        teamGender: 'Girls',
        latitude: 53.4084,
        longitude: -2.9916
      }
    ];
    
    for (const vacancy of teamVacancies) {
      try {
        await db.query(`
          INSERT INTO team_vacancies (
            postedBy, teamName, position, ageGroup, league, description, 
            requirements, trainingDays, matchDay, contactInfo, location, 
            teamGender, latitude, longitude, status, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `, [
          testUserId, vacancy.teamName, vacancy.position, vacancy.ageGroup,
          vacancy.league, vacancy.description, vacancy.requirements,
          vacancy.trainingDays, vacancy.matchDay, vacancy.contactInfo,
          vacancy.location, vacancy.teamGender, vacancy.latitude,
          vacancy.longitude, new Date().toISOString()
        ]);
        console.log(`✅ Added team vacancy: ${vacancy.teamName} - ${vacancy.position}`);
      } catch (error) {
        console.error(`❌ Error adding vacancy for ${vacancy.teamName}:`, error.message);
      }
    }
    
    // Add some player availability with coordinates
    const playerAvailability = [
      {
        firstName: 'Alex',
        lastName: 'Johnson',
        position: 'Midfielder',
        ageGroup: 'Under 15',
        preferredLeagues: JSON.stringify(['Manchester Youth League', 'Regional League']),
        description: 'Creative midfielder with good passing range',
        experience: 'Intermediate',
        availability: JSON.stringify(['Weekends', 'Tuesday', 'Thursday']),
        contactInfo: JSON.stringify({ phone: '+44 7700 900101', email: 'alex.johnson@email.com' }),
        location: 'Manchester, UK',
        preferredTeamGender: 'Boys',
        latitude: 53.4808,
        longitude: -2.2426
      },
      {
        firstName: 'Emma',
        lastName: 'Williams',
        position: 'Forward',
        ageGroup: 'Under 16',
        preferredLeagues: JSON.stringify(['Birmingham City Football League']),
        description: 'Fast striker with excellent finishing',
        experience: 'Advanced',
        availability: JSON.stringify(['Weekends', 'Wednesday', 'Friday']),
        contactInfo: JSON.stringify({ phone: '+44 7700 900102', email: 'emma.williams@email.com' }),
        location: 'Birmingham, UK',
        preferredTeamGender: 'Girls',
        latitude: 52.4797,
        longitude: -1.9026
      },
      {
        firstName: 'Jordan',
        lastName: 'Smith',
        position: 'Goalkeeper',
        ageGroup: 'Under 17',
        preferredLeagues: JSON.stringify(['London Metropolitan League']),
        description: 'Reliable goalkeeper with good reflexes',
        experience: 'Advanced',
        availability: JSON.stringify(['Weekends', 'Monday', 'Wednesday']),
        contactInfo: JSON.stringify({ phone: '+44 7700 900103', email: 'jordan.smith@email.com' }),
        location: 'London, UK',
        preferredTeamGender: 'Mixed',
        latitude: 51.5155,
        longitude: -0.0922
      }
    ];
    
    for (const player of playerAvailability) {
      try {
        await db.query(`
          INSERT INTO player_availability (
            postedBy, firstName, lastName, position, ageGroup, preferredLeagues,
            description, experience, availability, contactInfo, location,
            preferredTeamGender, latitude, longitude, status, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `, [
          testUserId, player.firstName, player.lastName, player.position,
          player.ageGroup, player.preferredLeagues, player.description,
          player.experience, player.availability, player.contactInfo,
          player.location, player.preferredTeamGender, player.latitude,
          player.longitude, new Date().toISOString()
        ]);
        console.log(`✅ Added player: ${player.firstName} ${player.lastName} - ${player.position}`);
      } catch (error) {
        console.error(`❌ Error adding player ${player.firstName} ${player.lastName}:`, error.message);
      }
    }
    
    console.log('\n🎉 Test data added successfully!');
    console.log('You should now see data on the map view.');
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  } finally {
    process.exit(0);
  }
}

addTestDataForMap();
