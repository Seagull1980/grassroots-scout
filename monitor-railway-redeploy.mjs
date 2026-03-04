import http from 'https';

const checkBackend = async () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMSIsImVtYWlsIjoiY29hY2hAdGVzdC5jb20iLCJyb2xlIjoiQ29hY2giLCJpYXQiOjE3NzI1NzY0NjMsImV4cCI6MTc3MjU4MDA2M30.Z-8s8me-98TW7By9gglFyrKUwMMEX2aWkdHIMU-e8YM';

  return new Promise((resolve) => {
    const options = {
      hostname: 'grassroots-scout-backend-production-7b21.up.railway.app',
      path: '/api/player-availability',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.availability && parsed.availability.length > 0) {
            const first = parsed.availability[0];
            if (first.positions && Array.isArray(first.positions) && first.positions.length > 0) {
              resolve({ status: 'SUCCESS', ageGroup: first.ageGroup, positions: first.positions });
              return;
            }
          }
          resolve({ status: 'DATA_MISSING' });
        } catch (e) {
          resolve({ status: 'PARSE_ERROR' });
        }
      });
    });

    req.on('error', () => {
      resolve({ status: 'CONNECTION_ERROR' });
    });

    req.setTimeout(5000);
    req.end();
  });
};

const startMonitoring = async () => {
  console.log('Monitoring Railway backend redeploy...');
  console.log('Started at:', new Date().toLocaleTimeString());
  console.log('');

  let attempts = 0;
  const maxAttempts = 60; // 5 minutes with 5-second intervals

  while (attempts < maxAttempts) {
    attempts++;
    const result = await checkBackend();

    const timestamp = new Date().toLocaleTimeString();
    
    if (result.status === 'SUCCESS') {
      console.log(`✅ [${timestamp}] SUCCESS! Backend is back online with position data!`);
      console.log(`   First player - AgeGroup: ${result.ageGroup}, Positions: ${result.positions.join(', ')}`);
      console.log('\n🎉 You can now refresh https://grassroots-scout-frontend.vercel.app/');
      console.log('   The Age Group and Position columns should show data now!');
      return;
    } else {
      const statusMsg = {
        'CONNECTION_ERROR': '⏳ Backend still deploying...',
        'DATA_MISSING': '⚠️  Backend online but data not yet populated',
        'PARSE_ERROR': '🔄 Backend responding but processing...'
      };
      console.log(`[${timestamp}] ${statusMsg[result.status] || result.status}`);
    }

    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n❌ Monitoring timeout - backend did not come back online');
  console.log('Check Railway dashboard: https://railway.app/');
};

startMonitoring();
