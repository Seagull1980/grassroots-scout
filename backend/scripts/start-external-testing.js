#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🌐 THE GRASSROOTS HUB - EXTERNAL TESTING SETUP');
console.log('='.repeat(50));

class ExternalTestingSetup {
  constructor() {
    this.frontendPort = 5173;
    this.backendPort = 5000;
    this.tunnels = [];
  }

  async checkServers() {
    console.log('\n🔍 Checking if servers are running...');
    
    return new Promise((resolve) => {
      const checkFrontend = spawn('curl', ['-s', `http://localhost:${this.frontendPort}`]);
      const checkBackend = spawn('curl', ['-s', `http://localhost:${this.backendPort}/api/health`]);
      
      let frontendRunning = false;
      let backendRunning = false;
      
      checkFrontend.on('close', (code) => {
        frontendRunning = code === 0;
        console.log(`📱 Frontend (${this.frontendPort}): ${frontendRunning ? '✅ Running' : '❌ Not running'}`);
        
        checkBackend.on('close', (code) => {
          backendRunning = code === 0;
          console.log(`🔧 Backend (${this.backendPort}): ${backendRunning ? '✅ Running' : '❌ Not running'}`);
          resolve({ frontendRunning, backendRunning });
        });
      });
    });
  }

  startLocalTunnel() {
    console.log('\n🚇 Starting LocalTunnel for external access...');
    
    // Start backend tunnel
    console.log('🔧 Creating backend tunnel...');
    const backendTunnel = spawn('lt', ['--port', this.backendPort.toString(), '--subdomain', 'grassroots-api'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    backendTunnel.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('https://')) {
        const url = output.match(/https:\/\/[^\s]+/)[0];
        console.log(`🔧 Backend API accessible at: ${url}`);
        this.backendUrl = url;
      }
    });

    // Start frontend tunnel
    console.log('📱 Creating frontend tunnel...');
    const frontendTunnel = spawn('lt', ['--port', this.frontendPort.toString(), '--subdomain', 'grassroots-hub'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    frontendTunnel.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('https://')) {
        const url = output.match(/https:\/\/[^\s]+/)[0];
        console.log(`📱 Frontend accessible at: ${url}`);
        this.frontendUrl = url;
        this.generateTestingGuide();
      }
    });

    // Store tunnel processes
    this.tunnels.push(backendTunnel, frontendTunnel);
    
    // Handle cleanup
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down tunnels...');
      this.tunnels.forEach(tunnel => tunnel.kill());
      process.exit(0);
    });
  }

  async updateFrontendConfig() {
    if (!this.backendUrl) {
      console.log('⚠️  Backend URL not available yet. You may need to update frontend config manually.');
      return;
    }

    console.log('\n🔧 Updating frontend configuration for external access...');
    
    const viteConfigPath = path.join(__dirname, '../../vite.config.ts');
    
    if (fs.existsSync(viteConfigPath)) {
      try {
        let config = fs.readFileSync(viteConfigPath, 'utf8');
        
        // Update proxy target to use tunnel URL
        config = config.replace(
          /target:\s*['"]http:\/\/localhost:5000['"]/,
          `target: '${this.backendUrl}'`
        );
        
        fs.writeFileSync(viteConfigPath, config);
        console.log('✅ Frontend configuration updated for external access');
      } catch (error) {
        console.log('⚠️  Could not update frontend config automatically');
      }
    }
  }

  generateTestingGuide() {
    const guide = `
🌐 EXTERNAL TESTING GUIDE - THE GRASSROOTS HUB
===============================================

📱 PUBLIC ACCESS URLs:
Frontend: ${this.frontendUrl || 'https://grassroots-hub.loca.lt'}
Backend API: ${this.backendUrl || 'https://grassroots-api.loca.lt'}

🧪 TEST ACCOUNTS:
Admin User:
- Email: admin@grassrootshub.com
- Password: admin123

Test Coach:
- Email: coach.wilson@email.com  
- Password: password123

Test Player:
- Email: player.martinez@email.com
- Password: password123

Test Parent:
- Email: parent.taylor@email.com
- Password: password123

🎯 TESTING SCENARIOS:

1. **Authentication Testing**
   ✓ Register new accounts (Coach, Player, Parent)
   ✓ Login with test accounts
   ✓ Admin dashboard access
   ✓ Password validation

2. **Team Vacancy Testing**
   ✓ Post new team vacancy (Coach account)
   ✓ Search/filter vacancies
   ✓ View vacancy details
   ✓ Location-based search

3. **Player Availability Testing**
   ✓ Post player availability (Player account)
   ✓ Search available players
   ✓ Multi-position selection
   ✓ Contact information display

4. **Profile Management**
   ✓ Complete user profiles
   ✓ Upload profile pictures
   ✓ Update contact information
   ✓ Role-specific fields

5. **Real League Data**
   ✓ Browse 35 authentic FA leagues
   ✓ Click through to official FA websites
   ✓ Filter by league categories
   ✓ Regional league distribution

6. **Mobile Responsiveness**
   ✓ Test on phones/tablets
   ✓ Navigation usability
   ✓ Form interactions
   ✓ Search functionality

7. **Admin Features** (Admin account only)
   ✓ Analytics dashboard
   ✓ User management
   ✓ League management
   ✓ System monitoring

📊 REAL DATA AVAILABLE:
- 35 authentic FA leagues imported
- 30 leagues with official website links
- Region-based league organization
- Various competition categories

🐛 BUG REPORTING:
Please report any issues with:
- Browser type and version
- Device type (mobile/desktop)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

📱 DEVICE COMPATIBILITY:
✓ Chrome, Firefox, Safari, Edge
✓ iOS Safari, Android Chrome
✓ Tablets and desktop computers
✓ All screen sizes supported

⚡ PERFORMANCE TESTING:
- Page load times
- Search response times
- Form submission speed
- Image upload functionality

🔒 SECURITY TESTING:
- Login/logout functionality
- Role-based access control
- Data validation
- Cross-site scripting prevention

Thank you for testing The Grassroots Hub! 🏈⚽
    `;

    const guidePath = path.join(__dirname, '../EXTERNAL-TESTING-GUIDE.md');
    fs.writeFileSync(guidePath, guide);
    
    console.log('\n📋 External testing guide created!');
    console.log(`📄 Saved to: ${guidePath}`);
    console.log('\n🎉 External testing setup complete!');
    console.log('\n📢 Share these URLs with your testers:');
    console.log(`📱 Frontend: ${this.frontendUrl || 'https://grassroots-hub.loca.lt'}`);
    console.log(`🔧 Backend: ${this.backendUrl || 'https://grassroots-api.loca.lt'}`);
  }

  async run() {
    console.log('🚀 Setting up external testing environment...\n');
    
    const serverStatus = await this.checkServers();
    
    if (!serverStatus.frontendRunning || !serverStatus.backendRunning) {
      console.log('\n⚠️  One or more servers are not running!');
      console.log('Please start both servers first:');
      console.log('1. Backend: cd backend && node server.js');
      console.log('2. Frontend: cd frontend && npm run dev');
      console.log('\nThen run this script again.');
      return;
    }
    
    this.startLocalTunnel();
    
    // Wait a bit for tunnels to establish
    setTimeout(() => {
      this.updateFrontendConfig();
    }, 5000);
  }
}

// Run the setup
const setup = new ExternalTestingSetup();
setup.run().catch(console.error);
