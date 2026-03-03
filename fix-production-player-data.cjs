const axios = require('axios');

// Production backend URL
const API_URL = 'https://grassroots-scout-backend-production-7b21.up.railway.app';

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

const leagues = [
  'Birmingham County FA',
  'West Midlands Regional League',
  'Leicester & District League'
];

async function fixProductionPlayerData() {
  try {
    console.log('🔐 Step 1: Login as Admin...');
    console.log('   Email: cgill1980@hotmail.com');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'cgill1980@hotmail.com',
      password: 'password123'  // Change this if different
    });
    
    const token = loginResponse.data.token;
    const userInfo = loginResponse.data.user;
    console.log(`✅ Login successful as ${userInfo.role}\n`);
    
    // Get existing player availability
    console.log('📋 Step 2: Fetching existing player availability...');
    const getResponse = await axios.get(`${API_URL}/api/player-availability`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const existing = getResponse.data.availability || [];
    console.log(`Found ${existing.length} existing records\n`);
    
    // Delete existing records
    if (existing.length > 0) {
      console.log('🗑️  Step 3: Deleting existing records...');
      for (const record of existing) {
        try {
          await axios.delete(`${API_URL}/api/player-availability/${record.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log(`   ✓ Deleted ID:${record.id} - ${record.title.substring(0, 40)}`);
        } catch (error) {
          console.log(`   ✗ Failed to delete ID:${record.id}: ${error.message}`);
        }
      }
      console.log('');
    }
    
    // Create new records with location data
    console.log('➕ Step 4: Creating 6 new player availability records with location data...\n');
    const ageGroups = ['U9', 'U14'];
    const created = [];
    
    for (const ageGroup of ageGroups) {
      for (let i = 0; i < 3; i++) {
        const location = midlandsLocations[i];
        const positionSet = positions[Math.floor(Math.random() * positions.length)];
        const leagueSet = [leagues[i % leagues.length]];
        
        const payload = {
          title: `${ageGroup} ${positionSet.join('/')} Available - ${location.city}`,
          description: `Test player looking for a team in the ${location.city} area. Available for training and matches.`,
          preferredLeagues: leagueSet,
          ageGroup: ageGroup,
          positions: positionSet,
          location: location.city,
          locationData: {
            address: `${location.city}, ${location.postcode}`,
            latitude: location.lat,
            longitude: location.lng
          },
          contactInfo: 'test@grassrootshub.com',
          status: 'active'
        };
        
        try {
          const createResponse = await axios.post(
            `${API_URL}/api/player-availability`,
            payload,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          const newRecord = createResponse.data;
          created.push(newRecord);
          console.log(`   ✓ Created: ${payload.title}`);
          console.log(`      Location: ${location.postcode} (${location.lat}, ${location.lng})`);
        } catch (error) {
          console.log(`   ✗ Failed to create: ${error.response?.data?.error || error.message}`);
        }
      }
    }
    
    console.log(`\n✅ Done! Created ${created.length} player availability records with location data.`);
    console.log('\n📍 All records now have proper coordinates for map display.');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ No response from server. Check the API_URL and network connection.');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

console.log('============================================');
console.log('  Fix Production Player Availability Data');
console.log('============================================\n');
console.log(`API URL: ${API_URL}\n`);

fixProductionPlayerData();
