const Database = require('./db/database.js');

const testTeamVacancies = [
  {
    title: 'Boys Under 12 Striker Needed',
    description: 'Looking for a talented striker to join our competitive boys Under 12 team. Training twice a week.',
    league: 'County League',
    ageGroup: 'Under 12',
    position: 'Striker',
    teamGender: 'Boys',
    location: 'Manchester, UK',
    contactInfo: 'coach@boysfc.com',
    postedBy: 1,
    status: 'active'
  },
  {
    title: 'Girls Football Team Seeking Goalkeeper',
    description: 'Our girls Under 14 team needs an experienced goalkeeper. Friendly team environment.',
    league: 'Local League',
    ageGroup: 'Under 14',
    position: 'Goalkeeper',
    teamGender: 'Girls',
    location: 'Birmingham, UK',
    contactInfo: 'manager@girlsfc.com',
    postedBy: 1,
    status: 'active'
  },
  {
    title: 'Mixed Team Defender Wanted',
    description: 'Mixed Under 16 team looking for versatile defender. All skill levels welcome.',
    league: 'Youth League',
    ageGroup: 'Under 16',
    position: 'Centre Back',
    teamGender: 'Mixed',
    location: 'Liverpool, UK',
    contactInfo: 'coach@mixedfc.com',
    postedBy: 1,
    status: 'active'
  },
  {
    title: 'Senior Boys Team - Midfielder',
    description: 'Competitive senior boys team seeking central midfielder with good passing skills.',
    league: 'Premier Youth League',
    ageGroup: 'Senior',
    position: 'Central Midfielder',
    teamGender: 'Boys',
    location: 'Leeds, UK',
    contactInfo: 'coach@seniorboysteam.com',
    postedBy: 1,
    status: 'active'
  },
  {
    title: 'Girls Under 10 Winger Position',
    description: 'Friendly girls Under 10 team looking for wingers. Focus on development and fun.',
    league: 'District League',
    ageGroup: 'Under 10',
    position: 'Right Winger',
    teamGender: 'Girls',
    location: 'Newcastle, UK',
    contactInfo: 'coach@u10girls.com',
    postedBy: 1,
    status: 'active'
  }
];

async function addTestTeamGenderData() {
  const db = new Database();
  
  try {
    console.log('Adding test team vacancies with gender information...');
    
    for (const vacancy of testTeamVacancies) {
      const result = await db.query(`
        INSERT INTO team_vacancies (
          title, description, league, ageGroup, position, teamGender, 
          location, contactInfo, postedBy, status, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        vacancy.title,
        vacancy.description,
        vacancy.league,
        vacancy.ageGroup,
        vacancy.position,
        vacancy.teamGender,
        vacancy.location,
        vacancy.contactInfo,
        vacancy.postedBy,
        vacancy.status
      ]);
      
      console.log(`✅ Added: ${vacancy.title} (${vacancy.teamGender} team)`);
    }
    
    console.log(`\n🎉 Successfully added ${testTeamVacancies.length} test team vacancies with gender information!`);
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  } finally {
    db.close();
  }
}

addTestTeamGenderData();
