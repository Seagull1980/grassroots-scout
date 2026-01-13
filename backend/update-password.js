const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database.sqlite');

const emailHash = '14a36a7e3a554f657c8b936b9908ef4156355f1c209a234fe663d8ee7e16cdb1';
const newPassword = 'password123';
const hashedPassword = bcrypt.hashSync(newPassword, 10);

db.run('UPDATE users SET password = ? WHERE emailHash = ?', [hashedPassword, emailHash], (err) => {
  if (err) {
    console.error('Error updating password:', err);
  } else {
    console.log('Password updated to password123');
  }
  db.close();
});