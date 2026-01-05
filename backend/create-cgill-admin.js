const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database.sqlite');

console.log('Creating cgill1980@hotmail.com as admin user...');

// Check if user already exists
db.get('SELECT * FROM users WHERE email = ?', ['cgill1980@hotmail.com'], (err, user) => {
  if (err) {
    console.error('Error checking user:', err);
    db.close();
    return;
  }
  
  if (user) {
    // User exists, update their role to Admin
    console.log('User exists, updating role to Admin...');
    db.run('UPDATE users SET role = ? WHERE email = ?', ['Admin', 'cgill1980@hotmail.com'], (err) => {
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
    
    db.run(`INSERT INTO users (email, password, firstName, lastName, role, isVerified) 
            VALUES (?, ?, ?, ?, ?, ?)`, [
      'cgill1980@hotmail.com',
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