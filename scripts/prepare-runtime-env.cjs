const fs = require('node:fs');
const path = require('node:path');

// Explicit application settings only. Never persist Amplify's temporary AWS credentials.
const keys = [
  'DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'ADMIN_SECRET', 'ADMIN_SETUP_KEY',
  'OPENAI_API_KEY', 'GOOGLE_MAPS_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'PLAID_CLIENT_ID', 'PLAID_SECRET', 'PLAID_ENV',
  'BRIGHT_DATA_API_TOKEN', 'BRIGHT_DATA_DATASET_ID', 'BRIGHT_DATA_AUCTION_DATASET_ID',
  'ZILLOW_API_KEY', 'RAPIDAPI_KEY', 'REALTOR_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'FROM_EMAIL',
  'AWS_REGION', 'SNS_REGION', 'SNS_ACCESS_KEY_ID', 'SNS_SECRET_ACCESS_KEY',
  'TELNYX_API_KEY', 'TELNYX_PHONE_NUMBER', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
  'CERTN_API_KEY', 'CERTN_API_URL', 'CERTN_OWNER_ID', 'CERTN_WEBHOOK_SECRET', 'CRON_SECRET',
  'GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET', 'GOOGLE_CALENDAR_REDIRECT_URI',
  'MICROSOFT_CALENDAR_CLIENT_ID', 'MICROSOFT_CALENDAR_CLIENT_SECRET', 'MICROSOFT_CALENDAR_REDIRECT_URI',
  'HUD_USER_TOKEN', 'AIRDNA_API_KEY', 'MASHVISOR_API_KEY', 'CRIME_REPORTS_API_KEY',
  'FBI_CRIME_DATA_API_KEY', 'GREAT_SCHOOLS_API_KEY', 'FACEBOOK_GRAPH_API_KEY',
];
function renderEnvironment(env) {
  for (const name of ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'ADMIN_SECRET']) {
    if (!env[name]?.trim()) throw new Error(`Missing required deployment setting: ${name}`);
  }
  return keys.filter(key => env[key] !== undefined)
    .map(key => {
      const value = env[key];
      // Single quotes/backticks preserve literal backslashes in Next's dotenv loader.
      const quote = ["'", '`'].find(candidate => !value.includes(candidate));
      if (!quote || /[\r\0]/.test(value)) {
        throw new Error(`Unsupported characters in deployment setting: ${key}`);
      }
      return `${key}=${quote}${value.replace(/\$/g, '\\$')}${quote}`;
    }).join('\n') + '\n';
}
if (require.main === module) {
  const filename = path.resolve('.env.production');
  fs.writeFileSync(filename, renderEnvironment(process.env), { mode: 0o600 });
  fs.chmodSync(filename, 0o600);
  console.log('Prepared server runtime configuration (values omitted).');
}
module.exports = { renderEnvironment };
