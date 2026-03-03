const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

// Force sync to disk
db.exec('PRAGMA wal_checkpoint(RESTART);');

// Get all users again  
const allUsers = db.prepare('SELECT id, email, role, createdAt FROM users ORDER BY createdAt DESC').all();
console.log(`\n=== All Users (${allUsers.length} total) ===\n`);
allUsers.forEach(u => {
  console.log(`ID: ${u.id.toString().padEnd(2)} | Email: ${u.email.padEnd(30)} | Role: ${u.role.padEnd(6)} | Created: ${u.createdAt}`);
});

// Count total users
const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
console.log(`\nTotal count from COUNT(*): ${count.c}`);

// Check user IDs - are they sequential or gaps?
const ids = db.prepare('SELECT id FROM users ORDER BY id').all();
console.log(`\nUser IDs in database: ${ids.map(u => u.id).join(', ')}`);

db.close();
