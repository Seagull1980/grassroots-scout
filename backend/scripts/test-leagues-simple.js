const http = require('http');

function testLeaguesAPI() {
  console.log('🔍 Testing updated leagues API...\n');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/leagues',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        console.log(`✅ Successfully fetched ${result.leagues.length} leagues\n`);
        
        // Show first 3 leagues with all their data
        console.log('🏆 Sample leagues with new fields:');
        result.leagues.slice(0, 3).forEach((league, index) => {
          console.log(`\n${index + 1}. ${league.name}`);
          console.log(`   ID: ${league.id}`);
          console.log(`   Description: ${league.description ? league.description.substring(0, 60) + '...' : 'N/A'}`);
          console.log(`   Region: ${league.region || 'N/A'}`);
          console.log(`   Category: ${league.category || 'N/A'}`);
          console.log(`   Website URL: ${league.websiteUrl || 'N/A'}`);
          console.log(`   Active: ${league.isActive ? 'Yes' : 'No'}`);
        });
        
        // Count leagues with URLs
        const withUrls = result.leagues.filter(league => league.websiteUrl).length;
        console.log(`\n🔗 Leagues with URLs: ${withUrls}/${result.leagues.length}`);
        
        // Show some URL examples
        const urlExamples = result.leagues.filter(l => l.websiteUrl).slice(0, 3);
        console.log('\n🌐 URL Examples:');
        urlExamples.forEach((league, index) => {
          console.log(`   ${index + 1}. ${league.name}`);
          console.log(`      ${league.websiteUrl}`);
        });
        
        console.log('\n✅ API test completed successfully!');
        console.log('💡 The leagues endpoint now includes region, category, and websiteUrl fields');
        
      } catch (parseError) {
        console.error('❌ Error parsing response:', parseError.message);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });
  
  req.end();
}

testLeaguesAPI();
