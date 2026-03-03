const Database = require('./backend/db/database.js');

const db = new Database();

async function deleteTestPlayerAdverts(advertIds) {
  try {
    if (!advertIds || advertIds.length === 0) {
      console.log('❌ No advert IDs provided.');
      console.log('\nUsage: node delete-test-player-adverts.js <id1,id2,id3,...>');
      console.log('Example: node delete-test-player-adverts.js 1,2,3,4,5,6,7,8');
      process.exit(1);
    }

    console.log(`🗑️  Deleting ${advertIds.length} test player availability adverts...`);
    
    for (const id of advertIds) {
      const advertResult = await db.query('SELECT id, title FROM player_availability WHERE id = ?', [id]);
      const advert = advertResult.rows && advertResult.rows[0];
      
      if (!advert) {
        console.log(`⚠️  Advert ID ${id} not found - skipping`);
        continue;
      }

      await db.query('DELETE FROM player_availability WHERE id = ?', [id]);
      console.log(`✅ Deleted: ${advert.title} (ID: ${id})`);
    }

    console.log(`\n🎉 Successfully deleted ${advertIds.length} test adverts!`);
  } catch (error) {
    console.error('❌ Error deleting test adverts:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ No advert IDs provided.');
    console.log('\nUsage: node delete-test-player-adverts.js <id1,id2,id3,...>');
    console.log('Example: node delete-test-player-adverts.js 1,2,3,4,5,6,7,8');
    process.exit(1);
  }

  const advertIds = args[0].split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  
  deleteTestPlayerAdverts(advertIds)
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { deleteTestPlayerAdverts };
