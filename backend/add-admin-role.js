const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Adding Admin role to database schema...');

// First, let's create a new table with Admin role
db.serialize(() => {
  // Create a new table with the updated schema
  db.run(`CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Coach', 'Player', 'Parent/Guardian', 'Admin')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    isVerified INTEGER DEFAULT 0
  )`, (err) => {
    if (err) {
      console.error('Error creating new table:', err);
      return;
    }
    console.log('✅ Created new users table with Admin role');
    
    // Copy data from old table
    db.run(`INSERT INTO users_new (id, email, password, firstName, lastName, role, createdAt)
            SELECT id, email, password, firstName, lastName, role, createdAt FROM users`, (err) => {
      if (err) {
        console.error('Error copying data:', err);
        return;
      }
      console.log('✅ Copied existing users');
      
      // Drop old table and rename new one
      db.run('DROP TABLE users', (err) => {
        if (err) {
          console.error('Error dropping old table:', err);
          return;
        }
        
        db.run('ALTER TABLE users_new RENAME TO users', (err) => {
          if (err) {
            console.error('Error renaming table:', err);
            return;
          }
          
          console.log('✅ Updated users table schema');
          
          // Now create an admin user
          const bcrypt = require('bcryptjs');
          const hashedPassword = bcrypt.hashSync('admin123', 10);
          
          db.run(`INSERT INTO users (email, password, firstName, lastName, role, isVerified) 
                  VALUES (?, ?, ?, ?, ?, ?)`, [
            'admin@test.com',
            hashedPassword,
            'Admin',
            'User',
            'Admin',
            1
          ], function(err) {
            if (err) {
              console.error('Error creating admin user:', err);
            } else {
              console.log('✅ Admin user created!');
              console.log('📧 Email: admin@test.com');
              console.log('🔑 Password: admin123');
              console.log('👤 Role: Admin');
            }
            db.close();
          });
        });
      });
    });
  });
});