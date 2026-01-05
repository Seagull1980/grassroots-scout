const Database = require('./db/database.js');

const sampleTeamVacancies = [
  {
    title: 'Boys Under 14 Goalkeeper Needed',
    description: 'We are looking for an enthusiastic goalkeeper to join our Under 14 boys team. Training twice a week with matches on Saturdays.',
    league: 'Youth County League',
    ageGroup: 'Under 14',
    position: 'Goalkeeper',
    teamGender: 'Boys',
    location: 'Manchester, Greater Manchester',
    locationData: JSON.stringify({
      address: 'Manchester, Greater Manchester',
      latitude: 53.4808,
      longitude: -2.2426
    }),
    contactInfo: 'coach@manchesterfc.com',
    postedBy: 1
  },
  {
    title: 'Girls Under 16 Midfielder Required',
    description: 'Competitive girls team seeks skilled midfielder. Great opportunity for development in local league.',
    league: 'Girls Regional League',
    ageGroup: 'Under 16',
    position: 'Central Midfielder',
    teamGender: 'Girls',
    location: 'Birmingham, West Midlands',
    locationData: JSON.stringify({
      address: 'Birmingham, West Midlands',
      latitude: 52.4862,
      longitude: -1.8904
    }),
    contactInfo: 'info@birminghamgirls.co.uk',
    postedBy: 1
  },
  {
    title: 'Mixed Under 12 Team Seeks Striker',
    description: 'Family-friendly mixed team looking for a striker. All abilities welcome, focus on fun and development.',
    league: 'Local Mixed League',
    ageGroup: 'Under 12',
    position: 'Striker',
    teamGender: 'Mixed',
    location: 'Leeds, West Yorkshire',
    locationData: JSON.stringify({
      address: 'Leeds, West Yorkshire',
      latitude: 53.8008,
      longitude: -1.5491
    }),
    contactInfo: 'contact@leedsmixed.org',
    postedBy: 1
  },
  {
    title: 'Boys Under 18 Defender Wanted',
    description: 'Senior boys team needs reliable defender. Training on Wednesdays and Fridays, matches on Sundays.',
    league: 'Premier Youth League',
    ageGroup: 'Under 18',
    position: 'Centre Back',
    teamGender: 'Boys',
    location: 'Liverpool, Merseyside',
    locationData: JSON.stringify({
      address: 'Liverpool, Merseyside',
      latitude: 53.4084,
      longitude: -2.9916
    }),
    contactInfo: 'manager@liverpoolfc.youth',
    postedBy: 1
  },
  {
    title: 'Girls Under 10 Any Position',
    description: 'New girls team forming, welcoming players of all positions and skill levels. Focus on enjoyment and learning.',
    league: 'Junior Girls League',
    ageGroup: 'Under 10',
    position: 'Any Position',
    teamGender: 'Girls',
    location: 'London, Greater London',
    locationData: JSON.stringify({
      address: 'London, Greater London',
      latitude: 51.5074,
      longitude: -0.1278
    }),
    contactInfo: 'hello@londongirlsfc.com',
    postedBy: 1
  }
];

async function addSampleData() {
  const db = new Database();
  
  try {
    console.log('🏆 Adding sample team vacancies with location and gender data...\n');
    
    for (const vacancy of sampleTeamVacancies) {
      const result = await db.query(`
        INSERT INTO team_vacancies (title, description, league, ageGroup, position, teamGender, location, locationData, contactInfo, postedBy, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
      `, [
        vacancy.title,
        vacancy.description,
        vacancy.league,
        vacancy.ageGroup,
        vacancy.position,
        vacancy.teamGender,
        vacancy.location,
        vacancy.locationData,
        vacancy.contactInfo,
        vacancy.postedBy
      ]);
      
      console.log(`✅ Added: ${vacancy.title} (${vacancy.teamGender} team, ${vacancy.ageGroup})`);
    }
    
    console.log(`\n🎉 Successfully added ${sampleTeamVacancies.length} sample team vacancies!`);
    console.log('\n🔍 You can now test:');
    console.log('- Age group filtering (Under 10, Under 12, Under 14, Under 16, Under 18)');
    console.log('- Team gender filtering (Boys, Girls, Mixed)');
    console.log('- Map search with proper location data');
    console.log('- Position filtering (Goalkeeper, Midfielder, Striker, etc.)');
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error.message);
  }
  
  process.exit(0);
}

addSampleData();
