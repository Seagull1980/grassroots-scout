const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

const info = db.prepare('PRAGMA table_info(users)').all();
console.log('\nUsers table structure:\n');
info.forEach(col => {
  const nullable = col.notnull ? 'NOT NULL' : 'nullable';
  console.log(`  ${col.name.padEnd(15)} | ${col.type.padEnd(10)} | ${nullable}`);
});

db.close();
