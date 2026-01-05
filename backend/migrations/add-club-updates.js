const Database = require('../db/database');

async function addClubUpdatesTables() {
  const db = new Database();
  
  try {
    console.log('🔄 Creating club updates tables...');
    
    // Club updates table for announcements and posts
    await db.query(`
      CREATE TABLE IF NOT EXISTS club_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clubName VARCHAR NOT NULL,
        coachId INTEGER NOT NULL,
        title VARCHAR NOT NULL,
        content TEXT NOT NULL,
        updateType VARCHAR DEFAULT 'general' CHECK(updateType IN ('general', 'announcement', 'event', 'achievement', 'urgent')),
        isPinned BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coachId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created club_updates table');
    
    // Club update comments for discussions
    await db.query(`
      CREATE TABLE IF NOT EXISTS club_update_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        updateId INTEGER NOT NULL,
        coachId INTEGER NOT NULL,
        comment TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updateId) REFERENCES club_updates(id) ON DELETE CASCADE,
        FOREIGN KEY (coachId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created club_update_comments table');
    
    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_club_updates_club 
      ON club_updates(clubName, createdAt DESC)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_club_update_comments 
      ON club_update_comments(updateId, createdAt)
    `);
    
    console.log('✅ Created indexes');
    console.log('✅ Club updates tables created successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run if called directly
if (require.main === module) {
  addClubUpdatesTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = addClubUpdatesTables;
