const Database = require('./db/database.js');

(async () => {
  const db = new Database();
  // Wait briefly for DB to initialize
  await new Promise(r => setTimeout(r, 500));
  try {
    const result = await db.query('SELECT * FROM leagues');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error reading leagues:', err);
    process.exit(1);
  } finally {
    await db.close();
  }
})();
