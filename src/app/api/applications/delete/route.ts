import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/applications/delete
 * Delete an application
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('id');

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting application: ${applicationId}`);

    // Find the application
    const application = await prisma.tenantApplication.findUnique({
      where: { id: applicationId },
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
        { success: false, error: 'Unauthorized to delete this application' },
        { status: 403 }
      );
    }

    // Delete the application
    await prisma.tenantApplication.delete({
      where: { id: applicationId },
    });

    console.log(`✅ Application deleted: ${applicationId}`);

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting application:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete application',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications/delete
 * Delete an application (alternative method)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting application: ${applicationId}`);

    // Find the application
    const application = await prisma.tenantApplication.findUnique({
      where: { id: applicationId },
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
        { success: false, error: 'Unauthorized to delete this application' },
        { status: 403 }
      );
    }

    // Delete the application
    await prisma.tenantApplication.delete({
      where: { id: applicationId },
    });

    console.log(`✅ Application deleted: ${applicationId}`);

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting application:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete application',
      },
      { status: 500 }
    );
  }
}
