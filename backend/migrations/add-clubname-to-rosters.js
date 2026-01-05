const Database = require('../db/database');

async function addClubNameColumn() {
  const db = new Database();
  
  try {
    console.log('🔄 Adding clubName column to team_rosters table...');
    
    // Check if column already exists
    const checkColumn = await db.query(`
      SELECT COUNT(*) as count 
      FROM pragma_table_info('team_rosters') 
      WHERE name='clubName'
    `);
    
    if (checkColumn.rows[0].count === 0) {
      // Add clubName column
      await db.query(`
        ALTER TABLE team_rosters 
        ADD COLUMN clubName VARCHAR
      `);
      console.log('✅ Added clubName column to team_rosters');
    } else {
      console.log('ℹ️  clubName column already exists');
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run if called directly
if (require.main === module) {
  addClubNameColumn()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = addClubNameColumn;
