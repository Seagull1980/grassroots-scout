const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
const migrationPath = path.resolve(__dirname, '20260618_add_share_name_to_child_player_availability.sql');

try {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const db = new Database(dbPath);
  db.exec(sql);
  db.close();
  console.log('Migration applied successfully');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
