const Database = require('./db/database.js');
const bcrypt = require('bcryptjs');

async function createTestData() {
  const db = new Database();
  
  try {
    console.log('🚀 Creating comprehensive test data...\n');
    
    // Test password for all test users
    const testPassword = await bcrypt.hash('test123', 10);
    
    // 1. Create Test Users
    console.log('👥 Creating test users...');
    
    const testUsers = [
      // Coaches
      { email: 'coach1@test.com', firstName: 'Sarah', lastName: 'Johnson', role: 'Coach' },
      { email: 'coach2@test.com', firstName: 'Mike', lastName: 'Williams', role: 'Coach' },
      { email: 'coach3@test.com', firstName: 'Emma', lastName: 'Davis', role: 'Coach' },
      { email: 'coach4@test.com', firstName: 'David', lastName: 'Miller', role: 'Coach' },
      
      // Players
      { email: 'player1@test.com', firstName: 'Alex', lastName: 'Thompson', role: 'Player' },
      { email: 'player2@test.com', firstName: 'Jamie', lastName: 'Wilson', role: 'Player' },
      { email: 'player3@test.com', firstName: 'Jordan', lastName: 'Brown', role: 'Player' },
      { email: 'player4@test.com', firstName: 'Taylor', lastName: 'Anderson', role: 'Player' },
      { email: 'player5@test.com', firstName: 'Casey', lastName: 'Martinez', role: 'Player' },
      { email: 'player6@test.com', firstName: 'Morgan', lastName: 'Garcia', role: 'Player' },
      { email: 'player7@test.com', firstName: 'Riley', lastName: 'Rodriguez', role: 'Player' },
      { email: 'player8@test.com', firstName: 'Avery', lastName: 'Lee', role: 'Player' },
      
      // Parents/Guardians
      { email: 'parent1@test.com', firstName: 'Lisa', lastName: 'Smith', role: 'Parent/Guardian' },
      { email: 'parent2@test.com', firstName: 'John', lastName: 'Jones', role: 'Parent/Guardian' },
      { email: 'parent3@test.com', firstName: 'Maria', lastName: 'Lopez', role: 'Parent/Guardian' },
    ];
    
    const userIds = {};
    for (const user of testUsers) {
      const result = await db.query(
        'INSERT INTO users (email, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?)',
        [user.email, testPassword, user.firstName, user.lastName, user.role]
      );
      userIds[user.email] = result.lastID;
      console.log(`   ✅ Created ${user.role}: ${user.firstName} ${user.lastName} (${user.email})`);
    }
    
    // 2. Create Test Leagues
    console.log('\n🏆 Creating test leagues...');
    const leagues = [
      { name: 'Manchester Youth League', description: 'Youth football league for ages 8-18' },
      { name: 'Birmingham City Football League', description: 'Competitive league for local teams' },
      { name: 'London Metropolitan League', description: 'Premier youth development league' },
      { name: 'Leeds Community Football League', description: 'Grassroots community league' },
      { name: 'Liverpool Junior League', description: 'Junior development league for young players' }
    ];
    
    const leagueIds = {};
    for (const league of leagues) {
      const result = await db.query(
        'INSERT INTO leagues (name, description, createdBy, isActive) VALUES (?, ?, ?, 1)',
        [league.name, league.description, userIds['cgill1980@hotmail.com'] || 1]
      );
      leagueIds[league.name] = result.lastID;
      console.log(`   ✅ Created league: ${league.name}`);
    }
    
    // 3. Create User Profiles
    console.log('\n📋 Creating user profiles...');
    
    // Coach profiles
    const coachProfiles = [
      {
        userId: userIds['coach1@test.com'],
        phone: '+44 7700 900123',
        location: 'Manchester, UK',
        bio: 'Experienced youth coach with UEFA B license. Specializing in player development.',
        coachingLicense: 'UEFA B',
        yearsExperience: 8,
        specializations: JSON.stringify(['Youth Development', 'Tactical Training', 'Fitness']),
        ageGroupsCoached: JSON.stringify(['U12', 'U14', 'U16']),
        trainingLocation: 'Carrington Training Ground',
        matchLocation: 'Old Trafford Academy',
        trainingDays: JSON.stringify(['Tuesday', 'Thursday', 'Saturday'])
      },
      {
        userId: userIds['coach2@test.com'],
        phone: '+44 7700 900124',
        location: 'Birmingham, UK',
        bio: 'Former professional player turned coach. Focus on technical skills development.',
        coachingLicense: 'UEFA A',
        yearsExperience: 12,
        specializations: JSON.stringify(['Technical Skills', 'Goalkeeping', 'Mental Training']),
        ageGroupsCoached: JSON.stringify(['U10', 'U12', 'U14']),
        trainingLocation: 'Birmingham FC Training Centre',
        matchLocation: 'St. Andrews Stadium',
        trainingDays: JSON.stringify(['Monday', 'Wednesday', 'Friday'])
      }
    ];
    
    for (const profile of coachProfiles) {
      await db.query(`
        INSERT INTO user_profiles (
          userId, phone, location, bio, coachingLicense, yearsExperience, 
          specializations, ageGroupsCoached, trainingLocation, 
          matchLocation, trainingDays, isProfileComplete, lastUpdated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `, [
        profile.userId, profile.phone, profile.location, profile.bio,
        profile.coachingLicense, profile.yearsExperience, profile.specializations,
        profile.ageGroupsCoached, profile.trainingLocation,
        profile.matchLocation, profile.trainingDays,
        new Date().toISOString()
      ]);
      console.log(`   ✅ Created coach profile for user ID: ${profile.userId}`);
    }
    
    // Player profiles
    const playerProfiles = [
      {
        userId: userIds['player1@test.com'],
        phone: '+44 7700 900201',
        dateOfBirth: '2008-03-15',
        location: 'Manchester, UK',
        bio: 'Passionate midfielder looking to join a competitive team.',
        position: 'Midfielder',
        preferredFoot: 'Right',
        height: 165,
        weight: 58,
        experienceLevel: 'Intermediate',
        availability: JSON.stringify(['Weekends', 'Weekday Evenings'])
      },
      {
        userId: userIds['player2@test.com'],
        phone: '+44 7700 900202',
        dateOfBirth: '2007-08-22',
        location: 'Birmingham, UK',
        bio: 'Fast striker with good finishing skills.',
        position: 'Forward',
        preferredFoot: 'Left',
        height: 172,
        weight: 62,
        experienceLevel: 'Advanced',
        availability: JSON.stringify(['Weekends', 'Tuesday', 'Thursday'])
      },
      {
        userId: userIds['player3@test.com'],
        phone: '+44 7700 900203',
        dateOfBirth: '2009-01-10',
        location: 'London, UK',
        bio: 'Solid defender with leadership qualities.',
        position: 'Defender',
        preferredFoot: 'Right',
        height: 175,
        weight: 65,
        experienceLevel: 'Intermediate',
        availability: JSON.stringify(['Weekends', 'Friday'])
      }
    ];
    
    for (const profile of playerProfiles) {
      await db.query(`
        INSERT INTO user_profiles (
          userId, phone, dateOfBirth, location, bio, position, preferredFoot,
          height, weight, experienceLevel, availability, isProfileComplete, lastUpdated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `, [
        profile.userId, profile.phone, profile.dateOfBirth, profile.location,
        profile.bio, profile.position, profile.preferredFoot, profile.height,
        profile.weight, profile.experienceLevel, profile.availability,
        new Date().toISOString()
      ]);
      console.log(`   ✅ Created player profile for user ID: ${profile.userId}`);
    }
    
    // 4. Create Team Vacancies
    console.log('\n🏟️ Creating team vacancies...');
    const teamVacancies = [
      {
        title: 'Midfielder Needed - U16 Team',
        description: 'We are looking for a creative midfielder to join our U16 squad. Training twice a week with matches on Saturdays.',
        league: 'Manchester Youth League',
        ageGroup: 'U16',
        position: 'Midfielder',
        location: 'Manchester, UK',
        contactInfo: 'coach1@test.com',
        postedBy: userIds['coach1@test.com']
      },
      {
        title: 'Goalkeeper Required - U14 Team',
        description: 'Seeking a dedicated goalkeeper for our competitive U14 team. Great opportunity for development.',
        league: 'Birmingham City Football League',
        ageGroup: 'U14',
        position: 'Goalkeeper',
        location: 'Birmingham, UK',
        contactInfo: 'coach2@test.com',
        postedBy: userIds['coach2@test.com']
      },
      {
        title: 'Striker Wanted - U12 Squad',
        description: 'Fast striker needed for our attacking play style. Join a friendly and competitive environment.',
        league: 'London Metropolitan League',
        ageGroup: 'U12',
        position: 'Forward',
        location: 'London, UK',
        contactInfo: 'coach3@test.com',
        postedBy: userIds['coach3@test.com']
      },
      {
        title: 'Defender Position Available',
        description: 'Strong defender needed for our backline. Training Mon/Wed, matches Sunday.',
        league: 'Leeds Community Football League',
        ageGroup: 'U18',
        position: 'Defender',
        location: 'Leeds, UK',
        contactInfo: 'coach4@test.com',
        postedBy: userIds['coach4@test.com']
      }
    ];
    
    for (const vacancy of teamVacancies) {
      await db.query(`
        INSERT INTO team_vacancies (
          title, description, league, ageGroup, position, location, contactInfo, postedBy, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `, [
        vacancy.title, vacancy.description, vacancy.league, vacancy.ageGroup,
        vacancy.position, vacancy.location, vacancy.contactInfo, vacancy.postedBy
      ]);
      console.log(`   ✅ Created vacancy: ${vacancy.title}`);
    }
    
    // 5. Create Player Availability
    console.log('\n⚽ Creating player availability posts...');
    const playerAvailability = [
      {
        title: 'Experienced Midfielder Available',
        description: 'Looking for a competitive team. Available for training and matches.',
        preferredLeagues: 'Manchester Youth League',
        ageGroup: 'U16',
        positions: JSON.stringify(['Midfielder', 'Attacking Midfielder']),
        location: 'Manchester, UK',
        contactInfo: 'player1@test.com',
        postedBy: userIds['player1@test.com']
      },
      {
        title: 'Fast Forward Seeking Team',
        description: 'Quick striker with good finishing. Looking for regular playing time.',
        preferredLeagues: 'Birmingham City Football League',
        ageGroup: 'U16',
        positions: JSON.stringify(['Forward', 'Winger']),
        location: 'Birmingham, UK',
        contactInfo: 'player2@test.com',
        postedBy: userIds['player2@test.com']
      },
      {
        title: 'Defender Available for U14 Team',
        description: 'Solid defender with good aerial ability. Team player with leadership skills.',
        preferredLeagues: 'London Metropolitan League',
        ageGroup: 'U14',
        positions: JSON.stringify(['Defender', 'Centre-Back']),
        location: 'London, UK',
        contactInfo: 'player3@test.com',
        postedBy: userIds['player3@test.com']
      }
    ];
    
    for (const availability of playerAvailability) {
      await db.query(`
        INSERT INTO player_availability (
          title, description, preferredLeagues, ageGroup, positions, location, contactInfo, postedBy, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `, [
        availability.title, availability.description, availability.preferredLeagues,
        availability.ageGroup, availability.positions, availability.location,
        availability.contactInfo, availability.postedBy
      ]);
      console.log(`   ✅ Created availability: ${availability.title}`);
    }
    
    // 6. Create Analytics Data (Page Views and Sessions)
    console.log('\n📊 Creating analytics test data...');
    
    // Generate page views for the last 30 days
    const pages = ['/dashboard', '/search', '/profile', '/vacancies', '/player-availability', '/analytics'];
    const userIdArray = Object.values(userIds);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate 5-20 page views per day
      const viewsPerDay = Math.floor(Math.random() * 16) + 5;
      
      for (let j = 0; j < viewsPerDay; j++) {
        const randomUserId = userIdArray[Math.floor(Math.random() * userIdArray.length)];
        const randomPage = pages[Math.floor(Math.random() * pages.length)];
        const sessionId = `session_${date.getTime()}_${j}`;
        
        // Random time during the day
        const randomHour = Math.floor(Math.random() * 24);
        const randomMinute = Math.floor(Math.random() * 60);
        date.setHours(randomHour, randomMinute, 0, 0);
        
        await db.query(`
          INSERT INTO page_views (userId, page, sessionId, timestamp, ipAddress, userAgent)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          randomUserId, randomPage, sessionId, date.toISOString(),
          `192.168.1.${Math.floor(Math.random() * 255)}`,
          'Mozilla/5.0 (Test Browser)'
        ]);
        
        // Create corresponding session
        await db.query(`
          INSERT OR REPLACE INTO user_sessions 
          (userId, sessionId, startTime, ipAddress, userAgent)
          VALUES (?, ?, ?, ?, ?)
        `, [
          randomUserId, sessionId, date.toISOString(),
          `192.168.1.${Math.floor(Math.random() * 255)}`,
          'Mozilla/5.0 (Test Browser)'
        ]);
      }
    }
    console.log(`   ✅ Created analytics data for the last 30 days`);
    
    // 7. Create some match completions for analytics
    console.log('\n🏅 Creating match completion data...');
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      const randomCoachId = [userIds['coach1@test.com'], userIds['coach2@test.com']][Math.floor(Math.random() * 2)];
      const randomPlayerId = userIdArray[Math.floor(Math.random() * userIdArray.length)];
      
      await db.query(`
        INSERT INTO match_completions (
          coachId, playerId, matchType, playerName, teamName, position, ageGroup, league, 
          startDate, completionStatus, completedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        randomCoachId,
        randomPlayerId,
        'player_to_team',
        'Test Player',
        'Test Team',
        'Midfielder',
        'U16',
        'Test League',
        date.toISOString().split('T')[0], // Date only
        'confirmed',
        date.toISOString()
      ]);
    }
    console.log(`   ✅ Created 10 match completion records`);
    
    console.log('\n🎉 Test data creation completed successfully!');
    console.log('\n📧 Test User Credentials:');
    console.log('   Email: [any test email above]');
    console.log('   Password: test123');
    console.log('\n   Example logins:');
    console.log('   • coach1@test.com / test123 (Coach)');
    console.log('   • player1@test.com / test123 (Player)');
    console.log('   • parent1@test.com / test123 (Parent/Guardian)');
    console.log('\n   Admin account:');
    console.log('   • cgill1980@hotmail.com / admin123 (Admin)');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await db.close();
  }
}

createTestData();
