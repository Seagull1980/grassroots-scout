const Database = require('./db/database.js');

async function testInsert() {
  const db = new Database();
  try {
    // Try without country column
    const result = await db.query(`INSERT INTO leagues (name, region, ageGroup, url, hits, description, isActive, createdBy)
                                   VALUES ('Test League', 'England', 'All Ages', 'https://test.com', 0, '', 1, 1);`);
    console.log('Insert successful, lastID:', result.lastID);
  } catch (err) {
    console.error('Insert failed:', err.message);
  }
}

testInsert();