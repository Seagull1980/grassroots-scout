const Database = require('./db/database.js');

async function simpleCleanup() {
  const db = new Database();
  
  try {
    console.log('🧹 Simple cleanup of test users...\n');
    
    // Get test user IDs
    const testEmailPattern = '%@test.com';
    const testUsersResult = await db.query('SELECT id FROM users WHERE email LIKE ?', [testEmailPattern]);
    const testUserIds = testUsersResult.rows.map(row => row.id);
    
    if (testUserIds.length === 0) {
      console.log('ℹ️  No test users found to clean up.');
      return;
    }
    
    console.log(`🔍 Found ${testUserIds.length} test users to clean up`);
    
    // Simple cleanup - just delete the test users (CASCADE should handle related data)
    const usersResult = await db.query(`DELETE FROM users WHERE email LIKE ?`, [testEmailPattern]);
    console.log(`   ✅ Deleted ${usersResult.changes || 0} test users`);
    
    // Clean up test leagues
    const testLeagues = [
      'Manchester Youth League',
      'Birmingham City Football League', 
      'London Metropolitan League',
      'Leeds Community Football League',
      'Liverpool Junior League'
    ];
    
    let totalLeaguesDeleted = 0;
    for (const leagueName of testLeagues) {
      try {
        const leagueResult = await db.query('DELETE FROM leagues WHERE name = ?', [leagueName]);
        totalLeaguesDeleted += leagueResult.changes || 0;
      } catch (error) {
        // Ignore errors for non-existent leagues
      }
    }
    console.log(`   ✅ Deleted ${totalLeaguesDeleted} test leagues`);
    
    console.log('\n🎉 Simple cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await db.close();
  }
}

simpleCleanup();
