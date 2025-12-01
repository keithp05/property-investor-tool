import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * DELETE /api/properties/[id]/documents/[docId]
 * Delete a document from a property
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: propertyId, docId } = await params;

    // Verify property belongs to user
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
    });

    if (!landlordProfile) {
      return NextResponse.json({ success: false, error: 'Landlord profile not found' }, { status: 403 });
    }

    // Verify document exists and belongs to this landlord/property
    const document = await prisma.landlordDocument.findFirst({
      where: {
        id: docId,
        propertyId,
        landlordId: landlordProfile.id,
      },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Delete document
    await prisma.landlordDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });

  } catch (error: any) {
    console.error('Delete property document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document', details: error.message },
      { status: 500 }
    );
  }
}
