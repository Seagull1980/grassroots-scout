const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

// Get fresh listing
const allUsers = db.prepare('SELECT id, email, role FROM users ORDER BY id').all();
console.log(`\n=== Total Users: ${allUsers.length} ===\n`);
allUsers.forEach(u => {
  console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role}`);
});

// Specific search
console.log('\n=== Searching for specific email ===');
const specific = db.prepare('SELECT id, email, role FROM users WHERE LOWER(email) LIKE LOWER("%chrisgill%")').all();
console.log(`Found ${specific.length} records matching "chrisgill":`);
specific.forEach(u => console.log(`  ID: ${u.id} | Email: ${u.email} | Role: ${u.role}`));

// Check if there's a case sensitivity issue  
const cgill = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get('chrisgill.1980@gmail.com');
console.log(`\nExact match for 'chrisgill.1980@gmail.com': ${cgill ? 'FOUND' : 'NOT FOUND'}`);
if (cgill) console.log(`  ${JSON.stringify(cgill)}`);

db.close();
