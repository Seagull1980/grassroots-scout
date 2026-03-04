import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/player-availability',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test'
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
      console.log('API Response - First record:');
      if (parsed[0]) {
        console.log('ID:', parsed[0].id);
        console.log('Title:', parsed[0].title);
        console.log('AgeGroup:', parsed[0].ageGroup);
        console.log('Positions:', parsed[0].positions);
        console.log('\nFull first record:');
        console.log(JSON.stringify(parsed[0], null, 2));
      }
    } catch (e) {
      console.error('Failed to parse:', e.message);
      console.log('Raw data:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem: ${e.message}`);
});

req.end();
