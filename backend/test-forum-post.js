const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'forum.db');
const db = new Database(dbPath);

console.log('Testing forum database...\n');

// Check table structure
console.log('Table structure:');
const tableInfo = db.prepare('PRAGMA table_info(forum_posts)').all();
console.log(tableInfo);

// Try to insert a test post
console.log('\nTrying to insert test post...');
try {
  const result = db.prepare(`
    INSERT INTO forum_posts (user_id, user_role, author_name, title, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(1, 'Coach', 'Test User', 'Test Post', 'Test content');
  
  console.log('✅ Insert successful!');
  console.log('Last insert ID:', result.lastInsertRowid);
  
  // Get the post back
  const post = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(result.lastInsertRowid);
  console.log('Post:', post);
} catch (error) {
  console.error('❌ Error inserting:', error.message);
  console.error('Full error:', error);
}

db.close();
