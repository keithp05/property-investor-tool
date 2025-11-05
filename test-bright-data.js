const axios = require('axios');

async function testBrightData() {
  const apiToken = process.env.BRIGHT_DATA_API_TOKEN || 'b773aaf2-a632-459f-b217-5d38368db5f6';
  const datasetId = process.env.BRIGHT_DATA_DATASET_ID || 'gd_lwh4f6i08oqu8aw1q5';

  console.log('🔍 Testing Bright Data API...');
  console.log('API Token:', apiToken ? apiToken.substring(0, 10) + '...' : 'NOT SET');
  console.log('Dataset ID:', datasetId);
  console.log('');

  try {
    // Test 1: Try to trigger a search
    console.log('Test 1: Triggering dataset query...');
    const response = await axios.post(
      'https://api.brightdata.com/datasets/v3/trigger',
      {
        dataset_id: datasetId,
        filters: {
          city: 'Austin',
          state: 'TX',
        },
        format: 'json',
        limit: 10,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Success! Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
  }

  console.log('');

  try {
    // Test 2: List available datasets
    console.log('Test 2: Listing available datasets...');
    const response = await axios.get(
      'https://api.brightdata.com/datasets/v3/datasets',
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    console.log('✅ Available datasets:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testBrightData();
