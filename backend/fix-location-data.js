const Database = require('./db/database.js');

async function fixLocationData() {
  const db = new Database();
  
  try {
    // Check for team vacancies with missing location data
    const result = await db.query('SELECT id, title, location, locationData FROM team_vacancies');
    console.log(`Found ${result.rows.length} team vacancies`);
    
    const needsLocationData = result.rows.filter(row => !row.locationData || row.locationData === 'null');
    console.log(`${needsLocationData.length} vacancies need location data:`);
    
    for (const vacancy of needsLocationData) {
      console.log(`- ID: ${vacancy.id}, Title: ${vacancy.title}, Location: ${vacancy.location}`);
      
      // Add default location data based on the location string
      let defaultLocationData;
      const location = vacancy.location || 'Manchester, UK';
      
      // Create basic location data based on common UK locations
      if (location.toLowerCase().includes('manchester')) {
        defaultLocationData = JSON.stringify({
          address: 'Manchester, UK',
          latitude: 53.4808,
          longitude: -2.2426
        });
      } else if (location.toLowerCase().includes('london')) {
        defaultLocationData = JSON.stringify({
          address: 'London, UK',
          latitude: 51.5074,
          longitude: -0.1278
        });
      } else if (location.toLowerCase().includes('birmingham')) {
        defaultLocationData = JSON.stringify({
          address: 'Birmingham, UK',
          latitude: 52.4862,
          longitude: -1.8904
        });
      } else if (location.toLowerCase().includes('liverpool')) {
        defaultLocationData = JSON.stringify({
          address: 'Liverpool, UK',
          latitude: 53.4084,
          longitude: -2.9916
        });
      } else if (location.toLowerCase().includes('leeds')) {
        defaultLocationData = JSON.stringify({
          address: 'Leeds, UK',
          latitude: 53.8008,
          longitude: -1.5491
        });
      } else {
        // Default to Manchester for unknown locations
        defaultLocationData = JSON.stringify({
          address: location,
          latitude: 53.4808,
          longitude: -2.2426
        });
      }
      
      // Update the database
      await db.query(
        'UPDATE team_vacancies SET locationData = ? WHERE id = ?',
        [defaultLocationData, vacancy.id]
      );
      
      console.log(`  ✓ Updated with location data: ${defaultLocationData}`);
    }
    
    console.log('\n✅ Location data fix completed!');
    
  } catch (error) {
    console.error('Error fixing location data:', error);
  }
}

fixLocationData();
