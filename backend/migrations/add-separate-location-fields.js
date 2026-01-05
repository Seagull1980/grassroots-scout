const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

console.log('Adding separate location fields to team_vacancies table...\n');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(team_vacancies)").all();
  const hasTrainingLocation = tableInfo.some(col => col.name === 'trainingLocationData');
  const hasMatchLocation = tableInfo.some(col => col.name === 'matchLocationData');
  
  if (hasTrainingLocation && hasMatchLocation) {
    console.log('✓ Columns already exist');
  } else {
    // Add new columns for separate location data
    if (!hasTrainingLocation) {
      db.prepare(`
        ALTER TABLE team_vacancies 
        ADD COLUMN trainingLocationData TEXT
      `).run();
      console.log('✓ Added trainingLocationData column');
    }
    
    if (!hasMatchLocation) {
      db.prepare(`
        ALTER TABLE team_vacancies 
        ADD COLUMN matchLocationData TEXT
      `).run();
      console.log('✓ Added matchLocationData column');
    }
    
    // Migrate existing locationData to trainingLocationData
    // (assuming existing data represents training locations)
    const migrateResult = db.prepare(`
      UPDATE team_vacancies 
      SET trainingLocationData = locationData 
      WHERE locationData IS NOT NULL 
        AND trainingLocationData IS NULL
    `).run();
    
    console.log(`✓ Migrated ${migrateResult.changes} existing location records to trainingLocationData`);
    
    console.log('\nNote: Existing locationData has been copied to trainingLocationData.');
    console.log('You can now add matchLocationData separately for teams that play at different venues.');
  }
  
  // Show sample of migrated data
  console.log('\nSample of location data:');
  const samples = db.prepare(`
    SELECT id, title, 
           CASE 
             WHEN trainingLocationData IS NOT NULL THEN '✓' 
             ELSE '✗' 
           END as hasTraining,
           CASE 
             WHEN matchLocationData IS NOT NULL THEN '✓' 
             ELSE '✗' 
           END as hasMatch
    FROM team_vacancies 
    LIMIT 5
  `).all();
  
  console.table(samples);
  
  console.log('\n✓ Migration complete!');
  
} catch (error) {
  console.error('Error during migration:', error);
  process.exit(1);
} finally {
  db.close();
}
