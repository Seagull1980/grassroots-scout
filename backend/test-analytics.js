const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';

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
console.log('Admin Token:', adminToken);

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