const jwt = require('jsonwebtoken');
const DatabaseUtils = require('./utils/dbUtils.js');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'grassroots-hub-secret-key';
const db = new DatabaseUtils();

async function testAdminLogin() {
  try {
    console.log('🔍 Testing admin login and token generation...');
    
    // Get the admin user we created
    const adminUser = await db.getOne('SELECT * FROM users WHERE email = ?', ['cgill1980@hotmail.com']);
    
    if (!adminUser) {
      console.error('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Found admin user:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    });
    
    // Create a valid JWT token
    const token = jwt.sign(
      { 
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('\n🔑 Generated admin token:');
    console.log(token);
    
    // Decode the token to verify contents
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('\n🔍 Token contents:', decoded);
    
    // Instructions for manual testing
    console.log('\n📋 COPY THESE VALUES TO BROWSER LOCAL STORAGE:');
    console.log('=====================================');
    console.log('\n1. Open DevTools (F12) → Application → Local Storage → http://localhost:5173');
    console.log('\n2. Add/Update these keys:');
    console.log('\nKey: token');
    console.log(`Value: ${token}`);
    
    console.log('\nKey: user');
    console.log(`Value: ${JSON.stringify({
      id: adminUser.id,
      email: adminUser.email,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      role: adminUser.role,
      createdAt: adminUser.createdAt
    })}`);
    
    console.log('\n3. Refresh the page and try analytics again');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAdminLogin();