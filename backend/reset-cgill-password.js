const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./grassroots_hub.db');

console.log('Resetting password for cgill1980@hotmail.com...');

// New password
const newPassword = 'admin123';

// Hash the new password
const hashedPassword = bcrypt.hashSync(newPassword, 12);

// Update the password
db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'cgill1980@hotmail.com'], function(err) {
  if (err) {
    console.error('Error updating password:', err);
  } else if (this.changes === 0) {
    console.log('❌ User not found with email cgill1980@hotmail.com');
  } else {
    console.log('✅ Password reset successfully for cgill1980@hotmail.com');
    console.log('📧 Email: cgill1980@hotmail.com');
    console.log('🔑 New Password: admin123');
    console.log('👤 Role: Admin');
    console.log('');
    console.log('You can now login with these credentials!');
  }
  
  db.close();
});