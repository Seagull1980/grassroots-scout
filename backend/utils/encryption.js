const crypto = require('crypto');
const CryptoJS = require('crypto-js');
require('dotenv').config();

class EncryptionService {
  constructor() {
    // Use environment variable or generate a strong key
    let rawKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    
    // Ensure key is exactly 64 hex characters (32 bytes)
    if (rawKey.length !== 64) {
      console.warn(`⚠️  WARNING: ENCRYPTION_KEY should be 64 hex characters (32 bytes). Current length: ${rawKey.length}`);
      // Truncate or pad the key to 64 characters
      rawKey = rawKey.slice(0, 64).padEnd(64, '0');
      console.warn('⚠️  Key has been adjusted to correct length.');
    }
    
    this.encryptionKey = rawKey;
    this.algorithm = 'aes-256-gcm';
    
    if (!process.env.ENCRYPTION_KEY) {
      console.warn('⚠️  WARNING: No ENCRYPTION_KEY found in environment variables. Using generated key.');
      console.warn('⚠️  For production, set ENCRYPTION_KEY in your .env file to ensure data persistence.');
    }
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text with IV and auth tag
   */
  encrypt(text) {
    if (!text || typeof text !== 'string') {
      return text; // Return as-is if not a string or empty
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw error; // Throw error instead of returning text so we can debug
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedText - Encrypted text with IV and auth tag
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedText) {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return encryptedText; // Return as-is if not a string or empty
    }

    // Check if data is already encrypted (contains colons separating IV:authTag:data)
    if (!encryptedText.includes(':')) {
      return encryptedText; // Assume it's unencrypted legacy data
    }

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        return encryptedText; // Invalid format, return as-is
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedText; // Return encrypted text if decryption fails
    }
  }

  /**
   * Hash sensitive data for searching (one-way hash)
   * @param {string} data - Data to hash
   * @returns {string} - Hashed data
   */
  hashForSearch(data) {
    if (!data || typeof data !== 'string') {
      return data;
    }
    
    return crypto.createHmac('sha256', this.encryptionKey)
                 .update(data.toLowerCase().trim())
                 .digest('hex');
  }

  /**
   * Encrypt email for storage while maintaining searchability
   * @param {string} email - Email to encrypt
   * @returns {object} - Object with encrypted email and searchable hash
   */
  encryptEmail(email) {
    if (!email) return { encrypted: null, searchHash: null };
    
    return {
      encrypted: this.encrypt(email.toLowerCase().trim()),
      searchHash: this.hashForSearch(email)
    };
  }

  /**
   * Encrypt phone number for storage
   * @param {string} phone - Phone number to encrypt
   * @returns {string} - Encrypted phone number
   */
  encryptPhone(phone) {
    if (!phone) return phone;
    
    // Remove all non-digits for consistency
    const cleanPhone = phone.replace(/\D/g, '');
    return this.encrypt(cleanPhone);
  }

  /**
   * Encrypt personal information in user profile
   * @param {object} profileData - Profile data object
   * @returns {object} - Profile data with encrypted sensitive fields
   */
  encryptProfileData(profileData) {
    const sensitiveFields = [
      'location', 'bio', 'emergencyContact', 
      'emergencyPhone', 'medicalInfo', 'trainingLocation', 'matchLocation'
    ];

    const encrypted = { ...profileData };

    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    });

    return encrypted;
  }

  /**
   * Decrypt personal information in user profile
   * @param {object} profileData - Profile data object with encrypted fields
   * @returns {object} - Profile data with decrypted sensitive fields
   */
  decryptProfileData(profileData) {
    const sensitiveFields = [
      'location', 'bio', 'emergencyContact', 
      'emergencyPhone', 'medicalInfo', 'trainingLocation', 'matchLocation'
    ];

    const decrypted = { ...profileData };

    sensitiveFields.forEach(field => {
      if (decrypted[field]) {
        decrypted[field] = this.decrypt(decrypted[field]);
      }
    });

    return decrypted;
  }

  /**
   * Encrypt contact information in vacancy/availability posts
   * @param {string} contactInfo - Contact information to encrypt
   * @returns {string} - Encrypted contact information
   */
  encryptContactInfo(contactInfo) {
    return this.encrypt(contactInfo);
  }

  /**
   * Decrypt contact information
   * @param {string} encryptedContactInfo - Encrypted contact information
   * @returns {string} - Decrypted contact information
   */
  decryptContactInfo(encryptedContactInfo) {
    return this.decrypt(encryptedContactInfo);
  }

  /**
   * Generate a secure session token
   * @returns {string} - Secure session token
   */
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate encryption key strength
   * @returns {boolean} - True if key is strong enough
   */
  validateKeyStrength() {
    const keyBuffer = Buffer.from(this.encryptionKey, 'hex');
    return keyBuffer.length >= 32; // At least 256 bits
  }

  /**
   * Generate a strong encryption key for production use
   * @returns {string} - Strong encryption key
   */
  static generateProductionKey() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new EncryptionService();
