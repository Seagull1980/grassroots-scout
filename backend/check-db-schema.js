const Database = require('./db/database.js');

async function checkTables() {
  const db = new Database();
  try {
    const result = await db.query('SELECT name FROM sqlite_master WHERE type="table";');
    console.log('Tables:', result.rows.map(r => r.name));

    // Check if leagues table exists
    const leaguesExists = result.rows.some(r => r.name === 'leagues');
    if (leaguesExists) {
      console.log('Leagues table exists, checking schema...');
      const schema = await db.query('PRAGMA table_info(leagues);');
      console.log('Leagues table columns:');
      schema.rows.forEach(row => {
        console.log(`  ${row.name} (${row.type})`);
      });
    } else {
      console.log('Leagues table does not exist');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTables();