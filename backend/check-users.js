const Database = require('./db/database.js');

async function checkUsers() {
  const db = new Database();
  
  try {
    console.log('🔍 Checking all users in the database...\n');
    
    const result = await db.query('SELECT id, email, firstName, lastName, role, createdAt FROM users ORDER BY createdAt DESC');
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in the database');
    } else {
      console.log(`✅ Found ${result.rows.length} users:\n`);
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('');
      });
    }
    
    // Check specifically for cgill1980@hotmail.com
    console.log('🔍 Checking for cgill1980@hotmail.com...\n');
    const cgillResult = await db.query('SELECT * FROM users WHERE email = ?', ['cgill1980@hotmail.com']);
    
    if (cgillResult.rows.length > 0) {
      const user = cgillResult.rows[0];
      console.log('✅ Found cgill1980@hotmail.com:');
      console.log(`   Current Role: ${user.role}`);
      console.log(`   User ID: ${user.id}`);
      
      if (user.role !== 'Admin') {
        console.log('\n🔧 User needs to be promoted to Admin');
      } else {
        console.log('\n✅ User is already an Admin');
      }
    } else {
      console.log('❌ cgill1980@hotmail.com not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await db.close();
  }
}

checkUsers();
