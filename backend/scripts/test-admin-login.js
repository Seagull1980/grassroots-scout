const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('🧪 Testing admin login...');
    
    // Test with the backend API endpoint
    const API_URL = 'https://b1b6311a4f11.ngrok-free.app/api'; // Using the current ngrok URL
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@grassrootshub.com',
      password: 'admin123'
    });

    if (response.data.token && response.data.user) {
      console.log('✅ Admin login successful!');
      console.log('👤 User:', response.data.user.firstName, response.data.user.lastName);
      console.log('👑 Role:', response.data.user.role);
      console.log('🆔 User ID:', response.data.user.id);
      console.log('🎫 Token received:', response.data.token ? 'Yes' : 'No');
    } else {
      console.log('❌ Login response missing expected data');
      console.log('Response:', response.data);
    }

  } catch (error) {
    console.error('❌ Admin login failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Also test with the coach account
async function testCoachLogin() {
  try {
    console.log('🧪 Testing coach login...');
    
    const API_URL = 'https://b1b6311a4f11.ngrok-free.app/api';
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'cgill1980@hotmail.com',
      password: 'admin123'
    });

    if (response.data.token && response.data.user) {
      console.log('✅ Coach login successful!');
      console.log('👤 User:', response.data.user.firstName, response.data.user.lastName);
      console.log('👑 Role:', response.data.user.role);
      console.log('🆔 User ID:', response.data.user.id);
    }

  } catch (error) {
    console.error('❌ Coach login failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function runTests() {
  await testAdminLogin();
  console.log('\n' + '='.repeat(50) + '\n');
  await testCoachLogin();
}

runTests();
