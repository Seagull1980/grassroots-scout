const Database = require('../db/database.js');
require('dotenv').config({ path: '../.env' });

const db = new Database();

async function createLeagueRequestsTable() {
  try {
    console.log('🚀 Creating league_requests table...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS league_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR NOT NULL,
        region VARCHAR,
        ageGroup VARCHAR,
        url VARCHAR,
        description TEXT,
        contactName VARCHAR,
        contactEmail VARCHAR,
        contactPhone VARCHAR,
        justification TEXT,
        status VARCHAR DEFAULT 'pending',
        submittedBy INTEGER NOT NULL,
        reviewedBy INTEGER,
        reviewedAt TIMESTAMP,
        reviewNotes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submittedBy) REFERENCES users (id),
        FOREIGN KEY (reviewedBy) REFERENCES users (id),
        CHECK (status IN ('pending', 'approved', 'rejected'))
      )
    `);
    
    console.log('✅ League requests table created successfully');
    
    // Create index for better query performance
    await db.query('CREATE INDEX IF NOT EXISTS idx_league_requests_status ON league_requests(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_league_requests_submitted_by ON league_requests(submittedBy)');
    
    console.log('✅ Indexes created successfully');
    
    // Verify table structure
    const tableInfo = await db.query('PRAGMA table_info(league_requests)');
    console.log('\n📋 Table structure:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating league_requests table:', error);
    throw error;
  }
}

// Run the schema creation if this script is executed directly
if (require.main === module) {
  createLeagueRequestsTable()
    .then(() => {
      console.log('\n✅ League requests table setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ League requests table setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createLeagueRequestsTable };