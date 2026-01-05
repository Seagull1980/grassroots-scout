const Database = require('../db/database.js');
require('dotenv').config({ path: '../.env' });

const db = new Database();

async function addLeagueColumns() {
  try {
    console.log('🚀 Adding new columns to leagues table...');
    
    // Add region column if it doesn't exist
    try {
      await db.query('ALTER TABLE leagues ADD COLUMN region VARCHAR');
      console.log('✅ Added region column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('⚠️  Region column already exists');
      } else {
        throw error;
      }
    }
    
    // Add ageGroup column if it doesn't exist
    try {
      await db.query('ALTER TABLE leagues ADD COLUMN ageGroup VARCHAR');
      console.log('✅ Added ageGroup column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('⚠️  AgeGroup column already exists');
      } else {
        throw error;
      }
    }
    
    // Add hits column if it doesn't exist
    try {
      await db.query('ALTER TABLE leagues ADD COLUMN hits INTEGER DEFAULT 0');
      console.log('✅ Added hits column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('⚠️  Hits column already exists');
      } else {
        throw error;
      }
    }
    
    // Check if url column exists, it should already be there according to the schema
    try {
      await db.query('SELECT url FROM leagues LIMIT 1');
      console.log('✅ URL column already exists');
    } catch (error) {
      if (error.message.includes('no such column')) {
        // Add url column if it doesn't exist
        await db.query('ALTER TABLE leagues ADD COLUMN url VARCHAR');
        console.log('✅ Added url column');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Database schema updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating database schema:', error);
    throw error;
  }
}

// Run the schema update if this script is executed directly
if (require.main === module) {
  addLeagueColumns()
    .then(() => {
      console.log('\n✅ Schema update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Schema update failed:', error);
      process.exit(1);
    });
}

module.exports = { addLeagueColumns };