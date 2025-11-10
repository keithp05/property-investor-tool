// Test signup directly against the deployed API
const API_URL = 'https://develop.d3q1fuby25122q.amplifyapp.com';

async function testSignup() {
  console.log('🧪 Testing signup API...\n');

  try {
    // Test 1: Check debug endpoint
    console.log('1️⃣ Testing database connection...');
    const debugRes = await fetch(`${API_URL}/api/debug`);
    const debugData = await debugRes.json();
    console.log('Debug response:', JSON.stringify(debugData, null, 2));
    console.log('');

    // Test 2: Try signup
    console.log('2️⃣ Testing signup...');
    const signupRes = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'LANDLORD'
      })
    });

    const signupData = await signupRes.json();
    console.log('Signup response:', JSON.stringify(signupData, null, 2));
    console.log('Status:', signupRes.status);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSignup();
