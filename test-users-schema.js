import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'database.sqlite'));

// Get table info
console.log('\n=== TABLE SCHEMA ===');
const schema = db.prepare("PRAGMA table_info(users)").all();
schema.forEach(col => {
  console.log(`${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'nullable'}`);
});

// Get all users
console.log('\n=== ALL USERS ===');
const users = db.prepare('SELECT * FROM users').all();
console.log(`Found ${users.length} users:`);
users.forEach(user => {
  console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
});

// Get specific user
if (users.length > 0) {
  console.log('\n=== SAMPLE USER (first user) ===');
  const sampleUser = users[0];
  console.log(JSON.stringify(sampleUser, null, 2));
}

db.close();
