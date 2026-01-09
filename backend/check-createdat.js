const Database = require('./db/database');

(async () => {
  const db = new Database();
  
  try {
    await db.initialize();
    
    // Check column names
    console.log('Checking users table columns...');
    const columns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('All columns:', columns.rows.map(r => r.column_name));
    
    // Get sample user data
    const users = await db.query('SELECT * FROM users LIMIT 1');
    if (users.rows.length > 0) {
      console.log('\nSample user keys:', Object.keys(users.rows[0]));
      console.log('\nSample user data:', users.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.close();
    process.exit();
  }
})();
