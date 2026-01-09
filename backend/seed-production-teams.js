/**
 * Script to seed production database with Midlands/Tamworth area teams via API
 * This works with both PostgreSQL (production) and SQLite (local)
 */
const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

// You'll need to get a valid JWT token first
// Either create a test coach account or use an existing one
const AUTH_TOKEN = process.env.SEED_AUTH_TOKEN || '';

if (!AUTH_TOKEN) {
  console.error('❌ Error: SEED_AUTH_TOKEN environment variable not set');
  console.log('\n📝 To use this script:');
  console.log('1. Login to the app as a coach');
  console.log('2. Copy your JWT token from browser localStorage');
  console.log('3. Set SEED_AUTH_TOKEN environment variable');
  console.log('4. Run: SEED_AUTH_TOKEN=your_token node backend/seed-production-teams.js');
  process.exit(1);
}

const teams = [
  // Tamworth Area
  {
    title: 'Tamworth FC U14 Central Midfielder',
    description: 'Dynamic midfielder needed for ambitious youth team. Regular training and competitive fixtures.',
    position: 'Midfielder',
    ageGroup: 'U14',
    league: 'Midlands Youth League',
    location: 'Castle Grounds, Tamworth, UK',
    contactInfo: 'coach@tamworthfc.com',
    locationData: {
      address: 'Castle Grounds, Tamworth, UK',
      latitude: 52.6339,
      longitude: -1.6951,
      postcode: 'B79 7NA'
    }
  },
  {
    title: 'Tamworth Youth Academy U12 Striker',
    description: 'Fast striker wanted for developing academy team. Focus on technical development.',
    position: 'Forward',
    ageGroup: 'U12',
    league: 'Midlands Youth League',
    location: 'Wigginton Park, Tamworth, UK',
    contactInfo: 'academy@tamworthyouth.com',
    locationData: {
      address: 'Wigginton Park, Tamworth, UK',
      latitude: 52.6225,
      longitude: -1.6889,
      postcode: 'B79 8NP'
    }
  },
  {
    title: 'Tamworth Rangers U15 Goalkeeper',
    description: 'Goalkeeper needed for competitive league team. Excellent coaching available.',
    position: 'Goalkeeper',
    ageGroup: 'U15',
    league: 'Staffordshire County League',
    location: 'Anker Valley, Tamworth, UK',
    contactInfo: 'rangers@tamworth.com',
    locationData: {
      address: 'Anker Valley, Tamworth, UK',
      latitude: 52.6289,
      longitude: -1.6745,
      postcode: 'B77 2LS'
    }
  },
  {
    title: 'Tamworth Spartans U13 Defender',
    description: 'Solid defender required for well-established youth team.',
    position: 'Defender',
    ageGroup: 'U13',
    league: 'Midlands Youth League',
    location: 'Dosthill Park, Tamworth, UK',
    contactInfo: 'spartans@tamworth.com',
    locationData: {
      address: 'Dosthill Park, Tamworth, UK',
      latitude: 52.6445,
      longitude: -1.6623,
      postcode: 'B77 1LG'
    }
  },
  // Lichfield
  {
    title: 'Lichfield City U14 Winger',
    description: 'Pacey winger needed for attacking team style.',
    position: 'Midfielder',
    ageGroup: 'U14',
    league: 'Staffordshire County League',
    location: 'Beacon Park, Lichfield, UK',
    contactInfo: 'city@lichfield.com',
    locationData: {
      address: 'Beacon Park, Lichfield, UK',
      latitude: 52.6825,
      longitude: -1.8267,
      postcode: 'WS13 7DU'
    }
  },
  {
    title: 'Lichfield Youth U16 Centre Back',
    description: 'Strong centre back wanted for high-level youth football.',
    position: 'Defender',
    ageGroup: 'U16',
    league: 'Staffordshire County League',
    location: 'Stowe Pool, Lichfield, UK',
    contactInfo: 'youth@lichfield.com',
    locationData: {
      address: 'Stowe Pool, Lichfield, UK',
      latitude: 52.6801,
      longitude: -1.8245,
      postcode: 'WS13 6DQ'
    }
  },
  // Burton upon Trent
  {
    title: 'Burton Albion Academy U13 Striker',
    description: 'Goal scorer needed for professional academy setup.',
    position: 'Forward',
    ageGroup: 'U13',
    league: 'EFL Youth Alliance',
    location: 'Stapenhill Recreation Ground, Burton upon Trent, UK',
    contactInfo: 'academy@burtonalbion.com',
    locationData: {
      address: 'Stapenhill Recreation Ground, Burton upon Trent, UK',
      latitude: 52.8067,
      longitude: -1.6423,
      postcode: 'DE15 9AE'
    }
  },
  {
    title: 'Burton Youth U15 Attacking Midfielder',
    description: 'Creative midfielder wanted for technical development squad.',
    position: 'Midfielder',
    ageGroup: 'U15',
    league: 'East Midlands Youth League',
    location: 'Shobnall Leisure Complex, Burton upon Trent, UK',
    contactInfo: 'youth@burton.com',
    locationData: {
      address: 'Shobnall Leisure Complex, Burton upon Trent, UK',
      latitude: 52.8134,
      longitude: -1.6289,
      postcode: 'DE14 2BB'
    }
  },
  // Nuneaton
  {
    title: 'Nuneaton Borough U14 Full Back',
    description: 'Versatile full back needed for competitive youth team.',
    position: 'Defender',
    ageGroup: 'U14',
    league: 'Midlands Youth League',
    location: 'Pingles Stadium, Nuneaton, UK',
    contactInfo: 'borough@nuneaton.com',
    locationData: {
      address: 'Pingles Stadium, Nuneaton, UK',
      latitude: 52.5234,
      longitude: -1.4689,
      postcode: 'CV11 4AA'
    }
  },
  {
    title: 'Nuneaton Town U12 Midfielder',
    description: 'Energetic midfielder for friendly youth team.',
    position: 'Midfielder',
    ageGroup: 'U12',
    league: 'Warwickshire Youth League',
    location: 'Riversley Park, Nuneaton, UK',
    contactInfo: 'town@nuneaton.com',
    locationData: {
      address: 'Riversley Park, Nuneaton, UK',
      latitude: 52.5289,
      longitude: -1.4623,
      postcode: 'CV11 5TY'
    }
  },
  // Sutton Coldfield
  {
    title: 'Sutton Coldfield Town U15 Central Defender',
    description: 'Commanding centre back needed for organized youth team.',
    position: 'Defender',
    ageGroup: 'U15',
    league: 'Birmingham County FA Youth League',
    location: 'Sutton Park, Sutton Coldfield, UK',
    contactInfo: 'town@suttoncoldfield.com',
    locationData: {
      address: 'Sutton Park, Sutton Coldfield, UK',
      latitude: 52.5634,
      longitude: -1.8423,
      postcode: 'B74 2YT'
    }
  },
  {
    title: 'Sutton United U13 Winger',
    description: 'Fast winger wanted for exciting youth setup.',
    position: 'Midfielder',
    ageGroup: 'U13',
    league: 'Birmingham County FA Youth League',
    location: 'Powells Pool, Sutton Coldfield, UK',
    contactInfo: 'united@sutton.com',
    locationData: {
      address: 'Powells Pool, Sutton Coldfield, UK',
      latitude: 52.5723,
      longitude: -1.8267,
      postcode: 'B75 7RY'
    }
  }
];

async function seedTeams() {
  console.log(`🌱 Seeding ${teams.length} teams to ${API_URL}...\n`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const team of teams) {
    try {
      const response = await axios.post(`${API_URL}/vacancies`, team, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Created: ${team.title}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed: ${team.title}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Message: ${error.response.data.error || error.response.data.message}`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📍 Total: ${teams.length}`);
}

seedTeams().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
