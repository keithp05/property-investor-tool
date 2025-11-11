import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/applications/[link]
 * Fetch application details by unique link (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { link: string } }
) {
  try {
    const { link } = params;

    const application = await prisma.tenantApplication.findUnique({
      where: { applicationLink: link },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            propertyType: true,
            monthlyRent: true,
            bedrooms: true,
            bathrooms: true,
            squareFootage: true,
          },
        },
        landlord: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if application has already been submitted
    if (application.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: 'This application has already been submitted',
          status: application.status,
        },
        { status: 400 }
      );
    }

    // Check if application is expired (30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (application.createdAt < thirtyDaysAgo) {
      return NextResponse.json(
        { error: 'This application link has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        property: application.property,
        landlord: {
          name: application.landlord.user.name,
          email: application.landlord.user.email,
          phone: application.landlord.user.phone,
        },
        applicationFee: application.applicationFee,
        status: application.status,
      },
    });

  } catch (error: any) {
    console.error('Fetch application error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch application',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
