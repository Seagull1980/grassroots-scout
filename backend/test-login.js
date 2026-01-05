const Database = require('./db/database.js');
const bcrypt = require('bcryptjs');

async function testLogin(email, password) {
  const db = new Database();
  
  try {
    console.log('🧪 Testing login for:', email);
    
    // Get user from database
    const userResult = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return false;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:', user.firstName, user.lastName, '(' + user.role + ')');
    
    // Test password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (isValidPassword) {
      console.log('✅ Password is CORRECT');
      console.log('🔐 Login would succeed for:', email);
      return true;
    } else {
      console.log('❌ Password is INCORRECT');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
    return false;
  } finally {
    if (db.db) {
      db.db.close();
    }
  }
}

// Test the new password
testLogin('cgill1980@hotmail.com', 'admin123');
