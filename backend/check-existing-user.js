const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.sqlite');

const emailHash = '14a36a7e3a554f657c8b936b9908ef4156355f1c209a234fe663d8ee7e16cdb1';

db.all('SELECT id, email, emailHash, firstName, lastName, role FROM users WHERE emailHash = ?', [emailHash], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Users with this emailHash:', rows);
  }
  db.close();
});