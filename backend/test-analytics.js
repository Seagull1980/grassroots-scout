const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const shouldShowToken = process.argv.includes('--show-token');

// Create admin token
const adminToken = jwt.sign(
  { 
    userId: 1,
    email: 'admin@test.com',
    role: 'Admin'
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Testing analytics endpoint...');
if (shouldShowToken) {
  console.log(adminToken);
} else {
  console.log('Admin token generated but hidden by default. Re-run with --show-token to print it.');
}

// Test the analytics endpoint
async function testAnalytics() {
  try {
    const response = await fetch('http://localhost:3001/api/analytics/overview', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Analytics data:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testAnalytics();