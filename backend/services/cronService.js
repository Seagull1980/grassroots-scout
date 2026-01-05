const cron = require('node-cron');
const alertService = require('./alertService.js');

class CronService {
  constructor(db = null) {
    this.jobs = [];
    this.db = db;
  }

  // Initialize all cron jobs
  init() {
    console.log('🕐 Initializing cron jobs...');

    // Weekly digest emails - Every Sunday at 9 AM
    const weeklyDigestJob = cron.schedule('0 9 * * 0', async () => {
      console.log('📊 Running weekly digest job...');
      try {
        await alertService.sendWeeklyDigests();
        console.log('✅ Weekly digest job completed');
      } catch (error) {
        console.error('❌ Weekly digest job failed:', error);
      }
    }, {
      scheduled: false
    });

    // Daily engagement cleanup - Every day at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running daily cleanup job...');
      try {
        await this.cleanupOldData();
        console.log('✅ Daily cleanup job completed');
      } catch (error) {
        console.error('❌ Daily cleanup job failed:', error);
      }
    }, {
      scheduled: false
    });

    // Inactive user re-engagement - Every Wednesday at 10 AM
    const reengagementJob = cron.schedule('0 10 * * 3', async () => {
      console.log('🔄 Running re-engagement job...');
      try {
        await this.sendReengagementEmails();
        console.log('✅ Re-engagement job completed');
      } catch (error) {
        console.error('❌ Re-engagement job failed:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs = [
      { name: 'weeklyDigest', job: weeklyDigestJob },
      { name: 'cleanup', job: cleanupJob },
      { name: 'reengagement', job: reengagementJob }
    ];

    console.log('✅ Cron jobs initialized');
  }

  // Start all cron jobs
  start() {
    console.log('▶️ Starting cron jobs...');
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`✅ Started ${name} job`);
    });
  }

  // Stop all cron jobs
  stop() {
    console.log('⏹️ Stopping cron jobs...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`🛑 Stopped ${name} job`);
    });
  }

  // Clean up old data to maintain database performance
  async cleanupOldData() {
    if (!this.db) {
      console.error('❌ No database instance available for cleanup');
      return;
    }

    try {
      // Delete old page views (older than 6 months)
      await this.db.query(
        "DELETE FROM page_views WHERE timestamp < datetime('now', '-6 months')"
      );

      // Delete old user sessions (older than 3 months)
      await this.db.query(
        "DELETE FROM user_sessions WHERE startTime < datetime('now', '-3 months')"
      );

      // Delete old search history (older than 1 year)
      await this.db.query(
        "DELETE FROM user_search_history WHERE searchedAt < datetime('now', '-1 year')"
      );

      // Delete processed notification queue items (older than 1 month)
      await this.db.query(
        "DELETE FROM notification_queue WHERE status = 'processed' AND processedAt < datetime('now', '-1 month')"
      );

      // Delete old alert logs (older than 1 year)
      await this.db.query(
        "DELETE FROM alert_logs WHERE sentAt < datetime('now', '-1 year')"
      );

      console.log('✅ Old data cleanup completed');
    } catch (error) {
      console.error('❌ Data cleanup failed:', error);
      throw error;
    }
  }

  // Send re-engagement emails to inactive users
  async sendReengagementEmails() {
    if (!this.db) {
      console.error('❌ No database instance available for re-engagement');
      return;
    }

    const emailService = require('./emailService.js');
    const encryptionService = require('../utils/encryption.js');

    try {
      // Find users who haven't logged in for 30 days but have alert preferences
      const inactiveUsers = await this.db.query(`
        SELECT DISTINCT u.id, u.email, u.firstName, u.role
        FROM users u
        JOIN user_alert_preferences uap ON u.id = uap.userId
        LEFT JOIN page_views pv ON u.id = pv.userId AND pv.timestamp > datetime('now', '-30 days')
        WHERE uap.emailNotifications = 1
        AND pv.userId IS NULL
        AND u.createdAt < datetime('now', '-7 days')
      `);

      for (const user of inactiveUsers.rows) {
        try {
          // Get recent activity in the platform that might interest them
          let recentActivity = [];
          
          if (user.role === 'Player' || user.role === 'Parent/Guardian') {
            const vacancies = await db.query(`
              SELECT title, league, position, ageGroup, createdAt
              FROM team_vacancies 
              WHERE createdAt > datetime('now', '-7 days') AND status = 'active'
              ORDER BY createdAt DESC 
              LIMIT 3
            `);
            recentActivity = vacancies.rows.map(v => ({
              title: `New ${v.position} opportunity in ${v.league}`,
              description: `${v.ageGroup} team looking for players`,
              date: v.createdAt
            }));
          } else if (user.role === 'Coach') {
            const players = await db.query(`
              SELECT title, preferredLeagues, ageGroup, createdAt
              FROM player_availability 
              WHERE createdAt > datetime('now', '-7 days') AND status = 'active'
              ORDER BY createdAt DESC 
              LIMIT 3
            `);
            recentActivity = players.rows.map(p => ({
              title: `New player available for ${p.preferredLeagues}`,
              description: `${p.ageGroup} player looking for opportunities`,
              date: p.createdAt
            }));
          }

          if (recentActivity.length > 0) {
            const email = encryptionService.decrypt(user.email);
            
            // Send re-engagement email
            await emailService.sendEmail(email, 'reengagement', {
              userName: user.firstName,
              userRole: user.role,
              recentActivity,
              daysSinceLastVisit: 30
            });

            console.log(`✅ Sent re-engagement email to ${email}`);
          }

        } catch (error) {
          console.error(`Failed to send re-engagement email to user ${user.id}:`, error);
        }
      }

      console.log(`✅ Re-engagement emails sent to ${inactiveUsers.rows.length} inactive users`);
      
    } catch (error) {
      console.error('❌ Re-engagement email job failed:', error);
      throw error;
    }
  }

  // Manual trigger for testing
  async triggerWeeklyDigest() {
    console.log('🧪 Manually triggering weekly digest...');
    await alertService.sendWeeklyDigests();
  }

  async triggerCleanup() {
    console.log('🧪 Manually triggering cleanup...');
    await this.cleanupOldData();
  }

  async triggerReengagement() {
    console.log('🧪 Manually triggering re-engagement...');
    await this.sendReengagementEmails();
  }
}

module.exports = new CronService();
