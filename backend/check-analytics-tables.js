const Database = require('better-sqlite3');
const db = new Database('database.db');

console.log('Checking analytics-related tables...\n');

// Check if page_views table exists
const pageViewsTable = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='page_views'"
).all();

if (pageViewsTable.length > 0) {
  console.log('✓ page_views table exists');
  const count = db.prepare('SELECT COUNT(*) as count FROM page_views').get();
  console.log(`  Rows: ${count.count}`);
} else {
  console.log('✗ page_views table does NOT exist');
}

// Check other analytics tables
const tables = ['match_completions', 'team_vacancies', 'player_availability', 'analytics_events'];

tables.forEach(tableName => {
  const result = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
  ).all();
  
  if (result.length > 0) {
    console.log(`✓ ${tableName} table exists`);
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    console.log(`  Rows: ${count.count}`);
  } else {
    console.log(`✗ ${tableName} table does NOT exist`);
  }
});

db.close();
