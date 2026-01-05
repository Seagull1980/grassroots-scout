const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'forum.db');
const db = new Database(dbPath);

console.log('Recreating forum_posts table without foreign keys...\n');

// Disable foreign key enforcement
db.pragma('foreign_keys = OFF');

// Drop the existing table
console.log('Dropping old table...');
db.exec('DROP TABLE IF EXISTS forum_posts');

// Recreate without foreign key
console.log('Creating new table without foreign key constraint...');
db.exec(`
  CREATE TABLE forum_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_role TEXT NOT NULL,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
  )
`);

// Verify
console.log('\nVerifying new table structure:');
const foreignKeys = db.prepare('PRAGMA foreign_key_list(forum_posts)').all();
console.log('Foreign keys:', foreignKeys.length ? foreignKeys : 'None - Success!');

console.log('\nTable structure:');
const tableInfo = db.prepare('PRAGMA table_info(forum_posts)').all();
tableInfo.forEach(col => {
  console.log(`  ${col.name} (${col.type})`);
});

// Test insert
console.log('\nTesting insert...');
try {
  const result = db.prepare(`
    INSERT INTO forum_posts (user_id, user_role, author_name, title, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(1, 'Coach', 'Test User', 'Test Post', 'Test content');
  
  console.log('✅ Insert successful! Post ID:', result.lastInsertRowid);
  
  const post = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(result.lastInsertRowid);
  console.log('Post:', post);
} catch (error) {
  console.error('❌ Error:', error.message);
}

db.close();
console.log('\n✅ Database recreated successfully!');
