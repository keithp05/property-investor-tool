import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/notifications';
import { sendSMS } from '@/lib/smsService';
import { parseWebhookPayload, mapCertnStatusToAppStatus } from '@/lib/certnService';

/**
 * POST /api/screening/webhook
 * Receive webhook callbacks from Certn when screening is complete
 * 
 * Configure this webhook URL in your Certn dashboard:
 * https://your-domain.com/api/screening/webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for potential signature verification
    const body = await request.json();
    
    console.log('📋 Certn webhook received:', JSON.stringify(body, null, 2));

    // Parse the webhook payload
    const parsed = parseWebhookPayload(body);
    
    if (!parsed) {
      console.error('❌ Failed to parse Certn webhook payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { applicantId, status, result, reportStatus } = parsed;
    
    console.log('📋 Parsed webhook:', { applicantId, status, result, reportStatus });

    // Find the application by Certn applicant/application ID
    const application = await prisma.tenantApplication.findFirst({
      where: {
        OR: [
          { backgroundCheckId: applicantId },
          { creditCheckId: applicantId },
        ],
      },
      include: {
        property: true,
        landlord: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!application) {
      console.warn(`⚠️ No application found for Certn ID: ${applicantId}`);
      // Return 200 to acknowledge receipt even if we can't find the application
      return NextResponse.json({ 
        received: true, 
        warning: 'Application not found',
      });
    }

    // Map Certn status to our status
    const appStatus = mapCertnStatusToAppStatus(reportStatus, result);
    
    // Extract data from webhook
    const creditScore = body.equifax_result?.credit_score 
      || body.credit_score 
      || null;
    
    const reportUrl = body.report_url 
      || body.softcheck_result?.report_url 
      || body.us_criminal_record_check_result?.report_url
      || null;

    // Update the application
    await prisma.tenantApplication.update({
      where: { id: application.id },
      data: {
        backgroundCheckStatus: appStatus,
        creditScore: creditScore,
        backgroundCheckReportUrl: reportUrl,
        creditReportUrl: reportUrl,
      },
    });

    console.log(`✅ Updated application ${application.id} with Certn results:`, {
      status: appStatus,
      creditScore,
      hasReportUrl: !!reportUrl,
    });

    // Notify landlord of results
    if (application.landlord?.email) {
      const statusText = appStatus === 'CLEARED' 
        ? '✅ Cleared - No issues found'
        : appStatus === 'REVIEW_NEEDED'
        ? '⚠️ Review Needed - Some items require attention'
        : appStatus === 'FAILED'
        ? '❌ Issues Found - Review recommended'
        : `Status: ${appStatus}`;

      await sendEmail({
        to: application.landlord.email,
        subject: `Background Check Complete - ${application.fullName || 'Applicant'} | RentalIQ`,
        body: `Hi ${application.landlord.name || 'Landlord'},

The background check for ${application.fullName || 'the applicant'} is complete.

Property: ${application.property.address}
Result: ${statusText}
${creditScore ? `Credit Score: ${creditScore}` : ''}

Log in to RentalIQ to view the full report.

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
    .status-cleared { background-color: #D1FAE5; border-left-color: #10B981; }
    .status-review { background-color: #FEF3C7; border-left-color: #F59E0B; }
    .status-failed { background-color: #FEE2E2; border-left-color: #EF4444; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Background Check Complete</h1>
    </div>
    <div class="content">
      <p>Hi ${application.landlord.name || 'Landlord'},</p>
      <p>The background check for <strong>${application.fullName || 'the applicant'}</strong> is complete.</p>
      
      <div class="info-box ${appStatus === 'CLEARED' ? 'status-cleared' : appStatus === 'REVIEW_NEEDED' ? 'status-review' : appStatus === 'FAILED' ? 'status-failed' : ''}">
        <strong>Property:</strong> ${application.property.address}<br>
        <strong>Applicant:</strong> ${application.fullName || 'N/A'}<br>
        <strong>Result:</strong> ${statusText}<br>
        ${creditScore ? `<strong>Credit Score:</strong> ${creditScore}` : ''}
      </div>
      
      <a href="${process.env.NEXTAUTH_URL}/applications/${application.id}" class="btn">View Full Report</a>
      
      <p style="margin-top: 30px;">Best regards,<br><strong>RentalIQ</strong></p>
    </div>
  </div>
</body>
</html>`,
      });
    }

    // Also notify the applicant that their check is complete
    if (application.email) {
      await sendEmail({
        to: application.email,
        subject: 'Background Check Complete - RentalIQ',
        body: `Hi ${application.fullName || 'Applicant'},

Your background check for ${application.property.address} has been completed.

The property manager will review your application and be in touch soon.

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
    .info-box { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Background Check Complete</h1>
    </div>
    <div class="content">
      <p>Hi ${application.fullName || 'Applicant'},</p>
      <div class="info-box">
        Your background check for <strong>${application.property.address}</strong> has been completed.
      </div>
      <p>The property manager will review your application and be in touch soon.</p>
      <p>Best regards,<br><strong>RentalIQ</strong></p>
    </div>
  </div>
</body>
</html>`,
      });

      // SMS notification to applicant
      if (application.phone) {
        await sendSMS(
          application.phone,
          `RentalIQ: Your background check for ${application.property.address} is complete. The landlord will review and contact you soon.`
        );
      }
    }

    return NextResponse.json({ 
      received: true,
      applicationId: application.id,
      status: appStatus,
    });

  } catch (error: any) {
    console.error('❌ Certn webhook error:', error);
    // Return 200 to prevent Certn from retrying
    return NextResponse.json({ 
      received: true, 
      error: error.message,
    });
  }
}

/**
 * GET /api/screening/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'Certn Webhook Handler',
    timestamp: new Date().toISOString(),
  });
}
