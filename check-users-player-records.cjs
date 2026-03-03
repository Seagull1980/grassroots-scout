const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

const users = db.prepare('SELECT id, email, role FROM users ORDER BY id').all();
console.log('\nUsers in database:');
users.forEach(u => {
  console.log(`  ID: ${u.id}, Email: ${u.email}, Role: ${u.role}`);
});

// Now check if logged in user (probably cgill@gmail.com or test-coach) has player availability records
console.log('\n');
const testUsers = ['cgill@gmail.com', 'test-coach@example.com', 'coach@example.com', 'player@example.com'];
testUsers.forEach(email => {
  const user = users.find(u => u.email === email);
  if (user) {
    const count = db.prepare('SELECT COUNT(*) as count FROM player_availability WHERE postedBy = ?').get(user.id);
    console.log(`User "${email}" (ID:${user.id}, Role:${user.role}) has ${count.count} player availability records`);
  }
});

db.close();
