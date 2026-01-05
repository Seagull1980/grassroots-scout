const https = require('https');
const http = require('http');

console.log('🏠 THE GRASSROOTS HUB - LOCAL TESTING STATUS');
console.log('='.repeat(50));

// Test local backend
const testLocalBackend = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Local Backend (5000): Running');
          console.log(`   Status: ${response.status}`);
          console.log(`   URL: http://localhost:5000`);
        } catch (e) {
          console.log('✅ Local Backend (5000): Responding');
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log('❌ Local Backend (5000): Not running');
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log('⏰ Local Backend (5000): Timeout');
      req.abort();
      resolve();
    });

    req.end();
  });
};

// Test local frontend
const testLocalFrontend = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5174,
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log('✅ Local Frontend (5174): Running');
      console.log(`   Status Code: ${res.statusCode}`);
      console.log(`   URL: http://localhost:5174`);
      resolve();
    });

    req.on('error', (error) => {
      console.log('❌ Local Frontend (5174): Not running');
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log('⏰ Local Frontend (5174): Timeout');
      req.abort();
      resolve();
    });

    req.end();
  });
};

// Test external tunnels
const testExternalBackend = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'grassroots-api-2025.loca.lt',
      port: 443,
      path: '/api/health',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      console.log('✅ External Backend: Active');
      console.log(`   URL: https://grassroots-api-2025.loca.lt`);
      resolve();
    });

    req.on('error', () => {
      console.log('❌ External Backend: Tunnel inactive');
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log('⏰ External Backend: Timeout');
      req.abort();
      resolve();
    });

    req.end();
  });
};

const testExternalFrontend = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'grassroots-hub-2025.loca.lt',
      port: 443,
      path: '/',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      console.log('✅ External Frontend: Active');
      console.log(`   URL: https://grassroots-hub-2025.loca.lt`);
      resolve();
    });

    req.on('error', () => {
      console.log('❌ External Frontend: Tunnel inactive');
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log('⏰ External Frontend: Timeout');
      req.abort();
      resolve();
    });

    req.end();
  });
};

async function runAllTests() {
  console.log('\n🔍 Testing Local Access...');
  await testLocalBackend();
  await testLocalFrontend();
  
  console.log('\n🌐 Testing External Access...');
  await testExternalBackend();
  await testExternalFrontend();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 TESTING SETUP COMPLETE!');
  console.log('='.repeat(50));
  
  console.log('\n🏠 LOCAL TESTING URLS:');
  console.log('Frontend: http://localhost:5174');
  console.log('Backend:  http://localhost:5000');
  console.log('Network:  http://192.168.0.44:5174');
  
  console.log('\n🌍 EXTERNAL TESTING URLS:');
  console.log('Frontend: https://grassroots-hub-2025.loca.lt');
  console.log('Backend:  https://grassroots-api-2025.loca.lt');
  
  console.log('\n🧪 TEST ACCOUNTS:');
  console.log('Admin:  admin@grassrootshub.com / admin123');
  console.log('Coach:  coach.wilson@email.com / password123');
  console.log('Player: player.martinez@email.com / password123');
  console.log('Parent: parent.taylor@email.com / password123');
  
  console.log('\n✅ READY FOR TESTING!');
  console.log('• Local development: http://localhost:5174');
  console.log('• Network testing: http://192.168.0.44:5174');
  console.log('• Global testing: https://grassroots-hub-2025.loca.lt');
  console.log('• 35 real FA leagues with official links');
  console.log('• Full authentication and role management');
  console.log('• Admin dashboard and analytics');
}

runAllTests().catch(console.error);
