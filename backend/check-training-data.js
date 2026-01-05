const Database = require('better-sqlite3');
const db = new Database('database.db');

console.log('\n=== DATABASE TABLES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Available tables:', tables.map(t => t.name).join(', '));

console.log('\n=== LOOKING FOR TRAINING/CALENDAR DATA ===');

// Check for any calendar-related tables
const calendarTables = tables.filter(t => 
  t.name.toLowerCase().includes('calendar') || 
  t.name.toLowerCase().includes('event') ||
  t.name.toLowerCase().includes('training')
);

if (calendarTables.length > 0) {
  console.log('Calendar-related tables found:', calendarTables.map(t => t.name).join(', '));
  
  calendarTables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`  ${table.name}: ${count.count} rows`);
  });
} else {
  console.log('No calendar-related tables found.');
}

// Check team_vacancies which might have location data
console.log('\n=== TEAM VACANCIES ===');
try {
  const vacancies = db.prepare('SELECT COUNT(*) as count FROM team_vacancies').get();
  console.log(`Total team vacancies: ${vacancies.count}`);
  
  // Check if they have location data
  const schema = db.prepare("PRAGMA table_info(team_vacancies)").all();
  const hasLocation = schema.some(col => col.name.toLowerCase().includes('lat') || col.name.toLowerCase().includes('long'));
  console.log('Has location columns:', hasLocation);
  
  if (!hasLocation) {
    console.log('Columns:', schema.map(c => c.name).join(', '));
  }
} catch (err) {
  console.log('team_vacancies table not found');
}

db.close();
