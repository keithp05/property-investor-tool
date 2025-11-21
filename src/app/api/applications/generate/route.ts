import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { sendApplicationLinkNotification } from '@/lib/notifications';

/**
 * POST /api/applications/generate
 * Generate a unique application link for a property and send to applicant(s)
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

    const { propertyId, applicantName, applicantEmail, applicantPhone, secondApplicant } = await request.json();

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
    console.log('📝 Data:', { propertyId, landlordId: session.user.id, applicationLink: uniqueLink, applicantName, applicantEmail });

    // Create application in database with applicant contact info
    const application = await prisma.tenantApplication.create({
      data: {
        propertyId,
        landlordId: session.user.id, // User ID, not LandlordProfile ID
        applicationLink: uniqueLink,
        status: 'PENDING',
        fullName: applicantName || null,
        email: applicantEmail || null,
        phone: applicantPhone || null,
        hasSecondApplicant: !!secondApplicant,
        // Store second applicant info if provided (as JSON, not stringified)
        secondApplicantInfo: secondApplicant ? secondApplicant : null,
      },
    });

    console.log('✅ Application created:', application.id);
    console.log('🔗 Application link stored in DB:', application.applicationLink);

    const baseUrl = process.env.NEXTAUTH_URL || 'https://develop.d3q1fuby25122q.amplifyapp.com';
    const fullLink = `${baseUrl}/apply/${uniqueLink}`;

    console.log(`✅ Generated application link for property ${propertyId}: ${fullLink}`);
    console.log('🔍 Verification - Link in DB matches generated:', application.applicationLink === uniqueLink);

    // Send notifications to primary applicant
    console.log('📧 Sending notification to primary applicant:', applicantEmail);
    const { emailSent, smsSent } = await sendApplicationLinkNotification({
      name: applicantName,
      email: applicantEmail,
      phone: applicantPhone,
      propertyAddress: property.address,
      applicationLink: fullLink,
    });

    // Send notifications to second applicant if provided
    let secondApplicantNotifications = { emailSent: false, smsSent: false };
    if (secondApplicant) {
      console.log('📧 Sending notification to second applicant:', secondApplicant.email);
      secondApplicantNotifications = await sendApplicationLinkNotification({
        name: secondApplicant.name,
        email: secondApplicant.email,
        phone: secondApplicant.phone,
        propertyAddress: property.address,
        applicationLink: fullLink,
      });
    }

    console.log(`✅ Notifications sent - Primary: Email ${emailSent ? '✓' : '✗'}, SMS ${smsSent ? '✓' : '✗'}`);
    if (secondApplicant) {
      console.log(`✅ Second applicant - Email ${secondApplicantNotifications.emailSent ? '✓' : '✗'}, SMS ${secondApplicantNotifications.smsSent ? '✓' : '✗'}`);
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      link: uniqueLink,
      fullLink,
      notifications: {
        primary: { emailSent, smsSent },
        secondary: secondApplicant ? secondApplicantNotifications : null,
      },
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
