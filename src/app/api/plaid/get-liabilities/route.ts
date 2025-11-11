import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { prisma } from '@/lib/prisma';

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

    // Get property with Plaid tokens
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

    if (!property.plaidAccessToken) {
      return NextResponse.json({ error: 'Plaid not linked to this property' }, { status: 400 });
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

    // Get liabilities (mortgage data)
    const liabilitiesResponse = await plaidClient.liabilitiesGet({
      access_token: property.plaidAccessToken,
    });

    const mortgage = liabilitiesResponse.data.liabilities?.mortgage?.[0];

    if (!mortgage) {
      return NextResponse.json({ error: 'No mortgage found' }, { status: 404 });
    }

    // Update property with latest mortgage data
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        mortgageBalance: mortgage.current_balance || undefined,
        mortgageRate: mortgage.interest_rate.percentage || undefined,
        monthlyMortgage: mortgage.next_monthly_payment || undefined,
        nextPaymentDue: mortgage.next_payment_due_date ? new Date(mortgage.next_payment_due_date) : undefined,
        lenderName: mortgage.origination_principal_amount ? 'Linked via Plaid' : undefined,
        plaidLastSync: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      mortgage: {
        currentBalance: mortgage.current_balance,
        interestRate: mortgage.interest_rate.percentage,
        interestRateType: mortgage.interest_rate.type,
        loanTerm: mortgage.loan_term,
        nextPaymentAmount: mortgage.next_monthly_payment,
        nextPaymentDue: mortgage.next_payment_due_date,
        originationDate: mortgage.origination_date,
        originationPrincipal: mortgage.origination_principal_amount,
        ytdInterestPaid: mortgage.ytd_interest_paid,
        ytdPrincipalPaid: mortgage.ytd_principal_paid,
        propertyAddress: mortgage.property_address,
      },
    });
  } catch (error: any) {
    console.error('Error fetching Plaid liabilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mortgage data', details: error.message },
      { status: 500 }
    );
  }
}
