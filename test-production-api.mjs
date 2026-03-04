import http from 'https';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMSIsImVtYWlsIjoiY29hY2hAdGVzdC5jb20iLCJyb2xlIjoiQ29hY2giLCJpYXQiOjE3NzI1NzY0NjMsImV4cCI6MTc3MjU4MDA2M30.Z-8s8me-98TW7By9gglFyrKUwMMEX2aWkdHIMU-e8YM';

const options = {
  hostname: 'grassroots-scout-backend-production-7b21.up.railway.app',
  path: '/api/player-availability',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

console.log('Testing production backend at: https://grassroots-scout-backend-production-7b21.up.railway.app');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('\nAPI Response Status:', res.statusCode);
      if (parsed.availability && parsed.availability.length > 0) {
        const first = parsed.availability[0];
        console.log('\n✓ First record:');
        console.log('  ID:', first.id);
        console.log('  Title:', first.title);
        console.log('  AgeGroup:', first.ageGroup);
        console.log('  Positions:', first.positions);
        console.log('  LocationData:', first.locationData ? 'Present' : 'Missing');
        
        if (first.ageGroup && first.positions && Array.isArray(first.positions)) {
          console.log('\n✅ PRODUCTION BACKEND: Age group and positions are correct!');
          process.exit(0);
        } else {
          console.log('\n⚠️ Age group or positions may need verification');
          process.exit(1);
        }
      } else {
        console.log('No records returned');
        process.exit(1);
      }
    } catch (e) {
      console.error('Failed to parse response:', e.message);
      console.log('Raw response:', data.substring(0, 300));
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

req.end();
