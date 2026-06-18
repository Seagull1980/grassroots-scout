const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
// Apply all .sql files in this directory in lexical order
try {
  const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found.');
    process.exit(0);
  }

  const db = new Database(dbPath);

  for (const file of files) {
    const migrationPath = path.resolve(__dirname, file);
    console.log('Applying migration:', file);
    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
    } catch (err) {
      // Log and continue on recoverable errors like duplicate column
      console.warn(`Warning applying ${file}:`, err.message || err);
      continue;
    }
  }

  db.close();
  console.log('All migrations applied successfully');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
