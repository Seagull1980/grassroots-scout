require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmailService() {
  console.log('🧪 Testing email service configuration...');
  
  try {
    // Test connection
    await emailService.testConnection();
    console.log('✅ Email service connection successful!');
    
    // Test sending a test email
    const testData = {
      playerName: 'Test User',
      vacancy: {
        id: '123',
        title: 'Test Team Vacancy',
        position: 'Midfielder',
        league: 'Sunday League',
        ageGroup: 'U21',
        location: 'London',
        description: 'Looking for a dedicated midfielder'
      }
    };
    
    console.log('📧 Sending test vacancy alert email...');
    await emailService.sendEmail(
      'test@example.com',
      'newVacancy',
      testData
    );
    console.log('✅ Test email sent successfully!');
    
  } catch (error) {
    console.error('❌ Email service test failed:', error.message);
    console.log('\nPlease ensure you have configured the following environment variables:');
    console.log('- EMAIL_USER: Your Gmail address');
    console.log('- EMAIL_PASS: Your Gmail app password');
    console.log('- EMAIL_FROM: Sender email address');
  }
}

testEmailService();
