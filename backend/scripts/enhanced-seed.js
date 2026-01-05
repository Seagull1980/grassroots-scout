const Database = require('../db/database.js');
require('dotenv').config();

class EnhancedDatabaseSeeder {
  constructor() {
    this.db = new Database();
  }

  async seedEnhancedData() {
    console.log('🏟️ Seeding enhanced clubs and players with map data...');
    
    try {
      // Seed multiple coach users with different club affiliations
      const coaches = await this.seedCoaches();
      
      // Seed team vacancies with detailed location data
      await this.seedTeamVacancies(coaches);
      
      // Seed multiple player users
      const players = await this.seedPlayers();
      
      // Seed player availability with location data
      await this.seedPlayerAvailability(players);
      
      // Seed additional leagues
      await this.seedAdditionalLeagues();
      
      console.log('✅ Enhanced data seeded successfully');
      
    } catch (error) {
      console.error('Error seeding enhanced data:', error.message);
      throw error;
    }
  }

  async seedCoaches() {
    console.log('👨‍🏫 Seeding coaches and clubs...');
    
    const crypto = require('crypto');
    const coaches = [];
    
    // Simple password hashing alternative
    const hashPassword = (password) => {
      return crypto.createHash('sha256').update(password).digest('hex');
    };
    
    const coachData = [
      {
        email: 'coach.utdyouth@example.com',
        firstName: 'Marcus',
        lastName: 'Thompson',
        club: 'Manchester United Youth FC',
        location: 'Manchester',
        lat: 53.4631,
        lng: -2.2914
      },
      {
        email: 'coach.chelseafc@example.com',
        firstName: 'Sarah',
        lastName: 'Williams',
        club: 'Chelsea Ladies FC',
        location: 'London',
        lat: 51.4816,
        lng: -0.1910
      },
      {
        email: 'coach.liverpoolfc@example.com',
        firstName: 'David',
        lastName: 'Roberts',
        club: 'Liverpool Community FC',
        location: 'Liverpool',
        lat: 53.4308,
        lng: -2.9608
      },
      {
        email: 'coach.arsenalfc@example.com',
        firstName: 'Emma',
        lastName: 'Johnson',
        club: 'Arsenal Youth Academy',
        location: 'North London',
        lat: 51.5549,
        lng: -0.1084
      },
      {
        email: 'coach.brightonfc@example.com',
        firstName: 'James',
        lastName: 'Mitchell',
        club: 'Brighton & Hove Albion Youth',
        location: 'Brighton',
        lat: 50.8429,
        lng: -0.1313
      },
      {
        email: 'coach.birminghamfc@example.com',
        firstName: 'Lisa',
        lastName: 'Anderson',
        club: 'Birmingham City Youth',
        location: 'Birmingham',
        lat: 52.4751,
        lng: -1.8755
      },
      {
        email: 'coach.leedsfc@example.com',
        firstName: 'Michael',
        lastName: 'Brown',
        club: 'Leeds United Academy',
        location: 'Leeds',
        lat: 53.7776,
        lng: -1.5724
      },
      {
        email: 'coach.newcastlefc@example.com',
        firstName: 'Rachel',
        lastName: 'Davis',
        club: 'Newcastle United Youth',
        location: 'Newcastle',
        lat: 54.9756,
        lng: -1.6131
      }
    ];

    for (const coach of coachData) {
      const hashedPassword = hashPassword('coach123');
      
      try {
        const result = await this.db.query(
          `INSERT INTO users (email, password, firstName, lastName, role) 
           VALUES (?, ?, ?, ?, ?) 
           ON CONFLICT (email) DO NOTHING 
           RETURNING id`,
          [coach.email, hashedPassword, coach.firstName, coach.lastName, 'Coach']
        );
        
        let coachId = result.rows[0]?.id || result.lastID;
        
        if (!coachId) {
          const existing = await this.db.query(
            'SELECT id FROM users WHERE email = ?',
            [coach.email]
          );
          coachId = existing.rows[0]?.id;
        }
        
        coaches.push({ ...coach, id: coachId });
        
      } catch (error) {
        console.error(`Error seeding coach ${coach.email}:`, error.message);
      }
    }
    
    console.log(`✅ ${coaches.length} coaches seeded`);
    return coaches;
  }

  async seedTeamVacancies(coaches) {
    console.log('⚽ Seeding team vacancies with location data...');
    
    const vacancyTemplates = [
      {
        title: 'Striker Needed - Premier Youth League',
        description: 'Dynamic striker wanted for our U18 squad. We play attractive, attacking football and are looking for someone who can finish chances and work hard for the team. Training twice a week (Tuesday & Thursday evenings) with matches on Saturdays. Great club atmosphere with excellent facilities.',
        ageGroup: 'U18',
        position: 'Forward',
        teamGender: 'Boys',
        league: 'Premier League Youth'
      },
      {
        title: 'Central Defender Required',
        description: 'Experienced centre-back needed for our competitive adult team. Looking for someone who can read the game well, strong in the air, and comfortable playing out from the back. Sunday morning kick-offs with optional midweek training.',
        ageGroup: 'Open Age',
        position: 'Defender',
        teamGender: 'Mixed',
        league: 'Sunday League'
      },
      {
        title: 'Goalkeeper - Women\'s Team',
        description: 'Enthusiastic goalkeeper wanted to join our women\'s first team. All abilities welcome - we have excellent goalkeeping coaches who will help develop your skills. Great team spirit and social events throughout the season.',
        ageGroup: 'Open Age',
        position: 'Goalkeeper',
        teamGender: 'Girls',
        league: 'Women\'s Football League'
      },
      {
        title: 'Midfielder - Community League',
        description: 'Box-to-box midfielder sought for our friendly community team. We focus on enjoyment and development rather than just results. Perfect for players looking to get back into football or trying a new position.',
        ageGroup: 'Open Age',
        position: 'Midfielder',
        teamGender: 'Mixed',
        league: 'Community Football League'
      },
      {
        title: 'Right Back - Youth Development',
        description: 'Technical full-back needed for our U16 development squad. Looking for someone who loves to get forward and support attacks while being solid defensively. Excellent coaching setup with pathway to senior football.',
        ageGroup: 'U16',
        position: 'Defender',
        teamGender: 'Boys',
        league: 'Premier League Youth'
      },
      {
        title: 'Winger - Veterans League',
        description: 'Experienced winger wanted for our over-35s team. Still competitive but with a focus on enjoyment and camaraderie. Play on artificial pitches with shorter match duration. Post-match drinks are mandatory!',
        ageGroup: 'Over 35',
        position: 'Midfielder',
        teamGender: 'Mixed',
        league: 'Veterans League'
      },
      {
        title: 'Any Position - New Youth Team',
        description: 'We\'re forming a new U14 girls team and need players in all positions. Complete beginners welcome - we have FA qualified coaches and will provide full training. Equipment provided for the first season.',
        ageGroup: 'U14',
        position: 'Any',
        teamGender: 'Girls',
        league: 'Community Football League'
      },
      {
        title: 'Central Midfielder - Championship Level',
        description: 'Creative midfielder required for our semi-professional team. Looking for someone with excellent passing range and game intelligence. Training 3x per week with Saturday afternoon matches. Some travel required.',
        ageGroup: 'Open Age',
        position: 'Midfielder',
        teamGender: 'Boys',
        league: 'Premier League Youth'
      }
    ];

    let vacancyIndex = 0;
    
    for (const coach of coaches) {
      // Create 2-3 vacancies per coach
      const numVacancies = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < numVacancies; i++) {
        const template = vacancyTemplates[vacancyIndex % vacancyTemplates.length];
        vacancyIndex++;
        
        // Add some location variety around the coach's base location
        const latVariation = (Math.random() - 0.5) * 0.1; // ~5km variation
        const lngVariation = (Math.random() - 0.5) * 0.1;
        
        const locationData = JSON.stringify({
          address: `${coach.club} Training Ground, ${coach.location}`,
          latitude: coach.lat + latVariation,
          longitude: coach.lng + lngVariation,
          placeId: `place_${coach.id}_${i}`,
          city: coach.location,
          postcode: this.generatePostcode(coach.location)
        });
        
        try {
          await this.db.query(
            `INSERT INTO team_vacancies (title, description, league, ageGroup, position, teamGender, location, locationData, contactInfo, postedBy) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              template.title,
              template.description,
              template.league,
              template.ageGroup,
              template.position,
              template.teamGender,
              `${coach.club}, ${coach.location}`,
              locationData,
              coach.email,
              coach.id
            ]
          );
        } catch (error) {
          console.error(`Error creating vacancy for coach ${coach.email}:`, error.message);
        }
      }
    }
    
    console.log('✅ Team vacancies seeded with location data');
  }

  async seedPlayers() {
    console.log('🏃‍♂️ Seeding players...');
    
    const crypto = require('crypto');
    const players = [];
    
    // Simple password hashing alternative
    const hashPassword = (password) => {
      return crypto.createHash('sha256').update(password).digest('hex');
    };
    
    const playerData = [
      {
        email: 'player.jamie@example.com',
        firstName: 'Jamie',
        lastName: 'Fletcher',
        location: 'Manchester',
        lat: 53.4808,
        lng: -2.2426,
        preferredPosition: 'Midfielder',
        ageGroup: 'U21'
      },
      {
        email: 'player.sofia@example.com',
        firstName: 'Sofia',
        lastName: 'Rodriguez',
        location: 'London',
        lat: 51.5074,
        lng: -0.1278,
        preferredPosition: 'Forward',
        ageGroup: 'Open Age'
      },
      {
        email: 'player.connor@example.com',
        firstName: 'Connor',
        lastName: 'MacLeod',
        location: 'Liverpool',
        lat: 53.4084,
        lng: -2.9916,
        preferredPosition: 'Defender',
        ageGroup: 'U18'
      },
      {
        email: 'player.aisha@example.com',
        firstName: 'Aisha',
        lastName: 'Patel',
        location: 'Birmingham',
        lat: 52.4862,
        lng: -1.8904,
        preferredPosition: 'Goalkeeper',
        ageGroup: 'Open Age'
      },
      {
        email: 'player.ryan@example.com',
        firstName: 'Ryan',
        lastName: 'O\'Connor',
        location: 'Leeds',
        lat: 53.8008,
        lng: -1.5491,
        preferredPosition: 'Midfielder',
        ageGroup: 'Over 35'
      },
      {
        email: 'player.zara@example.com',
        firstName: 'Zara',
        lastName: 'Ahmed',
        location: 'Newcastle',
        lat: 54.9783,
        lng: -1.6178,
        preferredPosition: 'Forward',
        ageGroup: 'U16'
      },
      {
        email: 'player.luke@example.com',
        firstName: 'Luke',
        lastName: 'Harrison',
        location: 'Brighton',
        lat: 50.8225,
        lng: -0.1372,
        preferredPosition: 'Defender',
        ageGroup: 'U21'
      },
      {
        email: 'player.maya@example.com',
        firstName: 'Maya',
        lastName: 'Thompson',
        location: 'Manchester',
        lat: 53.4620,
        lng: -2.2900,
        preferredPosition: 'Midfielder',
        ageGroup: 'Open Age'
      },
      {
        email: 'player.ethan@example.com',
        firstName: 'Ethan',
        lastName: 'Clarke',
        location: 'London',
        lat: 51.5155,
        lng: -0.0922,
        preferredPosition: 'Forward',
        ageGroup: 'U18'
      },
      {
        email: 'player.leah@example.com',
        firstName: 'Leah',
        lastName: 'Wilson',
        location: 'Liverpool',
        lat: 53.4000,
        lng: -2.9800,
        preferredPosition: 'Goalkeeper',
        ageGroup: 'U21'
      }
    ];

    for (const player of playerData) {
      const hashedPassword = hashPassword('player123');
      
      try {
        const result = await this.db.query(
          `INSERT INTO users (email, password, firstName, lastName, role) 
           VALUES (?, ?, ?, ?, ?) 
           ON CONFLICT (email) DO NOTHING 
           RETURNING id`,
          [player.email, hashedPassword, player.firstName, player.lastName, 'Player']
        );
        
        let playerId = result.rows[0]?.id || result.lastID;
        
        if (!playerId) {
          const existing = await this.db.query(
            'SELECT id FROM users WHERE email = ?',
            [player.email]
          );
          playerId = existing.rows[0]?.id;
        }
        
        players.push({ ...player, id: playerId });
        
      } catch (error) {
        console.error(`Error seeding player ${player.email}:`, error.message);
      }
    }
    
    console.log(`✅ ${players.length} players seeded`);
    return players;
  }

  async seedPlayerAvailability(players) {
    console.log('📍 Seeding player availability with location data...');
    
    const availabilityDescriptions = [
      "Experienced player looking for a competitive team to join this season. Available for training sessions and weekend matches. Strong work ethic and team player.",
      "Recently moved to the area and seeking a new club. Played at county level and looking to continue developing my skills in a supportive environment.",
      "Coming back to football after a break and eager to get back on the pitch. Flexible with positions and happy to play wherever needed most.",
      "University student available for part-time football. Can commit to weekend matches and some evening training sessions. Very enthusiastic!",
      "Veteran player with 15+ years experience looking for a team that values skill and game intelligence over pace. Still very competitive!",
      "Youth player seeking opportunities to develop and potentially progress to higher levels. Willing to travel for the right opportunity.",
      "Former semi-professional player now looking for recreational football. Great for mentoring younger players while still contributing on the pitch.",
      "New to the sport but very keen to learn and improve. Looking for a welcoming club that supports player development at all levels."
    ];

    const leagues = [
      'Premier League Youth',
      'Community Football League', 
      'Sunday League',
      'Women\'s Football League',
      'Veterans League'
    ];

    for (const player of players) {
      // Create 1-2 availability posts per player
      const numPosts = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < numPosts; i++) {
        const description = availabilityDescriptions[Math.floor(Math.random() * availabilityDescriptions.length)];
        const preferredLeagues = this.getRandomLeagues(leagues, player.ageGroup);
        
        // Add location variation
        const latVariation = (Math.random() - 0.5) * 0.05; // ~2.5km variation
        const lngVariation = (Math.random() - 0.5) * 0.05;
        
        const locationAddress = `${player.location} Area, ${this.generatePostcode(player.location)}`;
        
        try {
          await this.db.query(
            `INSERT INTO player_availability (title, description, preferredLeagues, ageGroup, positions, location, locationAddress, locationLatitude, locationLongitude, locationPlaceId, contactInfo, postedBy) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              `${player.preferredPosition} Available - ${player.firstName} ${player.lastName}`,
              description,
              preferredLeagues.join(','),
              player.ageGroup,
              player.preferredPosition,
              player.location,
              locationAddress,
              player.lat + latVariation,
              player.lng + lngVariation,
              `place_${player.id}_${i}`,
              player.email,
              player.id
            ]
          );
        } catch (error) {
          console.error(`Error creating availability for player ${player.email}:`, error.message);
        }
      }
    }
    
    console.log('✅ Player availability seeded with location data');
  }

  async seedAdditionalLeagues() {
    console.log('🏆 Seeding additional leagues...');
    
    const additionalLeagues = [
      {
        name: 'Metropolitan Youth League',
        description: 'Competitive youth league covering London and surrounding areas',
        isActive: true,
        createdBy: 1
      },
      {
        name: 'Northern Counties League',
        description: 'Regional league covering Manchester, Liverpool, Leeds and Newcastle',
        isActive: true,
        createdBy: 1
      },
      {
        name: 'Southern Grassroots League',
        description: 'Community-focused league for Brighton, Portsmouth and surrounding areas',
        isActive: true,
        createdBy: 1
      },
      {
        name: 'Midlands Football Alliance',
        description: 'Competitive league for Birmingham and central England teams',
        isActive: true,
        createdBy: 1
      },
      {
        name: 'Development League U16',
        description: 'Specialized development league for under-16 players',
        isActive: true,
        createdBy: 1
      },
      {
        name: 'Walking Football League',
        description: 'Modified game for players over 50 focusing on participation and fitness',
        isActive: true,
        createdBy: 1
      }
    ];

    for (const league of additionalLeagues) {
      try {
        await this.db.query(
          `INSERT INTO leagues (name, description, isActive, createdBy) 
           VALUES (?, ?, ?, ?) 
           ON CONFLICT (name) DO NOTHING`,
          [league.name, league.description, league.isActive, league.createdBy]
        );
      } catch (error) {
        console.error(`Error seeding league ${league.name}:`, error.message);
      }
    }
    
    console.log('✅ Additional leagues seeded');
  }

  generatePostcode(location) {
    const postcodes = {
      'Manchester': ['M1 1AA', 'M2 3BB', 'M3 4CC', 'M4 5DD'],
      'London': ['SW1 1AA', 'E1 6AN', 'N1 9GU', 'W1A 0AX'],
      'Liverpool': ['L1 8JQ', 'L2 2DZ', 'L3 9RE', 'L4 0TH'],
      'Birmingham': ['B1 1BB', 'B2 4QA', 'B3 1RL', 'B4 6AT'],
      'Leeds': ['LS1 4DT', 'LS2 8JG', 'LS3 1AB', 'LS4 2QF'],
      'Newcastle': ['NE1 4ST', 'NE2 1AB', 'NE3 5CD', 'NE4 6EF'],
      'Brighton': ['BN1 1AA', 'BN2 1UB', 'BN3 3YU', 'BN41 1QD']
    };
    
    const cityPostcodes = postcodes[location] || ['XX1 1XX'];
    return cityPostcodes[Math.floor(Math.random() * cityPostcodes.length)];
  }

  getRandomLeagues(leagues, ageGroup) {
    let suitableLeagues = [...leagues];
    
    // Filter leagues based on age group
    if (ageGroup.startsWith('U') || ageGroup.includes('16') || ageGroup.includes('18') || ageGroup.includes('21')) {
      suitableLeagues = suitableLeagues.filter(league => 
        league.includes('Youth') || league.includes('Development') || league.includes('Community')
      );
    } else if (ageGroup.includes('Over') || ageGroup.includes('35')) {
      suitableLeagues = suitableLeagues.filter(league => 
        league.includes('Veterans') || league.includes('Sunday') || league.includes('Community')
      );
    }
    
    // Return 1-3 random suitable leagues
    const count = Math.floor(Math.random() * 3) + 1;
    const shuffled = suitableLeagues.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, suitableLeagues.length));
  }

  async seed() {
    console.log('🚀 Starting enhanced database seeding with map data...\n');
    
    try {
      // Ensure tables exist
      await this.db.createTables();
      
      // Run enhanced seeding
      await this.seedEnhancedData();
      
      console.log('\n🎉 Enhanced database seeding completed successfully!');
      console.log('📊 Summary:');
      console.log('   • 8 coaches with club affiliations');
      console.log('   • 16-24 team vacancies with location data');
      console.log('   • 10 players from various locations');
      console.log('   • 10-20 player availability posts with GPS coordinates');
      console.log('   • 6 additional leagues');
      console.log('   • All entries include realistic UK locations with postcodes');
      
    } catch (error) {
      console.error('❌ Enhanced seeding failed:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }
}

// Handle command line execution
if (require.main === module) {
  const seeder = new EnhancedDatabaseSeeder();
  
  (async () => {
    try {
      await seeder.seed();
      process.exit(0);
    } catch (error) {
      console.error('Enhanced seeder failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = EnhancedDatabaseSeeder;
