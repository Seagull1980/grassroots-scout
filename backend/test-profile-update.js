const axios = require('axios');

async function testProfileUpdate() {
  try {
    // First login to get a token
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'cgill1980@hotmail.com', // Admin user
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('Login successful');

    // Now try to update profile
    console.log('Updating profile...');
    const profileData = {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      location: 'Test City',
      bio: 'Test bio',
      position: 'Forward',
      preferredFoot: 'Right',
      height: 180,
      weight: 75,
      experienceLevel: 'Intermediate',
      availability: ['Weekends'],
      specializations: ['Attacking'],
      trainingDays: ['Saturday', 'Sunday'],
      ageGroupsCoached: ['U16', 'U18']
    };

    const updateResponse = await axios.put('http://localhost:3000/api/profile', profileData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Profile update successful:', updateResponse.data);

  } catch (error) {
    console.error('Error:', error.response ? {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers
    } : error.message);
  }
}

testProfileUpdate();