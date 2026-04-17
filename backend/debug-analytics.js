const jwt = require('jsonwebtoken');
const DatabaseUtils = require('./utils/dbUtils.js');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const db = new DatabaseUtils();

async function debugAnalytics() {
  try {
    console.log('🔍 Debugging analytics endpoints...');
    
    // Get the admin user
    const adminUser = await db.getOne('SELECT * FROM users WHERE email = ?', ['cgill1980@hotmail.com']);
    
    if (!adminUser) {
      console.error('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Found admin user:', adminUser.email, 'Role:', adminUser.role);
    
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
    
    // Test each analytics query directly
    console.log('\n🧪 Testing database queries directly...');
    
    try {
      // Test overview query
      console.log('\n1. Testing overview queries...');
      const totalUsers = await db.getOne('SELECT COUNT(*) as count FROM users');
      console.log('Total users:', totalUsers);
      
      const totalTeams = await db.getOne('SELECT COUNT(*) as count FROM teams');
      console.log('Total teams:', totalTeams);
      
      const totalVacancies = await db.getOne('SELECT COUNT(*) as count FROM team_vacancies');
      console.log('Total vacancies:', totalVacancies);
      
      const totalPlayers = await db.getOne('SELECT COUNT(*) as count FROM player_availability');
      console.log('Total players:', totalPlayers);
      
      // Test user activity query
      console.log('\n2. Testing user activity query...');
      const userActivity = await db.getAll(`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as count
        FROM users 
        WHERE createdAt >= datetime('now', '-30 days')
        GROUP BY DATE(createdAt)
        ORDER BY date DESC
        LIMIT 30
      `);
      console.log('User activity results:', userActivity.length, 'records');
      
      // Test daily stats query
      console.log('\n3. Testing daily stats query...');
      const dailyStats = await db.getAll(`
        SELECT 
          DATE(createdAt) as date,
          SUM(CASE WHEN role = 'Coach' THEN 1 ELSE 0 END) as coaches,
          SUM(CASE WHEN role = 'Player' THEN 1 ELSE 0 END) as players,
          SUM(CASE WHEN role = 'Parent/Guardian' THEN 1 ELSE 0 END) as parents
        FROM users 
        WHERE createdAt >= datetime('now', '-30 days')
        GROUP BY DATE(createdAt)
        ORDER BY date DESC
        LIMIT 30
      `);
      console.log('Daily stats results:', dailyStats.length, 'records');
      
      console.log('\n✅ All database queries work fine!');
      
    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
    }
    
    // Now test the actual HTTP endpoints
    console.log('\n🌐 Testing HTTP endpoints...');
    
    const https = require('http');
    
    function makeRequest(path) {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: 3001,
          path: `/api/analytics${path}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const jsonData = JSON.parse(data);
                resolve({ success: true, data: jsonData, status: res.statusCode });
              } catch (e) {
                resolve({ success: false, error: 'Invalid JSON', raw: data, status: res.statusCode });
              }
            } else {
              resolve({ success: false, error: data, status: res.statusCode });
            }
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.end();
      });
    }
    
    try {
      const overviewResult = await makeRequest('/overview');
      console.log('📊 Overview endpoint:', overviewResult.success ? '✅ Success' : '❌ Failed');
      if (!overviewResult.success) {
        console.log('Error details:', overviewResult);
      }
      
      const dailyResult = await makeRequest('/daily-stats');
      console.log('📈 Daily stats endpoint:', dailyResult.success ? '✅ Success' : '❌ Failed');
      if (!dailyResult.success) {
        console.log('Error details:', dailyResult);
      }
      
      const activityResult = await makeRequest('/user-activity');
      console.log('👥 User activity endpoint:', activityResult.success ? '✅ Success' : '❌ Failed');
      if (!activityResult.success) {
        console.log('Error details:', activityResult);
      }
      
    } catch (httpError) {
      console.error('❌ HTTP request error:', httpError);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugAnalytics();