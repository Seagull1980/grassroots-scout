import http from 'http';

const postData = JSON.stringify({
  email: 'cgill1980@hotmail.com',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response body length:', body.length);
    try {
      const data = JSON.parse(body);
      console.log('Response:', data);
    } catch (e) {
      console.log('Raw response:', body);
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.error('Error details:', e);
});

req.write(postData);
req.end();