import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendSMS, getSMSStatus } from '@/lib/smsService';

/**
 * GET /api/debug/sms
 * Check SMS configuration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = getSMSStatus();
    
    // Check environment variables (mask sensitive data)
    const envCheck = {
      // Twilio (recommended)
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID 
        ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 6)}...${process.env.TWILIO_ACCOUNT_SID.slice(-4)}`
        : '❌ not set',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN 
        ? '✅ set (hidden)'
        : '❌ not set',
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '❌ not set',
      
      // AWS SNS
      SNS_ACCESS_KEY_ID: process.env.SNS_ACCESS_KEY_ID 
        ? `✅ ${process.env.SNS_ACCESS_KEY_ID.substring(0, 8)}...`
        : '❌ not set',
      SNS_SECRET_ACCESS_KEY: process.env.SNS_SECRET_ACCESS_KEY 
        ? '✅ set (hidden)'
        : '❌ not set',
      SNS_REGION: process.env.SNS_REGION || 'us-east-1 (default)',
    };

    return NextResponse.json({
      success: true,
      message: 'SMS configuration check',
      activeProvider: status.provider,
      isConfigured: status.isConfigured,
      providerDetails: status.details,
      environmentVariables: envCheck,
      troubleshooting: {
        step1: 'Check IAM user has SNS:Publish permission',
        step2: 'Check SMS spending limit in AWS SNS console (default $1)',
        step3: 'In sandbox mode, verify destination phone numbers first',
        step4: 'US numbers dont support custom SenderIDs',
        awsConsole: 'https://console.aws.amazon.com/sns/v3/home?region=us-east-1#/mobile/text-messaging',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * POST /api/debug/sms
 * Send a test SMS
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber, message } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number is required',
        example: { phoneNumber: '+12105551234', message: 'Test message (optional)' },
      }, { status: 400 });
    }

    const status = getSMSStatus();
    
    if (!status.isConfigured) {
      return NextResponse.json({
        success: false,
        error: 'SMS not configured',
        details: status.details,
        provider: status.provider,
      }, { status: 400 });
    }

    const testMessage = message || `Test SMS from RentalIQ at ${new Date().toLocaleTimeString()}. If you received this, SMS is working!`;

    console.log(`📱 === SENDING TEST SMS ===`);
    console.log(`📱 To: ${phoneNumber}`);
    console.log(`📱 Provider: ${status.provider}`);
    console.log(`📱 Message: ${testMessage}`);
    
    const result = await sendSMS(phoneNumber, testMessage);

    console.log(`📱 === SMS RESULT ===`);
    console.log(`📱 Success: ${result.success}`);
    console.log(`📱 MessageId: ${result.messageId || 'N/A'}`);
    console.log(`📱 Error: ${result.error || 'None'}`);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        provider: result.provider,
        phoneNumber,
        message: 'SMS sent successfully! Check your phone.',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        provider: result.provider,
        phoneNumber,
        troubleshooting: {
          iamPolicy: 'Ensure IAM user has: {"Effect": "Allow", "Action": "sns:Publish", "Resource": "*"}',
          spendingLimit: 'Check AWS SNS Text Messaging > Spending limit (default $1/month)',
          sandbox: 'In sandbox, add phone number to "Sandbox destination phone numbers"',
          region: 'Ensure SNS_REGION matches where you set up SMS',
        },
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Test SMS exception:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    }, { status: 500 });
  }
}
