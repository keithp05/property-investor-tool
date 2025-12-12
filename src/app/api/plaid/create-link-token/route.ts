import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

/**
 * POST /api/plaid/create-link-token
 * Create a Plaid Link token for connecting bank accounts
 * 
 * Supports two use cases:
 * 1. Property mortgage tracking (propertyId) - uses Liabilities product
 * 2. Tenant income verification (applicationId) - uses Income product
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId, applicationId, purpose = 'property' } = body;

    if (!propertyId && !applicationId) {
      return NextResponse.json({ 
        error: 'Property ID or Application ID required' 
      }, { status: 400 });
    }

    // Check if Plaid environment variables are configured
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET || !process.env.PLAID_ENV) {
      console.error('❌ Plaid environment variables not configured');
      return NextResponse.json(
        { 
          error: 'Plaid integration not configured',
          details: 'Plaid credentials are missing. Please configure PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV environment variables.'
        },
        { status: 500 }
      );
    }

    // Validate PLAID_ENV value
    const plaidEnv = process.env.PLAID_ENV as keyof typeof PlaidEnvironments;
    if (!PlaidEnvironments[plaidEnv]) {
      console.error('❌ Invalid PLAID_ENV:', plaidEnv);
      return NextResponse.json(
        { 
          error: 'Invalid Plaid environment',
          details: `PLAID_ENV must be one of: ${Object.keys(PlaidEnvironments).join(', ')}`
        },
        { status: 500 }
      );
    }

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

    // Determine products based on purpose
    let products: Products[];
    let redirectUri: string;
    
    if (purpose === 'income' || applicationId) {
      // Tenant income/employment verification
      // Note: Income verification requires user to connect their payroll provider
      products = [Products.Income];
      redirectUri = applicationId 
        ? `${process.env.NEXTAUTH_URL}/apply/${applicationId}?plaid=success`
        : `${process.env.NEXTAUTH_URL}/applications`;
    } else {
      // Property mortgage/liability tracking
      products = [Products.Liabilities];
      redirectUri = `${process.env.NEXTAUTH_URL}/properties`;
    }

    console.log(`📊 Creating Plaid link token:`, {
      purpose,
      products,
      userId: session.user.id,
      env: plaidEnv,
    });

    // Create link token
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: session.user.id,
      },
      client_name: 'RentalIQ',
      products,
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: `${process.env.NEXTAUTH_URL}/api/plaid/webhook`,
      redirect_uri: redirectUri,
    });

    console.log(`✅ Plaid link token created for ${purpose}`);

    return NextResponse.json({
      success: true,
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
      purpose,
    });
  } catch (error: any) {
    console.error('❌ Error creating Plaid link token:', error);
    const errorMessage = error.response?.data?.error_message || error.message || 'Unknown error';
    const errorCode = error.response?.data?.error_code;
    
    return NextResponse.json(
      { 
        error: 'Failed to create link token', 
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}
