const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';
const db = new sqlite3.Database('./database.sqlite');

// Function to create a fresh admin token
const createAdminToken = async (email) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'Admin'], (err, user) => {
      if (err) {
        console.error('Database error:', err);
        reject(err);
        return;
      }
      
      if (!user) {
        console.log('No admin user found with email:', email);
        reject(new Error('Admin user not found'));
        return;
      }
      
      console.log('Found admin user:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });
      
      // Create JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      console.log('\n=== ADMIN TOKEN ===');
      console.log('Token:', token);
      console.log('\nTo use this token:');
      console.log('1. Open browser developer tools (F12)');
      console.log('2. Go to Application/Storage tab');
      console.log('3. Find localStorage for localhost:5173');
      console.log('4. Set token =', token);
      console.log('5. Set user =', JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      }));
      console.log('6. Refresh the page');
      
      resolve({
        token: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          createdAt: user.createdAt
        }
      });
      
      db.close();
    });
  });
};

// Create admin token for cgill1980@hotmail.com
createAdminToken('cgill1980@hotmail.com')
  .catch(err => {
    console.error('Error:', err);
    // Try with admin@grassrootshub.com as fallback
    return createAdminToken('admin@grassrootshub.com');
  })
  .catch(err => {
    console.error('Error with both admin accounts:', err);
    process.exit(1);
  });