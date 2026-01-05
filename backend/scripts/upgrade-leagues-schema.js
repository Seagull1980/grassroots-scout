const Database = require('../db/database.js');
require('dotenv').config({ path: '../.env' });

const db = new Database();

async function upgradeLeaguesSchema() {
  try {
    console.log('🔧 Starting leagues table schema upgrade...');
    
    // Check current table structure
    const tableInfo = await db.query("PRAGMA table_info(leagues)");
    const existingColumns = tableInfo.rows.map(row => row.name);
    
    console.log('📋 Current columns:', existingColumns.join(', '));
    
    // Add new columns if they don't exist
    const newColumns = [
      { name: 'region', type: 'VARCHAR', description: 'Geographic region (e.g., North West, Yorkshire)' },
      { name: 'category', type: 'VARCHAR', description: 'League category (e.g., Senior, Youth, Women\'s)' },
      { name: 'websiteUrl', type: 'VARCHAR', description: 'Official league website URL' }
    ];
    
    for (const column of newColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adding column: ${column.name} (${column.type})`);
        await db.query(`ALTER TABLE leagues ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Added ${column.name} - ${column.description}`);
      } else {
        console.log(`⏭️ Column ${column.name} already exists, skipping`);
      }
    }
    
    // Verify final structure
    const updatedTableInfo = await db.query("PRAGMA table_info(leagues)");
    const finalColumns = updatedTableInfo.rows.map(row => row.name);
    
    console.log('\n🎉 Schema upgrade completed!');
    console.log('📋 Final columns:', finalColumns.join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Error upgrading leagues schema:', error);
    return false;
  }
}

// Run the upgrade
if (require.main === module) {
  upgradeLeaguesSchema()
    .then((success) => {
      if (success) {
        console.log('\n✨ Schema upgrade finished successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Schema upgrade failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Upgrade failed:', error);
      process.exit(1);
    });
}

module.exports = { upgradeLeaguesSchema };
