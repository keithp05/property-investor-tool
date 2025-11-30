import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/landlord/pros
 * Get landlord's preferred pros
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    // Get preferred pros
    const pros = await prisma.landlordPro.findMany({
      where: { landlordId: landlordProfile.id },
      include: {
        pro: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { acceptedAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      pros,
    });

  } catch (error: any) {
    console.error('Get landlord pros error:', error);
    return NextResponse.json(
      { error: 'Failed to get pros', details: error.message },
      { status: 500 }
    );
  }
}
