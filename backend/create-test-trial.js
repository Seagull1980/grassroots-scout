const Database = require('./db/database');
const db = new Database('./database.sqlite');

async function createTestTrial() {
  try {
    // Get a coach user
    const coachResult = await db.query('SELECT id, firstName, lastName FROM users WHERE role = ?', ['Coach']);
    const coach = coachResult.rows[0];
    console.log('Coach found:', coach.firstName, coach.lastName);
    
    // Get a player user
    const playerResult = await db.query('SELECT id, firstName, lastName, email FROM users WHERE role = ?', ['Player']);
    const player = playerResult.rows[0];
    console.log('Player found:', player.firstName, player.lastName, player.email);
    
    // Create a trial event
    const trialData = {
      title: 'Test Trial - U16 Team',
      description: 'Looking for talented midfielder and striker for our competitive U16 team.',
      eventType: 'trial',
      date: '2025-08-15',
      startTime: '14:00',
      endTime: '16:00',
      location: 'City Sports Complex, Manchester',
      ageGroup: 'U16',
      positions: JSON.stringify(['Midfielder', 'Striker']),
      requirements: 'Bring boots, water bottle, and positive attitude',
      maxParticipants: 20,
      createdBy: coach.id
    };
    
    const insertQuery = `INSERT INTO calendar_events 
      (title, description, eventType, date, startTime, endTime, location, createdBy, maxParticipants, ageGroup, positions, requirements) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const eventResult = await db.query(insertQuery, [
      trialData.title, trialData.description, trialData.eventType, trialData.date,
      trialData.startTime, trialData.endTime, trialData.location, trialData.createdBy,
      trialData.maxParticipants, trialData.ageGroup, trialData.positions, trialData.requirements
    ]);
    
    const trialId = eventResult.lastID;
    console.log('Trial created with ID:', trialId);
    
    // Create trial invitation
    const inviteQuery = 'INSERT INTO trial_invitations (eventId, playerId, invitedBy, message, status) VALUES (?, ?, ?, ?, ?)';
    const message = 'You have been invited to try out for our U16 team. We are looking for talented midfielders and strikers.';
    
    await db.query(inviteQuery, [trialId, player.id, coach.id, message, 'pending']);
    console.log('Trial invitation sent to:', player.email);
    
    console.log('Test trial and invitation created successfully!');
    console.log('Login as player1@test.com / test123 to see the trial invitation');
    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

createTestTrial();
