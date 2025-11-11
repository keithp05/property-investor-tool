import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

/**
 * POST /api/applications/generate
 * Generate a unique application link for a property
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json(
        { error: 'Landlord profile not found' },
        { status: 404 }
      );
    }

    // Verify property belongs to this landlord
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        landlordId: landlordProfile.id,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found or access denied' },
        { status: 404 }
      );
    }

    // Generate unique application link
    const uniqueLink = nanoid(16); // 16-character unique ID

    // Create application in database
    const application = await prisma.tenantApplication.create({
      data: {
        propertyId,
        landlordId: landlordProfile.id,
        applicationLink: uniqueLink,
        status: 'PENDING',
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const fullLink = `${baseUrl}/apply/${uniqueLink}`;

    console.log(`✅ Generated application link for property ${propertyId}: ${fullLink}`);

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      link: uniqueLink,
      fullLink,
    });

  } catch (error: any) {
    console.error('Generate application link error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate application link',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
