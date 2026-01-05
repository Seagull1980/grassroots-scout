const axios = require('axios');

async function testProfileUpdate() {
  try {
    // First, register a new user
    console.log('Registering new user...');
    try {
      const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'Player'
      });
      console.log('Registration successful:', registerResponse.data.message);
    } catch (regError) {
      if (regError.response?.data?.error === 'User already exists with this email') {
        console.log('User already exists, continuing with login...');
      } else {
        throw regError;
      }
    }
    
    // Login to get a token
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('Login successful:', loginResponse.data.message);
    const token = loginResponse.data.token;
    
    // Now try to update the profile
    console.log('Updating profile...');
    const profileData = {
      phone: '+44 7123 456789',
      location: 'London, UK',
      bio: 'Test profile update',
      position: 'Midfielder',
      availability: ['Monday Evening', 'Wednesday Evening'],
      experienceLevel: 'Intermediate'
    };
    
    const updateResponse = await axios.put('http://localhost:5000/api/profile', profileData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Now try to update the profile again (test update operation)
    console.log('Updating profile again...');
    const updatedProfileData = {
      phone: '+44 7987 654321',
      location: 'Manchester, UK',
      bio: 'Updated test profile',
      position: 'Striker',
      availability: ['Tuesday Evening', 'Thursday Evening', 'Saturday Morning'],
      experienceLevel: 'Advanced',
      height: 180,
      weight: 75
    };
    
    const updateResponse2 = await axios.put('http://localhost:5000/api/profile', updatedProfileData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Second profile update successful:', updateResponse2.data);
    
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
