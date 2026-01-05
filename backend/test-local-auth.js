const axios = require('axios');

async function testLocalAuth() {
  try {
    console.log('🔍 Testing local backend authentication...');
    
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'coach@test.com',
      password: 'test123'
    });
    
    console.log('✅ Local authentication successful!');
    console.log('📄 Response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Local authentication failed:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
    return false;
  }
}

testLocalAuth();
