const Database = require('./db/database.js');

async function migrateUsersTable() {
  try {
    const db = new Database();
    
    console.log('Starting database migration...');
    
    // Add missing columns to users table
    const migrations = [
      // Add email verification columns
      "ALTER TABLE users ADD COLUMN isEmailVerified BOOLEAN DEFAULT FALSE",
      "ALTER TABLE users ADD COLUMN emailVerificationToken VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN emailVerificationExpires TIMESTAMP DEFAULT NULL",
      
      // Add password reset columns (these might already exist from our recent change)
      "ALTER TABLE users ADD COLUMN passwordResetToken VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN passwordResetExpires TIMESTAMP DEFAULT NULL",
      
      // Rename role to userType for consistency
      "ALTER TABLE users ADD COLUMN userType VARCHAR(50) DEFAULT 'player'",
    ];
    
    for (let i = 0; i < migrations.length; i++) {
      try {
        await db.query(migrations[i]);
        console.log(`✅ Migration ${i + 1}/${migrations.length} completed: ${migrations[i].substring(0, 50)}...`);
      } catch (error) {
        if (error.message && error.message.includes('duplicate column name')) {
          console.log(`⚠️  Column already exists for migration ${i + 1}: ${migrations[i].substring(0, 50)}...`);
        } else {
          console.error(`❌ Error in migration ${i + 1}:`, error.message);
        }
      }
    }
    
    // Copy role values to userType column
    try {
      await db.query("UPDATE users SET userType = LOWER(role) WHERE userType IS NULL OR userType = 'player'");
      console.log('✅ Copied role values to userType column');
    } catch (error) {
      console.error('❌ Error copying role values:', error.message);
    }
    
    // Set existing users as email verified (since they were created in the old system)
    try {
      await db.query("UPDATE users SET isEmailVerified = TRUE WHERE isEmailVerified = FALSE OR isEmailVerified IS NULL");
      console.log('✅ Set existing users as email verified');
    } catch (error) {
      console.error('❌ Error setting email verification:', error.message);
    }
    
    // Check final results
    const users = await db.query('SELECT id, email, firstName, lastName, role, userType, isEmailVerified FROM users LIMIT 5');
    console.log('\nUpdated users:');
    console.log(users.rows);
    
    console.log('\n🎉 Database migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUsersTable();
