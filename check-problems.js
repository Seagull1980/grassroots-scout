// Check for TypeScript compilation issues in the frontend
const { execSync } = require('child_process');

console.log('🔍 Running TypeScript compilation check...\n');

try {
  // Check TypeScript compilation
  const result = execSync('npx tsc --noEmit --pretty', { 
    cwd: 'c:\\Users\\cgill\\Desktop\\Thegrassrootshub\\The Grassroots Hub - V4',
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ TypeScript compilation successful!');
  console.log('No TypeScript errors found.');
  
} catch (error) {
  console.log('❌ TypeScript compilation errors found:');
  console.log(error.stdout || error.message);
}

console.log('\n🔍 Checking for common issues...\n');

try {
  // Run ESLint if available
  const eslintResult = execSync('npx eslint src --ext .ts,.tsx --format=compact', {
    cwd: 'c:\\Users\\cgill\\Desktop\\Thegrassrootshub\\The Grassroots Hub - V4',
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  if (eslintResult.trim()) {
    console.log('⚠️ ESLint issues found:');
    console.log(eslintResult);
  } else {
    console.log('✅ No ESLint issues found.');
  }
  
} catch (error) {
  if (error.stdout) {
    console.log('⚠️ ESLint issues found:');
    console.log(error.stdout);
  } else {
    console.log('ℹ️ ESLint not available or configured.');
  }
}
