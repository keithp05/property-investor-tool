import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/properties/[id]/photos
 * Get all photos for a specific property
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: propertyId } = await params;

    // Verify property belongs to user
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
    });

    if (!landlordProfile) {
      return NextResponse.json({ success: false, error: 'Landlord profile not found' }, { status: 403 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlordId: landlordProfile.id },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    // Get photos for this property
    const photos = await prisma.propertyPhoto.findMany({
      where: { propertyId },
      orderBy: [{ photoType: 'asc' }, { uploadedAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      photos: photos.map(photo => ({
        id: photo.id,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        photoType: photo.photoType,
        uploadedAt: photo.uploadedAt,
        aiAnalyzed: photo.aiAnalyzed,
        aiDamageDetected: photo.aiDamageDetected,
        damageDescription: photo.damageDescription,
        estimatedRepairCost: photo.estimatedRepairCost ? Number(photo.estimatedRepairCost) : null,
      })),
    });

  } catch (error: any) {
    console.error('Get property photos error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get photos', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties/[id]/photos
 * Upload a photo for a specific property
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: propertyId } = await params;
    const body = await request.json();

    // Verify property belongs to user
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
    });

    if (!landlordProfile) {
      return NextResponse.json({ success: false, error: 'Landlord profile not found' }, { status: 403 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlordId: landlordProfile.id },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    const { photoType, imageData } = body;

    if (!imageData) {
      return NextResponse.json({ success: false, error: 'Image data is required' }, { status: 400 });
    }

    // Create photo record
    const photo = await prisma.propertyPhoto.create({
      data: {
        propertyId,
        storageProvider: 'AWS_S3', // Will use S3 later, base64 for now
        imageUrl: imageData, // Base64 data URL for now
        photoType: photoType || 'GENERAL',
        uploadedBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        imageUrl: photo.imageUrl,
        photoType: photo.photoType,
        uploadedAt: photo.uploadedAt,
      },
    });

  } catch (error: any) {
    console.error('Upload property photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload photo', details: error.message },
      { status: 500 }
    );
  }
}
