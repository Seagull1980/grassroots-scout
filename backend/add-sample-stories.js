const Database = require('./db/database.js');

async function addSampleSuccessStories() {
  try {
    const db = new Database();
    
    console.log('Adding sample success stories...');
    
    // First, let's get some user IDs to use as coachId and playerId
    const users = await db.query('SELECT id, email, firstName, lastName FROM users LIMIT 5');
    console.log('Available users:', users.rows);
    
    if (users.rows.length < 2) {
      console.error('Need at least 2 users in the database');
      process.exit(1);
    }
    
    const coachId = users.rows[0].id; // Use first user as coach
    const playerId = users.rows[1].id; // Use second user as player
    
    // First, let's see if there are any match completions
    const existingCompletions = await db.query('SELECT COUNT(*) as count FROM match_completions');
    console.log('Existing match completions:', existingCompletions.rows[0].count);
    
    // Add sample match completions with success stories
    const sampleStories = [
      {
        playerName: 'Alex Johnson',
        teamName: 'Riverside United FC',
        position: 'Midfielder',
        ageGroup: 'U16',
        league: 'County Youth League',
        successStory: 'Alex joined our team and immediately made an impact with his creative passing and work ethic. He has helped us win 3 games already this season!',
        rating: 5,
        publicStory: true
      },
      {
        playerName: 'Emma Thompson',
        teamName: 'Greenfield Lions',
        position: 'Striker',
        ageGroup: 'U14',
        league: 'Local Girls League',
        successStory: 'Emma has been fantastic for our team. Her speed and finishing ability have been crucial in our recent victories. A real team player!',
        rating: 5,
        publicStory: true
      },
      {
        playerName: 'Jamie Wilson',
        teamName: 'Oak Valley FC',
        position: 'Defender',
        ageGroup: 'U18',
        league: 'Regional Championship',
        successStory: 'Jamie brought great defensive stability to our backline. His leadership on the pitch has been invaluable for our younger players.',
        rating: 4,
        publicStory: true
      }
    ];
    
    for (const story of sampleStories) {
      await db.query(
        `INSERT INTO match_completions (
          coachId, playerId, matchType, playerName, teamName, position, ageGroup, league, 
          successStory, rating, publicStory, completionStatus, coachConfirmed, 
          playerConfirmed, completedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', true, true, datetime('now'), datetime('now'))`,
        [
          coachId,
          playerId,
          'player_to_team',
          story.playerName,
          story.teamName, 
          story.position,
          story.ageGroup,
          story.league,
          story.successStory,
          story.rating,
          story.publicStory
        ]
      );
      console.log(`✅ Added success story for ${story.playerName}`);
    }
    
    // Verify the stories were added
    const storiesResult = await db.query(
      `SELECT playerName, teamName, successStory FROM match_completions 
       WHERE completionStatus = 'confirmed' AND publicStory = true`
    );
    
    console.log('\nSuccess stories in database:');
    console.log(storiesResult.rows);
    
    console.log('\n🎉 Sample success stories added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample stories:', error);
    process.exit(1);
  }
}

addSampleSuccessStories();
