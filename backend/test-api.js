const http = require('http');

// Simple HTTP request function
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAPIAndAddData() {
  try {
    console.log('Testing API connection...');
    
    // Test GET request first
    const testResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/team-vacancies',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ API is responding:', testResponse.status);
    console.log('Current vacancies count:', testResponse.data?.vacancies?.length || 0);
    
    if (testResponse.data?.vacancies?.length > 0) {
      console.log('✅ Data already exists! Vacancies found:');
      testResponse.data.vacancies.forEach((vacancy, index) => {
        console.log(`${index + 1}. ${vacancy.teamName} - ${vacancy.position} (${vacancy.location})`);
      });
    } else {
      console.log('No data found. You may need to:');
      console.log('1. Register a user account on the website');
      console.log('2. Add team vacancies and player availability through the UI');
      console.log('3. Or run the database seeding scripts');
    }
    
    // Also check player availability
    const playersResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/player-availability',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Current player availability count:', playersResponse.data?.availability?.length || 0);
    
    if (playersResponse.data?.availability?.length > 0) {
      console.log('✅ Player data found:');
      playersResponse.data.availability.forEach((player, index) => {
        console.log(`${index + 1}. ${player.firstName} ${player.lastName} - ${player.position} (${player.location})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('Make sure the backend server is running on http://localhost:5000');
  }
}

testAPIAndAddData();
