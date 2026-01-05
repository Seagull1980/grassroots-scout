const Database = require('./db/database.js');

async function applyMigration() {
  const db = new Database();
  
  try {
    console.log('🔄 Applying featured listings migration...');
    
    // Add featured listing columns to team_vacancies
    await db.query(`
      ALTER TABLE team_vacancies ADD COLUMN isFeatured BOOLEAN DEFAULT 0
    `).catch(err => {
      if (!err.message.includes('duplicate column')) throw err;
    });
    
    await db.query(`
      ALTER TABLE team_vacancies ADD COLUMN featuredUntil DATETIME NULL
    `).catch(err => {
      if (!err.message.includes('duplicate column')) throw err;
    });
    
    await db.query(`
      ALTER TABLE team_vacancies ADD COLUMN featuredPrice DECIMAL(10,2) NULL
    `).catch(err => {
      if (!err.message.includes('duplicate column')) throw err;
    });
    
    // Add featured listing columns to player_availability
    await db.query(`
      ALTER TABLE player_availability ADD COLUMN isFeatured BOOLEAN DEFAULT 0
    `).catch(err => {
      if (!err.message.includes('duplicate column')) throw err;
    });
    
    await db.query(`
      ALTER TABLE player_availability ADD COLUMN featuredUntil DATETIME NULL
    `).catch(err => {
      if (!err.message.includes('duplicate column')) throw err;
    });
    
    await db.query(`
      ALTER TABLE player_availability ADD COLUMN featuredPrice DECIMAL(10,2) NULL
    `).catch(err => {
      if (!err.message.includes('duplicate column')) throw err;
    });
    
    // Create payments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        paymentType VARCHAR(50) NOT NULL,
        itemId INTEGER NOT NULL,
        itemType VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'GBP',
        paymentStatus VARCHAR(20) DEFAULT 'pending',
        paymentMethod VARCHAR(50),
        stripePaymentIntentId VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        completedAt DATETIME NULL,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);
    
    // Create pricing table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pricing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        featureType VARCHAR(50) NOT NULL UNIQUE,
        price DECIMAL(10,2) NOT NULL,
        duration INTEGER NOT NULL,
        description TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default pricing
    await db.query(`
      INSERT OR REPLACE INTO pricing (featureType, price, duration, description) VALUES
      ('featured_listing', 4.99, 30, 'Featured listing appears at the top of search results for 30 days'),
      ('urgent_tag', 2.99, 14, 'Urgent tag highlights your listing for 14 days'),
      ('priority_support', 9.99, 30, 'Priority customer support for 30 days'),
      ('verification_badge', 19.99, 365, 'Verified badge for your profile for 1 year')
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Pricing table created with default values:');
    
    const pricing = await db.query('SELECT * FROM pricing');
    pricing.rows.forEach(row => {
      console.log(`   - ${row.featureType}: £${row.price} for ${row.duration} days`);
    });
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await db.close();
    process.exit(1);
  }
}

applyMigration();
