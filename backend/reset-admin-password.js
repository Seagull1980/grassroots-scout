const Database = require('./db/database.js');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const db = new Database();
  
  try {
    const email = 'cgill1980@hotmail.com';
    const newPassword = 'admin123'; // You can change this
    
    console.log(`🔧 Resetting password for ${email}...`);
    
    // Check if user exists
    const userResult = await db.query('SELECT id, role FROM users WHERE email = ?', [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ Found user (ID: ${user.id}, Role: ${user.role})`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
    
    console.log('✅ Password updated successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log('\n🚀 You can now log in with these credentials');
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await db.close();
  }
}

resetAdminPassword();
