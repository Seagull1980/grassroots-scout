const Database = require('../db/database.js');
require('dotenv').config({ path: '../.env' });

const db = new Database();

async function cleanupTestData() {
  try {
    console.log('🧹 Starting comprehensive test data cleanup...\n');
    
    // Get counts before cleanup
    const beforeCounts = {
      users: await db.query('SELECT COUNT(*) as count FROM users WHERE email LIKE "%test.com%" OR firstName LIKE "%Test%"'),
      vacancies: await db.query('SELECT COUNT(*) as count FROM team_vacancies WHERE title LIKE "%Test%" OR description LIKE "%test%"'),
      availability: await db.query('SELECT COUNT(*) as count FROM player_availability WHERE title LIKE "%Test%" OR description LIKE "%test%"'),
      leagues: await db.query('SELECT COUNT(*) as count FROM leagues WHERE name LIKE "%Test%" OR description LIKE "%Test%"'),
      pageViews: await db.query('SELECT COUNT(*) as count FROM page_views WHERE userId IN (SELECT id FROM users WHERE email LIKE "%test.com%")'),
      sessions: await db.query('SELECT COUNT(*) as count FROM user_sessions WHERE userId IN (SELECT id FROM users WHERE email LIKE "%test.com%")')
    };
    
    console.log('📊 Test data found:');
    console.log(`   Test users: ${beforeCounts.users.rows[0].count}`);
    console.log(`   Test vacancies: ${beforeCounts.vacancies.rows[0].count}`);
    console.log(`   Test availability posts: ${beforeCounts.availability.rows[0].count}`);
    console.log(`   Test leagues: ${beforeCounts.leagues.rows[0].count}`);
    console.log(`   Test page views: ${beforeCounts.pageViews.rows[0].count}`);
    console.log(`   Test user sessions: ${beforeCounts.sessions.rows[0].count}\n`);
    
    // Clean up test data in dependency order
    console.log('🗑️ Removing test data...');
    
    // 1. Remove analytics data for test users
    console.log('   Cleaning analytics data...');
    await db.query('DELETE FROM page_views WHERE userId IN (SELECT id FROM users WHERE email LIKE "%test.com%" OR firstName LIKE "%Test%")');
    await db.query('DELETE FROM user_sessions WHERE userId IN (SELECT id FROM users WHERE email LIKE "%test.com%" OR firstName LIKE "%Test%")');
    await db.query('DELETE FROM match_completions WHERE userId IN (SELECT id FROM users WHERE email LIKE "%test.com%" OR firstName LIKE "%Test%")');
    
    // 2. Remove test vacancies and availability posts
    console.log('   Cleaning vacancies and availability posts...');
    await db.query('DELETE FROM team_vacancies WHERE postedBy IN (SELECT id FROM users WHERE email LIKE "%test.com%" OR firstName LIKE "%Test%") OR title LIKE "%Test%" OR description LIKE "%test%"');
    await db.query('DELETE FROM player_availability WHERE postedBy IN (SELECT id FROM users WHERE email LIKE "%test.com%" OR firstName LIKE "%Test%") OR title LIKE "%Test%" OR description LIKE "%test%"');
    
    // 3. Remove test user profiles
    console.log('   Cleaning user profiles...');
    await db.query('DELETE FROM user_profiles WHERE userId IN (SELECT id FROM users WHERE email LIKE "%test.com%" OR firstName LIKE "%Test%")');
    
    // 4. Remove test users (but keep admin users)
    console.log('   Cleaning test users...');
    await db.query('DELETE FROM users WHERE (email LIKE "%test.com%" OR firstName LIKE "%Test%") AND role != "Admin"');
    
    // 5. Remove test leagues (mark as inactive instead of deleting to preserve referential integrity)
    console.log('   Marking test leagues as inactive...');
    await db.query('UPDATE leagues SET isActive = 0 WHERE name LIKE "%Test%" OR description LIKE "%Test%"');
    
    // Get counts after cleanup
    const afterCounts = {
      users: await db.query('SELECT COUNT(*) as count FROM users'),
      activeUsers: await db.query('SELECT COUNT(*) as count FROM users WHERE role != "Admin"'),
      adminUsers: await db.query('SELECT COUNT(*) as count FROM users WHERE role = "Admin"'),
      vacancies: await db.query('SELECT COUNT(*) as count FROM team_vacancies'),
      availability: await db.query('SELECT COUNT(*) as count FROM player_availability'),
      activeLeagues: await db.query('SELECT COUNT(*) as count FROM leagues WHERE isActive = 1'),
      inactiveLeagues: await db.query('SELECT COUNT(*) as count FROM leagues WHERE isActive = 0'),
      pageViews: await db.query('SELECT COUNT(*) as count FROM page_views'),
      sessions: await db.query('SELECT COUNT(*) as count FROM user_sessions')
    };
    
    console.log('\n✅ Cleanup completed! Current database state:');
    console.log(`   Total users: ${afterCounts.users.rows[0].count}`);
    console.log(`   Non-admin users: ${afterCounts.activeUsers.rows[0].count}`);
    console.log(`   Admin users: ${afterCounts.adminUsers.rows[0].count}`);
    console.log(`   Team vacancies: ${afterCounts.vacancies.rows[0].count}`);
    console.log(`   Player availability posts: ${afterCounts.availability.rows[0].count}`);
    console.log(`   Active leagues: ${afterCounts.activeLeagues.rows[0].count}`);
    console.log(`   Inactive leagues: ${afterCounts.inactiveLeagues.rows[0].count}`);
    console.log(`   Page views: ${afterCounts.pageViews.rows[0].count}`);
    console.log(`   User sessions: ${afterCounts.sessions.rows[0].count}`);
    
    // Show remaining admin users
    const admins = await db.query('SELECT email, firstName, lastName FROM users WHERE role = "Admin"');
    console.log('\n👑 Remaining admin users:');
    admins.rows.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.firstName} ${admin.lastName} (${admin.email})`);
    });
    
    // Show sample of remaining leagues
    const sampleLeagues = await db.query('SELECT name, region, category FROM leagues WHERE isActive = 1 ORDER BY name LIMIT 5');
    console.log('\n🏆 Sample remaining leagues:');
    sampleLeagues.rows.forEach((league, index) => {
      console.log(`   ${index + 1}. ${league.name} (${league.region || 'N/A'} - ${league.category || 'N/A'})`);
    });
    
    console.log('\n🎉 Test data cleanup completed successfully!');
    console.log('💡 Your database now contains only real league data and admin users.');
    console.log('🚀 Ready for production use!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Interactive confirmation
function askForConfirmation() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('⚠️  This will remove ALL test data from the database.');
  console.log('   This includes test users, test vacancies, test availability posts, and test analytics data.');
  console.log('   Real leagues and admin users will be preserved.\n');
  
  rl.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      cleanupTestData()
        .then(() => {
          rl.close();
          process.exit(0);
        })
        .catch((error) => {
          console.error('💥 Cleanup failed:', error);
          rl.close();
          process.exit(1);
        });
    } else {
      console.log('❌ Cleanup cancelled.');
      rl.close();
      process.exit(0);
    }
  });
}

// Run with confirmation if called directly
if (require.main === module) {
  askForConfirmation();
}

module.exports = { cleanupTestData };
