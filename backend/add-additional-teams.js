const sqlite3 = require('sqlite3').verbose();

// Additional team vacancies with expanded age groups
const additionalTeamVacancies = [
  {
    title: 'Fun Football for Little Ones - Under 7s',
    description: 'Introducing young children to football in a fun, non-competitive environment. Focus on basic skills, teamwork, and enjoyment of the game.',
    league: 'Local League',
    ageGroup: 'Under 7',
    position: 'Any',
    location: 'Wembley Stadium, London',
    contactInfo: 'Contact coach Lisa Thompson: lisa@wembleyfc.com',
    locationAddress: 'Wembley Stadium, Wembley, London HA9 0WS, UK',
    locationLatitude: 51.5560,
    locationLongitude: -0.2795,
    locationPlaceId: 'ChIJ7dZZZZZZZ7gR-QqFVVVVVV7'
  },
  {
    title: 'Experienced Goalkeeper - Under 21s',
    description: 'Senior youth team looking for an experienced goalkeeper to compete in the Premier Youth League. Great opportunity for development.',
    league: 'Premier Youth League',
    ageGroup: 'Under 21',
    position: 'Goalkeeper',
    location: 'Villa Park, Birmingham',
    contactInfo: 'Contact coach Mark Johnson: mark@astonvilla.com',
    locationAddress: 'Villa Park, Trinity Rd, Birmingham B6 6HE, UK',
    locationLatitude: 52.5092,
    locationLongitude: -1.8848,
    locationPlaceId: 'ChIJ8dZZZZZZZ8gR-QqFVVVVVV8'
  },
  {
    title: 'Central Midfielder - Under 10s',
    description: 'Youth development team seeks a creative central midfielder. Training focuses on ball control, passing, and game understanding.',
    league: 'Youth League',
    ageGroup: 'Under 10',
    position: 'Midfielder',
    location: 'Goodison Park, Liverpool',
    contactInfo: 'Contact coach Sarah Evans: sarah@everton.com',
    locationAddress: 'Goodison Park, Goodison Rd, Liverpool L4 4EL, UK',
    locationLatitude: 53.4387,
    locationLongitude: -2.9663,
    locationPlaceId: 'ChIJ9dZZZZZZZ9gR-QqFVVVVVV9'
  },
  {
    title: 'Young Talent Development - Under 9s',
    description: 'Grassroots club developing young talent in a supportive environment. All abilities welcome, emphasis on fun and skill development.',
    league: 'County League',
    ageGroup: 'Under 9',
    position: 'Any',
    location: 'The Amex Stadium, Brighton',
    contactInfo: 'Contact coach Tom Wilson: tom@brighton.com',
    locationAddress: 'The American Express Community Stadium, Village Way, Brighton BN1 9BL, UK',
    locationLatitude: 50.8609,
    locationLongitude: -0.0835,
    locationPlaceId: 'ChIJ0eZZZZZZZ0eR-QqFVVVVVV0'
  },
  {
    title: 'Striker Wanted - Under 19s',
    description: 'Competitive Under 19s team looking for a clinical striker. Regular matches and training, excellent coaching staff.',
    league: 'Championship Youth',
    ageGroup: 'Under 19',
    position: 'Forward',
    location: 'Bramall Lane, Sheffield',
    contactInfo: 'Contact coach David Brown: david@sheffieldutd.com',
    locationAddress: 'Bramall Lane, Sheffield S2 4SU, UK',
    locationLatitude: 53.3700,
    locationLongitude: -1.4707,
    locationPlaceId: 'ChIJ1eZZZZZZZ1eR-QqFVVVVVV1'
  },
  {
    title: 'Left Winger Position - Under 12s',
    description: 'Well-established youth team seeks a pacey left winger. Great opportunity for skill development and competitive football.',
    league: 'Regional League',
    ageGroup: 'Under 12',
    position: 'Midfielder',
    location: 'Carrow Road, Norwich',
    contactInfo: 'Contact coach Emma Clark: emma@norwichcity.com',
    locationAddress: 'Carrow Road, Norwich NR1 1JE, UK',
    locationLatitude: 52.6220,
    locationLongitude: 1.3089,
    locationPlaceId: 'ChIJ2eZZZZZZZ2eR-QqFVVVVVV2'
  }
];

async function insertAdditionalTeamData() {
  const db = new sqlite3.Database('./database.sqlite');
  
  try {
    // Get the existing demo coach ID
    const getCoachId = new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE email = ?',
        ['coach.demo@grassrootshub.com'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.id : null);
        }
      );
    });

    const coachId = await getCoachId;
    
    if (!coachId) {
      console.log('❌ Demo coach not found. Please run the initial sample data script first.');
      return;
    }

    console.log('✅ Found demo coach with ID:', coachId);

    // Insert additional team vacancies
    for (const vacancy of additionalTeamVacancies) {
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
              console.log('✅ Inserted team vacancy:', vacancy.title);
              resolve(this.lastID);
            }
          }
        );
      });
    }

    console.log('\\n🎉 Successfully added', additionalTeamVacancies.length, 'additional team vacancies!');
    console.log('\\n📊 Age groups now covered:');
    console.log('- Under 7 (Fun Football)');
    console.log('- Under 9 (Young Talent Development)'); 
    console.log('- Under 10 (Central Midfielder)');
    console.log('- Under 12 (Left Winger)');
    console.log('- Under 13-18 (Previously added)');
    console.log('- Under 19 (Striker)');
    console.log('- Under 21 (Goalkeeper)');
    
  } catch (error) {
    console.error('❌ Error inserting additional team data:', error);
  } finally {
    db.close();
  }
}

insertAdditionalTeamData();
