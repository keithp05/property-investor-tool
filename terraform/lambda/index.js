/**
 * Lambda function to trigger monthly property refresh cron job
 * Called by AWS EventBridge Scheduler on the 1st of every month
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

exports.handler = async (event) => {
  console.log('🔄 Property refresh cron Lambda triggered');
  console.log('Event:', JSON.stringify(event, null, 2));

  const apiEndpoint = process.env.API_ENDPOINT;
  const cronSecret = process.env.CRON_SECRET || event.cronSecret;

  if (!apiEndpoint) {
    console.error('❌ API_ENDPOINT not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API_ENDPOINT not configured' }),
    };
  }

  if (!cronSecret) {
    console.error('❌ CRON_SECRET not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CRON_SECRET not configured' }),
    };
  }

  const url = `${apiEndpoint}/api/cron/refresh-properties`;
  console.log('📡 Calling API:', url);

  try {
    const result = await makeRequest(url, cronSecret);
    console.log('✅ Cron job completed successfully');
    console.log('Result:', JSON.stringify(result, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Property refresh cron job completed',
        result,
      }),
    };
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};

/**
 * Make HTTPS/HTTP POST request
 */
function makeRequest(urlString, cronSecret) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}
