const Database = require('./backend/db/database.js');

const db = new Database();

async function deleteTestTeamVacancies(vacancyIds) {
  try {
    if (!vacancyIds || vacancyIds.length === 0) {
      console.log('❌ No vacancy IDs provided.');
      console.log('\nUsage: node delete-test-team-vacancies.cjs <id1,id2,id3,...>');
      console.log('Example: node delete-test-team-vacancies.cjs 1,2,3,4,5,6,7,8');
      process.exit(1);
    }

    console.log(`🗑️  Deleting ${vacancyIds.length} test team vacancies...`);
    
    let deletedCount = 0;
    for (const id of vacancyIds) {
      const vacancyResult = await db.query('SELECT id, title FROM team_vacancies WHERE id = ?', [id]);
      const vacancy = vacancyResult.rows && vacancyResult.rows[0];
      
      if (!vacancy) {
        console.log(`⚠️  Vacancy ID ${id} not found - skipping`);
        continue;
      }

      await db.query('DELETE FROM team_vacancies WHERE id = ?', [id]);
      console.log(`✅ Deleted: ${vacancy.title} (ID: ${id})`);
      deletedCount++;
    }

    console.log(`\n🎉 Successfully deleted ${deletedCount} test team vacancies!`);
  } catch (error) {
    console.error('❌ Error deleting test vacancies:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ No vacancy IDs provided.');
    console.log('\nUsage: node delete-test-team-vacancies.cjs <id1,id2,id3,...>');
    console.log('Example: node delete-test-team-vacancies.cjs 1,2,3,4,5,6,7,8');
    process.exit(1);
  }

  const vacancyIds = args[0].split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  
  deleteTestTeamVacancies(vacancyIds)
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { deleteTestTeamVacancies };
