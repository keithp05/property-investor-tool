import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/applications/list
 * List all tenant applications for the logged-in landlord
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Fetch all applications for this landlord
    // Note: landlordId in TenantApplication is the User ID, not LandlordProfile ID
    const applications = await prisma.tenantApplication.findMany({
      where: {
        landlordId: session.user.id,
      },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            monthlyRent: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format response
    const formattedApplications = applications.map((app) => ({
      id: app.id,
      status: app.status,
      createdAt: app.createdAt,
      submittedAt: app.submittedAt,
      applicationLink: app.applicationLink,
      fullLink: `${process.env.NEXTAUTH_URL}/apply/${app.applicationLink}`,

      // Applicant Info (only if submitted)
      applicant: app.status !== 'PENDING' ? {
        fullName: app.fullName,
        email: app.email,
        phone: app.phone,
        monthlyIncome: app.monthlyIncome,
        employerName: app.employerName,
        creditScore: app.creditScore,
        backgroundCheckStatus: app.backgroundCheckStatus,
      } : null,

      // Property Info
      property: {
        id: app.property.id,
        address: app.property.address,
        city: app.property.city,
        state: app.property.state,
        zipCode: app.property.zipCode,
        monthlyRent: app.property.monthlyRent,
        fullAddress: `${app.property.address}, ${app.property.city}, ${app.property.state} ${app.property.zipCode}`,
      },

      // Payment Info
      applicationFeePaid: app.applicationFeePaid,
      applicationFee: app.applicationFee,
    }));

    return NextResponse.json({
      success: true,
      applications: formattedApplications,
    });

  } catch (error: any) {
    console.error('Fetch applications error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch applications',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
