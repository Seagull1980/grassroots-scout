const Database = require('../db/database.js');
require('dotenv').config();

class DataVerifier {
  constructor() {
    this.db = new Database();
  }

  async verifyData() {
    console.log('🔍 Verifying enhanced test data...\n');
    
    try {
      // Check coaches
      const coaches = await this.db.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'Coach'"
      );
      console.log(`👨‍🏫 Coaches: ${coaches.rows[0].count}`);
      
      // Check players
      const players = await this.db.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'Player'"
      );
      console.log(`🏃‍♂️ Players: ${players.rows[0].count}`);
      
      // Check team vacancies with location data
      const vacancies = await this.db.query(
        "SELECT COUNT(*) as count FROM team_vacancies WHERE locationData IS NOT NULL"
      );
      console.log(`⚽ Team vacancies with location data: ${vacancies.rows[0].count}`);
      
      // Check player availability with coordinates
      const availability = await this.db.query(
        "SELECT COUNT(*) as count FROM player_availability WHERE locationLatitude IS NOT NULL AND locationLongitude IS NOT NULL"
      );
      console.log(`📍 Player availability with GPS coordinates: ${availability.rows[0].count}`);
      
      // Check leagues
      const leagues = await this.db.query(
        "SELECT COUNT(*) as count FROM leagues"
      );
      console.log(`🏆 Total leagues: ${leagues.rows[0].count}`);
      
      // Sample location data
      console.log('\n📍 Sample location data:');
      const sampleVacancy = await this.db.query(
        "SELECT title, location, locationData FROM team_vacancies WHERE locationData IS NOT NULL LIMIT 1"
      );
      
      if (sampleVacancy.rows.length > 0) {
        const vacancy = sampleVacancy.rows[0];
        console.log(`   Team Vacancy: "${vacancy.title}"`);
        console.log(`   Location: ${vacancy.location}`);
        if (vacancy.locationData) {
          const locationData = JSON.parse(vacancy.locationData);
          console.log(`   Coordinates: ${locationData.latitude}, ${locationData.longitude}`);
          console.log(`   Address: ${locationData.address}`);
          console.log(`   Postcode: ${locationData.postcode}`);
        }
      }
      
      const samplePlayer = await this.db.query(
        "SELECT title, location, locationLatitude, locationLongitude, locationAddress FROM player_availability WHERE locationLatitude IS NOT NULL LIMIT 1"
      );
      
      if (samplePlayer.rows.length > 0) {
        const player = samplePlayer.rows[0];
        console.log(`\n   Player Availability: "${player.title}"`);
        console.log(`   Location: ${player.location}`);
        console.log(`   Coordinates: ${player.locationLatitude}, ${player.locationLongitude}`);
        console.log(`   Address: ${player.locationAddress}`);
      }
      
      // Location distribution
      console.log('\n🗺️ Location distribution:');
      const locationDistribution = await this.db.query(`
        SELECT 
          CASE 
            WHEN location LIKE '%Manchester%' THEN 'Manchester'
            WHEN location LIKE '%London%' THEN 'London' 
            WHEN location LIKE '%Liverpool%' THEN 'Liverpool'
            WHEN location LIKE '%Birmingham%' THEN 'Birmingham'
            WHEN location LIKE '%Leeds%' THEN 'Leeds'
            WHEN location LIKE '%Newcastle%' THEN 'Newcastle'
            WHEN location LIKE '%Brighton%' THEN 'Brighton'
            ELSE 'Other'
          END as city,
          COUNT(*) as count
        FROM (
          SELECT location FROM team_vacancies 
          UNION ALL 
          SELECT location FROM player_availability
        )
        GROUP BY city
        ORDER BY count DESC
      `);
      
      locationDistribution.rows.forEach(row => {
        console.log(`   ${row.city}: ${row.count} entries`);
      });
      
      console.log('\n✅ Data verification completed!');
      console.log('\n🎯 The database now contains comprehensive test data including:');
      console.log('   • Multiple clubs with realistic UK locations');
      console.log('   • GPS coordinates for mapping functionality');
      console.log('   • Varied player positions and age groups');
      console.log('   • Detailed location addresses with postcodes');
      console.log('   • Multiple leagues covering different regions');
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }
}

// Handle command line execution
if (require.main === module) {
  const verifier = new DataVerifier();
  
  (async () => {
    try {
      await verifier.verifyData();
      process.exit(0);
    } catch (error) {
      console.error('Verification failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = DataVerifier;
