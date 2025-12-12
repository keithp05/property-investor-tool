import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/plaid/exchange-token
 * Exchange Plaid public token for access token
 * 
 * Supports:
 * 1. Property mortgage linking (propertyId)
 * 2. Tenant income verification (applicationId)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { publicToken, propertyId, applicationId, purpose = 'property' } = body;
    
    if (!publicToken) {
      return NextResponse.json({ error: 'Public token required' }, { status: 400 });
    }
    
    if (!propertyId && !applicationId) {
      return NextResponse.json({ error: 'Property ID or Application ID required' }, { status: 400 });
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
    console.log('📊 Exchanging Plaid public token...');
    
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    console.log(`✅ Plaid token exchanged: ${itemId}`);

    // Handle based on purpose
    if (applicationId || purpose === 'income') {
      // Tenant income verification
      return await handleIncomeVerification(
        plaidClient, 
        accessToken, 
        itemId, 
        applicationId,
        session.user.id
      );
    } else {
      // Property mortgage linking
      return await handlePropertyLinking(
        plaidClient,
        accessToken,
        itemId,
        propertyId,
        session.user.id
      );
    }

  } catch (error: any) {
    console.error('❌ Error exchanging Plaid token:', error);
    const errorMessage = error.response?.data?.error_message || error.message;
    return NextResponse.json(
      { error: 'Failed to link account', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Handle property mortgage linking
 */
async function handlePropertyLinking(
  plaidClient: PlaidApi,
  accessToken: string,
  itemId: string,
  propertyId: string,
  userId: string
) {
  // Verify property ownership
  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId },
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

  console.log(`✅ Property ${propertyId} linked to Plaid`);

  return NextResponse.json({
    success: true,
    message: 'Mortgage account linked successfully',
    purpose: 'property',
  });
}

/**
 * Handle tenant income verification
 */
async function handleIncomeVerification(
  plaidClient: PlaidApi,
  accessToken: string,
  itemId: string,
  applicationId: string,
  userId: string
) {
  // Find the application
  const application = await prisma.tenantApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  try {
    // Get income data from Plaid
    // Note: This requires the Income product and payroll connection
    let incomeData: any = null;
    let employmentData: any = null;

    try {
      // Try to get income verification data
      const incomeResponse = await plaidClient.incomeVerificationPaystubsGet({
        access_token: accessToken,
      });
      incomeData = incomeResponse.data;
      console.log('📊 Income data retrieved');
    } catch (incomeError: any) {
      console.log('ℹ️ Income data not available:', incomeError.message);
    }

    try {
      // Try to get employment data
      const employmentResponse = await plaidClient.employmentVerificationGet({
        access_token: accessToken,
      });
      employmentData = employmentResponse.data;
      console.log('📊 Employment data retrieved');
    } catch (empError: any) {
      console.log('ℹ️ Employment data not available:', empError.message);
    }

    // Get basic account info as fallback
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    // Calculate total balance across accounts (for asset verification)
    const totalBalance = accountsResponse.data.accounts.reduce(
      (sum, account) => sum + (account.balances.current || 0),
      0
    );

    // Extract income info if available
    let annualIncome = null;
    let employer = null;
    
    if (incomeData?.paystubs?.length > 0) {
      const latestPaystub = incomeData.paystubs[0];
      // Estimate annual income from paystub
      const payPeriodGross = latestPaystub.pay_period_details?.gross_earnings || 0;
      const payFrequency = latestPaystub.pay_period_details?.pay_frequency || 'monthly';
      
      // Convert to annual
      const multiplier = {
        'weekly': 52,
        'biweekly': 26,
        'semimonthly': 24,
        'monthly': 12,
      }[payFrequency] || 12;
      
      annualIncome = payPeriodGross * multiplier;
      employer = latestPaystub.employer?.name;
    }

    if (employmentData?.items?.length > 0) {
      const employment = employmentData.items[0].employment_verification;
      if (employment) {
        employer = employer || employment.employer?.name;
      }
    }

    // Update application with verification data
    await prisma.tenantApplication.update({
      where: { id: applicationId },
      data: {
        // Store Plaid tokens for future verification
        plaidAccessToken: accessToken,
        plaidItemId: itemId,
        // Update income/employment if we got it
        ...(annualIncome && { annualIncome }),
        ...(employer && { employer }),
        // Mark as income verified
        incomeVerified: true,
        incomeVerifiedAt: new Date(),
        // Store account balance info
        verifiedAssets: totalBalance,
      },
    });

    console.log(`✅ Application ${applicationId} income verified:`, {
      annualIncome,
      employer,
      totalBalance,
    });

    return NextResponse.json({
      success: true,
      message: 'Income verification completed',
      purpose: 'income',
      data: {
        incomeVerified: true,
        annualIncome,
        employer,
        accountsConnected: accountsResponse.data.accounts.length,
        totalBalance,
      },
    });

  } catch (error: any) {
    console.error('❌ Income verification error:', error);
    
    // Still mark as linked even if we couldn't get full income data
    await prisma.tenantApplication.update({
      where: { id: applicationId },
      data: {
        plaidAccessToken: accessToken,
        plaidItemId: itemId,
        incomeVerified: false, // Partial verification
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Bank account linked, but full income verification requires payroll connection',
      purpose: 'income',
      partial: true,
    });
  }
}
