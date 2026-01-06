const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Database = require('./db/database.js');
require('dotenv').config();

const createProductionAdmin = async () => {
  const db = new Database();
  
  try {
    await db.createTables();
    console.log('✅ Database tables ready');
    
    // Admin account details
    const email = 'cgill1980@hotmail.com';
    const password = 'GrassrootsAdmin2026!';  // CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN
    const firstName = 'Chris';
    const lastName = 'Gill';
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create email hash
    const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
    
    // Check if admin already exists
    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    
    if (existing.rows && existing.rows.length > 0) {
      console.log('⚠️  Admin account already exists - updating password and permissions...');
      await db.query(
        `UPDATE users 
         SET password = ?, 
             role = 'Admin', 
             isEmailVerified = 1, 
             betaAccess = 1,
             betaAccessApproved = 1,
             isBlocked = 0
         WHERE email = ?`,
        [hashedPassword, email]
      );
      console.log('✅ Admin account updated successfully');
    } else {
      console.log('📝 Creating new admin account...');
      await db.query(
        `INSERT INTO users (email, emailHash, password, firstName, lastName, role, isEmailVerified, betaAccess, betaAccessApproved, isBlocked)
         VALUES (?, ?, ?, ?, ?, 'Admin', 1, 1, 1, 0)`,
        [email, emailHash, hashedPassword, firstName, lastName]
      );
      console.log('✅ Admin account created successfully');
    }
    
    console.log('\n=== ADMIN LOGIN CREDENTIALS ===');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('⚠️  CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');
    console.log('================================\n');
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  }
};

createProductionAdmin();
