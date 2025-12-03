import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/notifications';

/**
 * POST /api/screening/initiate
 * Initiate background and credit check for a tenant application
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
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
    if (application.backgroundCheckId || application.creditCheckId) {
      return NextResponse.json({ 
        error: 'Screening already initiated',
        backgroundCheckId: application.backgroundCheckId,
        creditCheckId: application.creditCheckId,
        backgroundCheckStatus: application.backgroundCheckStatus,
      }, { status: 400 });
    }

    const screeningId = `SCR-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Update application with screening initiation
    await prisma.tenantApplication.update({
      where: { id: applicationId },
      data: {
        backgroundCheckId: screeningId,
        backgroundCheckStatus: 'PENDING',
        creditCheckId: screeningId,
      },
    });

    // Send email to applicant
    if (application.email) {
      await sendEmail({
        to: application.email,
        subject: 'Background & Credit Check Initiated - RentalIQ',
        body: `Hi ${application.fullName || 'Applicant'},

Your background and credit check has been initiated for your rental application at ${application.property.address}.

This process typically takes 1-3 business days.

Best regards,
RentalIQ`,
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Screening Initiated</h1>
    </div>
    <div class="content">
      <p>Hi ${application.fullName || 'Applicant'},</p>
      <p>Your background and credit check has been initiated for:</p>
      <div class="info-box">
        <strong>${application.property.address}</strong><br>
        ${application.property.city}, ${application.property.state} ${application.property.zipCode}
      </div>
      <p><strong>Processing Time:</strong> 1-3 business days</p>
      <p>Best regards,<br><strong>RentalIQ</strong></p>
    </div>
  </div>
</body>
</html>`,
      });
    }

    console.log(`✅ Screening initiated for application ${applicationId}: ${screeningId}`);

    return NextResponse.json({
      success: true,
      screeningId,
      message: 'Screening initiated successfully',
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
