import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/notifications';

/**
 * POST /api/screening/complete
 * Manually complete screening with results (for landlords/admins)
 * Used for testing or when using external screening services
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      applicationId,
      creditScore,
      backgroundCheckStatus, // 'CLEAR' | 'REVIEW' | 'ADVERSE'
      notes,
    } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
    }

    // Get the application
    const application = await prisma.tenantApplication.findUnique({
      where: { id: applicationId },
      include: { property: true },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify the landlord owns this application
    if (application.landlordId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update application with screening results
    const updatedApplication = await prisma.tenantApplication.update({
      where: { id: applicationId },
      data: {
        creditScore: creditScore ? parseInt(creditScore) : null,
        backgroundCheckStatus: backgroundCheckStatus || 'COMPLETED',
        // If no screening ID exists, create one
        backgroundCheckId: application.backgroundCheckId || `MANUAL-${Date.now()}`,
        creditCheckId: application.creditCheckId || `MANUAL-${Date.now()}`,
      },
    });

    // Send email notification to applicant
    if (application.email) {
      const isApproved = backgroundCheckStatus === 'CLEAR' && (!creditScore || creditScore >= 600);
      
      await sendEmail({
        to: application.email,
        subject: `Screening Complete - ${application.property.address}`,
        body: `Hi ${application.fullName || 'Applicant'},

Your background and credit check for ${application.property.address} has been completed.

The landlord will be in touch regarding next steps.

Best regards,
RentalIQ`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Screening Complete</h1>
    </div>
    <div class="content">
      <p>Hi ${application.fullName || 'Applicant'},</p>
      <p>Your background and credit check for <strong>${application.property.address}</strong> has been completed.</p>
      <p>The landlord will be in touch regarding next steps.</p>
      <p>Best regards,<br><strong>RentalIQ</strong></p>
    </div>
  </div>
</body>
</html>`,
      });
    }

    console.log(`✅ Screening manually completed for application ${applicationId}`);

    return NextResponse.json({
      success: true,
      message: 'Screening results saved',
      application: {
        id: updatedApplication.id,
        creditScore: updatedApplication.creditScore,
        backgroundCheckStatus: updatedApplication.backgroundCheckStatus,
      },
    });

  } catch (error: any) {
    console.error('Complete screening error:', error);
    return NextResponse.json(
      { error: 'Failed to complete screening', details: error.message },
      { status: 500 }
    );
  }
}
