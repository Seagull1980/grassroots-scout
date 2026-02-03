import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkAdmins() {
  try {
    await client.connect();
    const result = await client.query("SELECT id, email, role, firstname FROM users WHERE role = 'Admin' ORDER BY id");
    console.log('Admin users found:', result.rows.length);
    result.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Email: ${row.email}, Name: ${row.firstname}`);
    });
    
    if (result.rows.length === 0) {
      console.log('\n⚠️  No admin users found in database');
    }
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAdmins();
