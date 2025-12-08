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
      
      // AWS SNS (fallback)
      SNS_ACCESS_KEY_ID: process.env.SNS_ACCESS_KEY_ID 
        ? `${process.env.SNS_ACCESS_KEY_ID.substring(0, 4)}...`
        : (process.env.AWS_ACCESS_KEY_ID 
          ? `AWS_* fallback: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 4)}...`
          : '❌ not set'),
      SNS_SECRET_ACCESS_KEY: process.env.SNS_SECRET_ACCESS_KEY 
        ? '✅ set (hidden)'
        : (process.env.AWS_SECRET_ACCESS_KEY 
          ? '✅ AWS_* fallback (hidden)'
          : '❌ not set'),
      SNS_REGION: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1 (default)',
    };

    return NextResponse.json({
      success: true,
      message: 'SMS configuration check',
      status,
      environmentVariables: envCheck,
      instructions: {
        twilio: {
          description: 'Recommended - Easy to set up',
          signUp: 'https://www.twilio.com/',
          cost: '~$0.0075/SMS for US numbers',
          requiredEnvVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
        },
        aws_sns: {
          description: 'Alternative - More complex setup',
          signUp: 'https://aws.amazon.com/sns/',
          cost: '~$0.00645/SMS',
          requiredEnvVars: ['SNS_ACCESS_KEY_ID', 'SNS_SECRET_ACCESS_KEY', 'SNS_REGION'],
          note: 'Use SNS_* prefix, not AWS_* (Amplify blocks AWS_* vars)',
        },
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
        instructions: 'Set TWILIO_* or SNS_* environment variables in Amplify',
      }, { status: 400 });
    }

    const testMessage = message || 'This is a test SMS from RentalIQ. If you received this, SMS is working! 🎉';

    console.log(`📱 Sending test SMS to: ${phoneNumber} via ${status.provider}`);
    
    const result = await sendSMS(phoneNumber, testMessage);

    console.log(`📱 SMS result:`, result);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      provider: result.provider,
      phoneNumber,
      messageSent: testMessage,
    });
  } catch (error: any) {
    console.error('❌ Test SMS error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
