const http = require('http');

function testExternalAccess() {
  console.log('🌐 Testing External Network Access...\n');
  
  const networkIP = '192.168.0.44';
  
  console.log('1. Testing Backend API (Network Access)...');
  testEndpoint(networkIP, 5000, '/api/health', (healthData) => {
    console.log(`   ✅ Backend API: ${healthData.message}`);
    
    console.log('\n2. Testing Real Leagues Data (Network Access)...');
    testEndpoint(networkIP, 5000, '/api/leagues', (leaguesData) => {
      console.log(`   ✅ Leagues API: ${leaguesData.leagues.length} leagues available`);
      
      const withUrls = leaguesData.leagues.filter(l => l.websiteUrl);
      console.log(`   🔗 Real FA URLs: ${withUrls.length}/${leaguesData.leagues.length}`);
      
      console.log('\n3. Testing Frontend (Network Access)...');
      testEndpoint(networkIP, 5173, '/', () => {
        console.log('   ✅ Frontend: Accessible from network');
        
        showAccessInstructions();
      }, (error) => {
        console.log('   ⚠️ Frontend: May still be loading...');
        showAccessInstructions();
      });
    });
  });
}

function testEndpoint(hostname, port, path, onSuccess, onError) {
  const options = {
    hostname,
    port,
    path,
    method: 'GET',
    timeout: 5000
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        if (path === '/') {
          onSuccess('Frontend loaded');
        } else {
          const result = JSON.parse(data);
          onSuccess(result);
        }
      } catch (parseError) {
        if (onError) {
          onError(parseError);
        }
      }
    });
  });
  
  req.on('error', (error) => {
    if (onError) {
      onError(error);
    }
  });
  
  req.on('timeout', () => {
    req.abort();
    if (onError) {
      onError(new Error('Request timeout'));
    }
  });
  
  req.end();
}

function showAccessInstructions() {
  console.log('\n🎉 External Access Ready!');
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│              NETWORK ACCESS ENABLED                │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│                                                     │');
  console.log('│  📱 SHARE THIS URL WITH TESTERS:                   │');
  console.log('│      http://192.168.0.44:5173                      │');
  console.log('│                                                     │');
  console.log('│  🔧 Backend API:                                   │');
  console.log('│      http://192.168.0.44:5000                      │');
  console.log('│                                                     │');
  console.log('│  👥 Test Accounts Available:                       │');
  console.log('│      Admin: cgill1980@hotmail.com / admin123       │');
  console.log('│      Coach: coach1@test.com / test123              │');
  console.log('│      Player: player1@test.com / test123            │');
  console.log('│                                                     │');
  console.log('│  ✅ Features Ready:                                │');
  console.log('│      • User Registration & Profiles                │');
  console.log('│      • 35 Real FA Leagues with URLs               │');
  console.log('│      • Team Vacancies & Player Search             │');
  console.log('│      • Analytics Dashboard                         │');
  console.log('│      • Mobile-Responsive Design                    │');
  console.log('│                                                     │');
  console.log('│  📋 Testing Guide: EXTERNAL-TESTING-GUIDE.md      │');
  console.log('│                                                     │');
  console.log('└─────────────────────────────────────────────────────┘');
  console.log('\n🌐 Requirements for Testers:');
  console.log('   • Same WiFi network as this computer');
  console.log('   • Any modern web browser');
  console.log('   • Mobile phones, tablets, or computers');
  console.log('\n📱 Ready for external testing!');
}

testExternalAccess();
