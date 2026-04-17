const jwt = require('jsonwebtoken');
const http = require('http');
const DatabaseUtils = require('./utils/dbUtils.js');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const shouldShowToken = process.argv.includes('--show-token');
const db = new DatabaseUtils();

async function testAnalyticsAPI() {
  try {
    console.log('🔍 Testing Analytics API with proper token...');
    
    // Get admin user
    const adminUser = await db.getOne('SELECT * FROM users WHERE email = ?', ['cgill1980@hotmail.com']);
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ Generated admin token for:', adminUser.email);
    if (shouldShowToken) {
      console.log(token);
    } else {
      console.log('Token output hidden by default. Re-run with --show-token to print it.');
    }
    
    // Test analytics endpoint
    const postData = JSON.stringify({});
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/analytics/overview',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      console.log(`📊 Response Status: ${res.statusCode}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log('✅ Analytics API Success!');
            console.log('📈 Overview Data:');
            console.log('  - Total Users:', result.overview.totalUsers);
            console.log('  - Total Teams:', result.overview.totalTeams);
            console.log('  - Total Players:', result.overview.totalPlayers);
            console.log('  - User Types:', result.userTypeBreakdown);
            
            console.log('\n🎯 API is working! Your analytics page should now load.');
            console.log('\n📋 FINAL STEP - Update your browser local storage:');
            console.log('=====================================');
            console.log(`Key: token`);
            console.log('Value: [hidden by default; re-run with --show-token if you explicitly need it]');
            console.log(`\nKey: user`);
            console.log(`Value: ${JSON.stringify({
              id: adminUser.id,
              email: adminUser.email,
              firstName: adminUser.firstName,
              lastName: adminUser.lastName,
              role: adminUser.role,
              createdAt: adminUser.createdAt
            })}`);
            console.log('=====================================');
            
          } catch (e) {
            console.error('❌ Invalid JSON response:', data);
          }
        } else {
          console.error('❌ API Error:', res.statusCode, data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAnalyticsAPI();