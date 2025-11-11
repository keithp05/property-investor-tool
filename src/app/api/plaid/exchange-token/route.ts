import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publicToken, propertyId } = await request.json();
    if (!publicToken || !propertyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify property ownership
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        landlordId: landlordProfile.id,
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
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

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get accounts to find the mortgage account
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    // Find the first liability account (mortgage)
    const mortgageAccount = accountsResponse.data.accounts.find(
      (account) => account.type === 'loan' || account.subtype === 'mortgage'
    );

    // Update property with Plaid tokens
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        plaidAccessToken: accessToken,
        plaidItemId: itemId,
        plaidAccountId: mortgageAccount?.account_id || accountsResponse.data.accounts[0]?.account_id,
        plaidLinked: true,
        plaidLastSync: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Mortgage account linked successfully',
    });
  } catch (error: any) {
    console.error('Error exchanging Plaid token:', error);
    return NextResponse.json(
      { error: 'Failed to link account', details: error.message },
      { status: 500 }
    );
  }
}
