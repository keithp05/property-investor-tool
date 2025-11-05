const axios = require('axios');

async function testZillow() {
  const apiKey = 'd51410cd3cmshfc1d93eaedb3fcep1400a6jsnfe9d65ac4994';

  console.log('🔍 Testing with CORRECTED API key...');
  
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

    console.log('✅ SUCCESS! Got', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2).substring(0, 500));
  } catch (error) {
    console.error('❌ ERROR:', error.response?.status, error.message);
    console.error('Response:', JSON.stringify(error.response?.data, null, 2));
  }
}

testZillow();
