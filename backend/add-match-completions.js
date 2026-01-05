const Database = require('./db/database.js');

async function addMatchCompletions() {
  const db = new Database();
  
  try {
    console.log('🏅 Adding match completion data...\n');
    
    // Get user IDs
    const usersResult = await db.query('SELECT id, email, role FROM users');
    const users = usersResult.rows;
    
    const coaches = users.filter(u => u.role === 'Coach');
    const players = users.filter(u => u.role === 'Player');
    
    console.log(`Found ${coaches.length} coaches and ${players.length} players`);
    
    if (coaches.length === 0 || players.length === 0) {
      console.log('❌ Need both coaches and players to create match completions');
      return;
    }
    
    // Create 10 match completion records
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      const randomCoach = coaches[Math.floor(Math.random() * coaches.length)];
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      
      await db.query(`
        INSERT INTO match_completions (
          coachId, playerId, matchType, playerName, teamName, position, ageGroup, league, 
          startDate, completionStatus, completedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        randomCoach.id,
        randomPlayer.id,
        'player_to_team',
        'Test Player ' + (i + 1),
        'Test Team ' + (i + 1),
        ['Midfielder', 'Forward', 'Defender', 'Goalkeeper'][Math.floor(Math.random() * 4)],
        ['U12', 'U14', 'U16', 'U18'][Math.floor(Math.random() * 4)],
        'Test League',
        date.toISOString().split('T')[0], // Date only
        'confirmed',
        date.toISOString()
      ]);
      
      console.log(`   ✅ Created match completion ${i + 1}/10`);
    }
    
    console.log('\n🎉 Match completion data added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding match completions:', error);
  } finally {
    await db.close();
  }
}

addMatchCompletions();
