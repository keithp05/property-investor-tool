const axios = require('axios');

async function testZillowAPI() {
  const apiKey = 'd51410cd3cmehfc1d93eaedb3fcep1400a6jsnfe9d65ac4994';

  console.log('🔍 Testing Zillow RapidAPI...');
  console.log('API Key:', apiKey.substring(0, 15) + '...');
  console.log('');

  try {
    const response = await axios.get('https://zillow-com1.p.rapidapi.com/propertyExtendedSearch', {
      params: {
        location: 'Austin, TX',
        status_type: 'ForSale',
      },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
      },
      timeout: 30000,
    });

    console.log('✅ SUCCESS! Zillow API is working!');
    console.log('Status:', response.status);
    console.log('Properties found:', response.data?.length || 'Unknown structure');
    console.log('Sample data:', JSON.stringify(response.data, null, 2).substring(0, 500));
  } catch (error) {
    console.error('❌ ERROR:', error.response?.status, error.response?.statusText);
    if (error.response?.status === 403) {
      console.error('🚫 403 Forbidden - Your subscription might not be active yet');
      console.error('   - Wait 2-5 minutes for subscription to activate');
      console.error('   - Or check if you need to generate a new API key');
    } else if (error.response?.status === 429) {
      console.error('⏱️  429 Rate Limited - You hit your request limit');
    } else if (error.response?.status === 401) {
      console.error('🔑 401 Unauthorized - Invalid API key');
    }
    console.error('Response:', JSON.stringify(error.response?.data, null, 2));
  }
}

testZillowAPI();
