const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const db = new sqlite3.Database('./database.sqlite');
const shouldShowToken = process.argv.includes('--show-token');

console.log('🔍 Debugging authentication for cgill1980@hotmail.com...\n');

// Check user in database
db.get('SELECT * FROM users WHERE email = ?', ['cgill1980@hotmail.com'], (err, user) => {
  if (err) {
    console.error('❌ Database error:', err);
    db.close();
    return;
  }

  if (!user) {
    console.log('❌ User not found in database');
    db.close();
    return;
  }

  console.log('✅ User found in database:');
  console.log('📧 Email:', user.email);
  console.log('👤 Role:', user.role);  
  console.log('🆔 ID:', user.id);
  console.log('📅 Created:', user.createdAt);
  console.log('✉️ Email Verified:', user.isEmailVerified);

  // Test password
  const testPassword = 'admin123';
  const passwordMatch = bcrypt.compareSync(testPassword, user.password);
  console.log('🔑 Password test (admin123):', passwordMatch ? '✅ Correct' : '❌ Wrong');

  // Generate a fresh token
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
  console.log('\n🎫 Fresh JWT token generated');
  if (shouldShowToken) {
    console.log(token);
  } else {
    console.log('Token output hidden by default. Re-run with --show-token to print it.');
  }

  // Verify the token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('\n✅ Token verification successful:');
    console.log('🆔 User ID:', decoded.userId);
    console.log('📧 Email:', decoded.email);
    console.log('👤 Role:', decoded.role);
    console.log('⏰ Expires:', new Date(decoded.exp * 1000));
  } catch (tokenErr) {
    console.log('❌ Token verification failed:', tokenErr.message);
  }

  db.close();
});