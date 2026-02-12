import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Test league request endpoints
async function testLeagueRequests() {
  try {
    console.log('🚀 Starting League Requests API Tests...\n');

    // ========================================
    // 1. Test: Login as Coach User
    // ========================================
    console.log('📝 Step 1: Logging in as coach...');
    const coachLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'coach@example.com',
      password: 'Password123!'
    }).catch(async (error) => {
      // Create a test coach account first
      if (error.response?.status === 401) {
        console.log('  Creating test coach account...');
        await axios.post(`${BASE_URL}/api/auth/register`, {
          email: 'coach@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'Coach',
          role: 'Coach',
          agreeToTerms: true
        });
        
        // Try login again
        return axios.post(`${BASE_URL}/api/auth/login`, {
          email: 'coach@example.com',
          password: 'Password123!'
        });
      }
      throw error;
    });
    
    const coachToken = coachLoginResponse.data.token;
    console.log('✅ Coach logged in successfully\n');

    // ========================================
    // 2. Test: Submit League Request
    // ========================================
    console.log('📝 Step 2: Submitting a league request...');
    const submitResponse = await axios.post(`${BASE_URL}/api/league-requests`, {
      name: 'Test Football League',
      region: 'Test Region',
      ageGroups: ['U10', 'U12', 'U14'],
      url: 'https://www.exampleleague.com',
      description: 'A test league for testing purposes',
      contactName: 'John Smith',
      contactEmail: 'john@example.com',
      contactPhone: '07123456789'
    }, {
      headers: {
        'Authorization': `Bearer ${coachToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ League request submitted successfully');
    console.log('   Response:', JSON.stringify(submitResponse.data, null, 2));
    const requestId = submitResponse.data.request?.id;
    console.log(`   Request ID: ${requestId}\n`);

    // ========================================
    // 3. Test: Get User's League Requests
    // ========================================
    console.log('📝 Step 3: Retrieving user\'s league requests...');
    const myRequestsResponse = await axios.get(`${BASE_URL}/api/league-requests/my-requests`, {
      headers: {
        'Authorization': `Bearer ${coachToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ User\'s league requests retrieved');
    console.log(`   Found ${myRequestsResponse.data.requests?.length} requests`);
    console.log('   Response:', JSON.stringify(myRequestsResponse.data, null, 2).substring(0, 500) + '...\n');

    // ========================================
    // 4. Test: Get Admin Token
    // ========================================
    console.log('📝 Step 4: Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'AdminPassword123!'
    }).catch(async (error) => {
      if (error.response?.status === 401) {
        console.log('  Creating test admin account...');
        await axios.post(`${BASE_URL}/api/auth/register`, {
          email: 'admin@example.com',
          password: 'AdminPassword123!',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'Admin',
          agreeToTerms: true
        });
        
        return axios.post(`${BASE_URL}/api/auth/login`, {
          email: 'admin@example.com',
          password: 'AdminPassword123!'
        });
      }
      throw error;
    });
    
    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin logged in successfully\n');

    // ========================================
    // 5. Test: Get All League Requests (Admin)
    // ========================================
    console.log('📝 Step 5: Retrieving all league requests (admin view)...');
    const allRequestsResponse = await axios.get(`${BASE_URL}/api/league-requests/admin/all`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Admin league requests retrieved');
    console.log(`   Found ${allRequestsResponse.data.requests?.length} total requests`);
    console.log('   Status counts:', allRequestsResponse.data.statusCounts);
    console.log('   Response (first request):', JSON.stringify(allRequestsResponse.data.requests?.[0], null, 2));
    console.log('');

    // ========================================
    // 6. Test: Get Request Statistics (Admin)
    // ========================================
    console.log('📝 Step 6: Getting request statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/api/league-requests/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Statistics retrieved');
    console.log('   Response:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    // ========================================
    // 7. Test: Approve League Request (Admin)
    // ========================================
    if (requestId) {
      console.log(`📝 Step 7: Approving league request ${requestId}...`);
      const approveResponse = await axios.post(
        `${BASE_URL}/api/league-requests/admin/${requestId}/approve`,
        {
          reviewNotes: 'Request approved for testing',
          leagueData: {
            name: 'Test Football League',
            region: 'Test Region',
            ageGroups: ['U10', 'U12', 'U14'],
            url: 'https://www.exampleleague.com',
            description: 'A test league for testing purposes',
            hits: 0
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ League request approved');
      console.log('   Response:', JSON.stringify(approveResponse.data, null, 2));
      console.log('');
    }

    // ========================================
    // 8. Summary
    // ========================================
    console.log('✅ All tests completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   ✓ Coach login successful');
    console.log('   ✓ Submit league request successful');
    console.log('   ✓ Get user\'s requests successful');
    console.log('   ✓ Admin login successful');
    console.log('   ✓ Get all requests (admin) successful');
    console.log('   ✓ Get statistics (admin) successful');
    if (requestId) {
      console.log('   ✓ Approve request (admin) successful');
    }

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    console.error('   Full error:', error);
  }
}

testLeagueRequests();
