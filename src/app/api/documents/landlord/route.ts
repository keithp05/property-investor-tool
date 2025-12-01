import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/documents/landlord
 * Get all documents for the current landlord
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    const documents = await prisma.landlordDocument.findMany({
      where: { landlordId: landlordProfile.id },
      include: {
        property: {
          select: { address: true },
        },
      },
      orderBy: [
        { type: 'asc' },
        { uploadedAt: 'desc' },
      ],
    });

    // Check for expired documents
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
      documents,
    });

  } catch (error: any) {
    console.error('Get landlord documents error:', error);
    return NextResponse.json(
      { error: 'Failed to get documents', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/landlord
 * Upload a new document
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    const data = await request.json();
    const {
      name,
      type,
      description,
      year,
      propertyId,
      expirationDate,
      fileData, // base64
      fileName,
      mimeType,
      fileSize,
    } = data;

    if (!name || !type || !fileData) {
      return NextResponse.json(
        { error: 'Name, type, and file are required' },
        { status: 400 }
      );
    }

    // For now, store as base64 data URL (in production, upload to S3)
    const document = await prisma.landlordDocument.create({
      data: {
        landlordId: landlordProfile.id,
        propertyId: propertyId || null,
        name,
        type: type as any,
        description,
        year: year ? parseInt(year) : null,
        fileUrl: fileData, // Store base64 (or S3 URL in production)
        fileName,
        mimeType,
        fileSize,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
    });

    console.log(`📄 Document uploaded: ${name} (${type})`);

    return NextResponse.json({
      success: true,
      document,
    });

  } catch (error: any) {
    console.error('Upload document error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document', details: error.message },
      { status: 500 }
    );
  }
}
