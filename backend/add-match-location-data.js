const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Adding match location data to team vacancies...\n');

// Sample match locations - different from training locations
const matchLocations = [
  {
    address: "Wembley Stadium, London, UK",
    latitude: 51.5560,
    longitude: -0.2795,
    postcode: "HA9 0WS",
    facilities: ["Changing rooms", "Spectator seating", "Floodlights", "Parking", "Refreshments"]
  },
  {
    address: "Emirates Stadium, London, UK", 
    latitude: 51.5549,
    longitude: -0.1084,
    postcode: "N5 1BU",
    facilities: ["Professional pitch", "Changing rooms", "Medical facilities", "Spectator seating"]
  },
  {
    address: "Stamford Bridge, London, UK",
    latitude: 51.4817,
    longitude: -0.1910,
    postcode: "SW6 1HS",
    facilities: ["Stadium pitch", "Full facilities", "Parking", "Spectator areas"]
  }
];

try {
  // Get existing vacancies
  const vacancies = db.prepare(`
    SELECT id, title 
    FROM team_vacancies 
    WHERE trainingLocationData IS NOT NULL
    LIMIT 3
  `).all();
  
  if (vacancies.length === 0) {
    console.log('No vacancies found with training locations');
    process.exit(0);
  }
  
  // Add match locations to each vacancy
  vacancies.forEach((vacancy, index) => {
    const matchLocation = matchLocations[index];
    
    db.prepare(`
      UPDATE team_vacancies 
      SET matchLocationData = ? 
      WHERE id = ?
    `).run(JSON.stringify(matchLocation), vacancy.id);
    
    console.log(`✓ Added match location for ${vacancy.title}:`);
    console.log(`  ${matchLocation.address}`);
  });
  
  console.log('\n✓ Match location data added successfully!');
  
  // Show results
  console.log('\nVacancies with both location types:');
  const updated = db.prepare(`
    SELECT id, title,
           json_extract(trainingLocationData, '$.address') as trainingLocation,
           json_extract(matchLocationData, '$.address') as matchLocation
    FROM team_vacancies 
    WHERE trainingLocationData IS NOT NULL 
      AND matchLocationData IS NOT NULL
  `).all();
  
  console.table(updated);
  
} catch (error) {
  console.error('Error adding match locations:', error);
  process.exit(1);
} finally {
  db.close();
}
