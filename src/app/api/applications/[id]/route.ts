import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/applications/[id]
 * Get full application details (landlord only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;
    const userId = (session.user as any).id;

    console.log(`📋 Fetching application ${applicationId} for user ${userId}`);

    // Get the application with property details
    const application = await prisma.tenantApplication.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            bedrooms: true,
            bathrooms: true,
            monthlyRent: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify the landlord owns this application
    if (application.landlordId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view this application' },
        { status: 403 }
      );
    }

    // Format the response with null checks
    const formattedApplication = {
      id: application.id,
      status: application.status,
      createdAt: application.createdAt,
      submittedAt: application.submittedAt,
      applicationLink: application.applicationLink,

      // Property (with null checks)
      property: application.property ? {
        id: application.property.id,
        fullAddress: `${application.property.address}, ${application.property.city}, ${application.property.state} ${application.property.zipCode}`,
        bedrooms: application.property.bedrooms,
        bathrooms: application.property.bathrooms,
        monthlyRent: application.property.monthlyRent,
      } : {
        id: '',
        fullAddress: 'Unknown Property',
        bedrooms: 0,
        bathrooms: 0,
        monthlyRent: null,
      },

      // Primary Applicant
      applicant: {
        fullName: application.fullName || null,
        email: application.email || null,
        phone: application.phone || null,
        dateOfBirth: application.dateOfBirth || null,
        ssnLast4: application.ssn ? `***-**-${application.ssn.slice(-4)}` : null,
      },

      // Employment
      employment: {
        current: {
          employerName: application.employerName || null,
          employerPhone: application.employerPhone || null,
          jobTitle: application.jobTitle || null,
          monthlyIncome: application.monthlyIncome || null,
          startDate: application.employmentStartDate || null,
        },
        previous: application.previousEmployerName ? {
          employerName: application.previousEmployerName,
          employerPhone: application.previousEmployerPhone,
          jobTitle: application.previousJobTitle,
          startDate: application.previousEmploymentStartDate,
          endDate: application.previousEmploymentEndDate,
        } : null,
      },

      // References
      references: [
        application.reference1Name ? {
          name: application.reference1Name,
          phone: application.reference1Phone,
          relationship: application.reference1Relationship,
        } : null,
        application.reference2Name ? {
          name: application.reference2Name,
          phone: application.reference2Phone,
          relationship: application.reference2Relationship,
        } : null,
      ].filter(Boolean),

      // Rental History
      rentalHistory: {
        current: {
          address: application.currentAddress || null,
          city: application.currentCity || null,
          state: application.currentState || null,
          zip: application.currentZip || null,
          landlordName: application.currentLandlord || null,
          landlordPhone: application.currentLandlordPhone || null,
          monthlyRent: application.currentMonthlyRent || null,
          moveInDate: application.currentMoveInDate || null,
        },
        previous: application.previousAddress ? {
          address: application.previousAddress,
          city: application.previousCity,
          state: application.previousState,
          zip: application.previousZip,
          landlordName: application.previousLandlord,
          landlordPhone: application.previousLandlordPhone,
        } : null,
      },

      // Pets & Occupants
      hasPets: application.hasPets || false,
      petDetails: application.petDetails || null,
      additionalOccupants: application.additionalOccupants || null,

      // Second Applicant
      hasSecondApplicant: application.hasSecondApplicant || false,
      secondApplicant: application.secondApplicantInfo || null,

      // Documents
      documents: {
        payStubs: application.payStubsUrls || [],
        idDocument: application.idDocumentUrl || null,
      },

      // Screening
      screening: {
        creditScore: application.creditScore || null,
        creditReportUrl: application.creditReportUrl || null,
        backgroundCheckStatus: application.backgroundCheckStatus || null,
        backgroundCheckReportUrl: application.backgroundCheckReportUrl || null,
      },

      // Payment
      payment: {
        applicationFee: application.applicationFee || 50,
        feePaid: application.applicationFeePaid || false,
        stripePaymentIntentId: application.stripePaymentIntentId || null,
      },
    };

    return NextResponse.json({
      success: true,
      application: formattedApplication,
    });
  } catch (error: any) {
    console.error('❌ Error fetching application:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch application',
      },
      { status: 500 }
    );
  }
}
