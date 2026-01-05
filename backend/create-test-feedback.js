const Database = require('./db/database');

async function createTestFeedback() {
  const db = new Database();
  db.db = new (require('sqlite3').verbose().Database)('./backend/database.sqlite', (err) => {
    if (err) console.error(err);
  });
  
  try {
    console.log('🔄 Creating test feedback data...\n');
    
    // Get some test users
    const users = await db.query('SELECT id, firstName, lastName, role FROM users LIMIT 5');
    
    if (users.rows.length === 0) {
      console.log('❌ No users found. Please create test users first.');
      return;
    }
    
    console.log(`Found ${users.rows.length} users to create feedback from\n`);
    
    const feedbackItems = [
      // Bug reports
      {
        userId: users.rows[0].id,
        feedbackType: 'bug',
        title: 'Search results not loading on mobile',
        description: 'When I try to search for teams on my iPhone, the results page shows a loading spinner but never displays any results. This happens consistently after the latest update.',
        category: 'search',
        priority: 'high',
        status: 'new',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          platform: 'iPhone',
          language: 'en-GB',
          screenResolution: '390x844',
          viewport: '390x844'
        }),
        pageUrl: 'http://localhost:5173/search'
      },
      {
        userId: users.rows[1].id,
        feedbackType: 'bug',
        title: 'Unable to upload team logo',
        description: 'The upload button for team logos is not responding. I click on it but nothing happens. Tried on Chrome and Firefox with the same issue.',
        category: 'team-roster',
        priority: 'medium',
        status: 'reviewing',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          platform: 'Win32',
          language: 'en-US',
          screenResolution: '1920x1080',
          viewport: '1536x864'
        }),
        pageUrl: 'http://localhost:5173/team-profile'
      },
      {
        userId: users.rows[2].id,
        feedbackType: 'bug',
        title: 'Map markers not showing correct locations',
        description: 'When viewing the map, some team locations appear in the wrong place. For example, a team in Manchester is showing up in Liverpool on the map.',
        category: 'maps',
        priority: 'critical',
        status: 'in-progress',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          platform: 'MacIntel',
          language: 'en-GB',
          screenResolution: '2560x1440',
          viewport: '1280x720'
        }),
        pageUrl: 'http://localhost:5173/maps'
      },
      {
        userId: users.rows[0].id,
        feedbackType: 'bug',
        title: 'Messages not sending',
        description: 'Tried to send a message to a coach but it keeps showing "Failed to send". The message never appears in my sent items.',
        category: 'messaging',
        priority: 'high',
        status: 'new',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile',
          platform: 'Linux armv81',
          language: 'en-GB',
          screenResolution: '412x915',
          viewport: '412x915'
        }),
        pageUrl: 'http://localhost:5173/messages'
      },
      // Improvement suggestions
      {
        userId: users.rows[1].id,
        feedbackType: 'improvement',
        title: 'Add filter for team gender',
        description: 'It would be really helpful to filter teams by whether they are boys, girls, or mixed teams. This would save a lot of time when searching for appropriate teams.',
        category: 'search',
        priority: 'medium',
        status: 'completed',
        adminNotes: 'Great suggestion! We have implemented gender filters in the latest update.',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Win32',
          language: 'en-US',
          screenResolution: '1920x1080',
          viewport: '1920x1080'
        }),
        pageUrl: 'http://localhost:5173/search'
      },
      {
        userId: users.rows[2].id,
        feedbackType: 'improvement',
        title: 'Email notifications for new matches',
        description: 'Would love to get email notifications when teams in my saved searches post new vacancies. Currently I have to keep checking the site manually.',
        category: 'general',
        priority: 'low',
        status: 'reviewing',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Win32',
          language: 'en-GB',
          screenResolution: '1366x768',
          viewport: '1366x768'
        }),
        pageUrl: 'http://localhost:5173/dashboard'
      },
      {
        userId: users.rows[3].id,
        feedbackType: 'improvement',
        title: 'Dark mode option',
        description: 'A dark mode would be great for using the site in the evening. The bright white background can be harsh on the eyes at night.',
        category: 'other',
        priority: 'low',
        status: 'new',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)',
          platform: 'iPad',
          language: 'en-GB',
          screenResolution: '768x1024',
          viewport: '768x1024'
        }),
        pageUrl: 'http://localhost:5173/dashboard'
      },
      {
        userId: users.rows[0].id,
        feedbackType: 'improvement',
        title: 'Bulk upload for team roster',
        description: 'Instead of adding players one by one, it would save tons of time if we could upload a CSV file with all player details.',
        category: 'team-roster',
        priority: 'high',
        status: 'in-progress',
        adminNotes: 'Working on this feature. Expected completion in January.',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Win32',
          language: 'en-GB',
          screenResolution: '1920x1080',
          viewport: '1920x1080'
        }),
        pageUrl: 'http://localhost:5173/team-roster'
      },
      {
        userId: users.rows[4].id,
        feedbackType: 'improvement',
        title: 'Performance analytics graphs',
        description: 'Would be amazing to see graphs and charts showing player progress over time. Could include goals, assists, attendance, etc.',
        category: 'performance',
        priority: 'medium',
        status: 'new',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          platform: 'MacIntel',
          language: 'en-US',
          screenResolution: '1440x900',
          viewport: '1440x900'
        }),
        pageUrl: 'http://localhost:5173/performance-analytics'
      },
      {
        userId: users.rows[1].id,
        feedbackType: 'improvement',
        title: 'Social media sharing buttons',
        description: 'Add quick share buttons to post team vacancies directly to Twitter/X, Facebook, and WhatsApp.',
        category: 'general',
        priority: 'low',
        status: 'wont-fix',
        adminNotes: 'We will focus on in-platform notifications for now. May revisit in future.',
        browserInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Win32',
          language: 'en-GB',
          screenResolution: '1920x1080',
          viewport: '1920x1080'
        }),
        pageUrl: 'http://localhost:5173/post-advert'
      }
    ];
    
    console.log('Creating feedback items...');
    const feedbackIds = [];
    
    for (const item of feedbackItems) {
      const result = await db.query(`
        INSERT INTO user_feedback 
        (userId, feedbackType, title, description, category, priority, status, adminNotes, browserInfo, pageUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.userId,
        item.feedbackType,
        item.title,
        item.description,
        item.category,
        item.priority,
        item.status,
        item.adminNotes || null,
        item.browserInfo,
        item.pageUrl
      ]);
      
      feedbackIds.push(result.lastID);
      console.log(`✅ Created ${item.feedbackType}: "${item.title}"`);
    }
    
    // Add some comments to feedback items
    console.log('\nAdding comments...');
    
    const comments = [
      {
        feedbackId: feedbackIds[0],
        userId: users.rows[1].id, // Different user (admin)
        comment: 'Thanks for reporting this. We are investigating the mobile search issue. Can you confirm which iOS version you are using?',
        isAdminComment: true
      },
      {
        feedbackId: feedbackIds[0],
        userId: users.rows[0].id, // Original user
        comment: 'I am using iOS 15.6 on an iPhone 12.',
        isAdminComment: false
      },
      {
        feedbackId: feedbackIds[2],
        userId: users.rows[1].id,
        comment: 'We have identified the geocoding issue and are working on a fix. Should be resolved by end of week.',
        isAdminComment: true
      },
      {
        feedbackId: feedbackIds[4],
        userId: users.rows[1].id,
        comment: 'Great suggestion! This has been implemented. You can now filter by team gender in the search filters.',
        isAdminComment: true
      },
      {
        feedbackId: feedbackIds[7],
        userId: users.rows[1].id,
        comment: 'We are currently developing this feature. It will include CSV upload and bulk editing capabilities.',
        isAdminComment: true
      },
      {
        feedbackId: feedbackIds[7],
        userId: users.rows[0].id,
        comment: 'That is excellent news! Will it also support Excel files?',
        isAdminComment: false
      }
    ];
    
    for (const comment of comments) {
      await db.query(`
        INSERT INTO feedback_comments (feedbackId, userId, comment, isAdminComment)
        VALUES (?, ?, ?, ?)
      `, [comment.feedbackId, comment.userId, comment.comment, comment.isAdminComment]);
      
      console.log(`✅ Added comment to feedback #${comment.feedbackId}`);
    }
    
    // Summary
    const totalFeedback = await db.query('SELECT COUNT(*) as count FROM user_feedback');
    const totalComments = await db.query('SELECT COUNT(*) as count FROM feedback_comments');
    const byType = await db.query(`
      SELECT feedbackType, COUNT(*) as count 
      FROM user_feedback 
      GROUP BY feedbackType
    `);
    const byStatus = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM user_feedback 
      GROUP BY status
    `);
    
    console.log('\n📊 Summary:');
    console.log(`Total feedback: ${totalFeedback.rows[0].count}`);
    console.log(`Total comments: ${totalComments.rows[0].count}`);
    console.log('\nBy Type:');
    byType.rows.forEach(row => {
      console.log(`  ${row.feedbackType}: ${row.count}`);
    });
    console.log('\nBy Status:');
    byStatus.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    
    console.log('\n✅ Test feedback created successfully!');
    console.log('\nYou can now:');
    console.log('  - View feedback at: http://localhost:5173/my-feedback');
    console.log('  - Admin dashboard at: http://localhost:5173/admin/feedback');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

createTestFeedback();
