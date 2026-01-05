const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database.sqlite in current directory (should be run from backend/)
const dbPath = path.join(process.cwd(), 'database.sqlite');
console.log(`Connecting to: ${dbPath}\n`);
const db = new sqlite3.Database(dbPath);

async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    }
  });
}

async function createTestFeedback() {
  try {
    console.log('🔄 Creating test feedback data...\n');
    
    // Get test users
    const users = await query('SELECT id, firstName, lastName, role FROM users LIMIT 5');
    
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`Found ${users.length} users\n`);
    
    const feedbackItems = [
      {
        userId: users[0].id,
        feedbackType: 'bug',
        title: 'Search results not loading on mobile',
        description: 'When I try to search for teams on my iPhone, the results page shows a loading spinner but never displays any results.',
        category: 'search',
        priority: 'high',
        status: 'new',
        browserInfo: JSON.stringify({ userAgent: 'Mozilla/5.0 (iPhone)', platform: 'iPhone' }),
        pageUrl: 'http://localhost:5173/search'
      },
      {
        userId: users[1].id,
        feedbackType: 'bug',
        title: 'Unable to upload team logo',
        description: 'The upload button for team logos is not responding.',
        category: 'team-roster',
        priority: 'medium',
        status: 'reviewing',
        browserInfo: JSON.stringify({ userAgent: 'Chrome/120', platform: 'Win32' }),
        pageUrl: 'http://localhost:5173/team-profile'
      },
      {
        userId: users[2].id,
        feedbackType: 'bug',
        title: 'Map markers showing wrong locations',
        description: 'Some team locations appear in the wrong place on the map.',
        category: 'maps',
        priority: 'critical',
        status: 'in-progress',
        browserInfo: JSON.stringify({ userAgent: 'Safari/15', platform: 'MacIntel' }),
        pageUrl: 'http://localhost:5173/maps'
      },
      {
        userId: users[0].id,
        feedbackType: 'improvement',
        title: 'Add filter for team gender',
        description: 'It would be helpful to filter teams by whether they are boys, girls, or mixed teams.',
        category: 'search',
        priority: 'medium',
        status: 'completed',
        adminNotes: 'Implemented gender filters!',
        browserInfo: JSON.stringify({ userAgent: 'Chrome/120', platform: 'Win32' }),
        pageUrl: 'http://localhost:5173/search'
      },
      {
        userId: users[1].id,
        feedbackType: 'improvement',
        title: 'Email notifications for new matches',
        description: 'Would love to get email notifications when teams in my saved searches post new vacancies.',
        category: 'general',
        priority: 'low',
        status: 'reviewing',
        browserInfo: JSON.stringify({ userAgent: 'Firefox/119', platform: 'Win32' }),
        pageUrl: 'http://localhost:5173/dashboard'
      },
      {
        userId: users[3].id,
        feedbackType: 'improvement',
        title: 'Dark mode option',
        description: 'A dark mode would be great for using the site in the evening.',
        category: 'other',
        priority: 'low',
        status: 'new',
        browserInfo: JSON.stringify({ userAgent: 'Safari/15', platform: 'iPad' }),
        pageUrl: 'http://localhost:5173/dashboard'
      },
      {
        userId: users[0].id,
        feedbackType: 'improvement',
        title: 'Bulk upload for team roster',
        description: 'Instead of adding players one by one, allow CSV file upload with all player details.',
        category: 'team-roster',
        priority: 'high',
        status: 'in-progress',
        adminNotes: 'Working on this. Expected January completion.',
        browserInfo: JSON.stringify({ userAgent: 'Chrome/120', platform: 'Win32' }),
        pageUrl: 'http://localhost:5173/team-roster'
      }
    ];
    
    console.log('Creating feedback...');
    const feedbackIds = [];
    
    for (const item of feedbackItems) {
      const result = await query(`
        INSERT INTO user_feedback 
        (userId, feedbackType, title, description, category, priority, status, adminNotes, browserInfo, pageUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.userId, item.feedbackType, item.title, item.description,
        item.category, item.priority, item.status, item.adminNotes || null,
        item.browserInfo, item.pageUrl
      ]);
      
      feedbackIds.push(result.lastID);
      console.log(`✅ ${item.feedbackType}: ${item.title}`);
    }
    
    // Add comments
    console.log('\nAdding comments...');
    
    const comments = [
      {
        feedbackId: feedbackIds[0],
        userId: users[1].id,
        comment: 'Thanks for reporting this. Investigating the mobile search issue.',
        isAdminComment: 1
      },
      {
        feedbackId: feedbackIds[0],
        userId: users[0].id,
        comment: 'Using iOS 15.6 on iPhone 12.',
        isAdminComment: 0
      },
      {
        feedbackId: feedbackIds[2],
        userId: users[1].id,
        comment: 'We have identified the geocoding issue. Fix coming end of week.',
        isAdminComment: 1
      },
      {
        feedbackId: feedbackIds[3],
        userId: users[1].id,
        comment: 'Gender filters are now live! Check it out.',
        isAdminComment: 1
      }
    ];
    
    for (const comment of comments) {
      await query(`
        INSERT INTO feedback_comments (feedbackId, userId, comment, isAdminComment)
        VALUES (?, ?, ?, ?)
      `, [comment.feedbackId, comment.userId, comment.comment, comment.isAdminComment]);
      
      console.log(`✅ Comment on feedback #${comment.feedbackId}`);
    }
    
    // Stats
    const totalFeedback = await query('SELECT COUNT(*) as count FROM user_feedback');
    const totalComments = await query('SELECT COUNT(*) as count FROM feedback_comments');
    const byType = await query('SELECT feedbackType, COUNT(*) as count FROM user_feedback GROUP BY feedbackType');
    
    console.log('\n📊 Summary:');
    console.log(`Total feedback: ${totalFeedback[0].count}`);
    console.log(`Total comments: ${totalComments[0].count}`);
    console.log('\nBy Type:');
    byType.forEach(row => console.log(`  ${row.feedbackType}: ${row.count}`));
    
    console.log('\n✅ Test feedback created!');
    console.log('\nView at:');
    console.log('  User: http://localhost:5173/my-feedback');
    console.log('  Admin: http://localhost:5173/admin/feedback');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close();
  }
}

createTestFeedback();
