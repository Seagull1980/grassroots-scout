const Database = require('./db/database.js');

async function recreateLeaguesTable() {
  const db = new Database();
  try {
    // Drop the existing table
    await db.query('DROP TABLE IF EXISTS leagues;');
    console.log('Dropped existing leagues table');

    // Create the table with the correct schema
    await db.query(`CREATE TABLE leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR UNIQUE NOT NULL,
      region VARCHAR,
      ageGroup VARCHAR,
      country VARCHAR DEFAULT 'England',
      url VARCHAR,
      hits INTEGER DEFAULT 0,
      description VARCHAR,
      isActive BOOLEAN DEFAULT TRUE,
      createdBy INTEGER,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users (id)
    );`);
    console.log('Created leagues table with correct schema');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

recreateLeaguesTable();