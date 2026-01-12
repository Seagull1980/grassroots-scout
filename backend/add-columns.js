const Database = require('./db/database.js');

async function addMissingColumns() {
  const db = new Database();
  try {
    // Check current schema
    const schema = await db.query('PRAGMA table_info(leagues);');
    const columns = schema.rows.map(row => row.name);
    console.log('Current columns:', columns);

    // Add missing columns
    const missingColumns = [
      { name: 'country', sql: 'ALTER TABLE leagues ADD COLUMN country VARCHAR DEFAULT \'England\'' },
      { name: 'hits', sql: 'ALTER TABLE leagues ADD COLUMN hits INTEGER DEFAULT 0' },
      { name: 'description', sql: 'ALTER TABLE leagues ADD COLUMN description VARCHAR' },
      { name: 'isActive', sql: 'ALTER TABLE leagues ADD COLUMN isActive BOOLEAN DEFAULT TRUE' },
      { name: 'createdBy', sql: 'ALTER TABLE leagues ADD COLUMN createdBy INTEGER' },
      { name: 'createdAt', sql: 'ALTER TABLE leagues ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const col of missingColumns) {
      if (!columns.includes(col.name)) {
        try {
          await db.query(col.sql + ';');
          console.log(`Added column: ${col.name}`);
        } catch (err) {
          console.error(`Failed to add ${col.name}:`, err.message);
        }
      } else {
        console.log(`Column ${col.name} already exists`);
      }
    }

    // Check final schema
    const finalSchema = await db.query('PRAGMA table_info(leagues);');
    console.log('Final columns:', finalSchema.rows.map(row => row.name));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

addMissingColumns();