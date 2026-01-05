const Database = require('./db/database.js');

async function showTestDataSummary() {
  const db = new Database();
  
  try {
    console.log('📊 Test Data Summary\n');
    
    // Users by role
    const usersResult = await db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    console.log('👥 Users by Role:');
    usersResult.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count}`);
    });
    
    // Leagues
    const leaguesResult = await db.query('SELECT COUNT(*) as count FROM leagues');
    console.log(`\n🏆 Leagues: ${leaguesResult.rows[0].count}`);
    
    // Team vacancies
    const vacanciesResult = await db.query('SELECT COUNT(*) as count FROM team_vacancies');
    console.log(`🏟️ Team Vacancies: ${vacanciesResult.rows[0].count}`);
    
    // Player availability
    const availabilityResult = await db.query('SELECT COUNT(*) as count FROM player_availability');
    console.log(`⚽ Player Availability: ${availabilityResult.rows[0].count}`);
    
    // User profiles
    const profilesResult = await db.query('SELECT COUNT(*) as count FROM user_profiles');
    console.log(`📋 User Profiles: ${profilesResult.rows[0].count}`);
    
    // Analytics data
    const pageViewsResult = await db.query('SELECT COUNT(*) as count FROM page_views');
    const sessionsResult = await db.query('SELECT COUNT(*) as count FROM user_sessions');
    console.log(`📊 Page Views: ${pageViewsResult.rows[0].count}`);
    console.log(`📊 User Sessions: ${sessionsResult.rows[0].count}`);
    
    // Match completions
    const matchesResult = await db.query('SELECT COUNT(*) as count FROM match_completions');
    console.log(`🏅 Match Completions: ${matchesResult.rows[0].count}`);
    
    console.log('\n🎉 Test data is ready!');
    console.log('\n🔑 Login credentials:');
    console.log('   Admin: cgill1980@hotmail.com / admin123');
    console.log('   Test Coach: coach1@test.com / test123');
    console.log('   Test Player: player1@test.com / test123');
    console.log('   Test Parent: parent1@test.com / test123');
    
  } catch (error) {
    console.error('❌ Error showing summary:', error);
  } finally {
    await db.close();
  }
}

showTestDataSummary();
