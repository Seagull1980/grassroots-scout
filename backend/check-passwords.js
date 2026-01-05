const sqlite3 = require('sqlite3');

console.log('🔍 Checking test users and their passwords...');

const db = new sqlite3.Database('./database.sqlite');

db.all("SELECT email, role, password FROM users WHERE email LIKE '%test.com' OR email = 'admin@grassrootshub.com'", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log('\n📧 Test users found:');
    console.log('===================');
    
    if (rows.length === 0) {
      console.log('❌ No test users found!');
    } else {
      rows.forEach(user => {
        console.log(`✅ ${user.email} (${user.role})`);
        console.log(`   Password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'NO PASSWORD'}`);
        console.log('');
      });
    }
  }
  
  db.close();
});
