const axios = require('axios');

async function testPlayerAvailability() {
  try {
    // First login as Coach
    console.log('Logging in as chrisgill.1980@gmail.com (Coach)...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'chrisgill.1980@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Fetch player availability
    console.log('Fetching player availability...');
    const response = await axios.get('http://localhost:5000/api/player-availability', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const availability = response.data.availability || [];
    
    console.log(`\n=== API RESPONSE ===`);
    console.log(`Total records returned: ${availability.length}`);
    console.log(`\nDetails:`);
    
    availability.forEach((player, index) => {
      const hasLocationData = player.locationData ? 'YES' : 'NO';
      console.log(`\n${index + 1}. ID:${player.id} | ${player.title.substring(0, 50)}`);
      console.log(`   Status: ${player.status}`);
      console.log(`   PostedBy: ${player.postedBy}`);
      console.log(`   hasLocationData: ${hasLocationData}`);
      
      if (hasLocationData === 'YES') {
        console.log(`   Location: ${player.locationData.address}`);
        console.log(`   Coords: ${player.locationData.latitude}, ${player.locationData.longitude}`);
      } else {
        console.log(`   Raw location fields:`);
        console.log(`     - locationAddress: ${player.locationAddress || 'null'}`);
        console.log(`     - locationLatitude: ${player.locationLatitude || 'null'}`);
        console.log(`     - locationLongitude: ${player.locationLongitude || 'null'}`);
      }
    });
    
    const withLocation = availability.filter(p => p.locationData).length;
    const withoutLocation = availability.length - withLocation;
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`With location: ${withLocation}`);
    console.log(`Without location: ${withoutLocation}`);
    
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the server running on port 5000?');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testPlayerAvailability();
