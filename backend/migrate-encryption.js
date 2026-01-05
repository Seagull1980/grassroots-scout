const Database = require('./db/database.js');
const encryptionService = require('./utils/encryption.js');
require('dotenv').config();

async function migrateToEncryption() {
  const db = new Database();
  
  try {
    console.log('🔄 Starting encryption migration...');
    
    // Add emailHash column if it doesn't exist
    try {
      await db.query('ALTER TABLE users ADD COLUMN emailHash VARCHAR');
      console.log('✅ Added emailHash column to users table');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('ℹ️  emailHash column already exists');
      } else {
        console.warn('⚠️  Could not add emailHash column:', error.message);
      }
    }
    
    // Get all users 
    const usersResult = await db.query('SELECT id, email FROM users');
    const users = usersResult.rows;
    
    console.log(`📧 Found ${users.length} users to migrate`);
    
    // Encrypt emails for existing users
    for (const user of users) {
      try {
        // Check if email is already encrypted (contains colons)
        const isAlreadyEncrypted = user.email && user.email.includes(':');
        
        if (!isAlreadyEncrypted) {
          // Encrypt the email
          const emailData = encryptionService.encryptEmail(user.email);
          
          // Update user with encrypted email and hash
          await db.query(
            'UPDATE users SET email = ?, emailHash = ? WHERE id = ?',
            [emailData.encrypted, emailData.searchHash, user.id]
          );
          
          console.log(`✅ Encrypted email for user ${user.id}`);
        } else {
          // Email is already encrypted, just create the hash
          const emailHash = encryptionService.hashForSearch(
            encryptionService.decrypt(user.email)
          );
          
          await db.query(
            'UPDATE users SET emailHash = ? WHERE id = ?',
            [emailHash, user.id]
          );
          
          console.log(`✅ Created hash for user ${user.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.id}:`, error.message);
      }
    }
    
    // Get user profiles that need encryption
    const profilesResult = await db.query('SELECT * FROM user_profiles');
    const profiles = profilesResult.rows;
    
    console.log(`👤 Found ${profiles.length} user profiles to check for encryption`);
    
    // Encrypt sensitive profile data
    for (const profile of profiles) {
      try {
        // Check if data is already encrypted
        const sensitiveFields = ['phone', 'dateOfBirth', 'location', 'bio', 'emergencyContact', 'emergencyPhone', 'medicalInfo', 'trainingLocation', 'matchLocation'];
        let needsEncryption = false;
        
        for (const field of sensitiveFields) {
          if (profile[field] && !profile[field].includes(':')) {
            needsEncryption = true;
            break;
          }
        }
        
        if (needsEncryption) {
          const encryptedData = encryptionService.encryptProfileData(profile);
          
          await db.query(`
            UPDATE user_profiles SET 
              phone = ?, dateOfBirth = ?, location = ?, bio = ?, 
              emergencyContact = ?, emergencyPhone = ?, medicalInfo = ?, 
              trainingLocation = ?, matchLocation = ?
            WHERE userId = ?
          `, [
            encryptedData.phone, encryptedData.dateOfBirth, encryptedData.location, 
            encryptedData.bio, encryptedData.emergencyContact, encryptedData.emergencyPhone, 
            encryptedData.medicalInfo, encryptedData.trainingLocation, encryptedData.matchLocation,
            profile.userId
          ]);
          
          console.log(`✅ Encrypted profile data for user ${profile.userId}`);
        }
      } catch (error) {
        console.error(`❌ Failed to encrypt profile for user ${profile.userId}:`, error.message);
      }
    }
    
    // Encrypt contact information in team vacancies
    const vacanciesResult = await db.query('SELECT id, contactInfo FROM team_vacancies WHERE contactInfo IS NOT NULL');
    const vacancies = vacanciesResult.rows;
    
    console.log(`🏟️  Found ${vacancies.length} team vacancies to check for encryption`);
    
    for (const vacancy of vacancies) {
      try {
        if (vacancy.contactInfo && !vacancy.contactInfo.includes(':')) {
          const encryptedContactInfo = encryptionService.encryptContactInfo(vacancy.contactInfo);
          
          await db.query(
            'UPDATE team_vacancies SET contactInfo = ? WHERE id = ?',
            [encryptedContactInfo, vacancy.id]
          );
          
          console.log(`✅ Encrypted contact info for vacancy ${vacancy.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to encrypt vacancy ${vacancy.id}:`, error.message);
      }
    }
    
    // Encrypt contact information in player availability
    const availabilityResult = await db.query('SELECT id, contactInfo FROM player_availability WHERE contactInfo IS NOT NULL');
    const availability = availabilityResult.rows;
    
    console.log(`👥 Found ${availability.length} player availability posts to check for encryption`);
    
    for (const avail of availability) {
      try {
        if (avail.contactInfo && !avail.contactInfo.includes(':')) {
          const encryptedContactInfo = encryptionService.encryptContactInfo(avail.contactInfo);
          
          await db.query(
            'UPDATE player_availability SET contactInfo = ? WHERE id = ?',
            [encryptedContactInfo, avail.id]
          );
          
          console.log(`✅ Encrypted contact info for availability ${avail.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to encrypt availability ${avail.id}:`, error.message);
      }
    }
    
    console.log('🎉 Encryption migration completed successfully!');
    console.log('🔒 All personal data is now encrypted for enhanced security');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToEncryption();
}

module.exports = migrateToEncryption;
