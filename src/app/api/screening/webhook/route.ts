import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/notifications';

/**
 * POST /api/screening/webhook
 * Webhook endpoint for receiving screening results from providers
 * 
 * Supports:
 * - TransUnion SmartMove
 * - Checkr
 * - Custom/internal updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📥 Screening webhook received:', JSON.stringify(body, null, 2));

    // Verify webhook authenticity (add your provider's verification here)
    // const signature = request.headers.get('x-webhook-signature');
    // if (!verifySignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const { 
      screeningId, 
      applicationId,
      type, // 'BACKGROUND' | 'CREDIT' | 'BOTH'
      status, // 'COMPLETED' | 'FAILED' | 'REQUIRES_ACTION'
      creditScore,
      creditReportUrl,
      backgroundCheckStatus, // 'CLEAR' | 'REVIEW' | 'ADVERSE'
      backgroundCheckReportUrl,
      summary,
    } = body;

    // Find application by screeningId or applicationId
    let application;
    if (applicationId) {
      application = await prisma.tenantApplication.findUnique({
        where: { id: applicationId },
        include: { property: true },
      });
    } else if (screeningId) {
      application = await prisma.tenantApplication.findFirst({
        where: { 
          OR: [
            { backgroundCheckId: screeningId },
            { creditCheckId: screeningId },
          ]
        },
        include: { property: true },
      });
    }

    if (!application) {
      console.error('❌ Application not found for screening webhook');
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    if (type === 'CREDIT' || type === 'BOTH') {
      if (creditScore) updateData.creditScore = creditScore;
      if (creditReportUrl) updateData.creditReportUrl = creditReportUrl;
    }

    if (type === 'BACKGROUND' || type === 'BOTH') {
      if (backgroundCheckStatus) updateData.backgroundCheckStatus = backgroundCheckStatus;
      if (backgroundCheckReportUrl) updateData.backgroundCheckReportUrl = backgroundCheckReportUrl;
    }

    // Update application
    await prisma.tenantApplication.update({
      where: { id: application.id },
      data: updateData,
    });

    // Send notification to landlord
    const landlord = await prisma.user.findUnique({
      where: { id: application.landlordId },
      select: { email: true, name: true },
    });

    if (landlord?.email) {
      const statusEmoji = backgroundCheckStatus === 'CLEAR' ? '✅' : 
                          backgroundCheckStatus === 'REVIEW' ? '⚠️' : '❌';
      
      await sendEmail({
        to: landlord.email,
        subject: `${statusEmoji} Screening Results Ready - ${application.fullName}`,
        body: `Hi ${landlord.name || 'Landlord'},

The screening results for ${application.fullName}'s application at ${application.property.address} are ready.

Credit Score: ${creditScore || 'N/A'}
Background Check: ${backgroundCheckStatus || 'N/A'}

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
    .header { background-color: ${backgroundCheckStatus === 'CLEAR' ? '#10B981' : backgroundCheckStatus === 'REVIEW' ? '#F59E0B' : '#EF4444'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .result-box { background-color: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
    .score { font-size: 48px; font-weight: bold; color: #4F46E5; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusEmoji} Screening Complete</h1>
    </div>
    <div class="content">
      <p>Hi ${landlord.name || 'Landlord'},</p>
      <p>The screening results for <strong>${application.fullName}</strong>'s application are ready.</p>
      
      <div class="result-box">
        <h3>📊 Credit Score</h3>
        <div class="score">${creditScore || 'N/A'}</div>
      </div>
      
      <div class="result-box">
        <h3>🔍 Background Check</h3>
        <p><strong>${backgroundCheckStatus === 'CLEAR' ? '✅ Clear - No issues found' : 
                     backgroundCheckStatus === 'REVIEW' ? '⚠️ Review Required - Items need attention' : 
                     '❌ Adverse - Issues found'}</strong></p>
      </div>
      
      <center>
        <a href="${process.env.NEXTAUTH_URL}/applications/${application.id}" class="button">View Full Report</a>
      </center>
      
      <p style="margin-top: 30px;">Best regards,<br><strong>RentalIQ</strong></p>
    </div>
  </div>
</body>
</html>`,
      });
    }

    console.log(`✅ Screening results updated for application ${application.id}`);

    return NextResponse.json({
      success: true,
      message: 'Screening results processed',
      applicationId: application.id,
    });

  } catch (error: any) {
    console.error('Screening webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process screening webhook', details: error.message },
      { status: 500 }
    );
  }
}
