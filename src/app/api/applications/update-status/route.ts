import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Update application status (APPROVE or DENY)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { applicationId, status } = await request.json();

    // Validate status
    if (!['APPROVED', 'DENIED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be APPROVED or DENIED' },
        { status: 400 }
      );
    }

    console.log(`📋 Updating application ${applicationId} to status: ${status}`);

    // Verify the application belongs to this landlord
    const application = await prisma.tenantApplication.findUnique({
      where: { id: applicationId },
      include: {
        property: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify landlord owns this application
    const userId = (session.user as any).id;
    if (application.landlordId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this application' },
        { status: 403 }
      );
    }

    // Update application status
    const updatedApplication = await prisma.tenantApplication.update({
      where: { id: applicationId },
      data: {
        status,
      },
      include: {
        property: true,
      },
    });

    console.log(`✅ Application ${applicationId} ${status}`);

    return NextResponse.json({
      success: true,
      application: updatedApplication,
      message: `Application ${status.toLowerCase()} successfully`,
    });
  } catch (error: any) {
    console.error('❌ Error updating application status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update application status',
      },
      { status: 500 }
    );
  }
}
