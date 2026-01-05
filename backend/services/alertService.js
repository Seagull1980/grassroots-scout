const Database = require('../db/database.js');
const emailService = require('./emailService.js');
const encryptionService = require('../utils/encryption.js');

class AlertService {
  constructor() {
    this.db = new Database();
  }

  // Create or update user alert preferences
  async setAlertPreferences(userId, preferences) {
    try {
      const {
        emailNotifications = true,
        newVacancyAlerts = true,
        newPlayerAlerts = true,
        trialInvitations = true,
        weeklyDigest = true,
        instantAlerts = false,
        // Filter preferences
        preferredLeagues = [],
        ageGroups = [],
        positions = [],
        maxDistance = 50
      } = preferences;

      // Check if user already has alert preferences
      const existing = await this.db.query(
        'SELECT id FROM user_alert_preferences WHERE userId = ?',
        [userId]
      );

      const alertData = [
        emailNotifications ? 1 : 0,
        newVacancyAlerts ? 1 : 0,
        newPlayerAlerts ? 1 : 0,
        trialInvitations ? 1 : 0,
        weeklyDigest ? 1 : 0,
        instantAlerts ? 1 : 0,
        JSON.stringify(preferredLeagues),
        JSON.stringify(ageGroups),
        JSON.stringify(positions),
        maxDistance,
        new Date().toISOString()
      ];

      if (existing.rows.length > 0) {
        await this.db.query(`
          UPDATE user_alert_preferences SET
            emailNotifications = ?, newVacancyAlerts = ?, newPlayerAlerts = ?,
            trialInvitations = ?, weeklyDigest = ?, instantAlerts = ?,
            preferredLeagues = ?, ageGroups = ?, positions = ?, maxDistance = ?,
            updatedAt = ?
          WHERE userId = ?
        `, [...alertData, userId]);
      } else {
        await this.db.query(`
          INSERT INTO user_alert_preferences (
            userId, emailNotifications, newVacancyAlerts, newPlayerAlerts,
            trialInvitations, weeklyDigest, instantAlerts, preferredLeagues,
            ageGroups, positions, maxDistance, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, ...alertData]);
      }

      return { success: true };
    } catch (error) {
      console.error('Error setting alert preferences:', error);
      throw error;
    }
  }

  // Get user alert preferences
  async getAlertPreferences(userId) {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_alert_preferences WHERE userId = ?',
        [userId]
      );

      if (result.rows.length === 0) {
        // Return default preferences
        return {
          emailNotifications: true,
          newVacancyAlerts: true,
          newPlayerAlerts: true,
          trialInvitations: true,
          weeklyDigest: true,
          instantAlerts: false,
          preferredLeagues: [],
          ageGroups: [],
          positions: [],
          maxDistance: 50
        };
      }

      const prefs = result.rows[0];
      return {
        emailNotifications: Boolean(prefs.emailNotifications),
        newVacancyAlerts: Boolean(prefs.newVacancyAlerts),
        newPlayerAlerts: Boolean(prefs.newPlayerAlerts),
        trialInvitations: Boolean(prefs.trialInvitations),
        weeklyDigest: Boolean(prefs.weeklyDigest),
        instantAlerts: Boolean(prefs.instantAlerts),
        preferredLeagues: JSON.parse(prefs.preferredLeagues || '[]'),
        ageGroups: JSON.parse(prefs.ageGroups || '[]'),
        positions: JSON.parse(prefs.positions || '[]'),
        maxDistance: prefs.maxDistance || 50
      };
    } catch (error) {
      console.error('Error getting alert preferences:', error);
      throw error;
    }
  }

  // Send alerts for new vacancy
  async sendNewVacancyAlerts(vacancy) {
    try {
      // Find users who should receive alerts for this vacancy
      const query = `
        SELECT DISTINCT u.id, u.email, u.firstName, uap.*
        FROM users u
        JOIN user_alert_preferences uap ON u.id = uap.userId
        WHERE u.role IN ('Player', 'Parent/Guardian')
        AND uap.emailNotifications = 1
        AND uap.newVacancyAlerts = 1
        AND (
          uap.preferredLeagues = '[]' OR 
          uap.preferredLeagues LIKE '%"${vacancy.league}"%'
        )
        AND (
          uap.ageGroups = '[]' OR 
          uap.ageGroups LIKE '%"${vacancy.ageGroup}"%'
        )
        AND (
          uap.positions = '[]' OR 
          uap.positions LIKE '%"${vacancy.position}"%'
        )
      `;

      const users = await this.db.query(query);
      
      const emailPromises = users.rows.map(async (user) => {
        try {
          const email = encryptionService.decrypt(user.email);
          await emailService.sendNewVacancyAlert(email, user.firstName, vacancy);
          
          // Log the alert
          await this.db.query(`
            INSERT INTO alert_logs (userId, alertType, targetId, targetType, sentAt)
            VALUES (?, 'new_vacancy', ?, 'vacancy', ?)
          `, [user.id, vacancy.id, new Date().toISOString()]);
          
        } catch (error) {
          console.error(`Failed to send vacancy alert to user ${user.id}:`, error);
        }
      });

      await Promise.all(emailPromises);
      console.log(`✅ Sent vacancy alerts to ${users.rows.length} users`);
      
    } catch (error) {
      console.error('Error sending vacancy alerts:', error);
      throw error;
    }
  }

  // Send alerts for new player availability
  async sendNewPlayerAlerts(playerAvailability) {
    try {
      // Find coaches who should receive alerts for this player
      const query = `
        SELECT DISTINCT u.id, u.email, u.firstName, uap.*
        FROM users u
        JOIN user_alert_preferences uap ON u.id = uap.userId
        WHERE u.role = 'Coach'
        AND uap.emailNotifications = 1
        AND uap.newPlayerAlerts = 1
        AND (
          uap.preferredLeagues = '[]' OR 
          uap.preferredLeagues LIKE '%"${playerAvailability.preferredLeagues}"%'
        )
        AND (
          uap.ageGroups = '[]' OR 
          uap.ageGroups LIKE '%"${playerAvailability.ageGroup}"%'
        )
      `;

      const coaches = await this.db.query(query);
      
      const emailPromises = coaches.rows.map(async (coach) => {
        try {
          const email = encryptionService.decrypt(coach.email);
          await emailService.sendNewPlayerAlert(email, coach.firstName, playerAvailability);
          
          // Log the alert
          await this.db.query(`
            INSERT INTO alert_logs (userId, alertType, targetId, targetType, sentAt)
            VALUES (?, 'new_player', ?, 'player_availability', ?)
          `, [coach.id, playerAvailability.id, new Date().toISOString()]);
          
        } catch (error) {
          console.error(`Failed to send player alert to coach ${coach.id}:`, error);
        }
      });

      await Promise.all(emailPromises);
      console.log(`✅ Sent player alerts to ${coaches.rows.length} coaches`);
      
    } catch (error) {
      console.error('Error sending player alerts:', error);
      throw error;
    }
  }

  // Send trial invitation notification
  async sendTrialInvitationAlert(playerId, coachName, trial, message) {
    try {
      // Get player details and alert preferences
      const userResult = await this.db.query(`
        SELECT u.email, u.firstName, uap.trialInvitations, uap.emailNotifications
        FROM users u
        LEFT JOIN user_alert_preferences uap ON u.id = uap.userId
        WHERE u.id = ?
      `, [playerId]);

      if (userResult.rows.length === 0) return;
      
      const user = userResult.rows[0];
      const shouldSendEmail = user.trialInvitations !== 0 && user.emailNotifications !== 0;

      if (shouldSendEmail) {
        const email = encryptionService.decrypt(user.email);
        await emailService.sendTrialInvitation(
          email, 
          user.firstName, 
          coachName, 
          trial, 
          message
        );

        // Log the alert
        await this.db.query(`
          INSERT INTO alert_logs (userId, alertType, targetId, targetType, sentAt)
          VALUES (?, 'trial_invitation', ?, 'trial', ?)
        `, [playerId, trial.id, new Date().toISOString()]);
      }
      
    } catch (error) {
      console.error('Error sending trial invitation alert:', error);
      throw error;
    }
  }

  // Send weekly digest emails
  async sendWeeklyDigests() {
    try {
      console.log('📊 Starting weekly digest generation...');
      
      // Get users who want weekly digests
      const usersResult = await this.db.query(`
        SELECT u.id, u.email, u.firstName, u.role
        FROM users u
        JOIN user_alert_preferences uap ON u.id = uap.userId
        WHERE uap.emailNotifications = 1 AND uap.weeklyDigest = 1
      `);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      for (const user of usersResult.rows) {
        try {
          // Get weekly stats
          const [vacanciesResult, playersResult, matchesResult] = await Promise.all([
            this.db.query('SELECT COUNT(*) as count FROM team_vacancies WHERE createdAt > ?', [weekAgo]),
            this.db.query('SELECT COUNT(*) as count FROM player_availability WHERE createdAt > ?', [weekAgo]),
            this.db.query('SELECT COUNT(*) as count FROM match_completions WHERE completedAt > ?', [weekAgo])
          ]);

          const stats = {
            newVacancies: vacanciesResult.rows[0]?.count || 0,
            newPlayers: playersResult.rows[0]?.count || 0,
            matches: matchesResult.rows[0]?.count || 0
          };

          // Get personalized recommendations based on user role
          let recommendations = [];
          if (user.role === 'Player' || user.role === 'Parent/Guardian') {
            const vacancyRecommendations = await this.db.query(`
              SELECT title, description, league, ageGroup, position
              FROM team_vacancies 
              WHERE createdAt > ? AND status = 'active'
              ORDER BY createdAt DESC 
              LIMIT 3
            `, [weekAgo]);
            
            recommendations = vacancyRecommendations.rows.map(v => ({
              title: `${v.position} needed at ${v.league}`,
              description: `${v.ageGroup} team looking for players`
            }));
          } else if (user.role === 'Coach') {
            const playerRecommendations = await this.db.query(`
              SELECT title, description, preferredLeagues, ageGroup
              FROM player_availability 
              WHERE createdAt > ? AND status = 'active'
              ORDER BY createdAt DESC 
              LIMIT 3
            `, [weekAgo]);
            
            recommendations = playerRecommendations.rows.map(p => ({
              title: `New player available - ${p.preferredLeagues}`,
              description: `${p.ageGroup} player looking for team`
            }));
          }

          // Send digest email
          const email = encryptionService.decrypt(user.email);
          await emailService.sendWeeklyDigest(email, user.firstName, stats, recommendations);

          // Log the digest
          await this.db.query(`
            INSERT INTO alert_logs (userId, alertType, targetId, targetType, sentAt)
            VALUES (?, 'weekly_digest', ?, 'digest', ?)
          `, [user.id, 0, new Date().toISOString()]);

        } catch (error) {
          console.error(`Failed to send weekly digest to user ${user.id}:`, error);
        }
      }

      console.log(`✅ Weekly digests sent to ${usersResult.rows.length} users`);
      
    } catch (error) {
      console.error('Error sending weekly digests:', error);
      throw error;
    }
  }
}

module.exports = new AlertService();
