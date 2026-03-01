import axios from 'axios';

// Test profile save functionality
async function testProfileSave() {
  try {
    // First, try to login to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('Login successful, token received');

    // Now try to save a profile
    // only send the fields that the current backend mapping understands
    const profileData = {
      // follow backend mapping by using lowercase keys
      dateofbirth: '1990-01-01',
      location: 'Test City',
      bio: 'Test bio',
      position: 'Forward',
      experiencelevel: 'Intermediate',
      phone: '07123 456789'
    };

    const saveResponse = await axios.put('http://localhost:5000/api/profile', profileData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Profile save successful:', saveResponse.data);

  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

testProfileSave();