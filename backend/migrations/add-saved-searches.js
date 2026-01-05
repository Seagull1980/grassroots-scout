const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');

function createSavedSearchesTable() {
  const db = new sqlite3.Database(dbPath);

  console.log('Creating saved_searches table...');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      filters TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      lastUsed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      useCount INTEGER DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('✗ Failed to create saved_searches table:', err.message);
    } else {
      console.log('✓ saved_searches table created successfully');
      
      // Create index for faster queries
      const createIndexSQL = `CREATE INDEX IF NOT EXISTS idx_saved_searches_userId ON saved_searches(userId)`;
      
      db.run(createIndexSQL, (err) => {
        if (err) {
          console.error('✗ Failed to create index:', err.message);
        } else {
          console.log('✓ Index created successfully');
        }
        
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('\n✅ Saved searches migration completed!');
          }
        });
      });
    }
  });
}

// Run migration
createSavedSearchesTable();
