import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCertnStatus } from '@/lib/certnService';

/**
 * GET /api/debug/certn
 * Check Certn configuration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = getCertnStatus();
    
    // Check environment variables (mask sensitive data)
    const envCheck = {
      CERTN_API_KEY: process.env.CERTN_API_KEY 
        ? `✅ set (${process.env.CERTN_API_KEY.substring(0, 8)}...)`
        : '❌ not set',
      CERTN_API_URL: process.env.CERTN_API_URL || 'https://api.certn.co (default)',
      CERTN_OWNER_ID: process.env.CERTN_OWNER_ID 
        ? `✅ set (${process.env.CERTN_OWNER_ID.substring(0, 8)}...)`
        : '⚠️ not set (optional)',
    };

    return NextResponse.json({
      success: true,
      message: 'Certn configuration check',
      isConfigured: status.isConfigured,
      apiUrl: status.apiUrl,
      environmentVariables: envCheck,
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/screening/webhook`,
      setup: {
        step1: 'Get API key from Certn dashboard (Settings → API)',
        step2: 'Add CERTN_API_KEY to AWS Amplify environment variables',
        step3: 'Optional: Add CERTN_OWNER_ID (your Certn user ID)',
        step4: `Configure webhook in Certn: ${process.env.NEXTAUTH_URL}/api/screening/webhook`,
        step5: 'Test with a screening request',
        docs: 'https://docs.certn.co/api',
      },
      endpoints: {
        initiate: 'POST /api/screening/initiate - Start a background check',
        status: 'GET /api/screening/initiate?applicationId=xxx - Check status',
        webhook: 'POST /api/screening/webhook - Receive results from Certn',
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
 * POST /api/debug/certn
 * Test Certn API connectivity
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = getCertnStatus();
    
    if (!status.isConfigured) {
      return NextResponse.json({
        success: false,
        error: 'Certn not configured',
        details: 'Add CERTN_API_KEY to environment variables',
      }, { status: 400 });
    }

    // Test API connectivity by making a simple request
    const apiUrl = process.env.CERTN_API_URL || 'https://api.certn.co';
    
    console.log('🔍 Testing Certn API connectivity...');
    
    const response = await fetch(`${apiUrl}/api/v1/settings/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CERTN_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        message: 'Certn API connection successful!',
        apiUrl,
        accountInfo: {
          // Only show non-sensitive info
          team: data.team_name || data.name,
          type: data.account_type,
        },
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: 'Certn API connection failed',
        status: response.status,
        details: errorData.message || errorData.error || response.statusText,
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Certn test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
