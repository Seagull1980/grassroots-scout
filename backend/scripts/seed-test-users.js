const Database = require('../db/database.js');
require('dotenv').config();

class TestUsersSeeder {
  constructor() {
    this.db = new Database();
  }

  async seedTestUsers() {
    console.log('👥 Seeding test users for each role...');
    
    try {
      const crypto = require('crypto');
      
      // Simple password hashing
      const hashPassword = (password) => {
        return crypto.createHash('sha256').update(password).digest('hex');
      };

      // Test Coaches
      const testCoaches = [
        {
          email: 'test.coach1@example.com',
          firstName: 'Michael',
          lastName: 'Thompson',
          password: 'coach123',
          club: 'Riverside FC',
          location: 'Manchester'
        },
        {
          email: 'test.coach2@example.com',
          firstName: 'Sarah',
          lastName: 'Mitchell',
          password: 'coach123',
          club: 'City United Youth',
          location: 'London'
        },
        {
          email: 'test.coach3@example.com',
          firstName: 'Robert',
          lastName: 'Clarke',
          password: 'coach123',
          club: 'Northside Athletic',
          location: 'Birmingham'
        }
      ];

      // Test Players
      const testPlayers = [
        {
          email: 'test.player1@example.com',
          firstName: 'Alex',
          lastName: 'Rodriguez',
          password: 'player123',
          preferredPosition: 'Midfielder',
          ageGroup: 'U21',
          location: 'Manchester'
        },
        {
          email: 'test.player2@example.com',
          firstName: 'Emma',
          lastName: 'Johnson',
          password: 'player123',
          preferredPosition: 'Forward',
          ageGroup: 'Open Age',
          location: 'London'
        },
        {
          email: 'test.player3@example.com',
          firstName: 'Daniel',
          lastName: 'Wilson',
          password: 'player123',
          preferredPosition: 'Defender',
          ageGroup: 'U18',
          location: 'Liverpool'
        },
        {
          email: 'test.player4@example.com',
          firstName: 'Sophie',
          lastName: 'Turner',
          password: 'player123',
          preferredPosition: 'Goalkeeper',
          ageGroup: 'U21',
          location: 'Birmingham'
        },
        {
          email: 'test.player5@example.com',
          firstName: 'Jake',
          lastName: 'Martinez',
          password: 'player123',
          preferredPosition: 'Midfielder',
          ageGroup: 'Over 35',
          location: 'Leeds'
        }
      ];

      // Test Parents/Guardians
      const testParents = [
        {
          email: 'test.parent1@example.com',
          firstName: 'Jennifer',
          lastName: 'Adams',
          password: 'parent123',
          childName: 'Oliver Adams',
          childAge: 'U14',
          location: 'Manchester'
        },
        {
          email: 'test.parent2@example.com',
          firstName: 'David',
          lastName: 'Brown',
          password: 'parent123',
          childName: 'Lily Brown',
          childAge: 'U12',
          location: 'London'
        },
        {
          email: 'test.parent3@example.com',
          firstName: 'Lisa',
          lastName: 'Davis',
          password: 'parent123',
          childName: 'Noah Davis',
          childAge: 'U16',
          location: 'Liverpool'
        },
        {
          email: 'test.parent4@example.com',
          firstName: 'Mark',
          lastName: 'Wilson',
          password: 'parent123',
          childName: 'Grace Wilson',
          childAge: 'U13',
          location: 'Birmingham'
        }
      ];

      // Add test coaches
      console.log('🏃‍♂️ Adding test coaches...');
      for (const coach of testCoaches) {
        const hashedPassword = hashPassword(coach.password);
        
        try {
          await this.db.query(
            `INSERT INTO users (email, password, firstName, lastName, role) 
             VALUES (?, ?, ?, ?, ?) 
             ON CONFLICT (email) DO NOTHING`,
            [coach.email, hashedPassword, coach.firstName, coach.lastName, 'Coach']
          );
          console.log(`  ✅ ${coach.firstName} ${coach.lastName} (${coach.email})`);
        } catch (error) {
          console.error(`  ❌ Error adding coach ${coach.email}:`, error.message);
        }
      }

      // Add test players
      console.log('⚽ Adding test players...');
      for (const player of testPlayers) {
        const hashedPassword = hashPassword(player.password);
        
        try {
          await this.db.query(
            `INSERT INTO users (email, password, firstName, lastName, role) 
             VALUES (?, ?, ?, ?, ?) 
             ON CONFLICT (email) DO NOTHING`,
            [player.email, hashedPassword, player.firstName, player.lastName, 'Player']
          );
          console.log(`  ✅ ${player.firstName} ${player.lastName} (${player.email}) - ${player.preferredPosition}`);
        } catch (error) {
          console.error(`  ❌ Error adding player ${player.email}:`, error.message);
        }
      }

      // Add test parents/guardians
      console.log('👨‍👩‍👧‍👦 Adding test parents/guardians...');
      for (const parent of testParents) {
        const hashedPassword = hashPassword(parent.password);
        
        try {
          await this.db.query(
            `INSERT INTO users (email, password, firstName, lastName, role) 
             VALUES (?, ?, ?, ?, ?) 
             ON CONFLICT (email) DO NOTHING`,
            [parent.email, hashedPassword, parent.firstName, parent.lastName, 'Parent/Guardian']
          );
          console.log(`  ✅ ${parent.firstName} ${parent.lastName} (${parent.email}) - Child: ${parent.childName}`);
        } catch (error) {
          console.error(`  ❌ Error adding parent ${parent.email}:`, error.message);
        }
      }

      console.log('\n🎉 Test users seeded successfully!');
      console.log('\n📋 Login Credentials Summary:');
      console.log('\n👨‍🏫 Test Coaches:');
      testCoaches.forEach(coach => {
        console.log(`  • Email: ${coach.email} | Password: ${coach.password} | Club: ${coach.club}`);
      });
      
      console.log('\n⚽ Test Players:');
      testPlayers.forEach(player => {
        console.log(`  • Email: ${player.email} | Password: ${player.password} | Position: ${player.preferredPosition} | Age: ${player.ageGroup}`);
      });
      
      console.log('\n👨‍👩‍👧‍👦 Test Parents/Guardians:');
      testParents.forEach(parent => {
        console.log(`  • Email: ${parent.email} | Password: ${parent.password} | Child: ${parent.childName} (${parent.childAge})`);
      });

      console.log('\n💡 All test accounts use simple passwords for easy testing!');
      
    } catch (error) {
      console.error('❌ Error seeding test users:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }

  async verifyTestUsers() {
    console.log('🔍 Verifying test users...\n');
    
    try {
      // Count users by role
      const roles = ['Coach', 'Player', 'Parent/Guardian', 'Admin'];
      
      for (const role of roles) {
        const result = await this.db.query(
          'SELECT COUNT(*) as count FROM users WHERE role = ?',
          [role]
        );
        console.log(`${this.getRoleEmoji(role)} ${role}: ${result.rows[0].count} users`);
      }

      // Show test users specifically
      console.log('\n🧪 Test Users (email starts with "test.")');
      const testUsers = await this.db.query(
        `SELECT email, firstName, lastName, role 
         FROM users 
         WHERE email LIKE 'test.%' 
         ORDER BY role, email`
      );
      
      testUsers.rows.forEach(user => {
        console.log(`  ${this.getRoleEmoji(user.role)} ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
      });

      console.log('\n✅ Verification completed!');
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }

  getRoleEmoji(role) {
    const emojis = {
      'Coach': '👨‍🏫',
      'Player': '⚽',
      'Parent/Guardian': '👨‍👩‍👧‍👦',
      'Admin': '👑'
    };
    return emojis[role] || '👤';
  }
}

// Handle command line execution
if (require.main === module) {
  const seeder = new TestUsersSeeder();
  const command = process.argv[2];
  
  (async () => {
    try {
      if (command === 'verify') {
        await seeder.verifyTestUsers();
      } else {
        await seeder.seedTestUsers();
      }
      process.exit(0);
    } catch (error) {
      console.error('Test users seeder failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = TestUsersSeeder;
