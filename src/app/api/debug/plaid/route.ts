import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

/**
 * GET /api/debug/plaid
 * Check Plaid configuration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check environment variables (mask sensitive data)
    const envCheck = {
      PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID 
        ? `✅ set (${process.env.PLAID_CLIENT_ID.substring(0, 8)}...)`
        : '❌ not set',
      PLAID_SECRET: process.env.PLAID_SECRET 
        ? '✅ set (hidden)'
        : '❌ not set',
      PLAID_ENV: process.env.PLAID_ENV || '❌ not set',
    };

    const isConfigured = !!(
      process.env.PLAID_CLIENT_ID && 
      process.env.PLAID_SECRET && 
      process.env.PLAID_ENV
    );

    // Validate environment
    const validEnvs = ['sandbox', 'development', 'production'];
    const envValid = validEnvs.includes(process.env.PLAID_ENV || '');

    return NextResponse.json({
      success: true,
      message: 'Plaid configuration check',
      isConfigured,
      environment: process.env.PLAID_ENV,
      environmentValid: envValid,
      environmentVariables: envCheck,
      availableProducts: {
        income: 'Income/employment verification for tenant screening',
        liabilities: 'Mortgage tracking for properties',
        transactions: 'Bank transaction history',
        assets: 'Bank account balances',
      },
      endpoints: {
        createLinkToken: 'POST /api/plaid/create-link-token',
        exchangeToken: 'POST /api/plaid/exchange-token',
        getLiabilities: 'GET /api/plaid/get-liabilities',
        webhook: 'POST /api/plaid/webhook',
      },
      setup: {
        step1: 'Get credentials from https://dashboard.plaid.com/developers/keys',
        step2: 'Add PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV to Amplify',
        step3: 'Use "development" for limited live access, "production" for full access',
        step4: 'Test by creating a link token',
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
 * POST /api/debug/plaid
 * Test Plaid API connectivity
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check configuration
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET || !process.env.PLAID_ENV) {
      return NextResponse.json({
        success: false,
        error: 'Plaid not configured',
        details: 'Add PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV to environment variables',
      }, { status: 400 });
    }

    // Validate environment value
    const plaidEnv = process.env.PLAID_ENV as keyof typeof PlaidEnvironments;
    if (!PlaidEnvironments[plaidEnv]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid PLAID_ENV',
        details: `Must be one of: sandbox, development, production`,
        current: process.env.PLAID_ENV,
      }, { status: 400 });
    }

    console.log('🔍 Testing Plaid API connectivity...');

    // Initialize Plaid client
    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidEnv],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });

    const plaidClient = new PlaidApi(configuration);

    // Test by creating a link token (this validates credentials)
    const testResponse = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: `test-${session.user.id}`,
      },
      client_name: 'RentalIQ Test',
      products: ['transactions'], // Basic product for testing
      country_codes: ['US'],
      language: 'en',
    });

    if (testResponse.data.link_token) {
      console.log('✅ Plaid API connection successful');
      
      return NextResponse.json({
        success: true,
        message: 'Plaid API connection successful!',
        environment: plaidEnv,
        apiUrl: PlaidEnvironments[plaidEnv],
        linkTokenCreated: true,
        expiresAt: testResponse.data.expiration,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to create test link token',
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Plaid test error:', error);
    
    const errorMessage = error.response?.data?.error_message || error.message;
    const errorCode = error.response?.data?.error_code;
    
    return NextResponse.json({
      success: false,
      error: 'Plaid API connection failed',
      code: errorCode,
      details: errorMessage,
      troubleshooting: {
        INVALID_API_KEYS: 'Check that PLAID_CLIENT_ID and PLAID_SECRET are correct',
        INVALID_PRODUCT: 'Your Plaid account may not have access to this product',
        RATE_LIMIT_EXCEEDED: 'Too many requests, wait and try again',
      },
    }, { status: 400 });
  }
}
