const Database = require('./db/database.js');
const bcrypt = require('bcryptjs');

async function createUserAdmin() {
  const db = new Database();
  
  try {
    const email = 'cgill1980@hotmail.com';
    const password = 'admin123';
    const firstName = 'Chris';
    const lastName = 'Gill';
    
    console.log(`🔧 Creating admin user: ${email}...`);
    
    // Check if user already exists
    const userResult = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    
    if (userResult.rows.length > 0) {
      console.log('✅ User already exists, updating to Admin role');
      await db.query('UPDATE users SET role = ? WHERE email = ?', ['Admin', email]);
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create the user
      await db.query(
        'INSERT INTO users (email, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, firstName, lastName, 'Admin']
      );
    }
    
    console.log('✅ Admin user created/updated successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await db.close();
  }
}

createUserAdmin();
