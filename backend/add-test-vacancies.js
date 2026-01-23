const Database = require('./db/database.js');
const db = new Database();

const testVacancies = [
  {
    title: 'Chelsea FC Youth Academy',
    ageGroup: 'U16',
    position: 'Forward',
    league: 'London Youth League',
    location: 'Chelsea Training Ground, London',
    locationLatitude: 51.4816,
    locationLongitude: -0.1910,
    locationAddress: 'Chelsea Training Ground, Stamford Bridge, London SW6 1HS',
    locationPlaceId: 'ChIJd6lXWP2w2EcR8qYV9nq8q8',
    description: 'Professional youth academy training sessions',
    contactInfo: 'academy@chelsea.com',
    status: 'active'
  },
  {
    title: 'Arsenal FC Development Squad',
    ageGroup: 'U14',
    position: 'Midfielder',
    league: 'London Youth League',
    location: 'Arsenal Training Centre, London',
    locationLatitude: 51.6033,
    locationLongitude: -0.0657,
    locationAddress: 'Arsenal Training Centre, London Colney, London N10 1BJ',
    locationPlaceId: 'ChIJd6lXWP2w2EcR8qYV9nq8q9',
    description: 'Development squad training for promising young players',
    contactInfo: 'development@arsenal.com',
    status: 'active'
  },
  {
    title: 'Tottenham Hotspur Academy',
    ageGroup: 'U18',
    position: 'Defender',
    league: 'London Youth League',
    location: 'Tottenham Training Ground, London',
    locationLatitude: 51.6044,
    locationLongitude: -0.0663,
    locationAddress: 'Tottenham Hotspur Training Centre, Hotspur Way, London N17 9BJ',
    locationPlaceId: 'ChIJd6lXWP2w2EcR8qYV9nq8q10',
    description: 'Elite academy training facility',
    contactInfo: 'academy@tottenham.com',
    status: 'active'
  }
];

async function addTestData() {
  try {
    for (const vacancy of testVacancies) {
      await db.query(`
        INSERT INTO team_vacancies
        (title, ageGroup, position, league, location, locationLatitude, locationLongitude, locationAddress, locationPlaceId, description, contactInfo, status, postedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vacancy.title, vacancy.ageGroup, vacancy.position, vacancy.league, vacancy.location,
        vacancy.locationLatitude, vacancy.locationLongitude, vacancy.locationAddress, vacancy.locationPlaceId,
        vacancy.description, vacancy.contactInfo, vacancy.status, 1, new Date().toISOString()
      ]);
    }

    console.log('Test team vacancies added successfully');

    const result = await db.query('SELECT COUNT(*) as count FROM team_vacancies WHERE locationLatitude IS NOT NULL');
    console.log('Total team vacancies with location data:', result.rows[0].count);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

addTestData();