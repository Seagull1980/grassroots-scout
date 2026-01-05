const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Sample team vacancies with real UK locations
const sampleTeamVacancies = [
  {
    title: 'Goalkeeper Needed - Under 16s',
    description: 'We are looking for a dedicated goalkeeper to join our Under 16s team. Training twice a week, matches on Saturdays. Great team spirit and professional coaching.',
    league: 'County League',
    ageGroup: 'Under 16',
    position: 'Goalkeeper',
    location: 'Old Trafford, Manchester',
    contactInfo: 'Contact coach John Smith: john@manchesterfc.com',
    locationAddress: 'Old Trafford, Sir Matt Busby Way, Stretford, Manchester M16 0RA, UK',
    locationLatitude: 53.4631,
    locationLongitude: -2.2914,
    locationPlaceId: 'ChIJ-Ym6W5WqeUgRKOkZZZZZZZ1'
  },
  {
    title: 'Midfielder Required - Under 18s',
    description: 'Ambitious Under 18s team seeks creative midfielder. We play attractive football and compete in the regional league. Previous experience preferred.',
    league: 'Regional League',
    ageGroup: 'Under 18',
    position: 'Midfielder',
    location: 'Emirates Stadium, London',
    contactInfo: 'Contact coach Sarah Wilson: sarah@arsenalfc.com',
    locationAddress: 'Emirates Stadium, Hornsey Rd, London N7 7AJ, UK',
    locationLatitude: 51.5549,
    locationLongitude: -0.1084,
    locationPlaceId: 'ChIJ5dZZZZZZZ2gR-QqFVVVVVV2'
  },
  {
    title: 'Striker Wanted - Under 14s',
    description: 'Fast-paced Under 14s team looking for a striker with good finishing ability. Training sessions focus on technical skills and teamwork.',
    league: 'Youth League',
    ageGroup: 'Under 14',
    position: 'Forward',
    location: 'Anfield, Liverpool',
    contactInfo: 'Contact coach Mike Davies: mike@liverpoolfc.com',
    locationAddress: 'Anfield Rd, Anfield, Liverpool L4 0TH, UK',
    locationLatitude: 53.4308,
    locationLongitude: -2.9608,
    locationPlaceId: 'ChIJ3dZZZZZZZ3gR-QqFVVVVVV3'
  },
  {
    title: 'Defender Position Open - Under 17s',
    description: 'Solid defensive unit seeks reliable centre-back. Good communication skills essential. Training Tuesdays and Thursdays, matches on Sundays.',
    league: 'Premier Youth League',
    ageGroup: 'Under 17',
    position: 'Defender',
    location: 'Stamford Bridge, London',
    contactInfo: 'Contact coach Emma Thompson: emma@chelseafc.com',
    locationAddress: 'Stamford Bridge, Fulham Rd, Fulham, London SW6 1HS, UK',
    locationLatitude: 51.4816,
    locationLongitude: -0.1910,
    locationPlaceId: 'ChIJ4dZZZZZZZ4gR-QqFVVVVVV4'
  },
  {
    title: 'Winger Opportunity - Under 15s',
    description: 'Dynamic Under 15s team looking for a pacey winger. We emphasize skill development and positive play. Excellent facilities and coaching staff.',
    league: 'Championship Youth',
    ageGroup: 'Under 15',
    position: 'Midfielder',
    location: 'Etihad Stadium, Manchester',
    contactInfo: 'Contact coach Alex Rodriguez: alex@mancity.com',
    locationAddress: 'Etihad Stadium, Etihad Campus, Manchester M11 3FF, UK',
    locationLatitude: 53.4831,
    locationLongitude: -2.2004,
    locationPlaceId: 'ChIJ5dZZZZZZZ5gR-QqFVVVVVV5'
  },
  {
    title: 'Multiple Positions - Under 13s',
    description: 'Newly formed Under 13s team has openings in multiple positions. Perfect for players looking to develop their skills in a supportive environment.',
    league: 'Local League',
    ageGroup: 'Under 13',
    position: 'Any',
    location: 'St. James\' Park, Newcastle',
    contactInfo: 'Contact coach David Brown: david@newcastlefc.com',
    locationAddress: 'St. James\' Park, Barrack Rd, Newcastle upon Tyne NE1 4ST, UK',
    locationLatitude: 54.9756,
    locationLongitude: -1.6218,
    locationPlaceId: 'ChIJ6dZZZZZZZ6gR-QqFVVVVVV6'
  }
];

// Create a coach user to post these vacancies
const sampleCoaches = [
  {
    email: 'coach.demo@grassrootshub.com',
    password: 'DemoCoach123!',
    firstName: 'Demo',
    lastName: 'Coach',
    role: 'Coach'
  }
];

async function insertSampleData() {
  const db = new sqlite3.Database('./database.sqlite');
  
  // Hash password for the demo coach
  const hashedPassword = await bcrypt.hash(sampleCoaches[0].password, 10);
  
  // Insert coach first
  const coachInsert = new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO users (email, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?)`,
      [sampleCoaches[0].email, hashedPassword, sampleCoaches[0].firstName, sampleCoaches[0].lastName, sampleCoaches[0].role],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });

  try {
    const coachId = await coachInsert;
    console.log('Coach inserted with ID:', coachId);

    // Insert team vacancies
    for (const vacancy of sampleTeamVacancies) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO team_vacancies 
           (title, description, league, ageGroup, position, location, contactInfo, postedBy, 
            locationAddress, locationLatitude, locationLongitude, locationPlaceId) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vacancy.title,
            vacancy.description,
            vacancy.league,
            vacancy.ageGroup,
            vacancy.position,
            vacancy.location,
            vacancy.contactInfo,
            coachId,
            vacancy.locationAddress,
            vacancy.locationLatitude,
            vacancy.locationLongitude,
            vacancy.locationPlaceId
          ],
          function(err) {
            if (err) reject(err);
            else {
              console.log('Inserted team vacancy:', vacancy.title);
              resolve(this.lastID);
            }
          }
        );
      });
    }

    console.log('\\nSample data inserted successfully!');
    console.log('Demo coach credentials:');
    console.log('Email: coach.demo@grassrootshub.com');
    console.log('Password: DemoCoach123!');
    console.log('\\nAdded', sampleTeamVacancies.length, 'team vacancies with locations');
    
  } catch (error) {
    console.error('Error inserting sample data:', error);
  } finally {
    db.close();
  }
}

insertSampleData();
