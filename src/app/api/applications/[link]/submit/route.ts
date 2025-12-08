import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendApplicationReceivedSMS } from '@/lib/smsService';

/**
 * POST /api/applications/[link]/submit
 * Submit completed tenant application
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ link: string }> }
) {
  try {
    const { link } = await params;
    const data = await request.json();

    console.log('📝 Submitting application for link:', link);
    console.log('📦 Received data keys:', Object.keys(data));

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
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!application) {
      console.error('❌ Application not found for link:', link);
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING') {
      console.error('❌ Application already submitted:', application.status);
      return NextResponse.json(
        { success: false, error: 'Application already submitted' },
        { status: 400 }
      );
    }

    // Prepare update data - only include fields that exist in schema
    const updateData: any = {
      // Primary Applicant Info - schema uses fullName, not firstName/lastName
      fullName: data.fullName || null,
      email: data.email || null,
      phone: data.phone || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      ssn: data.ssn || null,

      // Current Employment
      employerName: data.employerName || null,
      employerPhone: data.employerPhone || null,
      jobTitle: data.jobTitle || null,
      monthlyIncome: data.monthlyIncome ? parseFloat(data.monthlyIncome) : null,
      employmentStartDate: data.employmentStartDate ? new Date(data.employmentStartDate) : null,

      // Previous Employment
      previousEmployerName: data.previousEmployerName || null,
      previousEmployerPhone: data.previousEmployerPhone || null,
      previousJobTitle: data.previousJobTitle || null,
      previousEmploymentStartDate: data.previousEmploymentStartDate ? new Date(data.previousEmploymentStartDate) : null,
      previousEmploymentEndDate: data.previousEmploymentEndDate ? new Date(data.previousEmploymentEndDate) : null,

      // References
      reference1Name: data.reference1Name || null,
      reference1Phone: data.reference1Phone || null,
      reference1Relationship: data.reference1Relationship || null,
      reference2Name: data.reference2Name || null,
      reference2Phone: data.reference2Phone || null,
      reference2Relationship: data.reference2Relationship || null,

      // Current Address
      currentAddress: data.currentAddress || null,
      currentCity: data.currentCity || null,
      currentState: data.currentState || null,
      currentZip: data.currentZip || null,
      currentLandlord: data.currentLandlord || null,
      currentLandlordPhone: data.currentLandlordPhone || null,
      currentMonthlyRent: data.currentMonthlyRent ? parseFloat(data.currentMonthlyRent) : null,
      currentMoveInDate: data.currentMoveInDate ? new Date(data.currentMoveInDate) : null,

      // Previous Address
      previousAddress: data.previousAddress || null,
      previousCity: data.previousCity || null,
      previousState: data.previousState || null,
      previousZip: data.previousZip || null,
      previousLandlord: data.previousLandlord || null,
      previousLandlordPhone: data.previousLandlordPhone || null,

      // Pets - petDetails is Json type in schema
      hasPets: data.hasPets || false,
      petDetails: data.petDetails || null,

      // Additional Occupants - Json type in schema
      additionalOccupants: data.additionalOccupants || null,

      // Second Applicant - secondApplicantInfo is Json type in schema
      hasSecondApplicant: data.hasSecondApplicant || false,
      secondApplicantInfo: data.secondApplicantInfo ? { info: data.secondApplicantInfo } : null,

      // Documents
      payStubsUrls: data.payStubsUrls || [],
      idDocumentUrl: data.idDocumentUrl || null,

      // Payment tracking
      applicationFeePaid: data.applicationFeePaid || false,
      stripePaymentIntentId: data.stripePaymentIntentId || null,

      // Update status
      status: 'SUBMITTED',
      submittedAt: new Date(),
    };

    console.log('📝 Updating application with status: SUBMITTED');

    // Update application with submitted data
    const updatedApplication = await prisma.tenantApplication.update({
      where: { applicationLink: link },
      data: updateData,
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
      }
    }

    return NextResponse.json({
      success: true,
      applicationId: updatedApplication.id,
      message: 'Application submitted successfully',
    });

  } catch (error: any) {
    console.error('❌ Submit application error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit application',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
