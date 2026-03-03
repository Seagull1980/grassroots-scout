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
  ['Goalkeeper'], 
  ['Centre-back', 'Left-back'], 
  ['Right-back', 'Centre-back'],
  ['Defensive Midfielder'],
  ['Central Midfielder', 'Attacking Midfielder'],
  ['Left Wing', 'Right Wing'],
  ['Striker'],
  ['Centre Forward']
];

const playerNames = [
  'Joshua Mitchell', 'Oliver Thompson', 'Harry Davies', 'Jack Wilson',
  'Charlie Roberts', 'George Taylor', 'Thomas Brown', 'James Anderson',
  'William Jackson', 'Daniel White', 'Benjamin Harris', 'Samuel Martin',
  'Emma Johnson', 'Sophie Williams', 'Olivia Jones', 'Emily Davis',
  'Ava Robinson', 'Isabella Clarke', 'Mia Turner', 'Grace Walker'
];

async function createTestPlayerAdverts() {
  try {
    console.log('🔍 Fetching active leagues...');
    const leaguesResult = await db.query('SELECT id, name, region FROM leagues WHERE isActive = true OR isActive = 1 ORDER BY name LIMIT 10');
    const leagues = leaguesResult.rows || [];
    
    console.log(`✅ Found ${leagues.length} active leagues:`);
    leagues.forEach(league => console.log(`   - ${league.name} (${league.region || 'N/A'})`));
    
    if (leagues.length === 0) {
      console.error('❌ No active leagues found. Cannot create test adverts.');
      process.exit(1);
    }

    // Use first 3 leagues
    const selectedLeagues = leagues.slice(0, 3);
    console.log(`\n📋 Creating test adverts across 3 leagues: ${selectedLeagues.map(l => l.name).join(', ')}`);

    const ageGroups = ['U9', 'U14'];
    const createdAdverts = [];

    for (const ageGroup of ageGroups) {
      for (let i = 0; i < 4; i++) {
        const location = midlandsLocations[i % midlandsLocations.length];
        const playerName = playerNames[Math.floor(Math.random() * playerNames.length)];
        const position = positions[Math.floor(Math.random() * positions.length)];
        
        // Randomly select 1-2 leagues
        const numLeagues = Math.floor(Math.random() * 2) + 1;
        const advertLeagues = [];
        const shuffled = [...selectedLeagues].sort(() => 0.5 - Math.random());
        for (let j = 0; j < numLeagues && j < shuffled.length; j++) {
          advertLeagues.push(shuffled[j].name);
        }

        const title = `${ageGroup} ${position.join('/')} Available - ${location.city}`;
        const description = `${playerName} is looking for a team in the ${location.city} area. Available for training and matches. Experience playing in ${ageGroup} grassroots football. Committed and enthusiastic player seeking new opportunities.`;

        const result = await db.query(
          `INSERT INTO player_availability (
            title, 
            description, 
            preferredLeagues, 
            ageGroup, 
            position, 
            location, 
            locationAddress,
            locationLatitude, 
            locationLongitude,
            contactInfo, 
            postedBy, 
            status,
            createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            title,
            description,
            JSON.stringify(advertLeagues),
            ageGroup,
            JSON.stringify(position),
            location.city,
            `${location.city}, ${location.postcode}`,
            location.lat,
            location.lng,
            'test@grassrootshub.com',
            1, // Admin user ID
            'active'
          ]
        );

        createdAdverts.push({
          id: result.lastID,
          title,
          ageGroup,
          location: location.city,
          leagues: advertLeagues
        });

        console.log(`✅ Created: ${title} (ID: ${result.lastID})`);
      }
    }

    console.log(`\n🎉 Successfully created ${createdAdverts.length} test player availability adverts!`);
    console.log('\n📊 Summary:');
    console.log(`   - Age Groups: ${ageGroups.join(', ')}`);
    console.log(`   - Locations: ${[...new Set(createdAdverts.map(a => a.location))].join(', ')}`);
    console.log(`   - IDs: ${createdAdverts.map(a => a.id).join(', ')}`);
    
    console.log('\n🗑️  To delete these test adverts, run:');
    console.log(`   node delete-test-player-adverts.cjs ${createdAdverts.map(a => a.id).join(',')}`);

    return createdAdverts;
  } catch (error) {
    console.error('❌ Error creating test adverts:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createTestPlayerAdverts()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { createTestPlayerAdverts };
