import http from 'http';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMSIsImVtYWlsIjoiY29hY2hAdGVzdC5jb20iLCJyb2xlIjoiQ29hY2giLCJpYXQiOjE3NzI1NzY0NjMsImV4cCI6MTc3MjU4MDA2M30.Z-8s8me-98TW7By9gglFyrKUwMMEX2aWkdHIMU-e8YM';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/player-availability',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('API Response Status:', res.statusCode);
      if (parsed.availability && parsed.availability.length > 0) {
        const first = parsed.availability[0];
        console.log('\n✓ First record has data:');
        console.log('  ID:', first.id);
        console.log('  Title:', first.title);
        console.log('  AgeGroup:', first.ageGroup);
        console.log('  Positions:', first.positions);
        console.log('  LocationData:', first.locationData ? 'Present' : 'Missing');
        
        // Check if the data looks correct
        if (first.ageGroup && first.positions && Array.isArray(first.positions)) {
          console.log('\n✓✓ Age group and positions are populated correctly!');
        } else {
          console.log('\n✗ Age group or positions are missing or malformed');
        }
      } else {
        console.log('No records returned');
      }
    } catch (e) {
      console.error('Failed to parse response:', e.message);
      console.log('Raw response:', data.substring(0, 300));
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();
