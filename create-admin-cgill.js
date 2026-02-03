import pkg from 'pg';
import bcryptjs from 'bcryptjs';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function createAdmin() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Check if admin exists
    const existing = await client.query(
      "SELECT * FROM users WHERE email = $1",
      ['cgill1980@hotmail.com']
    );
    
    if (existing.rows.length > 0) {
      console.log('⚠️  User already exists with email cgill1980@hotmail.com');
      console.log('User ID:', existing.rows[0].id, 'Role:', existing.rows[0].role);
      
      // Update to admin if not already
      if (existing.rows[0].role !== 'Admin') {
        await client.query(
          "UPDATE users SET role = $1 WHERE email = $2",
          ['Admin', 'cgill1980@hotmail.com']
        );
        console.log('✅ Updated user role to Admin');
      }
      return;
    }
    
    // Create admin account
    const hashedPassword = bcryptjs.hashSync('TempPassword123!', 10);
    
    const result = await client.query(
      `INSERT INTO users (email, password, firstname, lastname, role, betaAccess, emailVerified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, role`,
      ['cgill1980@hotmail.com', hashedPassword, 'Chris', 'Gill', 'Admin', true, true]
    );
    
    console.log('✅ Admin account created successfully');
    console.log('Email:', result.rows[0].email);
    console.log('Role:', result.rows[0].role);
    console.log('ID:', result.rows[0].id);
    console.log('\n⚠️  Temporary password: TempPassword123!');
    console.log('Please change this password after first login');
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
