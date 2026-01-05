const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'database.sqlite');

async function createAdminUser() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err);
        reject(err);
        return;
      }
      console.log('🔧 Creating admin user...');
    });

    // Check if admin already exists
    db.get('SELECT * FROM users WHERE email = ?', ['admin@grassrootshub.com'], async (err, existingAdmin) => {
      if (err) {
        console.error('❌ Error checking for existing admin:', err);
        db.close();
        reject(err);
        return;
      }

      try {
        if (existingAdmin) {
          console.log('⚠️  Admin user already exists with email: admin@grassrootshub.com');
          
          // Update password for existing admin
          const hashedPassword = await bcrypt.hash('admin123', 10);
          
          db.run(
            'UPDATE users SET password = ?, isEmailVerified = 1, role = ? WHERE email = ?',
            [hashedPassword, 'Admin', 'admin@grassrootshub.com'],
            function(updateErr) {
              if (updateErr) {
                console.error('❌ Error updating admin user:', updateErr);
                db.close();
                reject(updateErr);
                return;
              }
              
              console.log('✅ Admin user password updated successfully');
              console.log('📧 Email: admin@grassrootshub.com');
              console.log('🔑 Password: admin123');
              console.log('👑 Role: Admin');
              
              db.close();
              resolve();
            }
          );
        } else {
          // Hash the password
          const hashedPassword = await bcrypt.hash('admin123', 10);
          
          // Insert admin user
          db.run(
            `INSERT INTO users (
              firstName, 
              lastName, 
              email, 
              password, 
              role, 
              isEmailVerified, 
              createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              'Admin',
              'User',
              'admin@grassrootshub.com',
              hashedPassword,
              'Admin',
              1, // Email verified
              new Date().toISOString()
            ],
            function(insertErr) {
              if (insertErr) {
                console.error('❌ Error creating admin user:', insertErr);
                db.close();
                reject(insertErr);
                return;
              }

              console.log('✅ Admin user created successfully!');
              console.log('📧 Email: admin@grassrootshub.com');
              console.log('🔑 Password: admin123');
              console.log('👑 Role: Admin');
              console.log(`🆔 User ID: ${this.lastID}`);
              
              db.close();
              resolve();
            }
          );
        }
      } catch (hashError) {
        console.error('❌ Error hashing password:', hashError);
        db.close();
        reject(hashError);
      }
    });
  });
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('🎉 Admin user setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  });
