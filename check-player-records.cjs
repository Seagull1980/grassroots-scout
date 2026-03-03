const Database = require('./backend/db/database.js');

const db = new Database();

async function checkRecords() {
  try {
    // Get all users
    const users = await db.query('SELECT id, email, role FROM users');
    console.log('=== USERS ===');
    users.rows.forEach(u => {
      console.log(`  ID:${u.id} | Email:${u.email} | Role:${u.role}`);
    });
    
    // Get all player_availability
    const players = await db.query(`
      SELECT 
        id, 
        postedBy, 
        title, 
        locationAddress,
        locationLatitude, 
        locationLongitude,
        status
      FROM player_availability
      ORDER BY id
    `);
    
    console.log('\n=== PLAYER AVAILABILITY ===');
    players.rows.forEach(p => {
      const hasLoc = p.locationLatitude && p.locationLongitude ? 'YES' : 'NO';
      console.log(`  ID:${p.id} | PostedBy:${p.postedBy} | Status:${p.status} | HasLoc:${hasLoc} | Title:${p.title.substring(0, 50)}`);
      if (hasLoc === 'YES') {
        console.log(`       Location: ${p.locationAddress} (${p.locationLatitude}, ${p.locationLongitude})`);
      }
    });
    
    // Check which user is chrisgill.1980@gmail.com
    const chris = await db.query('SELECT id FROM users WHERE email = ?', ['chrisgill.1980@gmail.com']);
    if (chris.rows && chris.rows.length > 0) {
      console.log(`\nChris Gill user ID: ${chris.rows[0].id}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkRecords();
