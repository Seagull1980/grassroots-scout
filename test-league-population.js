#!/usr/bin/env node

/**
 * Test script to verify league population in production
 * Run this after deployment to check if leagues are properly populated
 */

import https from 'https';

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://the-grassroots-scout.onrender.com';

console.log('🔍 Testing league population on production...');
console.log(`🌐 Production URL: ${PRODUCTION_URL}`);

// Test the leagues API endpoint
const testLeaguesEndpoint = () => {
  return new Promise((resolve, reject) => {
    const url = `${PRODUCTION_URL}/api/leagues`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const leagues = JSON.parse(data);

          if (Array.isArray(leagues)) {
            console.log(`✅ Leagues API returned ${leagues.length} leagues`);

            // Check for key leagues
            const tamworthLeague = leagues.find(l => l.name && l.name.includes('Tamworth'));
            const centralWarwickshire = leagues.find(l => l.name && l.name.includes('Central Warwickshire'));
            const northumberland = leagues.find(l => l.name && l.name.includes('Northumberland'));

            console.log('🎯 Key leagues check:');
            console.log(`  - Tamworth Junior Football League: ${tamworthLeague ? '✅ Found' : '❌ Missing'}`);
            console.log(`  - Central Warwickshire Youth League: ${centralWarwickshire ? '✅ Found' : '❌ Missing'}`);
            console.log(`  - Northumberland Football League: ${northumberland ? '✅ Found' : '❌ Missing'}`);

            if (leagues.length >= 20 && tamworthLeague) {
              console.log('🎉 League population appears successful!');
              resolve(leagues);
            } else {
              console.log('⚠️  League population may be incomplete');
              resolve(leagues);
            }
          } else {
            console.log('❌ Leagues API did not return an array');
            reject(new Error('Invalid response format'));
          }
        } catch (error) {
          console.log('❌ Failed to parse leagues response:', error.message);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.log('❌ Failed to connect to leagues API:', error.message);
      reject(error);
    });
  });
};

// Run the test
testLeaguesEndpoint()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.log('\n❌ Test failed:', error.message);
    console.log('\n💡 If the deployment is still in progress, wait a few minutes and try again.');
    process.exit(1);
  });