const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Adding beta access column to users table...');

db.serialize(() => {
  // Check if column exists
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('❌ Error checking table structure:', err);
      db.close();
      return;
    }

    const hasBetaAccess = columns.some(col => col.name === 'betaAccess');

    if (hasBetaAccess) {
      console.log('✅ betaAccess column already exists');
      db.close();
      return;
    }

    // Add betaAccess column
    db.run(`ALTER TABLE users ADD COLUMN betaAccess BOOLEAN DEFAULT 0`, (err) => {
      if (err) {
        console.error('❌ Error adding betaAccess column:', err);
        db.close();
        return;
      }
      
      console.log('✅ Added betaAccess column to users table');

      // Enable beta access for all existing users (grandfather them in)
      db.run(`UPDATE users SET betaAccess = 1`, (err) => {
        if (err) {
          console.error('❌ Error enabling beta access for existing users:', err);
        } else {
          console.log('✅ Enabled beta access for all existing users');
        }

        // Enable beta access for admin users
        db.run(`UPDATE users SET betaAccess = 1 WHERE role = 'Admin'`, (err) => {
          if (err) {
            console.error('❌ Error enabling beta access for admins:', err);
          } else {
            console.log('✅ Ensured all admins have beta access');
          }
          
          db.close();
          console.log('✅ Migration complete!');
        });
      });
    });
  });
});
