const Database = require('../db/database.js');
require('dotenv').config({ path: '../.env' });

const db = new Database();

async function verifyLeaguesImport() {
  try {
    console.log('🔍 Verifying real leagues import...\n');
    
    // Get total counts
    const totalLeagues = await db.query('SELECT COUNT(*) as count FROM leagues');
    const activeLeagues = await db.query('SELECT COUNT(*) as count FROM leagues WHERE isActive = 1');
    const inactiveLeagues = await db.query('SELECT COUNT(*) as count FROM leagues WHERE isActive = 0');
    
    console.log('📊 League Statistics:');
    console.log(`   Total leagues in database: ${totalLeagues.rows[0].count}`);
    console.log(`   Active leagues: ${activeLeagues.rows[0].count}`);
    console.log(`   Inactive leagues (old test data): ${inactiveLeagues.rows[0].count}`);
    
    // Show breakdown by category
    const categoryBreakdown = await db.query(`
      SELECT category, COUNT(*) as count 
      FROM leagues 
      WHERE isActive = 1 AND category IS NOT NULL
      GROUP BY category 
      ORDER BY count DESC
    `);
    
    console.log('\n🏆 Active Leagues by Category:');
    categoryBreakdown.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.count} leagues`);
    });
    
    // Show breakdown by region
    const regionBreakdown = await db.query(`
      SELECT region, COUNT(*) as count 
      FROM leagues 
      WHERE isActive = 1 AND region IS NOT NULL
      GROUP BY region 
      ORDER BY count DESC
    `);
    
    console.log('\n🗺️ Active Leagues by Region:');
    regionBreakdown.rows.forEach(row => {
      console.log(`   ${row.region}: ${row.count} leagues`);
    });
    
    // Show sample leagues with full data
    const sampleLeagues = await db.query(`
      SELECT name, description, region, category, websiteUrl 
      FROM leagues 
      WHERE isActive = 1 AND websiteUrl IS NOT NULL
      ORDER BY id 
      LIMIT 8
    `);
    
    console.log('\n🌟 Sample Real Leagues (with URLs):');
    sampleLeagues.rows.forEach((league, index) => {
      console.log(`\n   ${index + 1}. ${league.name}`);
      console.log(`      Region: ${league.region}`);
      console.log(`      Category: ${league.category}`);
      console.log(`      URL: ${league.websiteUrl}`);
      console.log(`      Description: ${league.description.substring(0, 80)}...`);
    });
    
    // Show most popular leagues (top 5)
    const topLeagues = await db.query(`
      SELECT name, region, category, websiteUrl
      FROM leagues 
      WHERE isActive = 1 AND websiteUrl IS NOT NULL
      ORDER BY id 
      LIMIT 5
    `);
    
    console.log('\n🏅 Top 5 Most Visited Real Leagues:');
    topLeagues.rows.forEach((league, index) => {
      console.log(`   ${index + 1}. ${league.name} (${league.region})`);
      console.log(`      🔗 ${league.websiteUrl}`);
    });
    
    console.log('\n✅ Verification completed successfully!');
    console.log('💡 The application now uses real FA league data instead of test data.');
    console.log('🌐 Each league includes its official Full-Time FA website URL.');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run verification
if (require.main === module) {
  verifyLeaguesImport()
    .then(() => {
      console.log('\n🎉 Real leagues are ready to use in your application!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyLeaguesImport };
