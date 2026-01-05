const Database = require('better-sqlite3');
const db = new Database('./forum.db');

console.log('\n=== Forum Database Structure ===\n');

// Check tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

// Check forum_posts structure
try {
  const columns = db.prepare('PRAGMA table_info(forum_posts)').all();
  console.log('\nforum_posts columns:', columns);
  
  // Try to insert a test post
  console.log('\nTrying to insert test post...');
  const result = db.prepare(`
    INSERT INTO forum_posts (user_id, user_role, author_name, title, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(1, 'Coach', 'Test User', 'Test Title', 'Test Content');
  
  console.log('Insert successful! ID:', result.lastInsertRowid);
  
  // Retrieve the post
  const post = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(result.lastInsertRowid);
  console.log('Retrieved post:', post);
  
  // Clean up
  db.prepare('DELETE FROM forum_posts WHERE id = ?').run(result.lastInsertRowid);
  console.log('Test post deleted');
  
} catch (error) {
  console.error('Error:', error.message);
}

db.close();
