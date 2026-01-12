const Database = require('../db/database.js');

async function addTrainingSessions() {
  const db = new Database();

  console.log('🔄 Adding training sessions tables...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      time TIME NOT NULL,
      location TEXT NOT NULL,
      max_spaces INTEGER NOT NULL,
      price DECIMAL(10,2) DEFAULT 0,
      price_type TEXT DEFAULT 'per_session', -- per_session, per_month, free
      includes_equipment BOOLEAN DEFAULT FALSE,
      includes_facilities BOOLEAN DEFAULT FALSE,
      payment_methods TEXT DEFAULT 'cash,bank_transfer', -- comma-separated
      refund_policy TEXT,
      special_offers TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES users(id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS training_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      booked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES training_sessions(id),
      FOREIGN KEY (player_id) REFERENCES users(id),
      UNIQUE(session_id, player_id)
    )
  `);

  console.log('✅ Created training_sessions table');
  console.log('✅ Created training_bookings table');
  console.log('🎉 Training sessions tables created successfully!');
}

if (require.main === module) {
  addTrainingSessions()
    .then(() => {
      console.log('✅ Training sessions migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Training sessions migration failed:', error);
      process.exit(1);
    });
}

module.exports = addTrainingSessions;