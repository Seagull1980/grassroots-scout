const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'forum.db');
const db = new Database(dbPath);

console.log('Checking forum database for constraints...\n');

// Check for triggers
console.log('Triggers:');
const triggers = db.prepare("SELECT * FROM sqlite_master WHERE type='trigger'").all();
console.log(triggers.length ? triggers : 'No triggers found');

// Check for foreign key list
console.log('\nForeign keys:');
const foreignKeys = db.prepare('PRAGMA foreign_key_list(forum_posts)').all();
console.log(foreignKeys.length ? foreignKeys : 'No foreign keys found');

// Check foreign key enforcement
console.log('\nForeign key enforcement:');
const fkStatus = db.prepare('PRAGMA foreign_keys').get();
console.log(fkStatus);

// Check all tables
console.log('\nAll tables:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

db.close();
