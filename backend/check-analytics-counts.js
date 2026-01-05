const DatabaseUtils = require('./db/database');

async function checkCounts() {
  const db = new DatabaseUtils();
  
  try {
    const pageViews = await db.query('SELECT COUNT(*) as count FROM page_views');
    console.log('Page views:', pageViews.rows[0].count);
    
    const sessions = await db.query('SELECT COUNT(*) as count FROM user_sessions');
    console.log('User sessions:', sessions.rows[0].count);
    
    const users = await db.query('SELECT COUNT(*) as count FROM users');
    console.log('Total users:', users.rows[0].count);
    
    const admins = await db.query("SELECT COUNT(*) as count FROM users WHERE userType = 'admin'");
    console.log('Admin users:', admins.rows[0].count);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.close();
  }
}

checkCounts();
