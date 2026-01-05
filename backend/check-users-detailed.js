const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./database.sqlite');

console.log('🔍 Checking test users in database...\n');

db.all("SELECT email, role, password FROM users WHERE email LIKE '%test.com' ORDER BY email", (err, rows) => {
  if (err) {
    console.error('❌ Database error:', err);
  } else {
    console.log('📧 Test users found:');
    console.log('===================');
    
    if (rows.length === 0) {
      console.log('❌ No test users found!');
    } else {
      rows.forEach((row, index) => {
        console.log(`${index + 1}. Email: ${row.email}`);
        console.log(`   Role: ${row.role}`);
        console.log(`   Password hash: ${row.password.substring(0, 30)}...`);
        console.log(`   Hash type: ${row.password.startsWith('$2b$') ? 'bcrypt' : 'other'}`);
        
        // Test password verification
        try {
          const isValid = bcrypt.compareSync('test123', row.password);
          console.log(`   Password 'test123' valid: ${isValid ? '✅ YES' : '❌ NO'}`);
        } catch (e) {
          console.log(`   Password verification error: ${e.message}`);
        }
        console.log('');
      });
    }
  }
  
  db.close();
});
