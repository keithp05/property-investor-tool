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

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found in session' },
        { status: 401 }
      );
    }

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
    });

    if (!landlordProfile) {
      // Return empty list instead of error
      return NextResponse.json({
        success: true,
        applications: [],
      });
    }

    // Fetch all applications for this landlord
    // Note: landlordId in TenantApplication is the User ID, not LandlordProfile ID
    const applications = await prisma.tenantApplication.findMany({
      where: {
        landlordId: userId,
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

    // Format response with null checks
    const formattedApplications = applications.map((app) => ({
      id: app.id,
      status: app.status,
      createdAt: app.createdAt,
      submittedAt: app.submittedAt,
      applicationLink: app.applicationLink,
      fullLink: `${process.env.NEXTAUTH_URL || ''}/apply/${app.applicationLink}`,

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
      property: app.property ? {
        id: app.property.id,
        address: app.property.address,
        city: app.property.city,
        state: app.property.state,
        zipCode: app.property.zipCode,
        monthlyRent: app.property.monthlyRent,
        fullAddress: `${app.property.address}, ${app.property.city}, ${app.property.state} ${app.property.zipCode}`,
      } : {
        id: '',
        address: 'Unknown',
        city: '',
        state: '',
        zipCode: '',
        monthlyRent: null,
        fullAddress: 'Unknown Property',
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
        success: false,
        error: 'Failed to fetch applications',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
