import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/properties/[id]/documents
 * Get all documents for a specific property
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

    // Get documents for this property
    const documents = await prisma.landlordDocument.findMany({
      where: { propertyId },
      orderBy: [{ type: 'asc' }, { uploadedAt: 'desc' }],
    });

    // Update expired status
    const now = new Date();
    for (const doc of documents) {
      if (doc.expirationDate && new Date(doc.expirationDate) < now && !doc.isExpired) {
        await prisma.landlordDocument.update({
          where: { id: doc.id },
          data: { isExpired: true },
        });
        doc.isExpired = true;
      }
    }

    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        description: doc.description,
        year: doc.year,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        fileUrl: doc.fileUrl,
        expirationDate: doc.expirationDate,
        isExpired: doc.isExpired,
        uploadedAt: doc.uploadedAt,
      })),
    });

  } catch (error: any) {
    console.error('Get property documents error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get documents', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties/[id]/documents
 * Upload a document for a specific property
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

    const { name, type, description, year, expirationDate, fileName, mimeType, fileSize, fileData } = body;

    if (!name || !type || !fileData) {
      return NextResponse.json({ success: false, error: 'Name, type, and file are required' }, { status: 400 });
    }

    // Create document record
    const document = await prisma.landlordDocument.create({
      data: {
        landlordId: landlordProfile.id,
        propertyId,
        name,
        type,
        description: description || null,
        year: year ? parseInt(year) : null,
        fileUrl: fileData, // Base64 data URL for now, S3 later
        fileName: fileName || 'document',
        mimeType: mimeType || 'application/octet-stream',
        fileSize: fileSize || null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        isExpired: false,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        fileName: document.fileName,
        uploadedAt: document.uploadedAt,
      },
    });

  } catch (error: any) {
    console.error('Upload property document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document', details: error.message },
      { status: 500 }
    );
  }
}
