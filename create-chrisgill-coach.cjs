const Database = require('better-sqlite3');
const crypto = require('crypto');

const db = new Database('./database.sqlite');

// Hash a password for the new user
const plainPassword = 'TestCoach123!';
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(plainPassword, salt, 100000, 64, 'sha512').toString('hex');
const hashedPassword = `${salt}:${hash}`;

// Insert the new user
const stmt = db.prepare(`
  INSERT INTO users (email, password, firstName, lastName, role, createdAt)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`);

try {
  const result = stmt.run('chrisgill.1980@gmail.com', hashedPassword, 'Chris', 'Gill', 'Coach');
  console.log(`✅ Created user: chrisgill.1980@gmail.com`);
  console.log(`   ID: ${result.lastInsertRowid}`);
  console.log(`   Role: Coach`);
  console.log(`   Password: ${plainPassword}`);
  console.log(`\n🔐 Use these credentials to log in:`);
  console.log(`   Email: chrisgill.1980@gmail.com`);
  console.log(`   Password: ${plainPassword}`);
} catch (error) {
  console.error('❌ Error creating user:', error.message);
}

db.close();
