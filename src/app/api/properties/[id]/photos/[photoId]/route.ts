import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * DELETE /api/properties/[id]/photos/[photoId]
 * Delete a photo from a property
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: propertyId, photoId } = await params;

    // Verify property belongs to user
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
    });

    if (!landlordProfile) {
      return NextResponse.json({ success: false, error: 'Landlord profile not found' }, { status: 403 });
    }

    // Verify property belongs to landlord
    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlordId: landlordProfile.id },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    // Verify photo exists and belongs to this property
    const photo = await prisma.propertyPhoto.findFirst({
      where: {
        id: photoId,
        propertyId,
      },
    });

    if (!photo) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    // Delete photo
    await prisma.propertyPhoto.delete({
      where: { id: photoId },
    });

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
    });

  } catch (error: any) {
    console.error('Delete property photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete photo', details: error.message },
      { status: 500 }
    );
  }
}
