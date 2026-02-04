import axios from 'axios';

// Test the endpoint directly
async function testEndpoint() {
  try {
    // First, let's get a valid token by logging in as the admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'cgill1980@hotmail.com',
      password: 'Password123!' // You'll need to update this if different
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully, token:', token.substring(0, 20) + '...');
    
    // Now test the users endpoint
    const usersResponse = await axios.get('http://localhost:5000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ /api/admin/users response:');
    console.log(JSON.stringify(usersResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEndpoint();
