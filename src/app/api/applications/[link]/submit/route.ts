import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendApplicationReceivedSMS } from '@/lib/smsService';

/**
 * POST /api/applications/[link]/submit
 * Submit completed tenant application
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { link: string } }
) {
  try {
    const { link } = params;
    const data = await request.json();

    // Verify application exists and is pending
    const application = await prisma.tenantApplication.findUnique({
      where: { applicationLink: link },
      include: {
        property: {
          select: {
            address: true,
            city: true,
            state: true,
          },
        },
        landlord: {
          include: {
            user: {
              select: {
                email: true,
                name: true,
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

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Application already submitted' },
        { status: 400 }
      );
    }

    // Update application with submitted data
    const updatedApplication = await prisma.tenantApplication.update({
      where: { applicationLink: link },
      data: {
        // Primary Applicant Info
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        ssn: data.ssn, // TODO: Encrypt this

        // Current Employment
        employerName: data.employerName,
        employerPhone: data.employerPhone,
        jobTitle: data.jobTitle,
        monthlyIncome: data.monthlyIncome ? parseFloat(data.monthlyIncome) : null,
        employmentStartDate: data.employmentStartDate ? new Date(data.employmentStartDate) : null,

        // Previous Employment (if less than 2 years)
        previousEmployerName: data.previousEmployerName,
        previousEmployerPhone: data.previousEmployerPhone,
        previousJobTitle: data.previousJobTitle,
        previousEmploymentStartDate: data.previousEmploymentStartDate ? new Date(data.previousEmploymentStartDate) : null,
        previousEmploymentEndDate: data.previousEmploymentEndDate ? new Date(data.previousEmploymentEndDate) : null,

        // References
        reference1Name: data.reference1Name,
        reference1Phone: data.reference1Phone,
        reference1Relationship: data.reference1Relationship,
        reference2Name: data.reference2Name,
        reference2Phone: data.reference2Phone,
        reference2Relationship: data.reference2Relationship,

        // Current Address
        currentAddress: data.currentAddress,
        currentCity: data.currentCity,
        currentState: data.currentState,
        currentZip: data.currentZip,
        currentLandlord: data.currentLandlord,
        currentLandlordPhone: data.currentLandlordPhone,
        currentMonthlyRent: data.currentMonthlyRent ? parseFloat(data.currentMonthlyRent) : null,
        currentMoveInDate: data.currentMoveInDate ? new Date(data.currentMoveInDate) : null,

        // Previous Address (if less than 2 years at current)
        previousAddress: data.previousAddress,
        previousCity: data.previousCity,
        previousState: data.previousState,
        previousZip: data.previousZip,
        previousLandlord: data.previousLandlord,
        previousLandlordPhone: data.previousLandlordPhone,

        // Pets
        hasPets: data.hasPets || false,
        petDetails: data.petDetails || null,

        // Additional Occupants
        additionalOccupants: data.additionalOccupants || null,

        // Second Applicant
        hasSecondApplicant: data.hasSecondApplicant || false,
        secondApplicantInfo: data.secondApplicantInfo || null,

        // Documents (URLs from S3 upload)
        payStubsUrls: data.payStubsUrls || [],
        idDocumentUrl: data.idDocumentUrl,

        // Payment tracking
        applicationFeePaid: data.applicationFeePaid || false,
        stripePaymentIntentId: data.stripePaymentIntentId,

        // Update status
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    console.log(`✅ Application submitted: ${updatedApplication.id}`);

    // Build property address for notification
    const propertyAddress = application.property
      ? `${application.property.address}, ${application.property.city}`
      : 'the property';

    // Send SMS notification to applicant
    if (data.phone) {
      try {
        const smsResult = await sendApplicationReceivedSMS(
          data.phone,
          data.fullName || 'Applicant',
          propertyAddress
        );
        
        if (smsResult.success) {
          console.log(`📱 SMS sent to applicant: ${data.phone}`);
        } else {
          console.log(`⚠️ SMS failed: ${smsResult.error}`);
        }
      } catch (smsError) {
        console.error('SMS notification error:', smsError);
        // Don't fail the request if SMS fails
      }
    }

    // TODO: Send email notification to landlord
    // TODO: Send SMS to landlord about new application
    // TODO: Trigger credit/background checks if payment received

    return NextResponse.json({
      success: true,
      applicationId: updatedApplication.id,
      message: 'Application submitted successfully',
    });

  } catch (error: any) {
    console.error('Submit application error:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit application',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
