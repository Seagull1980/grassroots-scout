const Database = require('../db/database.js');
require('dotenv').config();

class UndoTestUsers {
  constructor() {
    this.db = new Database();
  }

  async removeTestUsers() {
    console.log('🗑️ Removing test users...');
    
    try {
      // Get list of test users before deletion
      const testUsers = await this.db.query(
        `SELECT email, firstName, lastName, role 
         FROM users 
         WHERE email LIKE 'test.%' 
         ORDER BY role, email`
      );
      
      if (testUsers.rows.length === 0) {
        console.log('ℹ️ No test users found to remove.');
        return;
      }
      
      console.log(`\n📋 Found ${testUsers.rows.length} test users to remove:`);
      testUsers.rows.forEach(user => {
        console.log(`  ${this.getRoleEmoji(user.role)} ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
      });
      
      // Remove test users
      const result = await this.db.query(
        `DELETE FROM users WHERE email LIKE 'test.%'`
      );
      
      console.log(`\n✅ Removed ${result.rowCount || testUsers.rows.length} test users successfully!`);
      
      // Verify removal
      const remainingTestUsers = await this.db.query(
        `SELECT COUNT(*) as count FROM users WHERE email LIKE 'test.%'`
      );
      
      if (remainingTestUsers.rows[0].count === 0) {
        console.log('✅ Verification: All test users have been removed.');
      } else {
        console.log(`⚠️ Warning: ${remainingTestUsers.rows[0].count} test users still remain.`);
      }
      
      // Show current user counts
      console.log('\n📊 Current user counts:');
      const roles = ['Coach', 'Player', 'Parent/Guardian', 'Admin'];
      
      for (const role of roles) {
        const roleCount = await this.db.query(
          'SELECT COUNT(*) as count FROM users WHERE role = ?',
          [role]
        );
        console.log(`  ${this.getRoleEmoji(role)} ${role}: ${roleCount.rows[0].count} users`);
      }
      
    } catch (error) {
      console.error('❌ Error removing test users:', error);
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
  const undoer = new UndoTestUsers();
  
  (async () => {
    try {
      await undoer.removeTestUsers();
      process.exit(0);
    } catch (error) {
      console.error('Undo test users failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = UndoTestUsers;
