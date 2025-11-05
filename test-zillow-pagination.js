const axios = require('axios');

async function testZillow() {
  const apiKey = 'd51410cd3cmshfc1d93eaedb3fcep1400a6jsnfe9d65ac4994';

  console.log('🔍 Testing Zillow API pagination...');
  
  try {
    const response = await axios.get('https://zillow-com1.p.rapidapi.com/propertyExtendedSearch', {
      params: {
        location: 'San Antonio, TX',
        status_type: 'ForSale',
      },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
      },
      timeout: 30000,
    });

    console.log('✅ Success!');
    console.log('Total results in response:', response.data?.props?.length || 0);
    console.log('Response keys:', Object.keys(response.data));
    
    // Check for pagination info
    if (response.data.totalResultCount) {
      console.log('Total available:', response.data.totalResultCount);
    }
    if (response.data.totalPages) {
      console.log('Total pages:', response.data.totalPages);
    }
    
    console.log('\nFull response structure:', JSON.stringify(response.data, null, 2).substring(0, 1000));
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testZillow();
