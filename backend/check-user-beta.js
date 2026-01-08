const Database = require('./db/database');
const db = new Database();

async function checkUserBeta() {
  try {
    const userId = 4;
    const result = await db.query(
      'SELECT id, email, firstName, lastName, role, betaAccess FROM users WHERE id = ?',
      [userId]
    );
    
    if (result.rows && result.rows.length > 0) {
      const user = result.rows[0];
      console.log('\n=== User Beta Access Check ===');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Name:', user.firstName, user.lastName);
      console.log('Role:', user.role);
      console.log('Beta Access:', user.betaAccess);
      console.log('Beta Access Type:', typeof user.betaAccess);
      console.log('Beta Access Value (strict):', JSON.stringify(user.betaAccess));
      console.log('\n=== Middleware Check ===');
      const willPass = user.betaAccess === true || user.betaAccess === 1 || user.betaAccess === '1' || user.role === 'Admin';
      console.log('Will pass middleware?', willPass);
      console.log('  - betaAccess === true:', user.betaAccess === true);
      console.log('  - betaAccess === 1:', user.betaAccess === 1);
      console.log('  - betaAccess === "1":', user.betaAccess === '1');
      console.log('  - role === "Admin":', user.role === 'Admin');
      console.log('==============================\n');
      
      if (!willPass) {
        console.log('❌ USER WILL BE DENIED ACCESS');
        console.log('\nAttempting to update beta access...\n');
        
        await db.query('UPDATE users SET betaAccess = ? WHERE id = ?', [1, userId]);
        console.log('✅ Updated betaAccess to 1');
        
        // Check again
        const checkResult = await db.query('SELECT betaAccess FROM users WHERE id = ?', [userId]);
        const newValue = checkResult.rows[0].betaAccess;
        console.log('New betaAccess value:', newValue);
        console.log('New betaAccess type:', typeof newValue);
      } else {
        console.log('✅ USER SHOULD HAVE ACCESS');
      }
    } else {
      console.log('\nUser not found with ID:', userId);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking user:', error);
    process.exit(1);
  }
}

checkUserBeta();
