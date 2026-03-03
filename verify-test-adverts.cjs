const Database = require('./backend/db/database.js');

const db = new Database();

setTimeout(async () => {
  try {
    const result = await db.query('SELECT id, title, ageGroup, location, preferredLeagues FROM player_availability WHERE id >= 2 ORDER BY id');
    
    console.log('📊 Test Player Adverts in Database:\n');
    result.rows.forEach(r => {
      const leagues = JSON.parse(r.preferredLeagues || '[]');
      console.log(`   [${r.id}] ${r.ageGroup} - ${r.title}`);
      console.log(`       Location: ${r.location}`);
      console.log(`       Leagues: ${leagues.join(', ')}`);
      console.log('');
    });
    
    console.log(`✅ Total: ${result.rows.length} test player adverts`);
   process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}, 500);
