const { exec } = require('child_process');
const fs = require('fs');

function setupNgrokTesting() {
  console.log('🌐 Setting up ngrok for external testing...\n');
  
  console.log('📋 Step-by-step ngrok setup:\n');
  
  console.log('1. Install ngrok:');
  console.log('   • Download from: https://ngrok.com/download');
  console.log('   • Or run: npm install -g ngrok');
  console.log('   • Or run: choco install ngrok (if you have Chocolatey)\n');
  
  console.log('2. Sign up for free ngrok account:');
  console.log('   • Visit: https://dashboard.ngrok.com/signup');
  console.log('   • Get your authtoken\n');
  
  console.log('3. Configure ngrok with your authtoken:');
  console.log('   • Run: ngrok config add-authtoken YOUR_TOKEN\n');
  
  console.log('4. Start tunnels for your application:');
  console.log('   • Backend: ngrok http 5000');
  console.log('   • Frontend: ngrok http 5173\n');
  
  console.log('📱 This will give you public URLs like:');
  console.log('   • Frontend: https://abc123.ngrok.io');
  console.log('   • Backend API: https://xyz456.ngrok.io\n');
  
  console.log('🔧 Alternative automated setup...');
  
  // Check if ngrok is installed
  exec('ngrok version', (error, stdout, stderr) => {
    if (error) {
      console.log('❌ ngrok not installed. Please install manually or use alternative methods below.\n');
      showAlternativeMethods();
    } else {
      console.log('✅ ngrok found:', stdout.trim());
      console.log('\n🚀 Ready to create tunnels!');
      console.log('\nRun these commands in separate terminals:');
      console.log('1. ngrok http 5000 --region us');
      console.log('2. ngrok http 5173 --region us');
      console.log('\nThen update your frontend to use the ngrok backend URL.');
    }
  });
}

function showAlternativeMethods() {
  console.log('🌐 Alternative External Testing Methods:\n');
  
  console.log('2. **Cloudflare Tunnel (Free)**');
  console.log('   • Install: npm install -g cloudflared');
  console.log('   • Run: cloudflared tunnel --url http://localhost:5173');
  console.log('   • Provides: https://random-words.trycloudflare.com\n');
  
  console.log('3. **LocalTunnel (Free)**');
  console.log('   • Install: npm install -g localtunnel');
  console.log('   • Frontend: lt --port 5173 --subdomain grassroots-frontend');
  console.log('   • Backend: lt --port 5000 --subdomain grassroots-backend\n');
  
  console.log('4. **VS Code Live Share (For Developers)**');
  console.log('   • Install Live Share extension');
  console.log('   • Share session with testers');
  console.log('   • They can access via VS Code\n');
  
  console.log('5. **Deploy to Cloud (Production-like)**');
  console.log('   • Vercel (Frontend): vercel --prod');
  console.log('   • Railway/Heroku (Backend): git push');
  console.log('   • Most realistic testing environment\n');
  
  console.log('📋 Recommended approach: ngrok for immediate testing');
}

// Create ngrok configuration helper
function createNgrokConfig() {
  const ngrokConfig = {
    version: "2",
    authtoken: "YOUR_NGROK_TOKEN_HERE",
    tunnels: {
      "grassroots-frontend": {
        addr: 5173,
        proto: "http",
        subdomain: "grassroots-hub-frontend"
      },
      "grassroots-backend": {
        addr: 5000,
        proto: "http",
        subdomain: "grassroots-hub-backend"
      }
    }
  };
  
  const configPath = require('os').homedir() + '/.ngrok2/ngrok.yml';
  
  console.log('📄 Sample ngrok configuration:');
  console.log(JSON.stringify(ngrokConfig, null, 2));
  console.log(`\n💾 Save this to: ${configPath}`);
  console.log('\nThen run: ngrok start --all');
}

setupNgrokTesting();
console.log('\n' + '='.repeat(50));
createNgrokConfig();
