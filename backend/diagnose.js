const Database = require('better-sqlite3');
const fs = require('fs');

const dbPath = './database.sqlite';

try {
  if (!fs.existsSync(dbPath)) {
    console.log('DATABASE FILE NOT FOUND:', dbPath);
    process.exit(1);
  }
  
  const db = new Database(dbPath, { fileMustExist: true, verbose: console.log });
  
  console.log('\n========== DATABASE DIAGNOSTIC ==========\n');
  
  // Get total vacancies
  const total = db.prepare('SELECT COUNT(*) as total FROM team_vacancies').get();
  console.log('Total vacancies in database:', total.total);
  
  // Get vacancies with training locations
  const training = db.prepare('SELECT COUNT(*) as total FROM team_vacancies WHERE trainingLocationData IS NOT NULL').get();
  console.log('Vacancies with training locations:', training.total);
  
  // Get vacancies with match locations
  const match = db.prepare('SELECT COUNT(*) as total FROM team_vacancies WHERE matchLocationData IS NOT NULL').get();
  console.log('Vacancies with match locations:', match.total);
  
  // Show last 5 vacancies
  console.log('\nLast 5 vacancies:');
  const last5 = db.prepare(`
    SELECT id, title, status, 
      CASE WHEN trainingLocationData IS NOT NULL THEN 'YES' ELSE 'NO' END as training,
      CASE WHEN matchLocationData IS NOT NULL THEN 'YES' ELSE 'NO' END as match
    FROM team_vacancies ORDER BY id DESC LIMIT 5
  `).all();
  
  last5.forEach(v => {
    console.log(`  ID:${v.id} | ${v.title} | Status:${v.status} | Training:${v.training} | Match:${v.match}`);
  });
  
  // Check if vacancies have proper structure
  console.log('\nChecking sample training location data:');
  const sample = db.prepare(`
    SELECT id, title, trainingLocationData 
    FROM team_vacancies 
    WHERE trainingLocationData IS NOT NULL 
    LIMIT 1
  `).get();
  
  if (sample) {
    try {
      const data = JSON.parse(sample.trainingLocationData);
      console.log(`  Sample ID:${sample.id} | Title:${sample.title}`);
      console.log(`  Has latitude: ${data.latitude ? 'YES' : 'NO'}`);
      console.log(`  Has longitude: ${data.longitude ? 'YES' : 'NO'}`);
      console.log(`  Address: ${data.address}`);
    } catch (e) {
      console.log('  ERROR parsing JSON:', e.message);
    }
  } else {
    console.log('  No training location data found');
  }
  
  db.close();
  console.log('\n✓ Diagnostic complete\n');
  
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
