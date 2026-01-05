// Test script for training locations with map data
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test credentials (adjust as needed)
const TEST_COACH = {
  email: 'coach@test.com',
  password: 'password123'
};

const TEST_PLAYER = {
  email: 'player@test.com',
  password: 'password123'
};

let coachToken = '';
let playerToken = '';

async function login(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    console.log(`✅ Logged in as ${email}`);
    return response.data.token;
  } catch (error) {
    console.error(`❌ Login failed for ${email}:`, error.response?.data || error.message);
    throw error;
  }
}

async function createTrainingScheduleWithLocation() {
  try {
    // Create training schedule with location data
    const response = await axios.post(
      `${BASE_URL}/calendar/training-schedule`,
      {
        teamName: 'West London Eagles',
        dayOfWeek: 'Wednesday',
        startTime: '18:00',
        endTime: '19:30',
        location: 'Hyde Park Sports Ground, London',
        weeksAhead: 8,
        description: 'Regular Wednesday training session',
        latitude: 51.5074,  // London coordinates
        longitude: -0.1278,
        locationData: {
          address: 'Hyde Park Sports Ground, London',
          postcode: 'W2 2UH',
          facilities: ['Floodlit pitch', 'Changing rooms']
        },
        hasVacancies: true
      },
      {
        headers: { Authorization: `Bearer ${coachToken}` }
      }
    );
    
    console.log('✅ Training schedule created with location data:');
    console.log(`   - Team: ${response.data.schedule.teamName}`);
    console.log(`   - Day: ${response.data.schedule.dayOfWeek}`);
    console.log(`   - Events created: ${response.data.eventsCreated}`);
    return response.data;
  } catch (error) {
    console.error('❌ Create training schedule failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createSingleEventWithLocation() {
  try {
    const response = await axios.post(
      `${BASE_URL}/calendar/events`,
      {
        title: 'North London Tigers Training',
        description: 'Open training session - new players welcome',
        eventType: 'training',
        date: '2025-02-15',
        startTime: '19:00',
        endTime: '20:30',
        location: 'Finsbury Park, London',
        latitude: 51.5642,  // Finsbury Park coordinates
        longitude: -0.1062,
        locationData: {
          address: 'Finsbury Park, Seven Sisters Rd, London',
          postcode: 'N4 2NQ',
          facilities: ['5-a-side pitch', 'Free parking']
        },
        teamName: 'North London Tigers',
        hasVacancies: true
      },
      {
        headers: { Authorization: `Bearer ${coachToken}` }
      }
    );
    
    console.log('✅ Single training event created with location:');
    console.log(`   - Event: ${response.data.event.title}`);
    console.log(`   - Date: ${response.data.event.date}`);
    console.log(`   - Location: ${response.data.event.location}`);
    return response.data;
  } catch (error) {
    console.error('❌ Create event failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getNearbyTrainingLocations() {
  try {
    // Search from a player's location (e.g., somewhere in Central London)
    const playerLat = 51.5155;  // Central London
    const playerLon = -0.1426;
    const radius = 10; // 10km radius
    
    const response = await axios.get(
      `${BASE_URL}/calendar/training-locations`,
      {
        params: {
          latitude: playerLat,
          longitude: playerLon,
          radius: radius,
          hasVacancies: true
        },
        headers: { Authorization: `Bearer ${playerToken}` }
      }
    );
    
    console.log(`\n✅ Found ${response.data.trainingLocations.length} training locations within ${radius}km:`);
    response.data.trainingLocations.forEach((location, index) => {
      console.log(`\n${index + 1}. ${location.teamName || location.title}`);
      console.log(`   - Distance: ${location.distance}km`);
      console.log(`   - Location: ${location.location}`);
      console.log(`   - When: ${location.date} at ${location.startTime}`);
      console.log(`   - Has vacancies: ${location.hasVacancies ? 'Yes' : 'No'}`);
      console.log(`   - Contact: ${location.contactEmail}`);
      if (location.locationData) {
        console.log(`   - Facilities: ${location.locationData.facilities?.join(', ') || 'N/A'}`);
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Get training locations failed:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  console.log('🏃 Starting training locations test...\n');
  
  try {
    // Login as coach and player
    coachToken = await login(TEST_COACH.email, TEST_COACH.password);
    playerToken = await login(TEST_PLAYER.email, TEST_PLAYER.password);
    
    console.log('\n📅 Creating training schedules with location data...');
    await createTrainingScheduleWithLocation();
    
    console.log('\n📍 Creating single training event...');
    await createSingleEventWithLocation();
    
    console.log('\n🗺️ Searching for nearby training locations...');
    await getNearbyTrainingLocations();
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

runTests();
