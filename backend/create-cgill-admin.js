const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = new sqlite3.Database('./database.sqlite');

console.log('Creating cgill1980@hotmail.com as admin user...');

// Check if user already exists
const emailHash = crypto.createHash('sha256').update('cgill1980@hotmail.com').digest('hex');
db.get('SELECT * FROM users WHERE emailHash = ?', [emailHash], (err, user) => {
  if (err) {
    console.error('Error checking user:', err);
    db.close();
    return;
  }
  
  if (user) {
    // User exists, update their role to Admin
    console.log('User exists, updating role to Admin...');
    db.run('UPDATE users SET role = ?, isEmailVerified = ? WHERE emailHash = ?', ['Admin', 1, emailHash], (err) => {
      if (err) {
        console.error('Error updating user role:', err);
      } else {
        console.log('✅ Updated cgill1980@hotmail.com to Admin role');
      }
      db.close();
    });
  } else {
    // User doesn't exist, create new admin user
    console.log('Creating new admin user cgill1980@hotmail.com...');
    const hashedPassword = bcrypt.hashSync('password123', 10);
    
const crypto = require('crypto');

// Generate email hash
const emailHash = crypto.createHash('sha256').update('cgill1980@hotmail.com').digest('hex');

db.run(`INSERT INTO users (email, emailHash, password, firstName, lastName, role, isEmailVerified) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [
  'cgill1980@hotmail.com',
  emailHash,
  hashedPassword,
  'Chris',
  'Gill',
  'Admin',
  1
], function(err) {
      if (err) {
        console.error('Error creating admin user:', err);
      } else {
        console.log('✅ Created admin user cgill1980@hotmail.com');
        console.log('📧 Email: cgill1980@hotmail.com');
        console.log('🔑 Password: password123');
        console.log('👤 Role: Admin');
      }
      db.close();
    });
  }
});