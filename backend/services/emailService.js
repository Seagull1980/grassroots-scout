const nodemailer = require('nodemailer');
const crypto = require('crypto');
const encryptionService = require('../utils/encryption.js');

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

const normalizeUrl = (url) => (url || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');
const DEFAULT_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_SMTP_PORT = 465;
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 8000);

const parseBooleanEnv = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return fallback;
};

class EmailService {
  constructor() {
    this.auditLogger = null;
    this.frontendUrl = normalizeUrl(process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL);
    this.resendApiKey = process.env.RESEND_API_KEY || '';
    this.useResendFirst = parseBooleanEnv(process.env.EMAIL_USE_RESEND, Boolean(this.resendApiKey));
    const smtpHost = process.env.SMTP_HOST || DEFAULT_SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT);
    const smtpSecure = parseBooleanEnv(process.env.SMTP_SECURE, smtpPort === 465);
    const smtpUser = process.env.EMAIL_USER;
    const smtpPass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

    this.smtpConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      pass: smtpPass
    };

    // Configure email transporter with timeout and retry settings
    this.transporter = nodemailer.createTransport(this.createTransportConfig(this.smtpConfig));
    this.fallbackTransporter = this.createFallbackTransporter();

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
                <a href="${this.frontendUrl}/verify-email/${data.token}" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Verify My Email
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <a href="${this.frontendUrl}/verify-email/${data.token}">${this.frontendUrl}/verify-email/${data.token}</a>
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
                <a href="${this.frontendUrl}/search?tab=vacancies&id=${data.vacancy.id}" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  View Vacancy Details
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                You're receiving this because you have alerts enabled for similar opportunities. 
                <a href="${this.frontendUrl}/alert-preferences">Manage your alert preferences</a>
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
                <a href="${this.frontendUrl}/search?tab=players&id=${data.player.id}" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  View Player Profile
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                You're receiving this because you have alerts enabled for player availability. 
                <a href="${this.frontendUrl}/alert-preferences">Manage your alert preferences</a>
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
                <a href="${this.frontendUrl}/dashboard" 
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
                <a href="${this.frontendUrl}/calendar" 
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
                <a href="${this.frontendUrl}/dashboard" 
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Welcome Back to The Hub!
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Manage these emails from your account settings:
                <a href="${this.frontendUrl}/alert-preferences"> update your alert preferences</a>.
              </p>
            </div>
          </div>
        `
      },

      passwordReset: {
        subject: 'Reset Your Password - The Grassroots Hub',
        html: (data) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32; margin-bottom: 20px;">Password Reset Request</h2>
              <p>Hello ${data.firstName},</p>
              <p>We received a request to reset your password. Click the button below to choose a new one:</p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${this.frontendUrl}/reset-password/${data.token}"
                   style="background-color: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${this.frontendUrl}/reset-password/${data.token}">${this.frontendUrl}/reset-password/${data.token}</a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</p>
              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #999; font-size: 12px;">
                <p>Best regards,<br>The Grassroots Hub Team</p>
              </div>
            </div>
          </div>
        `
      },

      trialResponse: {
        subject: (data) => `Trial Invitation ${data.status === 'accepted' ? 'Accepted' : 'Declined'} - ${data.trialTitle}`,
        html: (data) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32; margin-bottom: 20px;">Trial Invitation ${data.status === 'accepted' ? 'Accepted ✅' : 'Declined ❌'}</h2>
              <p>Hi ${data.coachName},</p>
              <p><strong>${data.playerName}</strong> has <strong>${data.status}</strong> your trial invitation for:</p>
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2E7D32; margin-top: 0;">${data.trialTitle}</h3>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${this.frontendUrl}/calendar"
                   style="background-color: #2E7D32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  View Your Calendar
                </a>
              </div>
              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #999; font-size: 12px;">
                <p>Best regards,<br>The Grassroots Hub Team</p>
              </div>
            </div>
          </div>
        `
      }
    };
  }

  setAuditLogger(auditLogger) {
    this.auditLogger = typeof auditLogger === 'function' ? auditLogger : null;
  }

  async recordAuditEntry(entry) {
    if (!this.auditLogger) {
      return;
    }

    try {
      await this.auditLogger(entry);
    } catch (error) {
      console.error('⚠️ Failed to write email audit log:', error.message);
    }
  }

  getFromAddress(fallbackName = 'The Grassroots Hub') {
    return process.env.EMAIL_FROM || `"${fallbackName}" <${process.env.EMAIL_USER || 'noreply@grassrootshub.com'}>`;
  }

  normalizeRecipient(recipient) {
    if (!recipient || typeof recipient !== 'string') {
      return recipient;
    }

    const decrypted = encryptionService.decrypt(recipient);
    return typeof decrypted === 'string' ? decrypted.trim() : recipient;
  }

  hashRecipient(recipient) {
    if (!recipient || typeof recipient !== 'string') {
      return null;
    }

    return crypto.createHash('sha256').update(recipient.toLowerCase().trim()).digest('hex');
  }

  maskRecipient(recipient) {
    if (!recipient || typeof recipient !== 'string') {
      return recipient;
    }

    const normalized = recipient.trim();
    const atIndex = normalized.indexOf('@');
    if (atIndex <= 0) {
      return '[redacted]';
    }

    const localPart = normalized.slice(0, atIndex);
    const domainPart = normalized.slice(atIndex + 1);
    const first = localPart.charAt(0);
    const last = localPart.length > 1 ? localPart.charAt(localPart.length - 1) : '';
    const maskedLocal = `${first}***${last}`;

    return `${maskedLocal}@${domainPart}`;
  }

  createTransportConfig(config) {
    return {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      requireTLS: !config.secure,
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS
    };
  }

  createFallbackTransporter() {
    // Gmail sometimes fails on implicit TLS (465) in hosted environments.
    // Retry once using STARTTLS on 587 when primary transport is Gmail+465.
    if (this.smtpConfig.host !== 'smtp.gmail.com' || this.smtpConfig.port !== 465) {
      return null;
    }

    return nodemailer.createTransport(this.createTransportConfig({
      ...this.smtpConfig,
      port: 587,
      secure: false
    }));
  }

  shouldRetryWithFallback(error) {
    if (!error || !error.code) {
      return false;
    }

    return ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION'].includes(error.code);
  }

  async sendViaResend(mailOptions) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: mailOptions.from,
        to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text
      })
    });

    if (!response.ok) {
      let details = '';
      try {
        details = await response.text();
      } catch (error) {
        details = '';
      }

      const resendError = new Error(`Resend API error ${response.status}${details ? `: ${details}` : ''}`);
      resendError.code = 'ERESEND';
      throw resendError;
    }

    const result = await response.json();
    return { messageId: result.id || null };
  }

  async sendMailWithAudit(mailOptions, context = {}) {
    const normalizedTo = this.normalizeRecipient(mailOptions.to);
    const recipientHash = this.hashRecipient(normalizedTo);
    const contextMetadata = context.metadata && typeof context.metadata === 'object'
      ? context.metadata
      : {};
    const normalizedMailOptions = {
      ...mailOptions,
      to: normalizedTo
    };
    const baseAudit = {
      recipientEmail: this.maskRecipient(normalizedTo),
      templateName: context.templateName || 'custom',
      subject: normalizedMailOptions.subject || null,
      provider: 'smtp',
      metadata: {
        ...contextMetadata,
        recipientEmailHash: recipientHash
      }
    };

    try {
      if (this.useResendFirst && this.resendApiKey) {
        try {
          const resendResult = await this.sendViaResend(normalizedMailOptions);

          await this.recordAuditEntry({
            ...baseAudit,
            status: 'sent',
            messageId: resendResult.messageId,
            errorCode: null,
            errorMessage: null,
            provider: 'resend'
          });

          return resendResult;
        } catch (resendError) {
          console.warn(`⚠️ Resend delivery failed (${resendError.code || 'ERESEND'}). Falling back to SMTP.`);
        }
      }

      const result = await this.transporter.sendMail(normalizedMailOptions);

      await this.recordAuditEntry({
        ...baseAudit,
        status: 'sent',
        messageId: result.messageId || null,
        errorCode: null,
        errorMessage: null
      });

      return result;
    } catch (error) {
      if (this.fallbackTransporter && this.shouldRetryWithFallback(error)) {
        try {
          console.warn(`⚠️ Primary SMTP transport failed (${error.code || 'unknown'}). Retrying with STARTTLS fallback on port 587.`);
          const fallbackResult = await this.fallbackTransporter.sendMail(normalizedMailOptions);

          await this.recordAuditEntry({
            ...baseAudit,
            status: 'sent',
            messageId: fallbackResult.messageId || null,
            errorCode: null,
            errorMessage: null,
            provider: 'smtp-fallback',
            metadata: {
              ...baseAudit.metadata,
              fallbackUsed: true,
              primaryErrorCode: error.code || null,
              primaryErrorMessage: error.message || null
            }
          });

          return fallbackResult;
        } catch (fallbackError) {
          await this.recordAuditEntry({
            ...baseAudit,
            status: 'failed',
            messageId: null,
            errorCode: fallbackError.code || null,
            errorMessage: fallbackError.message || 'Unknown email delivery error',
            provider: 'smtp-fallback',
            metadata: {
              ...baseAudit.metadata,
              fallbackUsed: true,
              primaryErrorCode: error.code || null,
              primaryErrorMessage: error.message || null
            }
          });

          throw fallbackError;
        }
      }

      await this.recordAuditEntry({
        ...baseAudit,
        status: 'failed',
        messageId: null,
        errorCode: error.code || null,
        errorMessage: error.message || 'Unknown email delivery error'
      });

      throw error;
    }
  }

  async sendEmail(to, template, data) {
    let mailOptions = null;

    try {
      const templateConfig = this.templates[template];
      if (!templateConfig) {
        throw new Error(`Template '${template}' not found`);
      }

      mailOptions = {
        from: this.getFromAddress(),
        to,
        subject: templateConfig.subject,
        html: templateConfig.html(data)
      };

      const result = await this.sendMailWithAudit(mailOptions, {
        templateName: template,
        metadata: {
          dataKeys: data && typeof data === 'object' ? Object.keys(data) : []
        }
      });
      console.log(`✅ Email sent successfully to ${this.maskRecipient(this.normalizeRecipient(to))}: ${template}`);
      return result;
    } catch (error) {
      if (mailOptions === null) {
        await this.recordAuditEntry({
          recipientEmail: to,
          templateName: template,
          subject: null,
          status: 'failed',
          messageId: null,
          errorCode: error.code || null,
          errorMessage: error.message || 'Email composition failed',
          provider: 'smtp',
          metadata: {
            dataKeys: data && typeof data === 'object' ? Object.keys(data) : []
          }
        });
      }

      console.error(`❌ Failed to send email to ${this.maskRecipient(this.normalizeRecipient(to))}:`, error);
      throw error;
    }
  }

  async sendVerificationEmail(email, firstName, token) {
    const verificationUrl = `${this.frontendUrl}/verify-email/${token}`;
    console.log('📧 Sending verification email with URL:', verificationUrl);
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
        from: this.getFromAddress('The Grassroots Hub Admin'),
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

      const result = await this.sendMailWithAudit(mailOptions, {
        templateName: 'adminMessage',
        metadata: { subject }
      });
      console.log(`✅ Admin message sent successfully to ${userEmail}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send admin message to ${userEmail}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, firstName, resetToken) {
    return this.sendEmail(email, 'passwordReset', { firstName, token: resetToken });
  }

  async sendTrialResponse(coachEmail, coachName, playerName, trialTitle, status) {
    try {
      const templateData = this.templates.trialResponse;
      const mailOptions = {
        from: this.getFromAddress(),
        to: coachEmail,
        subject: typeof templateData.subject === 'function'
          ? templateData.subject({ coachName, playerName, trialTitle, status })
          : templateData.subject,
        html: templateData.html({ coachName, playerName, trialTitle, status })
      };
      const result = await this.sendMailWithAudit(mailOptions, {
        templateName: 'trialResponse',
        metadata: { status }
      });
      console.log(`✅ Trial response notification sent to ${coachEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send trial response notification:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendBetaAccessGranted(userEmail, firstName) {
    try {
      const mailOptions = {
        from: this.getFromAddress(),
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
                <a href="${this.frontendUrl}/login" 
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

      const result = await this.sendMailWithAudit(mailOptions, {
        templateName: 'betaAccessGranted'
      });
      console.log(`✅ Beta access granted email sent to ${userEmail}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send beta access email to ${userEmail}:`, error);
      // Log specific error details for troubleshooting
      if (error.code === 'ETIMEDOUT') {
        console.error('  ⏱️  SMTP Connection Timeout - Check firewall/network settings');
      } else if (error.code === 'EAUTH') {
        console.error('  🔐 SMTP Authentication Failed - Check EMAIL_USER and EMAIL_PASS/EMAIL_PASSWORD');
      } else if (error.code === 'ECONNECTION') {
        console.error('  🌐 Cannot connect to SMTP server - Check host/port');
      }
      // Don't throw - allow the beta access to proceed without email
      return { error: error.message, sent: false };
    }
  }

  async sendTeamInvitation(invitedEmail, inviterName, teamName, acceptLink) {
    try {
      const mailOptions = {
        from: this.getFromAddress(),
        to: invitedEmail,
        subject: `You're invited to join ${teamName}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32;">You're Invited to Join a Team!</h2>
              <p>Hi there,</p>
              <p><strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on the Grassroots Scout platform.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptLink}" 
                   style="background-color: #2E7D32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  View Invitation
                </a>
              </div>
              <p style="color: #999; font-size: 12px;">This invitation will expire in 7 days.</p>
              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #999; font-size: 12px;">
                <p>Best regards,<br>The Grassroots Hub Team</p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.sendMailWithAudit(mailOptions, {
        templateName: 'teamInvitation',
        metadata: { teamName }
      });
      console.log(`✅ Team invitation email sent to ${invitedEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send team invitation email:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendInvitationResponse(inviterEmail, inviterName, teamName, coachName, status) {
    try {
      const statusText = status === 'accepted' ? 'accepted' : 'declined';
      const mailOptions = {
        from: this.getFromAddress(),
        to: inviterEmail,
        subject: `${coachName} ${statusText} your team invitation`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32;">Invitation ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}!</h2>
              <p>Hi ${inviterName},</p>
              <p><strong>${coachName}</strong> has <strong>${statusText}</strong> your invitation to join <strong>${teamName}</strong>.</p>
              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #999; font-size: 12px;">
                <p>Best regards,<br>The Grassroots Hub Team</p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.sendMailWithAudit(mailOptions, {
        templateName: 'invitationResponse',
        metadata: { teamName, status: statusText }
      });
      console.log(`✅ Invitation response notification sent to ${inviterEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send response notification:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendCoachRemovalNotification(coachEmail, coachName, teamName, removedByName) {
    try {
      const mailOptions = {
        from: this.getFromAddress(),
        to: coachEmail,
        subject: `Team membership update for ${teamName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2E7D32;">Team Membership Update</h2>
              <p>Hi ${coachName},</p>
              <p><strong>${removedByName}</strong> has removed you from <strong>${teamName}</strong>.</p>
              <p>If you believe this was a mistake, please contact the team manager directly.</p>
              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #999; font-size: 12px;">
                <p>Best regards,<br>The Grassroots Hub Team</p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.sendMailWithAudit(mailOptions, {
        templateName: 'coachRemovalNotification',
        metadata: { teamName }
      });
      console.log(`✅ Removal notification sent to ${coachEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send removal notification:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendOpenTrainingStatusChange(userEmail, firstName, eventTitle, status) {
    const subjects = {
      confirmed: `You're confirmed for ${eventTitle}!`,
      waitlisted: `You've been added to the waitlist for ${eventTitle}`,
      pending_confirmation: `Registration received for ${eventTitle}`,
      payment_overdue: `Spot released due to missed payment - ${eventTitle}`,
      dropped_out: `Your registration for ${eventTitle} has been cancelled`
    };

    const bodies = {
      confirmed: `<p>Great news, ${firstName}! Your place on <strong>${eventTitle}</strong> has been confirmed. We look forward to seeing you there.</p>`,
      waitlisted: `<p>Hi ${firstName}, you have been added to the waiting list for <strong>${eventTitle}</strong>. We will let you know as soon as a spot opens up.</p>`,
      pending_confirmation: `<p>Hi ${firstName}, your registration for <strong>${eventTitle}</strong> has been received and is awaiting coach confirmation.</p>`,
      payment_overdue: `<p>Hi ${firstName}, your spot on <strong>${eventTitle}</strong> has been released because payment was not received by the deadline. Please re-register if you are still interested.</p>`,
      dropped_out: `<p>Hi ${firstName}, your registration for <strong>${eventTitle}</strong> has been cancelled. Contact the coach if this was unexpected.</p>`
    };

    const mailOptions = {
      from: this.getFromAddress(),
      to: userEmail,
      subject: subjects[status] || `Registration update for ${eventTitle}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2E7D32;">The Grassroots Hub</h2>
        ${bodies[status] || `<p>Hi ${firstName}, your registration status for <strong>${eventTitle}</strong> has been updated to "${status}".</p>`}
        <p style="color:#666;font-size:12px;">This is an automated message from The Grassroots Hub.</p>
      </div>`
    };

    try {
      const result = await this.sendMailWithAudit(mailOptions, {
        templateName: 'openTrainingStatusChange',
        metadata: { eventTitle, status }
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send open training status email:', error);
      return { success: false, error: error.message };
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
