const { execSync } = require('child_process');
const path = require('path');

const projectDir = path.resolve(__dirname);

try {
  console.log('Adding changes...');
  execSync('git add backend/db/database.js backend/server.js src/services/analyticsTracking.ts', {
    cwd: projectDir,
    stdio: 'inherit'
  });

  console.log('\nCommitting...');
  execSync('git commit -m "Fix database close hook, add beta access endpoints, and fix analytics API URL"', {
    cwd: projectDir,
    stdio: 'inherit'
  });

  console.log('\nPushing to main...');
  execSync('git push origin main', {
    cwd: projectDir,
    stdio: 'inherit'
  });

  console.log('\n✅ All changes pushed successfully!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
