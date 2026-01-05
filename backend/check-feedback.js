const Database = require('./db/database');

async function checkFeedbackTables() {
  const db = new Database('./backend/database.sqlite');
  
  try {
    console.log('Checking feedback tables...\n');
    
    // Check if tables exist
    const tables = await db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND (name='user_feedback' OR name='feedback_comments')
      ORDER BY name
    `);
    
    console.log('Feedback tables found:', tables.rows.length > 0 ? 'YES' : 'NO');
    tables.rows.forEach(row => {
      console.log(' -', row.name);
    });
    
    if (tables.rows.length > 0) {
      // Get schema for user_feedback
      const feedbackSchema = await db.query(`PRAGMA table_info(user_feedback)`);
      console.log('\nuser_feedback columns:');
      feedbackSchema.rows.forEach(col => {
        console.log(` - ${col.name}: ${col.type}`);
      });
      
      // Get schema for feedback_comments
      const commentsSchema = await db.query(`PRAGMA table_info(feedback_comments)`);
      console.log('\nfeedback_comments columns:');
      commentsSchema.rows.forEach(col => {
        console.log(` - ${col.name}: ${col.type}`);
      });
      
      // Get count
      const feedbackResult = await db.query('SELECT COUNT(*) as count FROM user_feedback');
      const commentsResult = await db.query('SELECT COUNT(*) as count FROM feedback_comments');
      console.log('\nRecords:');
      console.log(' - user_feedback:', feedbackResult.rows[0].count);
      console.log(' - feedback_comments:', commentsResult.rows[0].count);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.close();
  }
}

checkFeedbackTables();
