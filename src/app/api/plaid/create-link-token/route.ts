import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId } = await request.json();
    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
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

    // Create link token
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: session.user.id,
      },
      client_name: 'RentalIQ',
      products: [Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: `${process.env.NEXTAUTH_URL}/api/plaid/webhook`,
      redirect_uri: `${process.env.NEXTAUTH_URL}/properties`,
    });

    return NextResponse.json({
      success: true,
      linkToken: response.data.link_token,
    });
  } catch (error: any) {
    console.error('Error creating Plaid link token:', error);
    const errorMessage = error.response?.data?.error_message || error.message || 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to create link token', 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
