const nodemailer = require('nodemailer');
const encryptionService = require('../utils/encryption.js');

class EmailService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email templates
    this.templates = {
      emailVerification: {
        subject: 'Verify Your Grassroots Hub Account',
        html: (data) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2E7D32; margin-bottom: 10px;">⚽ Welcome to The Grassroots Hub!</h1>
                <p style="color: #666; font-size: 18px;">Please verify your email to get started</p>
              </div>
              
              <p>Hi ${data.firstName},</p>
              <p>Thanks for joining The Grassroots Hub! To complete your registration and access all features, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/verify-email/${data.token}" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Verify My Email
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/verify-email/${data.token}">${process.env.FRONTEND_URL || 'http://localhost:5174'}/verify-email/${data.token}</a>
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This verification link will expire in 24 hours. If you didn't create an account with us, you can safely ignore this email.
              </p>
              
              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #999; font-size: 12px;">
                <p>Best regards,<br>The Grassroots Hub Team</p>
              </div>
            </div>
          </div>
        `
      },
      
      newVacancy: {
        subject: '⚽ New Team Vacancy Match Found!',
        html: (data) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32; margin-bottom: 20px;">🎯 New Team Vacancy Found!</h2>
              <p>Hi ${data.playerName},</p>
              <p>We found a new team vacancy that matches your preferences:</p>
              
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2E7D32; margin-top: 0;">${data.vacancy.title}</h3>
                <p><strong>Position:</strong> ${data.vacancy.position}</p>
                <p><strong>League:</strong> ${data.vacancy.league}</p>
                <p><strong>Age Group:</strong> ${data.vacancy.ageGroup}</p>
                <p><strong>Location:</strong> ${data.vacancy.location}</p>
                <p><strong>Description:</strong> ${data.vacancy.description}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/search?tab=vacancies&id=${data.vacancy.id}" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  View Vacancy Details
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                You're receiving this because you have alerts enabled for similar opportunities. 
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile/alerts">Manage your alert preferences</a>
              </p>
            </div>
          </div>
        `
      },

      newPlayerAlert: {
        subject: '🎯 New Player Available!',
        html: (data) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32; margin-bottom: 20px;">🌟 New Player Available!</h2>
              <p>Hi ${data.coachName},</p>
              <p>A new player matching your team requirements is now available:</p>
              
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2E7D32; margin-top: 0;">${data.player.title}</h3>
                <p><strong>Positions:</strong> ${data.player.positions.join(', ')}</p>
                <p><strong>Preferred League:</strong> ${data.player.preferredLeagues}</p>
                <p><strong>Age Group:</strong> ${data.player.ageGroup}</p>
                <p><strong>Location:</strong> ${data.player.location}</p>
                <p><strong>Description:</strong> ${data.player.description}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/search?tab=players&id=${data.player.id}" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  View Player Profile
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                You're receiving this because you have alerts enabled for player availability. 
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile/alerts">Manage your alert preferences</a>
              </p>
            </div>
          </div>
        `
      },

      weeklyDigest: {
        subject: '📊 Your Weekly Grassroots Hub Activity',
        html: (data) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32; margin-bottom: 20px;">📊 Your Weekly Activity Summary</h2>
              <p>Hi ${data.userName},</p>
              <p>Here's what happened in your grassroots football network this week:</p>
              
              <div style="display: flex; justify-content: space-between; margin: 30px 0;">
                <div style="text-align: center; flex: 1;">
                  <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 10px;">
                    <h3 style="color: #1976d2; margin: 0; font-size: 24px;">${data.stats.newVacancies}</h3>
                    <p style="margin: 5px 0; color: #666;">New Vacancies</p>
                  </div>
                </div>
                <div style="text-align: center; flex: 1;">
                  <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 10px;">
                    <h3 style="color: #2E7D32; margin: 0; font-size: 24px;">${data.stats.newPlayers}</h3>
                    <p style="margin: 5px 0; color: #666;">New Players</p>
                  </div>
                </div>
                <div style="text-align: center; flex: 1;">
                  <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 10px;">
                    <h3 style="color: #f57c00; margin: 0; font-size: 24px;">${data.stats.matches}</h3>
                    <p style="margin: 5px 0; color: #666;">Successful Matches</p>
                  </div>
                </div>
              </div>

              ${data.recommendations.length > 0 ? `
                <div style="margin: 30px 0;">
                  <h3 style="color: #2E7D32;">🎯 Recommended for You</h3>
                  ${data.recommendations.map(rec => `
                    <div style="border-left: 4px solid #2E7D32; padding-left: 15px; margin: 15px 0;">
                      <strong>${rec.title}</strong><br>
                      <span style="color: #666;">${rec.description}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Visit Your Dashboard
                </a>
              </div>
            </div>
          </div>
        `
      },

      trialInvitation: {
        subject: '⚽ Trial Invitation!',
        html: (data) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32; margin-bottom: 20px;">🎉 You've Been Invited to a Trial!</h2>
              <p>Hi ${data.playerName},</p>
              <p>Coach ${data.coachName} has invited you to attend a trial session:</p>
              
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2E7D32; margin-top: 0;">${data.trial.title}</h3>
                <p><strong>Date:</strong> ${new Date(data.trial.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.trial.startTime} - ${data.trial.endTime}</p>
                <p><strong>Location:</strong> ${data.trial.location}</p>
                <p><strong>Age Group:</strong> ${data.trial.ageGroup}</p>
                <p><strong>Positions:</strong> ${data.trial.positions.join(', ')}</p>
                ${data.trial.requirements ? `<p><strong>Requirements:</strong> ${data.trial.requirements}</p>` : ''}
                ${data.message ? `<p><strong>Message from Coach:</strong> ${data.message}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/trials" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin: 0 10px;">
                  View Trial Details
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Please respond to this invitation as soon as possible. Good luck with your trial!
              </p>
            </div>
          </div>
        `
      },

      reengagement: {
        subject: '⚽ We Miss You at The Grassroots Hub!',
        html: (data) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32; margin-bottom: 20px;">⚽ We Miss You!</h2>
              <p>Hi ${data.userName},</p>
              <p>It's been ${data.daysSinceLastVisit} days since your last visit to The Grassroots Hub, and we wanted to let you know what you've been missing!</p>
              
              ${data.recentActivity.length > 0 ? `
                <div style="margin: 30px 0;">
                  <h3 style="color: #2E7D32;">🌟 Recent Activity Perfect for ${data.userRole}s</h3>
                  ${data.recentActivity.map(activity => `
                    <div style="border-left: 4px solid #2E7D32; padding-left: 15px; margin: 15px 0; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                      <strong style="color: #2E7D32;">${activity.title}</strong><br>
                      <span style="color: #666;">${activity.description}</span><br>
                      <small style="color: #999;">${new Date(activity.date).toLocaleDateString()}</small>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2E7D32; margin-top: 0;">🎯 Don't Miss Out!</h3>
                <p>The grassroots football community is growing every day. Come back and:</p>
                <ul style="color: #666;">
                  <li>Discover new ${data.userRole === 'Coach' ? 'talented players' : 'team opportunities'}</li>
                  <li>Connect with your local football community</li>
                  <li>Set up personalized alerts so you never miss a match</li>
                  <li>Track your activity and progress</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Welcome Back to The Hub!
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If you no longer want to receive these emails, you can 
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile/alerts">update your email preferences</a> 
                or <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe">unsubscribe</a>.
              </p>
            </div>
          </div>
        `
      }
    };
  }

  async sendEmail(to, template, data) {
    try {
      const templateConfig = this.templates[template];
      if (!templateConfig) {
        throw new Error(`Template '${template}' not found`);
      }

      const mailOptions = {
        from: `"The Grassroots Hub" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: templateConfig.subject,
        html: templateConfig.html(data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}: ${template}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendVerificationEmail(email, firstName, token) {
    return this.sendEmail(email, 'emailVerification', {
      firstName,
      token
    });
  }

  async sendNewVacancyAlert(playerEmail, playerName, vacancy) {
    return this.sendEmail(playerEmail, 'newVacancy', {
      playerName,
      vacancy
    });
  }

  async sendNewPlayerAlert(coachEmail, coachName, player) {
    return this.sendEmail(coachEmail, 'newPlayerAlert', {
      coachName,
      player
    });
  }

  async sendTrialInvitation(playerEmail, playerName, coachName, trial, message) {
    return this.sendEmail(playerEmail, 'trialInvitation', {
      playerName,
      coachName,
      trial,
      message
    });
  }

  async sendWeeklyDigest(userEmail, userName, stats, recommendations) {
    return this.sendEmail(userEmail, 'weeklyDigest', {
      userName,
      stats,
      recommendations
    });
  }

  async sendAdminMessage(userEmail, firstName, subject, message) {
    try {
      const mailOptions = {
        from: `"The Grassroots Hub Admin" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `[Admin Message] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="background-color: #d32f2f; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h2 style="margin: 0;">📧 Message from Administrator</h2>
              </div>
              
              <p>Hi ${firstName},</p>
              <p>You have received a message from The Grassroots Hub administration team:</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
                <h3 style="color: #d32f2f; margin-top: 0;">${subject}</h3>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If you have any questions or concerns, please reply to this email or contact our support team.
              </p>
              
              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #999; font-size: 12px;">
                <p>Best regards,<br>The Grassroots Hub Admin Team</p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Admin message sent successfully to ${userEmail}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send admin message to ${userEmail}:`, error);
      throw error;
    }
  }

  async sendBetaAccessGranted(userEmail, firstName) {
    try {
      const mailOptions = {
        from: `"The Grassroots Hub" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '🎉 Welcome to The Grassroots Hub Beta!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2E7D32; margin-bottom: 10px;">🎉 Beta Access Granted!</h1>
                <p style="color: #666; font-size: 18px;">You're in! Welcome to The Grassroots Hub</p>
              </div>
              
              <p>Hi ${firstName},</p>
              
              <p>Great news! Your account has been approved for beta access to The Grassroots Hub.</p>
              
              <div style="background-color: #e8f5e9; padding: 20px; border-left: 4px solid #2E7D32; margin: 20px 0;">
                <h3 style="color: #2E7D32; margin-top: 0;">What's Next?</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Log in to your account and explore all features</li>
                  <li>Complete your profile to get better matches</li>
                  <li>Start posting team vacancies or player availability</li>
                  <li>Use our search filters to find the perfect match</li>
                  <li>Share your feedback to help us improve</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/login" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Log In Now
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                As a beta tester, your feedback is invaluable. If you encounter any issues or have suggestions, 
                please use the feedback feature in the app or reply to this email.
              </p>
              
              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #999; font-size: 12px;">
                <p>Best regards,<br>The Grassroots Hub Team</p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Beta access granted email sent to ${userEmail}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send beta access email to ${userEmail}:`, error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
