const Database = require('./db/database');

async function checkData() {
  const db = new Database();
  
  try {
    // Wait a moment for database connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Checking database data...');
    
    const teamVacancies = await db.getAllTeamVacancies();
    console.log(`Team Vacancies: ${teamVacancies.length}`);
    if (teamVacancies.length > 0) {
      console.log('Sample team vacancy:', teamVacancies[0]);
    }
    
    const playerAvailability = await db.getAllPlayerAvailability();
    console.log(`Player Availability: ${playerAvailability.length}`);
    if (playerAvailability.length > 0) {
      console.log('Sample player availability:', playerAvailability[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking data:', error);
    process.exit(1);
  }
}

checkData();
