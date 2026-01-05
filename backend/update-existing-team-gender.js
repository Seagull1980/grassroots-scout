const Database = require('./db/database.js');

async function updateExistingTeamGenderData() {
  const db = new Database();
  
  try {
    console.log('Updating existing team vacancies with team gender information...');
    
    // Get all existing team vacancies that don't have teamGender set
    const vacancies = await db.query(`
      SELECT id, title, description, ageGroup 
      FROM team_vacancies 
      WHERE teamGender IS NULL OR teamGender = ''
    `);
    
    console.log(`Found ${vacancies.rows.length} vacancies to update`);
    
    for (const vacancy of vacancies.rows) {
      let teamGender = 'Mixed'; // Default value
      
      // Simple heuristic to assign team gender based on title/description
      const text = (vacancy.title + ' ' + vacancy.description).toLowerCase();
      
      if (text.includes('boys') || text.includes("boys'") || text.includes('male')) {
        teamGender = 'Boys';
      } else if (text.includes('girls') || text.includes("girls'") || text.includes('female') || text.includes('ladies')) {
        teamGender = 'Girls';
      } else if (text.includes('mixed') || text.includes('co-ed') || text.includes('coed')) {
        teamGender = 'Mixed';
      }
      
      await db.query(`
        UPDATE team_vacancies 
        SET teamGender = ? 
        WHERE id = ?
      `, [teamGender, vacancy.id]);
      
      console.log(`✅ Updated vacancy "${vacancy.title}" -> ${teamGender} team`);
    }
    
    console.log(`\n🎉 Successfully updated ${vacancies.rows.length} existing team vacancies!`);
    
  } catch (error) {
    console.error('❌ Error updating existing data:', error);
  } finally {
    db.close();
  }
}

updateExistingTeamGenderData();
