const Database = require('./db/database');
const db = new Database();

async function findUser() {
  try {
    const email = 'gemf1981@hotmail.co.uk';
    const result = await db.query(
      'SELECT id, email, firstName, lastName, role, betaAccess FROM users WHERE email = ?',
      [email]
    );
    
    if (result.rows && result.rows.length > 0) {
      const user = result.rows[0];
      console.log('\n=== User Found ===');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Name:', user.firstName, user.lastName);
      console.log('Role:', user.role);
      console.log('Beta Access:', user.betaAccess);
      console.log('Beta Access Type:', typeof user.betaAccess);
      console.log('==================\n');
    } else {
      console.log('\nUser not found with email:', email);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error finding user:', error);
    process.exit(1);
  }
}

findUser();
