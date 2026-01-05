const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Creating test coach user for map data...\n');

try {
  // Check if coach user exists
  const existingUser = db.prepare("SELECT id, email, role FROM users WHERE role = 'coach' LIMIT 1").get();
  
  if (existingUser) {
    console.log('✓ Coach user already exists:');
    console.log(`  ID: ${existingUser.id}`);
    console.log(`  Email: ${existingUser.email}`);
    console.log(`  Role: ${existingUser.role}`);
  } else {
    // Create a test coach user
    const hashedPassword = bcrypt.hashSync('TestPass123!', 10);
    
    const result = db.prepare(`
      INSERT INTO users (email, password, firstName, lastName, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'testcoach@grassrootshub.com',
      hashedPassword,
      'Test',
      'Coach',
      'coach',
      new Date().toISOString()
    );
    
    console.log('✓ Created test coach user:');
    console.log(`  ID: ${result.lastInsertRowid}`);
    console.log(`  Email: testcoach@grassrootshub.com`);
    console.log(`  Password: TestPass123!`);
    console.log(`  Role: coach`);
  }
  
  console.log('\n✓ Ready to add team vacancies!');
  
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  db.close();
}
