// Test notification sending
require('dotenv').config();
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

async function testSMS() {
  console.log('\n📱 Testing SMS (AWS SNS)...');
  console.log('Credentials:', {
    accessKeyId: process.env.SNS_ACCESS_KEY_ID?.substring(0, 8) + '...',
    region: process.env.SNS_REGION || 'us-east-1'
  });

  const client = new SNSClient({
    region: process.env.SNS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.SNS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SNS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const command = new PublishCommand({
      PhoneNumber: '+12109459406', // Your phone number
      Message: 'Test SMS from RentalIQ - If you receive this, SMS is working! ✅',
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    });

    const result = await client.send(command);
    console.log('✅ SMS sent successfully! MessageId:', result.MessageId);
    return true;
  } catch (error) {
    console.error('❌ SMS failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

async function testEmail() {
  console.log('\n📧 Testing Email (AWS SES)...');
  console.log('From:', process.env.EMAIL_FROM);
  console.log('Credentials:', {
    accessKeyId: process.env.SNS_ACCESS_KEY_ID?.substring(0, 8) + '...',
    region: process.env.SNS_REGION || 'us-east-1'
  });

  const client = new SESClient({
    region: process.env.SNS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.SNS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SNS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const command = new SendEmailCommand({
      Source: process.env.EMAIL_FROM || 'keith.p05@gmail.com',
      Destination: {
        ToAddresses: ['keith.p05@gmail.com'], // Verified email
      },
      Message: {
        Subject: {
          Data: 'Test Email from RentalIQ',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: 'Test email from RentalIQ - If you receive this, email is working! ✅',
            Charset: 'UTF-8',
          },
          Html: {
            Data: '<html><body><h2>Test Email from RentalIQ</h2><p>If you receive this, <strong>email is working!</strong> ✅</p></body></html>',
            Charset: 'UTF-8',
          },
        },
      },
    });

    const result = await client.send(command);
    console.log('✅ Email sent successfully! MessageId:', result.MessageId);
    return true;
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing RentalIQ Notifications\n');
  console.log('Environment check:');
  console.log('- SNS_ACCESS_KEY_ID:', process.env.SNS_ACCESS_KEY_ID ? '✓' : '✗');
  console.log('- SNS_SECRET_ACCESS_KEY:', process.env.SNS_SECRET_ACCESS_KEY ? '✓' : '✗');
  console.log('- EMAIL_FROM:', process.env.EMAIL_FROM || '(not set)');

  const emailSuccess = await testEmail();
  const smsSuccess = await testSMS();

  console.log('\n📊 Test Results:');
  console.log('Email:', emailSuccess ? '✅ PASS' : '❌ FAIL');
  console.log('SMS:', smsSuccess ? '✅ PASS' : '❌ FAIL');

  if (emailSuccess && smsSuccess) {
    console.log('\n🎉 All tests passed! Notifications are working.');
  } else {
    console.log('\n⚠️  Some tests failed. Check errors above.');
  }
}

runTests();
