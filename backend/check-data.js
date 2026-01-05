const Database = require('./db/database.js');

async function checkData() {
  const db = new Database();
  
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM team_vacancies');
    console.log(`Total team vacancies: ${result.rows[0].count}`);
    
    if (result.rows[0].count > 0) {
      const sample = await db.query('SELECT id, title, location, locationData FROM team_vacancies LIMIT 5');
      console.log('\nSample team vacancies:');
      sample.rows.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`Title: ${row.title}`);
        console.log(`Location: ${row.location}`);
        console.log(`LocationData: ${row.locationData ? 'YES' : 'NO'}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkData();
