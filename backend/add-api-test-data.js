const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function addTestDataThroughAPI() {
  try {
    console.log('Adding test data through API...');
    
    // Create a test user first
    let token = null;
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        email: 'testuser@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'Coach'
      });
      console.log('✅ Test user created');
      
      // Login to get token
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'testuser@example.com',
        password: 'password123'
      });
      token = loginResponse.data.token;
      console.log('✅ Logged in successfully');
    } catch (error) {
      // User might already exist, try to login
      try {
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: 'testuser@example.com',
          password: 'password123'
        });
        token = loginResponse.data.token;
        console.log('✅ Logged in with existing user');
      } catch (loginError) {
        console.error('❌ Failed to login:', loginError.response?.data || loginError.message);
        return;
      }
    }
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Add team vacancies
    const teamVacancies = [
      {
        teamName: 'Manchester United FC Youth',
        position: 'Midfielder',
        ageGroup: 'Under 14',
        league: 'Manchester Youth League',
        description: 'Looking for creative midfielder to join our development squad',
        requirements: 'Must attend training twice a week',
        trainingDays: ['Tuesday', 'Thursday'],
        matchDay: 'Saturday',
        contactInfo: { phone: '+44 7700 900001', email: 'coach@manunited-youth.com' },
        location: 'Manchester, UK',
        teamGender: 'Boys',
        latitude: 53.4630,
        longitude: -2.2914
      },
      {
        teamName: 'Birmingham City Girls FC',
        position: 'Striker',
        ageGroup: 'Under 16',
        league: 'Birmingham City Football League',
        description: 'Experienced striker needed for competitive team',
        requirements: 'Previous league experience preferred',
        trainingDays: ['Wednesday', 'Friday'],
        matchDay: 'Sunday',
        contactInfo: { phone: '+44 7700 900002', email: 'coach@birmingham-girls.com' },
        location: 'Birmingham, UK',
        teamGender: 'Girls',
        latitude: 52.4862,
        longitude: -1.8904
      },
      {
        teamName: 'London Eagles FC',
        position: 'Goalkeeper',
        ageGroup: 'Under 18',
        league: 'London Metropolitan League',
        description: 'Reliable goalkeeper wanted for senior youth team',
        requirements: 'Must be available for weekend matches',
        trainingDays: ['Monday', 'Wednesday'],
        matchDay: 'Saturday',
        contactInfo: { phone: '+44 7700 900003', email: 'coach@london-eagles.com' },
        location: 'London, UK',
        teamGender: 'Mixed',
        latitude: 51.5074,
        longitude: -0.1278
      }
    ];
    
    for (const vacancy of teamVacancies) {
      try {
        await axios.post(`${API_BASE}/team-vacancies`, vacancy, { headers });
        console.log(`✅ Added team vacancy: ${vacancy.teamName} - ${vacancy.position}`);
      } catch (error) {
        console.error(`❌ Error adding vacancy for ${vacancy.teamName}:`, error.response?.data || error.message);
      }
    }
    
    // Add player availability
    const playerAvailability = [
      {
        firstName: 'Alex',
        lastName: 'Johnson',
        position: 'Midfielder',
        ageGroup: 'Under 15',
        preferredLeagues: ['Manchester Youth League', 'Regional League'],
        description: 'Creative midfielder with good passing range',
        experience: 'Intermediate',
        availability: ['Weekends', 'Tuesday', 'Thursday'],
        contactInfo: { phone: '+44 7700 900101', email: 'alex.johnson@email.com' },
        location: 'Manchester, UK',
        preferredTeamGender: 'Boys',
        latitude: 53.4808,
        longitude: -2.2426
      },
      {
        firstName: 'Emma',
        lastName: 'Williams',
        position: 'Forward',
        ageGroup: 'Under 16',
        preferredLeagues: ['Birmingham City Football League'],
        description: 'Fast striker with excellent finishing',
        experience: 'Advanced',
        availability: ['Weekends', 'Wednesday', 'Friday'],
        contactInfo: { phone: '+44 7700 900102', email: 'emma.williams@email.com' },
        location: 'Birmingham, UK',
        preferredTeamGender: 'Girls',
        latitude: 52.4797,
        longitude: -1.9026
      },
      {
        firstName: 'Jordan',
        lastName: 'Smith',
        position: 'Goalkeeper',
        ageGroup: 'Under 17',
        preferredLeagues: ['London Metropolitan League'],
        description: 'Reliable goalkeeper with good reflexes',
        experience: 'Advanced',
        availability: ['Weekends', 'Monday', 'Wednesday'],
        contactInfo: { phone: '+44 7700 900103', email: 'jordan.smith@email.com' },
        location: 'London, UK',
        preferredTeamGender: 'Mixed',
        latitude: 51.5155,
        longitude: -0.0922
      }
    ];
    
    for (const player of playerAvailability) {
      try {
        await axios.post(`${API_BASE}/player-availability`, player, { headers });
        console.log(`✅ Added player: ${player.firstName} ${player.lastName} - ${player.position}`);
      } catch (error) {
        console.error(`❌ Error adding player ${player.firstName} ${player.lastName}:`, error.response?.data || error.message);
      }
    }
    
    console.log('\n🎉 Test data added successfully through API!');
    console.log('You should now see data on the map view.');
    
  } catch (error) {
    console.error('❌ Error adding test data:', error.response?.data || error.message);
  }
}

addTestDataThroughAPI();
