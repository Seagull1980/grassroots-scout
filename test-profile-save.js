import axios from 'axios';

// Test profile save functionality
async function testProfileSave() {
  try {
    // First, try to login to get a token
    const loginResponse = await axios.post('http://localhost:3000/api/login', {
      email: 'admin@test.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('Login successful, token received');

    // Now try to save a profile
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
      availability: JSON.stringify(['Weekends']),
      specializations: JSON.stringify(['Attacking']),
      trainingDays: JSON.stringify(['Saturday', 'Sunday']),
      ageGroupsCoached: JSON.stringify(['U16', 'U18'])
    };

    const saveResponse = await axios.put('http://localhost:3000/api/profile', profileData, {
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