const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.sqlite');

db.run(`UPDATE users SET email = "cgill1980@hotmail.com" WHERE emailHash = "14a36a7e3a554f657c8b936b9908ef4156355f1c209a234fe663d8ee7e16cdb1"`, (err) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Updated email to plain text');
  }
  db.close();
});