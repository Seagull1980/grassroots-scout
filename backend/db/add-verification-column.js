const Database = require('./database.js');

async function addVerificationColumn() {
  const db = new Database();
  
  try {
    console.log('Adding verification column to users table...');
    
    // Check if column already exists
    const tableInfo = await db.query("PRAGMA table_info(users)");
    const columnExists = tableInfo.rows.some(col => col.name === 'isVerified');
    
    if (!columnExists) {
      await db.query(`
        ALTER TABLE users ADD COLUMN isVerified INTEGER DEFAULT 0
      `);
      console.log('✅ isVerified column added successfully');
      
      // Auto-verify admin users
      await db.query(`
        UPDATE users SET isVerified = 1 WHERE role = 'Admin'
      `);
      console.log('✅ Admin users auto-verified');
    } else {
      console.log('ℹ️ isVerified column already exists');
    }
    
    console.log('✅ Verification system ready!');
  } catch (error) {
    console.error('❌ Error adding verification column:', error);
  }
  // Don't close the database - it's a singleton shared across the app
}

addVerificationColumn();
