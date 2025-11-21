import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/applications/[link]
 * Fetch application details by unique link (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ link: string }> | { link: string } }
) {
  try {
    // Handle both sync and async params (Next.js 13+ vs 15+)
    const resolvedParams = await Promise.resolve(params);
    const { link } = resolvedParams;

    console.log('🔍 Fetching application with link:', link);

    if (!link || link.trim() === '') {
      console.error('❌ Empty or invalid link provided');
      return NextResponse.json(
        { error: 'Invalid application link' },
        { status: 400 }
      );
    }

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
            squareFeet: true,
          },
        },
        landlord: {
          select: {
            name: true,
            email: true,
            landlordProfile: {
              select: {
                phone: true,
                company: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      console.error('❌ Application not found for link:', link);
      // Try to find similar links for debugging
      const similarApps = await prisma.tenantApplication.findMany({
        where: {
          applicationLink: {
            contains: link.substring(0, 8), // First 8 chars for debugging
          },
        },
        select: {
          applicationLink: true,
          id: true,
        },
        take: 5,
      });
      console.log('🔍 Similar application links found:', similarApps);
      
      return NextResponse.json(
        { 
          error: 'Application not found',
          details: `No application found with link: ${link}`,
        },
        { status: 404 }
      );
    }

    console.log('✅ Application found:', application.id);

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
          name: application.landlord.name,
          email: application.landlord.email,
          phone: application.landlord.landlordProfile?.phone || null,
          company: application.landlord.landlordProfile?.company || null,
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
