import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * DELETE /api/lenders/[id]
 * Delete a lender
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    // Verify lender belongs to landlord
    const lender = await prisma.lender.findFirst({
      where: {
        id,
        landlordId: landlordProfile.id,
      },
    });

    if (!lender) {
      return NextResponse.json({ error: 'Lender not found' }, { status: 404 });
    }

    await prisma.lender.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Lender deleted',
    });

  } catch (error: any) {
    console.error('Delete lender error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lender', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lenders/[id]
 * Update a lender
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const data = await request.json();

    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    // Verify lender belongs to landlord
    const lender = await prisma.lender.findFirst({
      where: {
        id,
        landlordId: landlordProfile.id,
      },
    });

    if (!lender) {
      return NextResponse.json({ error: 'Lender not found' }, { status: 404 });
    }

    const updated = await prisma.lender.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        website: data.website,
        city: data.city,
        state: data.state,
        minLoanAmount: data.minLoanAmount ? parseFloat(data.minLoanAmount) : null,
        maxLoanAmount: data.maxLoanAmount ? parseFloat(data.maxLoanAmount) : null,
        interestRateMin: data.interestRateMin ? parseFloat(data.interestRateMin) : null,
        interestRateMax: data.interestRateMax ? parseFloat(data.interestRateMax) : null,
        ltvMax: data.ltvMax ? parseFloat(data.ltvMax) : null,
        timeToClose: data.timeToClose,
        loanTypes: data.loanTypes,
        notes: data.notes,
        isFavorite: data.isFavorite,
        rating: data.rating,
      },
    });

    return NextResponse.json({
      success: true,
      lender: updated,
    });

  } catch (error: any) {
    console.error('Update lender error:', error);
    return NextResponse.json(
      { error: 'Failed to update lender', details: error.message },
      { status: 500 }
    );
  }
}
