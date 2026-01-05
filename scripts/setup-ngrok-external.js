const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class NgrokExternalSetup {
  constructor() {
    this.frontendUrl = null;
    this.backendUrl = null;
    this.processes = [];
  }

  async setupExternalAccess() {
    console.log('🌐 Setting up external access with ngrok...\n');

    // Step 1: Start ngrok tunnels
    await this.startNgrokTunnels();

    // Step 2: Update frontend configuration
    await this.updateFrontendConfig();

    // Step 3: Update backend CORS configuration
    await this.updateBackendCORS();

    // Step 4: Provide access instructions
    this.showAccessInstructions();

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down external access setup...');
      this.cleanup();
      process.exit(0);
    });
  }

  async startNgrokTunnels() {
    console.log('🚀 Starting ngrok tunnels...');

    // Start frontend tunnel
    const frontendTunnel = spawn('ngrok', ['http', '5173', '--region', 'eu'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Start backend tunnel
    const backendTunnel = spawn('ngrok', ['http', '3001', '--region', 'eu'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.processes.push(frontendTunnel, backendTunnel);

    // Wait for tunnels to establish
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get tunnel URLs
    try {
      const response = await fetch('http://127.0.0.1:4040/api/tunnels');
      const data = await response.json();
      
      for (const tunnel of data.tunnels) {
        if (tunnel.config.addr === 'http://localhost:5173') {
          this.frontendUrl = tunnel.public_url;
          console.log(`✅ Frontend tunnel: ${this.frontendUrl}`);
        } else if (tunnel.config.addr === 'http://localhost:3001') {
          this.backendUrl = tunnel.public_url;
          console.log(`✅ Backend tunnel: ${this.backendUrl}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to get tunnel URLs. Make sure ngrok is installed and authenticated.');
      console.log('Visit: https://ngrok.com/download and run: ngrok authtoken YOUR_TOKEN');
      process.exit(1);
    }
  }

  async updateFrontendConfig() {
    if (!this.backendUrl) {
      console.log('⚠️  Backend URL not available. Skipping frontend config update.');
      return;
    }

    console.log('\n🔧 Updating frontend API configuration...');

    const apiFilePath = path.join(__dirname, '../src/services/api.ts');
    
    try {
      let apiContent = fs.readFileSync(apiFilePath, 'utf8');
      
      // Update API_URL with the new backend tunnel URL
      apiContent = apiContent.replace(
        /const API_URL = '[^']+';/,
        `const API_URL = '${this.backendUrl}/api';`
      );
      
      fs.writeFileSync(apiFilePath, apiContent);
      console.log('✅ Frontend API configuration updated');
    } catch (error) {
      console.error('❌ Failed to update frontend config:', error.message);
    }
  }

  async updateBackendCORS() {
    if (!this.frontendUrl || !this.backendUrl) {
      console.log('⚠️  URLs not available. Skipping CORS update.');
      return;
    }

    console.log('\n🔧 Updating backend CORS configuration...');

    const serverFilePath = path.join(__dirname, '../backend/server.js');
    
    try {
      let serverContent = fs.readFileSync(serverFilePath, 'utf8');
      
      // Add ngrok URLs to CORS origins
      const newOrigin = `    '${this.frontendUrl}', // Ngrok frontend tunnel
    '${this.backendUrl}', // Ngrok backend tunnel`;
      
      serverContent = serverContent.replace(
        /\/\^https:\/\/\.\*\\\.ngrok-free\\\.app\$\/, \/\/ Allow new ngrok domains/,
        `/^https:\\/\\/.*\\.ngrok-free\\.app$/, // Allow new ngrok domains
${newOrigin}`
      );
      
      fs.writeFileSync(serverFilePath, serverContent);
      console.log('✅ Backend CORS configuration updated');
      
      // Restart backend to apply changes
      console.log('🔄 Backend restart required for CORS changes to take effect');
    } catch (error) {
      console.error('❌ Failed to update backend CORS:', error.message);
    }
  }

  showAccessInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 EXTERNAL ACCESS CONFIGURED SUCCESSFULLY!');
    console.log('='.repeat(60));
    
    if (this.frontendUrl) {
      console.log(`\n🌐 Frontend URL (share this): ${this.frontendUrl}`);
    }
    
    if (this.backendUrl) {
      console.log(`🔧 Backend API URL: ${this.backendUrl}/api`);
    }
    
    console.log('\n📋 Test Credentials:');
    console.log('   Email: coach@test.com');
    console.log('   Password: test123');
    
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   • Frontend config has been updated automatically');
    console.log('   • You may need to restart the backend server');
    console.log('   • ngrok free tier has usage limits');
    console.log('   • These URLs are temporary and change when restarted');
    
    console.log('\n🔄 To restart backend with new CORS settings:');
    console.log('   1. Stop the current backend server (Ctrl+C)');
    console.log('   2. Run: npm run dev (in backend directory)');
    
    console.log('\n🛑 Press Ctrl+C to stop ngrok tunnels');
    console.log('='.repeat(60));
  }

  cleanup() {
    console.log('🧹 Cleaning up processes...');
    this.processes.forEach(process => {
      if (process && !process.killed) {
        process.kill();
      }
    });
  }
}

// Run the setup
if (require.main === module) {
  const setup = new NgrokExternalSetup();
  setup.setupExternalAccess().catch(console.error);
}

module.exports = NgrokExternalSetup;
