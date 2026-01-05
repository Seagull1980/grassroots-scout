const Database = require('../db/database.js');
require('dotenv').config();

class DatabaseSeeder {
  constructor() {
    this.db = new Database();
  }

  async seedLeagues() {
    console.log('🌱 Seeding leagues...');
    
    const leagues = [
      {
        name: 'Premier League Youth',
        description: 'Youth development league for aspiring professional players',
        isActive: true,
        createdBy: 1
      },
      {
        name: 'Community Football League',
        description: 'Local community league for recreational football',
        isActive: true,
        createdBy: 1
      },
      {
        name: 'Sunday League',
        description: 'Traditional Sunday morning football league',
        isActive: true,
        createdBy: 1
      },
      {
        name: 'Women\'s Football League',
        description: 'Dedicated league for women\'s football development',
        isActive: true,
        createdBy: 1
      },
      {
        name: 'Veterans League',
        description: 'League for experienced players over 35',
        isActive: true,
        createdBy: 1
      }
    ];

    for (const league of leagues) {
      try {
        await this.db.query(
          `INSERT INTO leagues (name, description, isActive, createdBy) 
           VALUES (?, ?, ?, ?) 
           ON CONFLICT (name) DO NOTHING`,
          [league.name, league.description, league.isActive, league.createdBy]
        );
      } catch (error) {
        console.error(`Error seeding league ${league.name}:`, error.message);
      }
    }
    
    console.log('✅ Leagues seeded successfully');
  }

  async seedAdminUser() {
    console.log('🌱 Seeding admin user...');
    
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    try {
      const result = await this.db.query(
        `INSERT INTO users (email, password, firstName, lastName, role) 
         VALUES (?, ?, ?, ?, ?) 
         ON CONFLICT (email) DO NOTHING 
         RETURNING id`,
        ['admin@grassrootshub.com', hashedPassword, 'Admin', 'User', 'Admin']
      );
      
      if (result.rows.length > 0 || result.lastID) {
        console.log('✅ Admin user created');
      } else {
        console.log('ℹ️ Admin user already exists');
      }
    } catch (error) {
      console.error('Error seeding admin user:', error.message);
    }
  }

  async seedSampleData() {
    console.log('🌱 Seeding sample data...');
    
    // Sample coach user
    const bcrypt = require('bcrypt');
    const coachPassword = await bcrypt.hash('coach123', 10);
    
    try {
      const coachResult = await this.db.query(
        `INSERT INTO users (email, password, firstName, lastName, role) 
         VALUES (?, ?, ?, ?, ?) 
         ON CONFLICT (email) DO NOTHING 
         RETURNING id`,
        ['coach@example.com', coachPassword, 'John', 'Smith', 'Coach']
      );
      
      let coachId = coachResult.rows[0]?.id || coachResult.lastID;
      
      if (!coachId) {
        // User already exists, get their ID
        const existingCoach = await this.db.query(
          'SELECT id FROM users WHERE email = ?',
          ['coach@example.com']
        );
        coachId = existingCoach.rows[0]?.id;
      }

      // Sample team vacancy
      if (coachId) {
        await this.db.query(
          `INSERT INTO team_vacancies (title, description, league, ageGroup, position, location, contactInfo, postedBy) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'Goalkeeper Wanted - Sunday League',
            'Looking for an experienced goalkeeper to join our Sunday league team. Training twice a week, matches on Sundays.',
            'Sunday League',
            'Open Age',
            'Goalkeeper',
            'Manchester, UK',
            'coach@example.com',
            coachId
          ]
        );
      }

      // Sample player user
      const playerPassword = await bcrypt.hash('player123', 10);
      
      const playerResult = await this.db.query(
        `INSERT INTO users (email, password, firstName, lastName, role) 
         VALUES (?, ?, ?, ?, ?) 
         ON CONFLICT (email) DO NOTHING 
         RETURNING id`,
        ['player@example.com', playerPassword, 'Mike', 'Johnson', 'Player']
      );
      
      let playerId = playerResult.rows[0]?.id || playerResult.lastID;
      
      if (!playerId) {
        const existingPlayer = await this.db.query(
          'SELECT id FROM users WHERE email = ?',
          ['player@example.com']
        );
        playerId = existingPlayer.rows[0]?.id;
      }

      // Sample player availability
      if (playerId) {
        await this.db.query(
          `INSERT INTO player_availability (title, description, preferredLeagues, ageGroup, position, location, contactInfo, postedBy) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'Midfielder Available - Looking for Team',
            'Experienced central midfielder looking for a competitive team. Available weekday evenings and weekends.',
            'Premier League Youth,Community Football League',
            'U21',
            'Midfielder',
            'London, UK',
            'player@example.com',
            playerId
          ]
        );
      }

      console.log('✅ Sample data seeded successfully');
    } catch (error) {
      console.error('Error seeding sample data:', error.message);
    }
  }

  async seed() {
    console.log('🚀 Starting database seeding...\n');
    
    try {
      // Ensure tables exist
      await this.db.createTables();
      
      // Seed data
      await this.seedAdminUser();
      await this.seedLeagues();
      await this.seedSampleData();
      
      console.log('\n🎉 Database seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }

  async reset() {
    console.log('🗑️ Resetting database...');
    
    const tables = [
      'event_participants',
      'trial_invitations', 
      'calendar_events',
      'email_alerts',
      'player_availability',
      'team_vacancies',
      'user_profiles',
      'leagues',
      'users'
    ];

    try {
      for (const table of tables) {
        await this.db.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleared ${table}`);
      }
      
      console.log('🎉 Database reset completed!');
    } catch (error) {
      console.error('❌ Reset failed:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }
}

// Handle command line arguments
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  const command = process.argv[2];
  
  (async () => {
    try {
      if (command === 'reset') {
        await seeder.reset();
      } else {
        await seeder.seed();
      }
      process.exit(0);
    } catch (error) {
      console.error('Seeder failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = DatabaseSeeder;
