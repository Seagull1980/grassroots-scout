const sqlite3 = require('sqlite3');

console.log('🧹 Cleaning up old simple test users...');

const db = new sqlite3.Database('./database.sqlite');

// Delete the old simple test users
db.run("DELETE FROM users WHERE email IN ('coach@test.com', 'player@test.com', 'parent@test.com')", (err) => {
  if (err) {
    console.error('❌ Error deleting users:', err.message);
  } else {
    console.log('✅ Deleted old simple test users');
  }
  
  db.close();
});
