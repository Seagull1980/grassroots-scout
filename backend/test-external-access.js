const https = require('https');

console.log('🌐 Testing External Access...\n');

// Test backend API
const testBackend = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'grassroots-api-2025.loca.lt',
      port: 443,
      path: '/api/health',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Backend API: Server is running');
          console.log(`   Status: ${response.status}`);
          console.log(`   Message: ${response.message}`);
        } catch (e) {
          console.log('✅ Backend API: Responding (non-JSON response)');
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log('❌ Backend API: Connection failed');
      console.log(`   Error: ${error.message}`);
      resolve();
    });

    req.setTimeout(10000, () => {
      console.log('⏰ Backend API: Request timeout');
      req.abort();
      resolve();
    });

    req.end();
  });
};

// Test frontend
const testFrontend = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'grassroots-hub-2025.loca.lt',
      port: 443,
      path: '/',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      console.log('✅ Frontend: Accessible');
      console.log(`   Status Code: ${res.statusCode}`);
      resolve();
    });

    req.on('error', (error) => {
      console.log('❌ Frontend: Connection failed');
      console.log(`   Error: ${error.message}`);
      resolve();
    });

    req.setTimeout(10000, () => {
      console.log('⏰ Frontend: Request timeout');
      req.abort();
      resolve();
    });

    req.end();
  });
};

async function runTests() {
  console.log('🔧 Testing Backend API...');
  await testBackend();
  
  console.log('\n📱 Testing Frontend...');
  await testFrontend();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 EXTERNAL TESTING SETUP COMPLETE!');
  console.log('='.repeat(50));
  
  console.log('\n📱 Share these URLs with your testers:');
  console.log('Frontend: https://grassroots-hub-2025.loca.lt');
  console.log('Backend:  https://grassroots-api-2025.loca.lt');
  
  console.log('\n🧪 Test Accounts:');
  console.log('Admin:  admin@grassrootshub.com / admin123');
  console.log('Coach:  coach.wilson@email.com / password123');
  console.log('Player: player.martinez@email.com / password123');
  console.log('Parent: parent.taylor@email.com / password123');
  
  console.log('\n📋 Features to test:');
  console.log('• Authentication and registration');
  console.log('• Team vacancy posting and searching');
  console.log('• Player availability management');
  console.log('• 35 real FA leagues with official links');
  console.log('• Mobile responsive design');
  console.log('• Admin dashboard (admin account)');
  
  console.log('\n🔄 Tunnels will remain active until you close them');
  console.log('To stop: Press Ctrl+C in the tunnel terminal windows');
}

runTests().catch(console.error);
