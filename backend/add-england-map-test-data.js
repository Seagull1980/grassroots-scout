const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Adding comprehensive England test data for map...\n');

// Get a league to use
const league = db.prepare("SELECT id FROM leagues LIMIT 1").get();
const leagueId = league ? league.id : 1;

// Get any user ID for postedBy (required field)
const user = db.prepare("SELECT id FROM users LIMIT 1").get();
if (!user) {
  console.error('No users found. Creating a test user...');
  const result = db.prepare(`
    INSERT INTO users (email, password, firstName, lastName, role, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'maptest@grassrootshub.com',
    'hashed_password_placeholder',
    'Map',
    'Tester',
    'coach',
    new Date().toISOString()
  );
  console.log(`Created test user with ID ${result.lastInsertRowid}\n`);
}
const userId = user ? user.id : db.prepare("SELECT id FROM users LIMIT 1").get().id;
console.log(`Using user ID ${userId} for all vacancies\n`);

// Comprehensive test data across England
const teamVacancies = [
  // Manchester
  {
    title: 'Manchester City Youth U13 Defender',
    description: 'Looking for talented defenders to join our youth academy. Regular training sessions and competitive matches.',
    position: 'Defender',
    ageGroup: 'U13',
    trainingLocation: {
      address: 'Heaton Park, Manchester, UK',
      latitude: 53.5271,
      longitude: -2.2519,
      postcode: 'M25 2SW',
      facilities: ['Grass pitches', 'Changing rooms', 'Parking', 'Floodlights']
    },
    matchLocation: {
      address: 'Etihad Campus, Manchester, UK',
      latitude: 53.4831,
      longitude: -2.2004,
      postcode: 'M11 3FF',
      facilities: ['Stadium pitch', 'Professional facilities', 'Medical room', 'Spectator seating']
    }
  },
  // Birmingham
  {
    title: 'Birmingham United U15 Midfielder',
    description: 'Central midfielder wanted for competitive Sunday league team.',
    position: 'Midfielder',
    ageGroup: 'U15',
    trainingLocation: {
      address: 'Cannon Hill Park, Birmingham, UK',
      latitude: 52.4536,
      longitude: -1.9086,
      postcode: 'B12 9QH',
      facilities: ['Multiple pitches', 'Changing facilities', 'Cafe']
    },
    matchLocation: {
      address: 'Villa Park, Birmingham, UK',
      latitude: 52.5092,
      longitude: -1.8849,
      postcode: 'B6 6HE',
      facilities: ['Stadium', 'Full facilities', 'Parking', 'Refreshments']
    }
  },
  // Liverpool
  {
    title: 'Liverpool FC Youth U14 Forward',
    description: 'Exciting opportunity for strikers to join our development squad.',
    position: 'Forward',
    ageGroup: 'U14',
    trainingLocation: {
      address: 'Sefton Park, Liverpool, UK',
      latitude: 53.3766,
      longitude: -2.9389,
      postcode: 'L17 1AP',
      facilities: ['Grass pitches', 'Changing rooms', 'Parking']
    },
    matchLocation: {
      address: 'Anfield, Liverpool, UK',
      latitude: 53.4308,
      longitude: -2.9608,
      postcode: 'L4 0TH',
      facilities: ['Professional stadium', 'Full facilities', 'Medical support']
    }
  },
  // Leeds
  {
    title: 'Leeds Rangers U12 Goalkeeper',
    description: 'Goalkeeper needed for friendly youth team. Training twice weekly.',
    position: 'Goalkeeper',
    ageGroup: 'U12',
    trainingLocation: {
      address: 'Roundhay Park, Leeds, UK',
      latitude: 53.8382,
      longitude: -1.4967,
      postcode: 'LS8 2ER',
      facilities: ['Training pitches', 'Pavilion', 'Parking']
    },
    matchLocation: {
      address: 'Elland Road, Leeds, UK',
      latitude: 53.7779,
      longitude: -1.5720,
      postcode: 'LS11 0ES',
      facilities: ['Stadium pitch', 'Changing rooms', 'Spectator areas']
    }
  },
  // Newcastle
  {
    title: 'Newcastle Youth U16 Winger',
    description: 'Fast winger required for attacking football team.',
    position: 'Midfielder',
    ageGroup: 'U16',
    trainingLocation: {
      address: 'Leazes Park, Newcastle upon Tyne, UK',
      latitude: 54.9783,
      longitude: -1.6178,
      postcode: 'NE1 4PF',
      facilities: ['Grass pitches', 'Basic facilities']
    },
    matchLocation: {
      address: 'St James Park, Newcastle upon Tyne, UK',
      latitude: 54.9756,
      longitude: -1.6217,
      postcode: 'NE1 4ST',
      facilities: ['Professional stadium', 'Full facilities', 'Medical room']
    }
  },
  // Bristol
  {
    title: 'Bristol Rovers U13 Full Back',
    description: 'Defensive full back needed for youth development team.',
    position: 'Defender',
    ageGroup: 'U13',
    trainingLocation: {
      address: 'Ashton Court Estate, Bristol, UK',
      latitude: 51.4503,
      longitude: -2.6336,
      postcode: 'BS41 9JN',
      facilities: ['Multiple pitches', 'Changing rooms', 'Parking', 'Cafe']
    },
    matchLocation: {
      address: 'Memorial Stadium, Bristol, UK',
      latitude: 51.4863,
      longitude: -2.5837,
      postcode: 'BS7 0BF',
      facilities: ['Stadium', 'Changing facilities', 'Spectator seating']
    }
  },
  // Sheffield
  {
    title: 'Sheffield United U15 Centre Back',
    description: 'Strong centre back wanted for competitive league team.',
    position: 'Defender',
    ageGroup: 'U15',
    trainingLocation: {
      address: 'Endcliffe Park, Sheffield, UK',
      latitude: 53.3689,
      longitude: -1.5089,
      postcode: 'S11 8RQ',
      facilities: ['Training pitches', 'Pavilion', 'Parking']
    },
    matchLocation: {
      address: 'Bramall Lane, Sheffield, UK',
      latitude: 53.3703,
      longitude: -1.4709,
      postcode: 'S2 4SU',
      facilities: ['Professional pitch', 'Full facilities', 'Medical support']
    }
  },
  // Brighton
  {
    title: 'Brighton Academy U14 Attacking Mid',
    description: 'Creative midfielder needed for technical football team.',
    position: 'Midfielder',
    ageGroup: 'U14',
    trainingLocation: {
      address: 'Preston Park, Brighton, UK',
      latitude: 50.8405,
      longitude: -0.1439,
      postcode: 'BN1 6SD',
      facilities: ['Grass pitches', 'Changing rooms', 'Cafe']
    },
    matchLocation: {
      address: 'Amex Stadium, Brighton, UK',
      latitude: 50.8609,
      longitude: -0.0830,
      postcode: 'BN1 9BL',
      facilities: ['Modern stadium', 'Professional facilities', 'Parking']
    }
  },
  // Nottingham
  {
    title: 'Nottingham Forest U12 Striker',
    description: 'Goal scorer needed for youth development program.',
    position: 'Forward',
    ageGroup: 'U12',
    trainingLocation: {
      address: 'Wollaton Park, Nottingham, UK',
      latitude: 52.9418,
      longitude: -1.2101,
      postcode: 'NG8 2AE',
      facilities: ['Training pitches', 'Changing facilities', 'Parking']
    },
    matchLocation: {
      address: 'City Ground, Nottingham, UK',
      latitude: 52.9400,
      longitude: -1.1327,
      postcode: 'NG2 5FJ',
      facilities: ['Stadium pitch', 'Full facilities', 'Medical room']
    }
  },
  // Southampton
  {
    title: 'Southampton FC U16 Defensive Mid',
    description: 'Holding midfielder required for academy team.',
    position: 'Midfielder',
    ageGroup: 'U16',
    trainingLocation: {
      address: 'Southampton Common, Southampton, UK',
      latitude: 50.9262,
      longitude: -1.4061,
      postcode: 'SO15 7NN',
      facilities: ['Multiple pitches', 'Changing rooms', 'Parking']
    },
    matchLocation: {
      address: 'St Marys Stadium, Southampton, UK',
      latitude: 50.9059,
      longitude: -1.3909,
      postcode: 'SO14 5FP',
      facilities: ['Professional stadium', 'Full facilities', 'Medical support']
    }
  },
  // Leicester
  {
    title: 'Leicester City U13 Wing Back',
    description: 'Attack-minded full back wanted for youth squad.',
    position: 'Defender',
    ageGroup: 'U13',
    trainingLocation: {
      address: 'Abbey Park, Leicester, UK',
      latitude: 52.6543,
      longitude: -1.1363,
      postcode: 'LE4 5AQ',
      facilities: ['Grass pitches', 'Pavilion', 'Parking']
    },
    matchLocation: {
      address: 'King Power Stadium, Leicester, UK',
      latitude: 52.6204,
      longitude: -1.1420,
      postcode: 'LE2 7FL',
      facilities: ['Modern stadium', 'Professional facilities', 'Parking']
    }
  },
  // Norwich
  {
    title: 'Norwich City U15 Striker',
    description: 'Fast striker needed for competitive youth team.',
    position: 'Forward',
    ageGroup: 'U15',
    trainingLocation: {
      address: 'Eaton Park, Norwich, UK',
      latitude: 52.6153,
      longitude: 1.2467,
      postcode: 'NR4 7TJ',
      facilities: ['Training pitches', 'Changing rooms', 'Cafe']
    },
    matchLocation: {
      address: 'Carrow Road, Norwich, UK',
      latitude: 52.6222,
      longitude: 1.3089,
      postcode: 'NR1 1JE',
      facilities: ['Stadium pitch', 'Full facilities', 'Spectator areas']
    }
  },
  // Bournemouth
  {
    title: 'Bournemouth AFC U14 Goalkeeper',
    description: 'Shot-stopper required for development squad.',
    position: 'Goalkeeper',
    ageGroup: 'U14',
    trainingLocation: {
      address: 'Kings Park, Bournemouth, UK',
      latitude: 50.7367,
      longitude: -1.8625,
      postcode: 'BH7 7BZ',
      facilities: ['Grass pitches', 'Changing facilities', 'Parking']
    },
    matchLocation: {
      address: 'Vitality Stadium, Bournemouth, UK',
      latitude: 50.7352,
      longitude: -1.8383,
      postcode: 'BH7 7AF',
      facilities: ['Stadium', 'Professional facilities', 'Medical room']
    }
  },
  // Wolverhampton
  {
    title: 'Wolves Academy U12 Centre Mid',
    description: 'Box-to-box midfielder wanted for youth academy.',
    position: 'Midfielder',
    ageGroup: 'U12',
    trainingLocation: {
      address: 'West Park, Wolverhampton, UK',
      latitude: 52.5925,
      longitude: -2.1528,
      postcode: 'WV1 4PD',
      facilities: ['Training pitches', 'Pavilion', 'Parking']
    },
    matchLocation: {
      address: 'Molineux Stadium, Wolverhampton, UK',
      latitude: 52.5903,
      longitude: -2.1305,
      postcode: 'WV1 4QR',
      facilities: ['Professional stadium', 'Full facilities', 'Medical support']
    }
  },
  // Coventry
  {
    title: 'Coventry City U16 Striker',
    description: 'Target man needed for physical style of play.',
    position: 'Forward',
    ageGroup: 'U16',
    trainingLocation: {
      address: 'War Memorial Park, Coventry, UK',
      latitude: 52.4042,
      longitude: -1.5224,
      postcode: 'CV3 6PT',
      facilities: ['Multiple pitches', 'Changing rooms', 'Parking']
    },
    matchLocation: {
      address: 'Coventry Building Society Arena, Coventry, UK',
      latitude: 52.4484,
      longitude: -1.4991,
      postcode: 'CV6 6GE',
      facilities: ['Modern stadium', 'Professional facilities', 'Parking']
    }
  }
];

try {
  let addedCount = 0;
  
  for (const vacancy of teamVacancies) {
    const result = db.prepare(`
      INSERT INTO team_vacancies (
        title, description, position, ageGroup, league,
        location, status, contactInfo, createdAt, postedBy,
        trainingLocationData, matchLocationData
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      vacancy.title,
      vacancy.description,
      vacancy.position,
      vacancy.ageGroup,
      leagueId,
      vacancy.trainingLocation.address, // Use training location as primary location
      'active',
      `contact@${vacancy.title.toLowerCase().replace(/\s+/g, '')}.com`,
      new Date().toISOString(),
      userId,
      JSON.stringify(vacancy.trainingLocation),
      JSON.stringify(vacancy.matchLocation)
    );
    
    addedCount++;
    console.log(`✓ Added: ${vacancy.title}`);
    console.log(`  Training: ${vacancy.trainingLocation.address}`);
    console.log(`  Matches: ${vacancy.matchLocation.address}`);
    console.log('');
  }
  
  console.log(`\n✓ Successfully added ${addedCount} team vacancies across England!`);
  
  // Show summary
  console.log('\nSummary by region:');
  const summary = db.prepare(`
    SELECT 
      CASE 
        WHEN location LIKE '%Manchester%' THEN 'North West'
        WHEN location LIKE '%Liverpool%' THEN 'North West'
        WHEN location LIKE '%Newcastle%' THEN 'North East'
        WHEN location LIKE '%Leeds%' THEN 'Yorkshire'
        WHEN location LIKE '%Sheffield%' THEN 'Yorkshire'
        WHEN location LIKE '%Birmingham%' THEN 'Midlands'
        WHEN location LIKE '%Nottingham%' THEN 'Midlands'
        WHEN location LIKE '%Leicester%' THEN 'Midlands'
        WHEN location LIKE '%Coventry%' THEN 'Midlands'
        WHEN location LIKE '%Wolverhampton%' THEN 'Midlands'
        WHEN location LIKE '%London%' THEN 'London'
        WHEN location LIKE '%Brighton%' THEN 'South East'
        WHEN location LIKE '%Southampton%' THEN 'South'
        WHEN location LIKE '%Bournemouth%' THEN 'South'
        WHEN location LIKE '%Bristol%' THEN 'South West'
        WHEN location LIKE '%Norwich%' THEN 'East Anglia'
        ELSE 'Other'
      END as region,
      COUNT(*) as count
    FROM team_vacancies
    WHERE trainingLocationData IS NOT NULL
      AND matchLocationData IS NOT NULL
    GROUP BY region
    ORDER BY count DESC
  `).all();
  
  console.table(summary);
  
  console.log('\nTotal vacancies with both location types:');
  const total = db.prepare(`
    SELECT COUNT(*) as total
    FROM team_vacancies
    WHERE trainingLocationData IS NOT NULL
      AND matchLocationData IS NOT NULL
  `).get();
  
  console.log(`${total.total} team vacancies ready for map testing!`);
  
} catch (error) {
  console.error('Error adding test data:', error);
  process.exit(1);
} finally {
  db.close();
}
