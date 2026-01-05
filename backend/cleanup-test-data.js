const Database = require('./db/database.js');

async function cleanupTestData() {
  const db = new Database();
  
  try {
    console.log('🧹 Cleaning up test data...\n');
    
    // Get test user IDs first (to avoid deleting real users)
    const testEmailPattern = '%@test.com';
    const testUsersResult = await db.query('SELECT id FROM users WHERE email LIKE ?', [testEmailPattern]);
    const testUserIds = testUsersResult.rows.map(row => row.id);
    
    if (testUserIds.length === 0) {
      console.log('ℹ️  No test users found to clean up.');
      return;
    }
    
    console.log(`🔍 Found ${testUserIds.length} test users to clean up`);
    
    // 1. Clean up analytics data for test users
    console.log('📊 Cleaning analytics data...');
    const pageViewsResult = await db.query(`DELETE FROM page_views WHERE userId IN (${testUserIds.map(() => '?').join(',')})`, testUserIds);
    console.log(`   ✅ Deleted ${pageViewsResult.changes || 0} page views`);
    
    const sessionsResult = await db.query(`DELETE FROM user_sessions WHERE userId IN (${testUserIds.map(() => '?').join(',')})`, testUserIds);
    console.log(`   ✅ Deleted ${sessionsResult.changes || 0} user sessions`);
    
    // 2. Clean up match completions
    console.log('🏅 Cleaning match completions...');
    const matchResult = await db.query(`DELETE FROM match_completions WHERE playerId IN (${testUserIds.map(() => '?').join(',')})`, testUserIds);
    console.log(`   ✅ Deleted ${matchResult.changes || 0} match completions`);
    
    // 3. Clean up player availability posts
    console.log('⚽ Cleaning player availability...');
    const availabilityResult = await db.query(`DELETE FROM player_availability WHERE postedBy IN (${testUserIds.map(() => '?').join(',')})`, testUserIds);
    console.log(`   ✅ Deleted ${availabilityResult.changes || 0} player availability posts`);
    
    // 4. Clean up team vacancies
    console.log('🏟️ Cleaning team vacancies...');
    const vacanciesResult = await db.query(`DELETE FROM team_vacancies WHERE postedBy IN (${testUserIds.map(() => '?').join(',')})`, testUserIds);
    console.log(`   ✅ Deleted ${vacanciesResult.changes || 0} team vacancies`);
    
    // 5. Clean up user profiles
    console.log('📋 Cleaning user profiles...');
    const profilesResult = await db.query(`DELETE FROM user_profiles WHERE userId IN (${testUserIds.map(() => '?').join(',')})`, testUserIds);
    console.log(`   ✅ Deleted ${profilesResult.changes || 0} user profiles`);
    
    // 6. Clean up test leagues (be careful not to delete real leagues)
    console.log('🏆 Cleaning test leagues...');
    const testLeagues = [
      'Manchester Youth League',
      'Birmingham City Football League', 
      'London Metropolitan League',
      'Leeds Community Football League',
      'Liverpool Junior League'
    ];
    
    let totalLeaguesDeleted = 0;
    for (const leagueName of testLeagues) {
      const leagueResult = await db.query('DELETE FROM leagues WHERE name = ?', [leagueName]);
      totalLeaguesDeleted += leagueResult.changes || 0;
    }
    console.log(`   ✅ Deleted ${totalLeaguesDeleted} test leagues`);
    
    // 7. Clean up calendar events created by test users
    console.log('📅 Cleaning calendar events...');
    const eventsResult = await db.query(`DELETE FROM calendar_events WHERE createdBy IN (${testUserIds.map(() => '?').join(',')})`, testUserIds);
    console.log(`   ✅ Deleted ${eventsResult.changes || 0} calendar events`);
    
    // 8. Clean up trial invitations
    console.log('🎯 Cleaning trial invitations...');
    const invitationsResult = await db.query(`DELETE FROM trial_invitations WHERE playerId IN (${testUserIds.map(() => '?').join(',')}) OR coachId IN (${testUserIds.map(() => '?').join(',')})`, [...testUserIds, ...testUserIds]);
    console.log(`   ✅ Deleted ${invitationsResult.changes || 0} trial invitations`);
    
    // 9. Finally, delete test users themselves
    console.log('👥 Cleaning test users...');
    const usersResult = await db.query(`DELETE FROM users WHERE id IN (${testUserIds.map(() => '?').join(',')})`, testUserIds);
    console.log(`   ✅ Deleted ${usersResult.changes || 0} test users`);
    
    console.log('\n🎉 Test data cleanup completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   • ${usersResult.changes || 0} test users removed`);
    console.log(`   • ${profilesResult.changes || 0} profiles removed`);
    console.log(`   • ${vacanciesResult.changes || 0} team vacancies removed`);
    console.log(`   • ${availabilityResult.changes || 0} player availability posts removed`);
    console.log(`   • ${totalLeaguesDeleted} test leagues removed`);
    console.log(`   • ${pageViewsResult.changes || 0} page views removed`);
    console.log(`   • ${sessionsResult.changes || 0} user sessions removed`);
    console.log(`   • ${matchResult.changes || 0} match completions removed`);
    console.log(`   • ${eventsResult.changes || 0} calendar events removed`);
    console.log(`   • ${invitationsResult.changes || 0} trial invitations removed`);
    
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  } finally {
    await db.close();
  }
}

// Add command line option to confirm cleanup
const args = process.argv.slice(2);
if (args.includes('--confirm')) {
  cleanupTestData();
} else {
  console.log('🚨 WARNING: This will delete all test data!');
  console.log('   This includes all users with @test.com email addresses and their associated data.');
  console.log('');
  console.log('   To proceed, run: node cleanup-test-data.js --confirm');
  console.log('');
  console.log('   Test data that will be removed:');
  console.log('   • All users with @test.com emails');
  console.log('   • Their profiles, vacancies, availability posts');
  console.log('   • Analytics data (page views, sessions)');
  console.log('   • Test leagues and calendar events');
  console.log('   • Match completions and trial invitations');
}
