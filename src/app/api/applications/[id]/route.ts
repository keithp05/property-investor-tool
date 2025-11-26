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

    // Format the response (hide sensitive data like full SSN)
    const formattedApplication = {
      id: application.id,
      status: application.status,
      createdAt: application.createdAt,
      submittedAt: application.submittedAt,
      applicationLink: application.applicationLink,

      // Property
      property: {
        id: application.property.id,
        fullAddress: `${application.property.address}, ${application.property.city}, ${application.property.state} ${application.property.zipCode}`,
        bedrooms: application.property.bedrooms,
        bathrooms: application.property.bathrooms,
        monthlyRent: application.property.monthlyRent,
      },

      // Primary Applicant
      applicant: {
        fullName: application.fullName,
        email: application.email,
        phone: application.phone,
        dateOfBirth: application.dateOfBirth,
        ssnLast4: application.ssn ? `***-**-${application.ssn.slice(-4)}` : null,
      },

      // Employment
      employment: {
        current: {
          employerName: application.employerName,
          employerPhone: application.employerPhone,
          jobTitle: application.jobTitle,
          monthlyIncome: application.monthlyIncome,
          startDate: application.employmentStartDate,
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
          address: application.currentAddress,
          city: application.currentCity,
          state: application.currentState,
          zip: application.currentZip,
          landlordName: application.currentLandlord,
          landlordPhone: application.currentLandlordPhone,
          monthlyRent: application.currentMonthlyRent,
          moveInDate: application.currentMoveInDate,
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
      hasPets: application.hasPets,
      petDetails: application.petDetails,
      additionalOccupants: application.additionalOccupants,

      // Second Applicant
      hasSecondApplicant: application.hasSecondApplicant,
      secondApplicant: application.secondApplicantInfo,

      // Documents
      documents: {
        payStubs: application.payStubsUrls || [],
        idDocument: application.idDocumentUrl,
      },

      // Screening
      screening: {
        creditScore: application.creditScore,
        creditReportUrl: application.creditReportUrl,
        backgroundCheckStatus: application.backgroundCheckStatus,
        backgroundCheckReportUrl: application.backgroundCheckReportUrl,
      },

      // Payment
      payment: {
        applicationFee: application.applicationFee,
        feePaid: application.applicationFeePaid,
        stripePaymentIntentId: application.stripePaymentIntentId,
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
