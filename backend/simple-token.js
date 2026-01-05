const jwt = require('jsonwebtoken');
const JWT_SECRET = 'grassroots-hub-secret-key';

// Admin user data (from our database)
const adminUser = {
  id: 2,
  email: 'cgill1980@hotmail.com',
  firstName: 'Chris',
  lastName: 'Gill',
  role: 'Admin',
  createdAt: '2025-08-06 22:31:00'
};

// Generate token
const token = jwt.sign(
  { 
    userId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('🔑 ADMIN TOKEN:');
console.log(token);

console.log('\n👤 USER DATA:');
console.log(JSON.stringify(adminUser));

console.log('\n📋 BROWSER LOCAL STORAGE SETUP:');
console.log('=====================================');
console.log('1. Open DevTools (F12) in your browser');
console.log('2. Go to Application → Local Storage → http://localhost:5173');
console.log('3. Add these two keys:');
console.log('\nKey: token');
console.log('Value: ' + token);
console.log('\nKey: user'); 
console.log('Value: ' + JSON.stringify(adminUser));
console.log('\n4. Refresh the page and try analytics!');
console.log('=====================================');