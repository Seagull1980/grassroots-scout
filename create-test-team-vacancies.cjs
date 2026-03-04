const Database = require('./backend/db/database.js');

const db = new Database();

const midlandsLocations = [
  { city: 'Birmingham', lat: 52.4862, lng: -1.8904, postcode: 'B1 1AA' },
  { city: 'Coventry', lat: 52.4068, lng: -1.5197, postcode: 'CV1 1AA' },
  { city: 'Leicester', lat: 52.6369, lng: -1.1398, postcode: 'LE1 1AA' },
  { city: 'Nottingham', lat: 52.9548, lng: -1.1581, postcode: 'NG1 1AA' },
  { city: 'Derby', lat: 52.9225, lng: -1.4746, postcode: 'DE1 1AA' },
  { city: 'Wolverhampton', lat: 52.5867, lng: -2.1286, postcode: 'WV1 1AA' }
];

const positions = [
  'Goalkeeper', 
  'Centre-back', 
  'Left-back',
  'Right-back',
  'Defensive Midfielder',
  'Central Midfielder',
  'Attacking Midfielder',
  'Left Wing',
  'Right Wing',
  'Striker',
  'Centre Forward'
];

const teamNames = [
  'United FC', 'City FC', 'Rangers FC', 'Rovers FC',
  'Athletic FC', 'Town FC', 'Wanderers FC', 'Borough FC',
  'County FC', 'Vale FC', 'Albion FC', 'Hotspur FC'
];

async function createTestTeamVacancies() {
  try {
    console.log('🔍 Fetching active leagues...');
    const leaguesResult = await db.query('SELECT id, name, region FROM leagues WHERE isActive = true OR isActive = 1 ORDER BY name LIMIT 10');
    const leagues = leaguesResult.rows || [];
    
    console.log(`✅ Found ${leagues.length} active leagues:`);
    leagues.forEach(league => console.log(`   - ${league.name} (${league.region || 'N/A'})`));
    
    if (leagues.length === 0) {
      console.error('❌ No active leagues found. Cannot create test vacancies.');
      process.exit(1);
    }

    // Use first 3 leagues
    const selectedLeagues = leagues.slice(0, 3);
    console.log(`\n📋 Creating test team vacancies across 3 leagues: ${selectedLeagues.map(l => l.name).join(', ')}`);

    const ageGroups = ['U9', 'U11', 'U14', 'U16'];
    const createdVacancies = [];

    // Create 2 vacancies per age group (8 total)
    for (const ageGroup of ageGroups) {
      for (let i = 0; i < 2; i++) {
        const location = midlandsLocations[(ageGroups.indexOf(ageGroup) * 2 + i) % midlandsLocations.length];
        const teamName = teamNames[Math.floor(Math.random() * teamNames.length)];
        const position = positions[Math.floor(Math.random() * positions.length)];
        const league = selectedLeagues[Math.floor(Math.random() * selectedLeagues.length)];
        
        // Randomly add features
        const hasMatchRecording = Math.random() > 0.5;
        const hasPathwayToSenior = Math.random() > 0.6;

        const title = `${location.city} ${teamName} - ${ageGroup} ${position} Wanted`;
        const description = `${location.city} ${teamName} are looking for a talented ${position} to join our ${ageGroup} team. We compete in ${league.name} and train twice a week with matches on weekends. Great coaching, friendly environment, and a focus on player development.${hasMatchRecording ? ' We record all matches for performance review.' : ''}${hasPathwayToSenior ? ' Clear pathway to senior team.' : ''}`;

        const result = await db.query(
          `INSERT INTO team_vacancies (
            title, 
            description, 
            league, 
            ageGroup, 
            position,
            location,
            locationLatitude,
            locationLongitude,
            locationAddress,
            contactInfo, 
            postedBy,
            hasMatchRecording,
            hasPathwayToSenior,
            status,
            createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            title,
            description,
            league.name,
            ageGroup,
            position,
            location.city,
            location.lat,
            location.lng,
            `${location.city}, ${location.postcode}`,
            'test@grassrootshub.com',
            1, // Admin user ID
            hasMatchRecording ? 1 : 0,
            hasPathwayToSenior ? 1 : 0,
            'active'
          ]
        );

        createdVacancies.push({
          id: result.lastID,
          title,
          ageGroup,
          position,
          league: league.name,
          location: location.city
        });

        console.log(`✅ Created: ${title} (ID: ${result.lastID})`);
      }
    }

    console.log(`\n🎉 Successfully created ${createdVacancies.length} test team vacancies!`);
    console.log('\n📊 Summary:');
    console.log(`   - Age Groups: ${ageGroups.join(', ')}`);
    console.log(`   - Locations: ${[...new Set(createdVacancies.map(v => v.location))].join(', ')}`);
    console.log(`   - Positions: ${[...new Set(createdVacancies.map(v => v.position))].join(', ')}`);
    console.log(`   - IDs: ${createdVacancies.map(v => v.id).join(', ')}`);
    
    console.log('\n🗑️  To delete these test vacancies, run:');
    console.log(`   node delete-test-team-vacancies.cjs ${createdVacancies.map(v => v.id).join(',')}`);

    return createdVacancies;
  } catch (error) {
    console.error('❌ Error creating test vacancies:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createTestTeamVacancies()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { createTestTeamVacancies };
