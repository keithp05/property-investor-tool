import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { smsService, getSMSStatus, sendSMS } from '@/lib/smsService';

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

    const smsConfig = getSMSStatus();

    // Check environment variables (mask sensitive data)
    const envCheck = {
      // Twilio
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID 
        ? `✅ set (${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...)`
        : '❌ not set',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN 
        ? '✅ set (hidden)'
        : '❌ not set',
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '❌ not set',
      
      // AWS SNS
      SNS_ACCESS_KEY_ID: process.env.SNS_ACCESS_KEY_ID 
        ? `✅ set (${process.env.SNS_ACCESS_KEY_ID.substring(0, 8)}...)`
        : '❌ not set',
      SNS_SECRET_ACCESS_KEY: process.env.SNS_SECRET_ACCESS_KEY 
        ? '✅ set (hidden)'
        : '❌ not set',
      SNS_REGION: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1 (default)',
      
      // Fallback AWS credentials
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID 
        ? `✅ set (${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...)`
        : '❌ not set',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY 
        ? '✅ set (hidden)'
        : '❌ not set',
    };

    return NextResponse.json({
      success: true,
      message: 'SMS configuration check',
      currentProvider: smsConfig.provider,
      isConfigured: smsConfig.isConfigured,
      details: smsConfig.details,
      environmentVariables: envCheck,
      providerPriority: [
        '1. Twilio (recommended) - Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER',
        '2. AWS SNS (fallback) - Set SNS_ACCESS_KEY_ID, SNS_SECRET_ACCESS_KEY, SNS_REGION',
      ],
      snsNotes: {
        sandboxMode: 'By default, SNS SMS is in sandbox mode. You must verify destination phone numbers first.',
        verifyPhone: 'To verify a phone: AWS Console → SNS → Text messaging (SMS) → Sandbox destination phone numbers → Add phone number',
        productionAccess: 'To send to any number: AWS Console → SNS → Text messaging (SMS) → Exit SMS sandbox',
        spendingLimit: 'Default spending limit is $1/month. Increase in SNS console if needed.',
      },
      testEndpoint: 'POST /api/debug/sms with body: { "phoneNumber": "+1XXXXXXXXXX" }',
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

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number required',
        example: { phoneNumber: '+15551234567' },
      }, { status: 400 });
    }

    // Check configuration first
    const smsConfig = getSMSStatus();
    
    if (!smsConfig.isConfigured) {
      return NextResponse.json({
        success: false,
        error: 'SMS not configured',
        details: smsConfig.details,
        setupInstructions: {
          twilio: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in Amplify',
          sns: 'Set SNS_ACCESS_KEY_ID, SNS_SECRET_ACCESS_KEY, SNS_REGION in Amplify',
        },
      }, { status: 400 });
    }

    console.log(`🔍 Testing SMS to: ${phoneNumber}`);
    console.log(`📱 Using provider: ${smsConfig.provider}`);

    // Send test message
    const testMessage = `🔔 RentalIQ Test Message\n\nThis is a test SMS from your RentalIQ application.\n\nTime: ${new Date().toLocaleString()}\nProvider: ${smsConfig.provider}`;
    
    const result = await sendSMS(phoneNumber, testMessage);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test SMS sent successfully!',
        provider: result.provider,
        messageId: result.messageId,
        sentTo: phoneNumber,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        provider: result.provider,
        troubleshooting: getTroubleshootingTips(result.error || '', smsConfig.provider),
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ SMS test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send test SMS',
    }, { status: 500 });
  }
}

function getTroubleshootingTips(error: string, provider: string): Record<string, string> {
  const tips: Record<string, string> = {};
  
  if (provider === 'sns') {
    tips['Sandbox Mode'] = 'If phone is not verified, go to AWS SNS Console → Text messaging → Sandbox destination phone numbers → Add and verify your phone';
    tips['IAM Permissions'] = 'Ensure IAM user has sns:Publish permission';
    tips['Spending Limit'] = 'Check/increase SMS spending limit in SNS Console → Text messaging → Account information';
    tips['Phone Format'] = 'Use E.164 format: +1XXXXXXXXXX (include country code)';
    tips['Exit Sandbox'] = 'To send to unverified numbers, request production access in SNS Console';
  } else if (provider === 'twilio') {
    tips['Trial Account'] = 'Twilio trial accounts can only send to verified numbers';
    tips['Phone Format'] = 'Use E.164 format: +1XXXXXXXXXX';
    tips['Account Balance'] = 'Check Twilio account balance';
    tips['Phone Number'] = 'Ensure TWILIO_PHONE_NUMBER is an SMS-capable number';
  }
  
  return tips;
}
