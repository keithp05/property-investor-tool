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
    console.log('🔍 Generate application link - Starting...');
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.error('❌ No session or user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', session.user.id);

    const { propertyId } = await request.json();

    if (!propertyId) {
      console.error('❌ No property ID provided');
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    console.log('📍 Property ID:', propertyId);

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      console.error('❌ Landlord profile not found for user:', session.user.id);
      return NextResponse.json(
        { error: 'Landlord profile not found' },
        { status: 404 }
      );
    }

    console.log('✅ Landlord profile found:', landlordProfile.id);

    // Verify property belongs to this landlord
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        landlordId: landlordProfile.id,
      },
    });

    if (!property) {
      console.error('❌ Property not found or access denied. PropertyId:', propertyId, 'LandlordId:', landlordProfile.id);
      return NextResponse.json(
        { error: 'Property not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ Property verified:', property.address);

    // Generate unique application link
    const uniqueLink = nanoid(16); // 16-character unique ID

    console.log('🔗 Creating application with link:', uniqueLink);
    console.log('📝 Data:', { propertyId, landlordId: session.user.id, applicationLink: uniqueLink });

    // Create application in database
    const application = await prisma.tenantApplication.create({
      data: {
        propertyId,
        landlordId: session.user.id, // User ID, not LandlordProfile ID
        applicationLink: uniqueLink,
        status: 'PENDING',
      },
    });

    console.log('✅ Application created:', application.id);

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
