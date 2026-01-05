const fetch = require('node-fetch');

async function testLeaguesAPI() {
  try {
    console.log('🔍 Testing updated leagues API...\n');
    
    const response = await fetch('http://localhost:5000/api/leagues');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ Successfully fetched ${data.leagues.length} leagues\n`);
    
    // Show first 5 leagues with all their data
    console.log('🏆 Sample leagues with new fields:');
    data.leagues.slice(0, 5).forEach((league, index) => {
      console.log(`\n${index + 1}. ${league.name}`);
      console.log(`   ID: ${league.id}`);
      console.log(`   Description: ${league.description ? league.description.substring(0, 80) + '...' : 'N/A'}`);
      console.log(`   Region: ${league.region || 'N/A'}`);
      console.log(`   Category: ${league.category || 'N/A'}`);
      console.log(`   Website URL: ${league.websiteUrl || 'N/A'}`);
      console.log(`   Active: ${league.isActive ? 'Yes' : 'No'}`);
      console.log(`   Created: ${league.createdAt}`);
    });
    
    // Show breakdown by category
    const categories = {};
    data.leagues.forEach(league => {
      const category = league.category || 'Unknown';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    console.log('\n📊 Leagues by Category:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} leagues`);
    });
    
    // Show breakdown by region
    const regions = {};
    data.leagues.forEach(league => {
      const region = league.region || 'Unknown';
      regions[region] = (regions[region] || 0) + 1;
    });
    
    console.log('\n🗺️ Leagues by Region:');
    Object.entries(regions).forEach(([region, count]) => {
      console.log(`   ${region}: ${count} leagues`);
    });
    
    // Count leagues with URLs
    const withUrls = data.leagues.filter(league => league.websiteUrl).length;
    console.log(`\n🔗 Leagues with URLs: ${withUrls}/${data.leagues.length}`);
    
    console.log('\n✅ API test completed successfully!');
    console.log('💡 The leagues endpoint now includes region, category, and websiteUrl fields');
    
  } catch (error) {
    console.error('❌ Error testing leagues API:', error.message);
  }
}

// Check if node-fetch is available, otherwise suggest using built-in modules
async function main() {
  try {
    await testLeaguesAPI();
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('node-fetch')) {
      console.log('⚠️ node-fetch not available, using alternative method...');
      
      // Alternative using built-in modules
      const http = require('http');
      
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
            console.log(`✅ Successfully fetched ${result.leagues.length} leagues`);
            console.log('🔗 Sample league with URL:');
            const sampleLeague = result.leagues.find(l => l.websiteUrl);
            if (sampleLeague) {
              console.log(`   Name: ${sampleLeague.name}`);
              console.log(`   Region: ${sampleLeague.region}`);
              console.log(`   Category: ${sampleLeague.category}`);
              console.log(`   URL: ${sampleLeague.websiteUrl}`);
            }
          } catch (parseError) {
            console.error('❌ Error parsing response:', parseError.message);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ Request error:', error.message);
      });
      
      req.end();
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

main();
