import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * DELETE /api/landlord/pros/[id]
 * Remove a pro from landlord's preferred list
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

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    // Verify the connection belongs to this landlord
    const connection = await prisma.landlordPro.findFirst({
      where: {
        id,
        landlordId: landlordProfile.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Delete the connection
    await prisma.landlordPro.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Pro removed from preferred list',
    });

  } catch (error: any) {
    console.error('Remove pro error:', error);
    return NextResponse.json(
      { error: 'Failed to remove pro', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/landlord/pros/[id]
 * Update a pro connection (e.g., set as primary)
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

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    // Verify the connection belongs to this landlord
    const connection = await prisma.landlordPro.findFirst({
      where: {
        id,
        landlordId: landlordProfile.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // If setting as primary for a category, unset other primaries
    if (data.isPrimary && data.primaryForCategory) {
      await prisma.landlordPro.updateMany({
        where: {
          landlordId: landlordProfile.id,
          primaryForCategory: data.primaryForCategory,
          id: { not: id },
        },
        data: {
          isPrimary: false,
          primaryForCategory: null,
        },
      });
    }

    // Update the connection
    const updated = await prisma.landlordPro.update({
      where: { id },
      data: {
        isPrimary: data.isPrimary,
        primaryForCategory: data.primaryForCategory,
        landlordNotes: data.landlordNotes,
      },
    });

    return NextResponse.json({
      success: true,
      connection: updated,
    });

  } catch (error: any) {
    console.error('Update pro connection error:', error);
    return NextResponse.json(
      { error: 'Failed to update', details: error.message },
      { status: 500 }
    );
  }
}
