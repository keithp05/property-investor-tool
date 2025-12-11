import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/notifications';
import { 
  initiateQuickScreening, 
  inviteApplicantScreening,
  getCertnStatus,
  CertnScreeningRequest 
} from '@/lib/certnService';

/**
 * POST /api/screening/initiate
 * Initiate background and credit check for a tenant application via Certn
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, method = 'invite' } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
    }

    // Check if Certn is configured
    const certnStatus = getCertnStatus();
    if (!certnStatus.isConfigured) {
      return NextResponse.json({
        error: 'Background check service not configured',
        details: 'Certn API key not set. Add CERTN_API_KEY to environment variables.',
        setup: {
          required: ['CERTN_API_KEY'],
          optional: ['CERTN_API_URL', 'CERTN_OWNER_ID'],
          docs: 'https://docs.certn.co/api',
        },
      }, { status: 500 });
    }

    // Get the application with property details
    const application = await prisma.tenantApplication.findUnique({
      where: { id: applicationId },
      include: {
        property: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify the landlord owns this application
    if (application.landlordId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if application fee is paid
    if (!application.applicationFeePaid) {
      return NextResponse.json({ 
        error: 'Application fee must be paid before screening can be initiated',
        code: 'FEE_NOT_PAID'
      }, { status: 400 });
    }

    // Check if screening already initiated
    if (application.backgroundCheckId) {
      return NextResponse.json({ 
        error: 'Screening already initiated',
        backgroundCheckId: application.backgroundCheckId,
        backgroundCheckStatus: application.backgroundCheckStatus,
      }, { status: 400 });
    }

    // Validate required applicant info
    if (!application.email) {
      return NextResponse.json({
        error: 'Applicant email is required for screening',
        code: 'MISSING_EMAIL',
      }, { status: 400 });
    }

    // Parse applicant name
    const nameParts = (application.fullName || '').split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Unknown';

    // Build Certn screening request
    const screeningRequest: CertnScreeningRequest = {
      applicant: {
        first_name: firstName,
        last_name: lastName,
        email: application.email,
        phone_number: application.phone || undefined,
        date_of_birth: application.dateOfBirth 
          ? new Date(application.dateOfBirth).toISOString().split('T')[0] 
          : undefined,
        addresses: application.currentAddress ? [{
          address: application.currentAddress,
          city: '', // Would need to parse or have separate fields
          province_state: '',
          country: 'US',
          current: true,
        }] : undefined,
      },
      property: {
        address: application.property.address,
        city: application.property.city,
        province_state: application.property.state,
        country: 'US',
        postal_code: application.property.zipCode,
      },
      // Request all available checks
      request_softcheck: true,
      request_us_criminal_record_check: true,
      request_identity_verification: false, // Optional - costs extra
    };

    // Initiate screening via Certn
    let result;
    if (method === 'quick') {
      // Quick screening - runs immediately with provided info
      result = await initiateQuickScreening(screeningRequest);
    } else {
      // Invite screening - sends link to applicant to complete
      result = await inviteApplicantScreening(screeningRequest);
    }

    if (!result.success) {
      console.error('❌ Certn screening failed:', result.error);
      return NextResponse.json({
        error: 'Failed to initiate screening',
        details: result.error,
      }, { status: 500 });
    }

    // Update application with Certn IDs
    await prisma.tenantApplication.update({
      where: { id: applicationId },
      data: {
        backgroundCheckId: result.applicantId || result.applicationId,
        backgroundCheckStatus: 'PENDING',
        creditCheckId: result.applicationId,
      },
    });

    // Send email notification to applicant
    if (application.email) {
      const emailSubject = method === 'quick' 
        ? 'Background Check Initiated - RentalIQ'
        : 'Complete Your Background Check - RentalIQ';
      
      const emailBody = method === 'quick'
        ? `Hi ${firstName},

Your background check has been initiated for your rental application at ${application.property.address}.

This process typically takes 1-3 business days. You will be notified once the results are ready.

Best regards,
RentalIQ`
        : `Hi ${firstName},

To complete your rental application for ${application.property.address}, please complete the background check process.

You will receive a separate email from Certn with instructions to verify your identity and authorize the background check.

This is a required step to process your application.

Best regards,
RentalIQ`;

      await sendEmail({
        to: application.email,
        subject: emailSubject,
        body: emailBody,
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background-color: #EEF2FF; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0; }
    .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Background Check ${method === 'quick' ? 'Initiated' : 'Required'}</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      ${method === 'quick' ? `
        <p>Your background check has been initiated for:</p>
        <div class="info-box">
          <strong>${application.property.address}</strong><br>
          ${application.property.city}, ${application.property.state} ${application.property.zipCode}
        </div>
        <p><strong>Processing Time:</strong> 1-3 business days</p>
        <p>You will be notified once the results are ready.</p>
      ` : `
        <p>To complete your rental application, you need to authorize a background check.</p>
        <div class="info-box">
          <strong>Property:</strong> ${application.property.address}<br>
          ${application.property.city}, ${application.property.state} ${application.property.zipCode}
        </div>
        <div class="warning">
          <strong>Action Required:</strong> Check your email for a message from Certn with instructions to complete the verification.
        </div>
      `}
      <p>Best regards,<br><strong>RentalIQ</strong></p>
    </div>
  </div>
</body>
</html>`,
      });
    }

    console.log(`✅ Certn screening initiated for application ${applicationId}:`, {
      method,
      applicationId: result.applicationId,
      applicantId: result.applicantId,
    });

    return NextResponse.json({
      success: true,
      screeningId: result.applicantId || result.applicationId,
      applicationId: result.applicationId,
      method,
      message: method === 'quick' 
        ? 'Background check initiated. Results typically arrive in 1-3 business days.'
        : 'Screening invite sent. Applicant will receive an email to complete verification.',
      status: 'PENDING',
    });

  } catch (error: any) {
    console.error('Screening initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate screening', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/screening/initiate
 * Get screening status for an application
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
    }

    const application = await prisma.tenantApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        landlordId: true,
        backgroundCheckId: true,
        backgroundCheckStatus: true,
        backgroundCheckReportUrl: true,
        creditCheckId: true,
        creditScore: true,
        creditReportUrl: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.landlordId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      screening: {
        backgroundCheck: {
          id: application.backgroundCheckId,
          status: application.backgroundCheckStatus,
          reportUrl: application.backgroundCheckReportUrl,
        },
        creditCheck: {
          id: application.creditCheckId,
          score: application.creditScore,
          reportUrl: application.creditReportUrl,
        },
      },
    });

  } catch (error: any) {
    console.error('Get screening status error:', error);
    return NextResponse.json(
      { error: 'Failed to get screening status', details: error.message },
      { status: 500 }
    );
  }
}
