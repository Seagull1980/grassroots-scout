const Database = require('./backend/db/database.js');

const db = new Database();

setTimeout(async () => {
  try {
    // List all tables
    const tables = await db.query(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    console.log('📋 Tables in database:');
    tables.rows.forEach(r => console.log(`   - ${r.name}`));
    
    // Check player_availability structure
    const playerAvailStructure = await db.query(`PRAGMA table_info(player_availability)`);
    if (playerAvailStructure.rows.length > 0) {
      console.log('\n📊 player_availability columns:');
      playerAvailStructure.rows.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
    } else {
      console.log('\n⚠️  player_availability table does not exist');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}, 500);
