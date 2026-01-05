const Database = require('../db/database.js');

(async () => {
  const db = new Database();
  
  try {
    console.log('📝 Adding isBlocked column to users table...');
    
    // Check if column already exists
    const checkResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM pragma_table_info('users') 
      WHERE name='isBlocked'
    `);
    
    if (checkResult.rows[0].count > 0) {
      console.log('✅ isBlocked column already exists');
    } else {
      // Add the column
      await db.query('ALTER TABLE users ADD COLUMN isBlocked BOOLEAN DEFAULT 0');
      console.log('✅ isBlocked column added successfully');
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
})();
