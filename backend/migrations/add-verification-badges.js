const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');

function addVerificationColumns() {
  const db = new sqlite3.Database(dbPath);

  console.log('Adding verification badge columns to database...');

  const migrations = [
    {
      name: 'Add isVerified column to users',
      sql: `ALTER TABLE users ADD COLUMN isVerified BOOLEAN DEFAULT 0`
    },
    {
      name: 'Add verifiedAt column to users',
      sql: `ALTER TABLE users ADD COLUMN verifiedAt TIMESTAMP NULL`
    },
    {
      name: 'Add verifiedBy column to users',
      sql: `ALTER TABLE users ADD COLUMN verifiedBy INTEGER NULL`
    },
    {
      name: 'Add verificationNotes column to users',
      sql: `ALTER TABLE users ADD COLUMN verificationNotes TEXT NULL`
    }
  ];

  db.serialize(() => {
    migrations.forEach((migration) => {
      db.run(migration.sql, (err) => {
        if (err) {
          if (err.message.includes('duplicate column name')) {
            console.log(`✓ ${migration.name} - Column already exists, skipping`);
          } else {
            console.error(`✗ ${migration.name} - Error:`, err.message);
          }
        } else {
          console.log(`✓ ${migration.name} - Success`);
        }
      });
    });
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\n✅ Verification badge migration completed!');
    }
  });
}

// Run migration
addVerificationColumns();
