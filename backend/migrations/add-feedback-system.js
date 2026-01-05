const Database = require('../db/database');

async function addFeedbackTables() {
  const db = new Database();
  
  try {
    console.log('🔄 Creating feedback system tables...');
    
    // User feedback table for bug reports and improvement ideas
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        feedbackType VARCHAR NOT NULL CHECK(feedbackType IN ('bug', 'improvement')),
        title VARCHAR NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR DEFAULT 'general' CHECK(category IN ('general', 'search', 'messaging', 'team-roster', 'maps', 'dashboard', 'performance', 'mobile', 'other')),
        priority VARCHAR DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
        status VARCHAR DEFAULT 'new' CHECK(status IN ('new', 'reviewing', 'in-progress', 'completed', 'wont-fix', 'duplicate')),
        adminNotes TEXT,
        attachmentUrl VARCHAR,
        browserInfo TEXT,
        pageUrl VARCHAR,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolvedAt TIMESTAMP,
        resolvedBy INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resolvedBy) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created user_feedback table');
    
    // Feedback comments for admin-user communication
    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feedbackId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        comment TEXT NOT NULL,
        isAdminComment BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feedbackId) REFERENCES user_feedback(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created feedback_comments table');
    
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_type_status 
      ON user_feedback(feedbackType, status, createdAt DESC)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_user 
      ON user_feedback(userId, createdAt DESC)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_comments 
      ON feedback_comments(feedbackId, createdAt)
    `);
    
    console.log('✅ Created indexes');
    console.log('✅ Feedback system tables created successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run if called directly
if (require.main === module) {
  addFeedbackTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = addFeedbackTables;
