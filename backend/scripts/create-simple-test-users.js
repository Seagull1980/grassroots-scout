const Database = require('../db/database.js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

class SimpleTestUsers {
  constructor() {
    this.db = new Database();
  }

  async createTestUsers() {
    console.log('👥 Creating simple test users...');
    
    try {
      // Use bcrypt for password hashing (same as server.js)
      const hashPassword = async (password) => {
        return await bcrypt.hash(password, 10);
      };

      // Simple test users
      const testUsers = [
        {
          email: 'coach@test.com',
          firstName: 'Test',
          lastName: 'Coach',
          role: 'Coach',
          password: 'test123'
        },
        {
          email: 'player@test.com',
          firstName: 'Test',
          lastName: 'Player',
          role: 'Player',
          password: 'test123'
        },
        {
          email: 'parent@test.com',
          firstName: 'Test',
          lastName: 'Parent',
          role: 'Parent/Guardian',
          password: 'test123'
        }
      ];

      console.log('Adding test users...');
      
      for (const user of testUsers) {
        const hashedPassword = await hashPassword(user.password);
        
        try {
          await this.db.query(
            `INSERT INTO users (email, password, firstName, lastName, role) 
             VALUES (?, ?, ?, ?, ?) 
             ON CONFLICT (email) DO NOTHING`,
            [user.email, hashedPassword, user.firstName, user.lastName, user.role]
          );
          console.log(`  ✅ ${user.role}: ${user.email} (password: ${user.password})`);
        } catch (error) {
          console.error(`  ❌ Error adding ${user.email}:`, error.message);
        }
      }

      console.log('\n🎉 Test users created successfully!');
      console.log('\n📋 Login Credentials:');
      testUsers.forEach(user => {
        console.log(`  ${this.getRoleEmoji(user.role)} ${user.role}: ${user.email} / ${user.password}`);
      });
      
    } catch (error) {
      console.error('❌ Error creating test users:', error);
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
  const creator = new SimpleTestUsers();
  
  (async () => {
    try {
      await creator.createTestUsers();
      process.exit(0);
    } catch (error) {
      console.error('Test user creation failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = SimpleTestUsers;
