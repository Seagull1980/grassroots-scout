// ============================================
//  Browser Console Test Player Manager
// ============================================
// 
// INSTRUCTIONS:
// 1. Open your production site in browser
// 2. Make sure you're logged in
// 3. Open browser console (F12)
// 4. Copy and paste this entire script
// 5. Run: createTestPlayers()  // To create 6 test players
// 6. Run: deleteTestPlayers()  // To delete all test players
//
// ============================================

const API_URL = 'https://grassroots-scout-backend-production-7b21.up.railway.app';

const testPlayerData = [
  {
    location: { city: 'Birmingham', lat: 52.4862, lng: -1.8904, postcode: 'B1 1AA' },
    ageGroup: 'U9',
    positions: ['Goalkeeper'],
    leagues: ['Birmingham County FA']
  },
  {
    location: { city: 'Coventry', lat: 52.4068, lng: -1.5197, postcode: 'CV1 1AA' },
    ageGroup: 'U9',
    positions: ['Centre-back', 'Left-back'],
    leagues: ['West Midlands Regional League']
  },
  {
    location: { city: 'Leicester', lat: 52.6369, lng: -1.1398, postcode: 'LE1 1AA' },
    ageGroup: 'U9',
    positions: ['Striker'],
    leagues: ['Leicester & District League']
  },
  {
    location: { city: 'Birmingham', lat: 52.4862, lng: -1.8904, postcode: 'B1 1AA' },
    ageGroup: 'U14',
    positions: ['Central Midfielder', 'Attacking Midfielder'],
    leagues: ['Birmingham County FA']
  },
  {
    location: { city: 'Coventry', lat: 52.4068, lng: -1.5197, postcode: 'CV1 1AA' },
    ageGroup: 'U14',
    positions: ['Left Wing', 'Right Wing'],
    leagues: ['West Midlands Regional League']
  },
  {
    location: { city: 'Leicester', lat: 52.6369, lng: -1.1398, postcode: 'LE1 1AA' },
    ageGroup: 'U14',
    positions: ['Right-back', 'Centre-back'],
    leagues: ['Leicester & District League']
  }
];

// Store created IDs for later deletion
window.testPlayerIds = window.testPlayerIds || [];

async function getAuthToken() {
  // Try to get token from localStorage
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No auth token found. Please make sure you are logged in.');
    return null;
  }
  return token;
}

async function createTestPlayers() {
  console.log('🚀 Creating Test Player Availability Records...\n');
  
  const token = await getAuthToken();
  if (!token) return;
  
  const createdIds = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < testPlayerData.length; i++) {
    const data = testPlayerData[i];
    const payload = {
      title: `${data.ageGroup} ${data.positions.join('/')} Available - ${data.location.city}`,
      description: `Test player looking for a team in the ${data.location.city} area. Available for training and matches. Created via browser console script.`,
      preferredLeagues: data.leagues,
      ageGroup: data.ageGroup,
      positions: data.positions,
      location: data.location.city,
      locationData: {
        address: `${data.location.city}, ${data.location.postcode}`,
        latitude: data.location.lat,
        longitude: data.location.lng
      },
      contactInfo: 'test@grassrootshub.com',
      status: 'active'
    };
    
    try {
      const response = await fetch(`${API_URL}/api/player-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        const newId = result.availabilityId || result.availability?.id;
        createdIds.push(newId);
        successCount++;
        console.log(`✅ ${i + 1}/${testPlayerData.length}: Created ${payload.title}`);
        console.log(`   Location: ${data.location.postcode} (${data.location.lat}, ${data.location.lng})`);
        console.log(`   ID: ${newId}\n`);
      } else {
        const error = await response.json();
        failCount++;
        console.error(`❌ ${i + 1}/${testPlayerData.length}: Failed - ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      failCount++;
      console.error(`❌ ${i + 1}/${testPlayerData.length}: Error - ${error.message}`);
    }
  }
  
  // Store IDs globally for deletion
  window.testPlayerIds = [...window.testPlayerIds, ...createdIds];
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📝 Created IDs: [${createdIds.join(', ')}]`);
  console.log('\n💡 To delete these players, run: deleteTestPlayers()');
  console.log('='.repeat(50));
  
  return createdIds;
}

async function deleteTestPlayers() {
  console.log('🗑️  Deleting Test Player Availability Records...\n');
  
  const token = await getAuthToken();
  if (!token) return;
  
  // First, fetch all player availability to find test records
  try {
    const response = await fetch(`${API_URL}/api/player-availability`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch player availability');
      return;
    }
    
    const data = await response.json();
    const allPlayers = data.availability || [];
    
    // Find test players (either by stored IDs or by description)
    const testPlayers = allPlayers.filter(p => 
      window.testPlayerIds.includes(p.id) || 
      (p.description && p.description.includes('Created via browser console script'))
    );
    
    if (testPlayers.length === 0) {
      console.log('ℹ️  No test players found to delete.');
      console.log(`   Total player availability records: ${allPlayers.length}`);
      return;
    }
    
    console.log(`Found ${testPlayers.length} test player(s) to delete:\n`);
    
    let deleteCount = 0;
    let failCount = 0;
    
    for (const player of testPlayers) {
      try {
        const deleteResponse = await fetch(`${API_URL}/api/player-availability/${player.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (deleteResponse.ok) {
          deleteCount++;
          console.log(`✅ Deleted ID:${player.id} - ${player.title}`);
          // Remove from stored IDs
          window.testPlayerIds = window.testPlayerIds.filter(id => id !== player.id);
        } else {
          failCount++;
          const error = await deleteResponse.json();
          console.error(`❌ Failed to delete ID:${player.id} - ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Error deleting ID:${player.id} - ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Deleted: ${deleteCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📝 Remaining stored IDs: [${window.testPlayerIds.join(', ')}]`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function listTestPlayers() {
  console.log('📋 Listing Test Player Availability Records...\n');
  
  const token = await getAuthToken();
  if (!token) return;
  
  try {
    const response = await fetch(`${API_URL}/api/player-availability`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch player availability');
      return;
    }
    
    const data = await response.json();
    const allPlayers = data.availability || [];
    
    const testPlayers = allPlayers.filter(p => 
      window.testPlayerIds.includes(p.id) || 
      (p.description && p.description.includes('Created via browser console script'))
    );
    
    console.log(`Total player availability records: ${allPlayers.length}`);
    console.log(`Test player records: ${testPlayers.length}\n`);
    
    if (testPlayers.length > 0) {
      console.log('Test Players:');
      testPlayers.forEach((p, i) => {
        const hasLoc = p.locationData ? 'YES' : 'NO';
        console.log(`${i + 1}. ID:${p.id} | ${p.title}`);
        console.log(`   Location: ${hasLoc} ${hasLoc === 'YES' ? `(${p.locationData.latitude}, ${p.locationData.longitude})` : ''}`);
      });
    }
    
    console.log(`\n📝 Stored test IDs: [${window.testPlayerIds.join(', ')}]`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Display instructions
console.log('\n' + '='.repeat(50));
console.log('  Browser Console Test Player Manager');
console.log('='.repeat(50));
console.log('\n✅ Script loaded successfully!\n');
console.log('Available commands:');
console.log('  createTestPlayers()  - Create 6 test players with locations');
console.log('  deleteTestPlayers()  - Delete all test players');
console.log('  listTestPlayers()    - List current test players');
console.log('\n' + '='.repeat(50) + '\n');
