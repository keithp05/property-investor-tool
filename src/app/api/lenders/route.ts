import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/lenders
 * Get all lenders for the current landlord
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    const lenders = await prisma.lender.findMany({
      where: { landlordId: landlordProfile.id },
      orderBy: [
        { isFavorite: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      lenders,
    });

  } catch (error: any) {
    console.error('Get lenders error:', error);
    return NextResponse.json(
      { error: 'Failed to get lenders', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lenders
 * Create a new lender
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    const data = await request.json();

    const lender = await prisma.lender.create({
      data: {
        landlordId: landlordProfile.id,
        name: data.name,
        type: data.type as any,
        contactName: data.contactName || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        city: data.city || null,
        state: data.state || null,
        minLoanAmount: data.minLoanAmount ? parseFloat(data.minLoanAmount) : null,
        maxLoanAmount: data.maxLoanAmount ? parseFloat(data.maxLoanAmount) : null,
        interestRateMin: data.interestRateMin ? parseFloat(data.interestRateMin) : null,
        interestRateMax: data.interestRateMax ? parseFloat(data.interestRateMax) : null,
        ltvMax: data.ltvMax ? parseFloat(data.ltvMax) : null,
        timeToClose: data.timeToClose || null,
        loanTypes: data.loanTypes || [],
        notes: data.notes || null,
      },
    });

    console.log(`🏦 Lender created: ${lender.name}`);

    return NextResponse.json({
      success: true,
      lender,
    });

  } catch (error: any) {
    console.error('Create lender error:', error);
    return NextResponse.json(
      { error: 'Failed to create lender', details: error.message },
      { status: 500 }
    );
  }
}
