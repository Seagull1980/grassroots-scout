import https from 'https';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMSIsImVtYWlsIjoiY29hY2hAdGVzdC5jb20iLCJyb2xlIjoiQ29hY2giLCJpYXQiOjE3NzI1NzY0NjMsImV4cCI6MTc3MjU4MDA2M30.Z-8s8me-98TW7By9gglFyrKUwMMEX2aWkdHIMU-e8YM';

const options = {
  hostname: 'grassroots-scout-backend-production-7b21.up.railway.app',
  path: '/api/player-availability',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

console.log('Testing production API response structure...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      
      // Log the response structure
      console.log('Response status:', res.statusCode);
      console.log('\nResponse keys:', Object.keys(parsed));
      
      if (parsed.availability) {
        console.log('Number of records:', parsed.availability.length);
        console.log('\nFirst record structure:');
        const first = parsed.availability[0];
        console.log('Keys:', Object.keys(first));
        
        console.log('\nFirst record data:');
        console.log('  id:', first.id);
        console.log('  title:', first.title);
        console.log('  ageGroup:', first.ageGroup);
        console.log('  positions:', first.positions);
        console.log('  position:', first.position);
        console.log('  itemType:', first.itemType);
        console.log('  locationData:', first.locationData ? 'present' : 'missing');
        
        // Check if positions is an array
        console.log('\nPosition field analysis:');
        console.log('  typeof positions:', typeof first.positions);
        console.log('  Array.isArray(positions):', Array.isArray(first.positions));
        if (Array.isArray(first.positions)) {
          console.log('  positions length:', first.positions.length);
          console.log('  positions content:', JSON.stringify(first.positions));
        }
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw data (first 500 chars):', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
