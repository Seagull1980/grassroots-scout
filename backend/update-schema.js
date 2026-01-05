const Database = require('./db/database');
const db = new Database('./database.sqlite');

async function updateTableSchema() {
  try {
    console.log('Adding missing columns to calendar_events table...');
    
    // Add missing columns one by one
    try {
      await db.query('ALTER TABLE calendar_events ADD COLUMN ageGroup VARCHAR');
      console.log('✅ Added ageGroup column');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ ageGroup column already exists');
      } else {
        throw err;
      }
    }
    
    try {
      await db.query('ALTER TABLE calendar_events ADD COLUMN positions TEXT');
      console.log('✅ Added positions column');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ positions column already exists');
      } else {
        throw err;
      }
    }
    
    try {
      await db.query('ALTER TABLE calendar_events ADD COLUMN requirements TEXT');
      console.log('✅ Added requirements column');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ requirements column already exists');
      } else {
        throw err;
      }
    }
    
    console.log('Database schema updated successfully!');
    db.close();
  } catch (error) {
    console.error('Error updating schema:', error);
    db.close();
  }
}

updateTableSchema();
