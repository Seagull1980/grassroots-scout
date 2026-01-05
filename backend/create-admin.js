const bcrypt = require('bcryptjs');
const Database = require('./db/database.js');

const createAdmin = async () => {
  const db = new Database();
  
  try {
    // Wait for database to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const email = 'admin@grassrootshub.com';
    const password = 'admin123';
    const firstName = 'Admin';
    const lastName = 'User';
    const role = 'Admin';

    console.log('Creating admin user...');
    
    // Check if admin already exists
    const existingResult = await db.query('SELECT id FROM users WHERE email = ? OR role = ?', [email, 'Admin']);
    if (existingResult.rows.length > 0) {
      console.log('Admin user already exists!');
      console.log('Email: admin@grassrootshub.com');
      console.log('Password: admin123');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin user
    const result = await db.query(
      'INSERT INTO users (email, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, firstName, lastName, role]
    );

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@grassrootshub.com');
    console.log('Password: admin123');
    console.log('User ID:', result.lastID);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    if (db.db) {
      db.db.close();
    }
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(0);
  }
};

createAdmin();
