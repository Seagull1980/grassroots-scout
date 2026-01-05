const axios = require('axios');

async function testProfileUpdate() {
  try {
    // First, login to get a token
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'chrisgill.1980@gmail.com',
      password: 'password' // Assuming this is the password used during registration
    });
    
    console.log('Login successful:', loginResponse.data.message);
    const token = loginResponse.data.token;
    
    // Now try to update the profile
    console.log('Updating profile...');
    const profileData = {
      phone: '+44 7123 456789',
      location: 'London, UK',
      bio: 'Test profile update',
      position: 'Midfielder'
    };
    
    const updateResponse = await axios.put('http://localhost:5000/api/profile', profileData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Profile update successful:', updateResponse.data);
    
    // Get the updated profile
    console.log('Fetching updated profile...');
    const getResponse = await axios.get('http://localhost:5000/api/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Updated profile:', JSON.stringify(getResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testProfileUpdate();
