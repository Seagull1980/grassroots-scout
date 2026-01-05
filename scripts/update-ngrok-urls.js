const fs = require('fs');
const path = require('path');

// Script to update API URLs in the frontend when ngrok URLs change
class UrlUpdater {
    constructor() {
        this.projectDir = path.join(__dirname, '..');
        this.apiFilePath = path.join(this.projectDir, 'src', 'services', 'api.ts');
        this.viteConfigPath = path.join(this.projectDir, 'vite.config.ts');
    }

    async getActiveNgrokUrls() {
        try {
            const response = await fetch('http://127.0.0.1:4040/api/tunnels');
            const data = await response.json();
            
            const frontendTunnel = data.tunnels.find(t => t.config.addr.includes('5173'));
            const backendTunnel = data.tunnels.find(t => t.config.addr.includes('3001'));
            
            return {
                frontend: frontendTunnel?.public_url,
                backend: backendTunnel?.public_url
            };
        } catch (error) {
            console.error('❌ Failed to get ngrok URLs:', error.message);
            return null;
        }
    }

    updateApiUrl(newBackendUrl) {
        try {
            const apiContent = fs.readFileSync(this.apiFilePath, 'utf8');
            const updatedContent = apiContent.replace(
                /const API_URL = 'https:\/\/[a-z0-9]+\.ngrok-free\.app\/api';/,
                `const API_URL = '${newBackendUrl}/api';`
            );
            
            fs.writeFileSync(this.apiFilePath, updatedContent);
            console.log('✅ Updated API URL in api.ts');
            return true;
        } catch (error) {
            console.error('❌ Failed to update API URL:', error.message);
            return false;
        }
    }

    updateViteConfig(newFrontendUrl) {
        try {
            const viteContent = fs.readFileSync(this.viteConfigPath, 'utf8');
            const hostname = new URL(newFrontendUrl).hostname;
            
            const updatedContent = viteContent.replace(
                /'[a-z0-9]+\.ngrok-free\.app'/g,
                `'${hostname}'`
            );
            
            fs.writeFileSync(this.viteConfigPath, updatedContent);
            console.log('✅ Updated Vite config with new hostname');
            return true;
        } catch (error) {
            console.error('❌ Failed to update Vite config:', error.message);
            return false;
        }
    }

    async updateUrls() {
        console.log('🔧 Updating frontend configuration with current ngrok URLs...');
        
        const urls = await this.getActiveNgrokUrls();
        if (!urls || !urls.frontend || !urls.backend) {
            console.error('❌ Could not retrieve ngrok URLs. Make sure ngrok is running.');
            return false;
        }

        console.log(`🌐 Frontend URL: ${urls.frontend}`);
        console.log(`🔧 Backend URL: ${urls.backend}`);

        const apiUpdated = this.updateApiUrl(urls.backend);
        const viteUpdated = this.updateViteConfig(urls.frontend);

        if (apiUpdated && viteUpdated) {
            console.log('✅ All URLs updated successfully!');
            console.log('🔄 Vite will automatically reload with the new configuration.');
            return true;
        } else {
            console.error('❌ Some URLs failed to update.');
            return false;
        }
    }
}

// Run the updater if called directly
if (require.main === module) {
    const updater = new UrlUpdater();
    updater.updateUrls();
}

module.exports = UrlUpdater;
