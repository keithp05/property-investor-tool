import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/smsService';

/**
 * Handle various application actions
 * - approve: Approve application
 * - deny: Deny application
 * - request_info: Request more information
 * - message: Send a message to applicant
 * - schedule_call: Schedule a call with applicant
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { applicationId, actionType, message, reason, infoNeeded, callDate, callTime } = body;

    if (!applicationId || !actionType) {
      return NextResponse.json(
        { success: false, error: 'Missing applicationId or actionType' },
        { status: 400 }
      );
    }

    console.log(`📋 Application action: ${actionType} for ${applicationId}`);

    // Fetch the application
    const application = await prisma.tenantApplication.findUnique({
      where: { id: applicationId },
      include: {
        property: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify landlord owns this application
    const userId = (session.user as any).id;
    if (application.landlordId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this application' },
        { status: 403 }
      );
    }

    const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim() || 'Applicant';
    const propertyAddress = application.property?.address || 'the property';
    const landlordName = (session.user as any).name || 'Property Manager';

    let newStatus = application.status;
    let emailSubject = '';
    let emailBody = '';
    let smsMessage = '';
    let resultMessage = '';

    switch (actionType) {
      case 'approve':
        newStatus = 'APPROVED';
        emailSubject = `🎉 Application Approved - ${propertyAddress}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Congratulations, ${applicantName}!</h2>
            <p>Great news! Your rental application for <strong>${propertyAddress}</strong> has been <strong style="color: #059669;">APPROVED</strong>.</p>
            ${message ? `<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;">${message}</p></div>` : ''}
            <h3>Next Steps:</h3>
            <ol>
              <li>Review and sign the lease agreement (will be sent separately)</li>
              <li>Pay security deposit and first month's rent</li>
              <li>Schedule move-in date and key pickup</li>
            </ol>
            <p>We look forward to having you as our tenant!</p>
            <p>Best regards,<br>${landlordName}</p>
          </div>
        `;
        smsMessage = `🎉 Great news ${applicantName}! Your application for ${propertyAddress} has been APPROVED. Check your email for next steps.`;
        resultMessage = 'Application approved and applicant notified';
        break;

      case 'deny':
        newStatus = 'DENIED';
        emailSubject = `Application Update - ${propertyAddress}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dear ${applicantName},</h2>
            <p>Thank you for your interest in <strong>${propertyAddress}</strong>.</p>
            <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
            ${message || reason ? `<div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Reason:</strong> ${message || reason}</p></div>` : ''}
            <p>We encourage you to continue your search and wish you the best in finding your new home.</p>
            <p>Best regards,<br>${landlordName}</p>
          </div>
        `;
        smsMessage = `Hi ${applicantName}, we've sent you an email regarding your application for ${propertyAddress}. Please check your inbox.`;
        resultMessage = 'Application denied and applicant notified';
        break;

      case 'request_info':
        newStatus = 'MORE_INFO_NEEDED';
        const infoList = infoNeeded && infoNeeded.length > 0 
          ? `<ul>${infoNeeded.map((item: string) => `<li>${item}</li>`).join('')}</ul>` 
          : '';
        emailSubject = `Action Required: Additional Information Needed - ${propertyAddress}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dear ${applicantName},</h2>
            <p>Thank you for your application for <strong>${propertyAddress}</strong>.</p>
            <p>To continue processing your application, we need the following additional information:</p>
            <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0;">
              ${infoList}
            </div>
            ${message ? `<p><strong>Additional notes:</strong> ${message}</p>` : ''}
            <p>Please reply to this email with the requested documents or information at your earliest convenience.</p>
            <p>Best regards,<br>${landlordName}</p>
          </div>
        `;
        smsMessage = `Hi ${applicantName}, we need additional information for your application at ${propertyAddress}. Please check your email for details.`;
        resultMessage = 'Information request sent to applicant';
        break;

      case 'message':
        emailSubject = `Message from Property Manager - ${propertyAddress}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dear ${applicantName},</h2>
            <p>You have a new message regarding your application for <strong>${propertyAddress}</strong>:</p>
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0;">${message}</p>
            </div>
            <p>Feel free to reply to this email if you have any questions.</p>
            <p>Best regards,<br>${landlordName}</p>
          </div>
        `;
        smsMessage = `Hi ${applicantName}, you have a new message about your application for ${propertyAddress}. Check your email for details.`;
        resultMessage = 'Message sent to applicant';
        break;

      case 'schedule_call':
        const formattedDate = new Date(callDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const formattedTime = callTime;
        
        emailSubject = `📞 Call Scheduled - ${propertyAddress}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dear ${applicantName},</h2>
            <p>A call has been scheduled to discuss your application for <strong>${propertyAddress}</strong>.</p>
            <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
              <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 0;"><strong>🕐 Time:</strong> ${formattedTime}</p>
            </div>
            ${message ? `<p><strong>Notes:</strong> ${message}</p>` : ''}
            <p>Please make sure you're available at this time. If you need to reschedule, please reply to this email as soon as possible.</p>
            <p>Best regards,<br>${landlordName}</p>
          </div>
        `;
        smsMessage = `Hi ${applicantName}, a call has been scheduled for ${formattedDate} at ${formattedTime} to discuss your application for ${propertyAddress}.`;
        resultMessage = `Call scheduled for ${formattedDate} at ${formattedTime}`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action type' },
          { status: 400 }
        );
    }

    // Update status if changed
    if (newStatus !== application.status) {
      await prisma.tenantApplication.update({
        where: { id: applicationId },
        data: { status: newStatus },
      });
      console.log(`✅ Application status updated to: ${newStatus}`);
    }

    // Send email notification
    let emailSent = false;
    if (application.email) {
      try {
        await sendEmail({
          to: application.email,
          subject: emailSubject,
          html: emailBody,
        });
        emailSent = true;
        console.log(`📧 Email sent to ${application.email}`);
      } catch (emailError: any) {
        console.error('⚠️ Failed to send email:', emailError.message);
      }
    }

    // Send SMS notification
    let smsSent = false;
    if (application.phone && smsMessage) {
      try {
        const smsResult = await sendSMS(application.phone, smsMessage);
        smsSent = smsResult.success;
        console.log(`📱 SMS ${smsSent ? 'sent' : 'failed'} to ${application.phone}`);
      } catch (smsError: any) {
        console.error('⚠️ Failed to send SMS:', smsError.message);
      }
    }

    // Log the action
    try {
      await (prisma as any).applicationActivity?.create?.({
        data: {
          applicationId,
          actionType,
          message: message || null,
          performedBy: userId,
          createdAt: new Date(),
        },
      });
    } catch (logError) {
      // Activity logging table might not exist, ignore
      console.log('Activity logging skipped (table may not exist)');
    }

    return NextResponse.json({
      success: true,
      message: resultMessage,
      emailSent,
      smsSent,
      newStatus,
    });
  } catch (error: any) {
    console.error('❌ Error processing application action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process action',
      },
      { status: 500 }
    );
  }
}
