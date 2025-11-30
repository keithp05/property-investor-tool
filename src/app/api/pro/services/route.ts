import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/pro/services
 * Get service requests assigned to the current pro
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pro profile
    const proProfile = await prisma.proProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!proProfile) {
      return NextResponse.json({ error: 'Pro profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filter
    const where: any = {
      proId: proProfile.id,
    };

    if (status) {
      where.status = status;
    }

    const serviceRequests = await prisma.serviceRequest.findMany({
      where,
      include: {
        property: {
          select: {
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        landlord: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            phone: true,
          },
        },
        scopeOfWork: true,
        appointments: {
          orderBy: { scheduledDate: 'asc' },
          take: 1,
        },
        _count: {
          select: {
            messages: true,
            changeOrders: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      services: serviceRequests,
    });

  } catch (error: any) {
    console.error('Get pro services error:', error);
    return NextResponse.json(
      { error: 'Failed to get services', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pro/services
 * Update a service request (status, notes, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { serviceRequestId, status, completionNotes, completionPhotos, scheduledDate, scheduledTime } = data;

    if (!serviceRequestId) {
      return NextResponse.json({ error: 'Service request ID required' }, { status: 400 });
    }

    // Verify pro owns this service request
    const proProfile = await prisma.proProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!proProfile) {
      return NextResponse.json({ error: 'Pro profile not found' }, { status: 404 });
    }

    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: {
        id: serviceRequestId,
        proId: proProfile.id,
      },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found or not assigned to you' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};

    if (status) {
      updateData.status = status;
      
      // If completing, set completion date
      if (status === 'COMPLETED' || status === 'PENDING_APPROVAL') {
        updateData.completedAt = new Date();
      }
    }

    if (completionNotes) {
      updateData.completionNotes = completionNotes;
    }

    if (completionPhotos) {
      updateData.completionPhotos = completionPhotos;
    }

    if (scheduledDate) {
      updateData.scheduledDate = new Date(scheduledDate);
      updateData.status = 'SCHEDULED';
    }

    if (scheduledTime) {
      updateData.scheduledTime = scheduledTime;
    }

    // Update service request
    const updated = await prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      serviceRequest: updated,
    });

  } catch (error: any) {
    console.error('Update service request error:', error);
    return NextResponse.json(
      { error: 'Failed to update service', details: error.message },
      { status: 500 }
    );
  }
}
