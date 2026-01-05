const Database = require('./db/database.js');

async function manualCleanup() {
  const db = new Database();
  
  try {
    console.log('🧹 Manual cleanup...\n');
    
    // Check current users
    const allUsers = await db.query('SELECT id, email FROM users');
    console.log('All users:', allUsers.rows);
    
    // Try to delete each test user individually
    const testEmails = [
      'coach1@test.com', 'coach2@test.com', 'coach3@test.com', 'coach4@test.com',
      'player1@test.com', 'player2@test.com', 'player3@test.com', 'player4@test.com',
      'player5@test.com', 'player6@test.com', 'player7@test.com', 'player8@test.com',
      'parent1@test.com', 'parent2@test.com', 'parent3@test.com'
    ];
    
    for (const email of testEmails) {
      try {
        const result = await db.query('DELETE FROM users WHERE email = ?', [email]);
        if (result.changes > 0) {
          console.log(`   ✅ Deleted user: ${email}`);
        }
      } catch (error) {
        console.log(`   ❌ Error deleting ${email}:`, error.message);
      }
    }
    
    console.log('\n✅ Manual cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during manual cleanup:', error);
  } finally {
    await db.close();
  }
}

manualCleanup();
