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

    // Initialize Plaid client
    const configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments],
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
    return NextResponse.json(
      { error: 'Failed to create link token', details: error.message },
      { status: 500 }
    );
  }
}
