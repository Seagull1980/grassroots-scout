const DatabaseUtils = require('./db/database');

async function clearAnalyticsData() {
  const db = new DatabaseUtils();
  
  try {
    console.log('Clearing analytics test data...\n');
    
    // Clear page views
    const pageViewsResult = await db.query('DELETE FROM page_views');
    console.log(`✓ Cleared ${pageViewsResult.changes || 0} page views`);
    
    // Clear user sessions
    const sessionsResult = await db.query('DELETE FROM user_sessions');
    console.log(`✓ Cleared ${sessionsResult.changes || 0} user sessions`);
    
    // Clear analytics events if table exists
    try {
      const eventsResult = await db.query('DELETE FROM analytics_events');
      console.log(`✓ Cleared ${eventsResult.changes || 0} analytics events`);
    } catch (err) {
      console.log('  (analytics_events table does not exist - skipping)');
    }
    
    console.log('\n✓ Analytics data cleared successfully!');
    console.log('\nNote: User accounts, teams, and other core data remain intact.');
    
  } catch (error) {
    console.error('Error clearing analytics data:', error);
  } finally {
    await db.close();
  }
}

clearAnalyticsData();
