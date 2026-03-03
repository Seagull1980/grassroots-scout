const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

// Get all users
const allUsers = db.prepare('SELECT id, email, role FROM users ORDER BY id').all();
console.log('=== All Users in Database ===');
allUsers.forEach(u => {
  const playerCount = db.prepare('SELECT COUNT(*) as c FROM player_availability WHERE postedBy = ?').get(u.id);
  console.log(`  ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Player Records: ${playerCount.c}`);
});

// Search for the email from the logs
const emailToFind = 'chrisgill.1980@gmail.com';
const found = db.prepare('SELECT * FROM users WHERE email = ?').get(emailToFind);
console.log(`\nSearch for "${emailToFind}": ${found ? 'FOUND' : 'NOT FOUND'}`);
if (found) {
  console.log(JSON.stringify(found, null, 2));
}

// List all distinct emails in users table
const emails = db.prepare('SELECT DISTINCT email FROM users ORDER BY email').all();
console.log('\n=== All Emails in Database ===');
emails.forEach(e => console.log(`  ${e.email}`));

db.close();
