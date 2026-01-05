const Database = require('../db/database.js');

async function addAlertSystemTables() {
  const db = new Database();
  
  try {
    console.log('🔄 Adding alert system tables...');
    
    // User alert preferences table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_alert_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        emailNotifications BOOLEAN DEFAULT TRUE,
        newVacancyAlerts BOOLEAN DEFAULT TRUE,
        newPlayerAlerts BOOLEAN DEFAULT TRUE,
        trialInvitations BOOLEAN DEFAULT TRUE,
        weeklyDigest BOOLEAN DEFAULT TRUE,
        instantAlerts BOOLEAN DEFAULT FALSE,
        preferredLeagues TEXT DEFAULT '[]',
        ageGroups TEXT DEFAULT '[]',
        positions TEXT DEFAULT '[]',
        maxDistance INTEGER DEFAULT 50,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId)
      )
    `);
    console.log('✅ Created user_alert_preferences table');

    // Alert logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS alert_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        alertType VARCHAR(50) NOT NULL,
        targetId INTEGER,
        targetType VARCHAR(50),
        sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created alert_logs table');

    // User interactions table for recommendations
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        actionType VARCHAR(50) NOT NULL,
        targetId INTEGER,
        targetType VARCHAR(50),
        metadata TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created user_interactions table');

    // Social shares table
    await db.query(`
      CREATE TABLE IF NOT EXISTS social_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        shareType VARCHAR(50) NOT NULL,
        targetId INTEGER NOT NULL,
        targetType VARCHAR(50) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        sharedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created social_shares table');

    // User bookmarks/favorites table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        targetId INTEGER NOT NULL,
        targetType VARCHAR(50) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId, targetId, targetType)
      )
    `);
    console.log('✅ Created user_bookmarks table');

    // User search history for recommendations
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        searchTerm VARCHAR(255),
        filters TEXT,
        resultsCount INTEGER,
        searchedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created user_search_history table');

    // User engagement metrics
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_engagement_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        sessionId VARCHAR(255),
        pageViews INTEGER DEFAULT 0,
        timeSpent INTEGER DEFAULT 0,
        actionsCompleted INTEGER DEFAULT 0,
        date DATE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId, date)
      )
    `);
    console.log('✅ Created user_engagement_metrics table');

    // Notification queue for batch processing
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        notificationType VARCHAR(50) NOT NULL,
        priority INTEGER DEFAULT 1,
        data TEXT NOT NULL,
        scheduledFor TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processedAt TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created notification_queue table');

    console.log('🎉 Alert system tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating alert system tables:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addAlertSystemTables()
    .then(() => {
      console.log('✅ Alert system migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Alert system migration failed:', error);
      process.exit(1);
    });
}

module.exports = addAlertSystemTables;
