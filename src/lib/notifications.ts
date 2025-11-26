import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize SNS client lazily to avoid issues with missing credentials
let snsClient: SNSClient | null = null;
let sesClient: SESClient | null = null;

const getSNSClient = () => {
  if (!snsClient) {
    const accessKeyId = process.env.SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      console.error('❌ AWS SNS credentials not configured');
      return null;
    }

    snsClient = new SNSClient({
      region: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return snsClient;
};

const getSESClient = () => {
  if (!sesClient) {
    const accessKeyId = process.env.SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      console.error('❌ AWS SES credentials not configured');
      return null;
    }

    sesClient = new SESClient({
      region: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return sesClient;
};

interface SendSMSParams {
  phoneNumber: string;
  message: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Send SMS via AWS SNS
 */
export async function sendSMS({ phoneNumber, message }: SendSMSParams): Promise<boolean> {
  try {
    // Get SNS client with credential validation
    const client = getSNSClient();
    if (!client) {
      console.error('❌ AWS SNS not configured - cannot send SMS');
      console.error('Please set SNS_ACCESS_KEY_ID and SNS_SECRET_ACCESS_KEY in environment variables');
      return false;
    }

    // Format phone number to E.164 format (+1XXXXXXXXXX)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.length === 10) {
      formattedPhone = `+1${formattedPhone}`; // Add US country code
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = `+${formattedPhone}`;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }

    console.log('📱 Sending SMS to:', formattedPhone);
    console.log('📝 Message preview:', message.substring(0, 50) + '...');

    const command = new PublishCommand({
      PhoneNumber: formattedPhone,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // Use 'Promotional' for marketing messages
        },
      },
    });

    const result = await client.send(command);
    console.log('✅ SMS sent successfully. MessageId:', result.MessageId);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send SMS:', error.message || error);
    console.error('Error details:', error);
    if (error.name === 'InvalidParameterException') {
      console.error('Invalid phone number format:', phoneNumber);
    }
    if (error.name === 'InvalidClientTokenId' || error.name === 'SignatureDoesNotMatch') {
      console.error('AWS credentials are invalid');
    }
    return false;
  }
}

/**
 * Send Email via AWS SES
 */
export async function sendEmail({ to, subject, body, html }: SendEmailParams): Promise<boolean> {
  try {
    console.log('📧 Sending email via AWS SES to:', to);

    // Get SES client with credential validation
    const client = getSESClient();
    if (!client) {
      console.error('❌ AWS SES not configured - cannot send email');
      console.error('Please set SNS_ACCESS_KEY_ID and SNS_SECRET_ACCESS_KEY in environment variables');
      return false;
    }

    const fromAddress = process.env.EMAIL_FROM || 'keith.p05@gmail.com';
    console.log('📤 From address:', fromAddress);

    const command = new SendEmailCommand({
      Source: fromAddress,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: body,
            Charset: 'UTF-8',
          },
          Html: {
            Data: html || body,
            Charset: 'UTF-8',
          },
        },
      },
    });

    const result = await client.send(command);
    console.log('✅ Email sent successfully via AWS SES. MessageId:', result.MessageId);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send email via AWS SES:', error.message || error);
    console.error('Error details:', error);

    if (error.name === 'MessageRejected') {
      console.error('Email was rejected. Make sure the FROM and TO addresses are verified in AWS SES.');
    }
    if (error.name === 'InvalidClientTokenId' || error.name === 'SignatureDoesNotMatch') {
      console.error('AWS credentials are invalid');
    }

    return false;
  }
}

/**
 * Send application link notification via email and SMS
 */
export async function sendApplicationLinkNotification({
  name,
  email,
  phone,
  propertyAddress,
  applicationLink,
}: {
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  applicationLink: string;
}): Promise<{ emailSent: boolean; smsSent: boolean }> {
  // Email content
  const emailSubject = `Rental Application for ${propertyAddress}`;
  const emailBody = `Hi ${name},

Thank you for your interest in ${propertyAddress}!

Please complete your rental application by clicking the link below:
${applicationLink}

This application typically takes 10-15 minutes to complete. You'll need:
- Employment information
- Current and previous addresses
- References
- Photo ID

The application link is unique to you and should not be shared.

If you have any questions, please don't hesitate to reach out.

Best regards,
RentalIQ Property Management`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .checklist { background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .checklist li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rental Application</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>Thank you for your interest in <strong>${propertyAddress}</strong>!</p>
      <p>Please complete your rental application by clicking the button below:</p>
      <center>
        <a href="${applicationLink}" class="button">Complete Application</a>
      </center>
      <div class="checklist">
        <p><strong>This application typically takes 10-15 minutes. You'll need:</strong></p>
        <ul>
          <li>✓ Employment information</li>
          <li>✓ Current and previous addresses</li>
          <li>✓ References</li>
          <li>✓ Photo ID</li>
        </ul>
      </div>
      <p><small>⚠️ This application link is unique to you and should not be shared.</small></p>
      <p>If you have any questions, please don't hesitate to reach out.</p>
      <p>Best regards,<br><strong>RentalIQ Property Management</strong></p>
    </div>
  </div>
</body>
</html>`;

  // SMS content (shorter)
  const smsMessage = `Hi ${name}! Complete your rental application for ${propertyAddress}: ${applicationLink}`;

  // Send both notifications
  const [emailSent, smsSent] = await Promise.all([
    sendEmail({ to: email, subject: emailSubject, body: emailBody, html: emailHtml }),
    sendSMS({ phoneNumber: phone, message: smsMessage }),
  ]);

  return { emailSent, smsSent };
}

/**
 * Send application status notification (approval/denial) via email and SMS
 */
export async function sendApplicationStatusNotification({
  name,
  email,
  phone,
  propertyAddress,
  status,
  denialReason,
}: {
  name: string;
  email: string;
  phone?: string;
  propertyAddress: string;
  status: 'APPROVED' | 'DENIED';
  denialReason?: string;
}): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const isApproved = status === 'APPROVED';
  
  // Email content based on status
  const emailSubject = isApproved
    ? `🎉 Congratulations! Your Application for ${propertyAddress} Has Been Approved`
    : `Application Update for ${propertyAddress}`;

  const emailBody = isApproved
    ? `Hi ${name},

Great news! Your rental application for ${propertyAddress} has been APPROVED!

Next Steps:
- We will contact you shortly to discuss move-in details
- Please prepare your security deposit and first month's rent
- We'll schedule a time for lease signing and key pickup

We're excited to have you as our new tenant!

If you have any questions, please don't hesitate to reach out.

Best regards,
RentalIQ Property Management`
    : `Hi ${name},

Thank you for your interest in ${propertyAddress} and for taking the time to submit your rental application.

After careful review, we regret to inform you that we are unable to approve your application at this time.${denialReason ? `\n\nReason: ${denialReason}` : ''}

We encourage you to:
- Continue searching for properties that match your needs
- Review your application for any areas that could be improved
- Consider reaching out if you have any questions

We wish you the best in your housing search.

Best regards,
RentalIQ Property Management`;

  const emailHtml = isApproved
    ? `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .badge { display: inline-block; padding: 8px 16px; background-color: #10B981; color: white; border-radius: 20px; font-weight: bold; }
    .next-steps { background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10B981; }
    .next-steps h3 { margin-top: 0; color: #10B981; }
    .next-steps li { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Application Approved!</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p><strong>Great news!</strong> Your rental application for <strong>${propertyAddress}</strong> has been:</p>
      <center><span class="badge">✓ APPROVED</span></center>
      <div class="next-steps">
        <h3>Next Steps</h3>
        <ul>
          <li>We will contact you shortly to discuss move-in details</li>
          <li>Please prepare your security deposit and first month's rent</li>
          <li>We'll schedule a time for lease signing and key pickup</li>
        </ul>
      </div>
      <p>We're excited to have you as our new tenant!</p>
      <p>If you have any questions, please don't hesitate to reach out.</p>
      <p>Best regards,<br><strong>RentalIQ Property Management</strong></p>
    </div>
  </div>
</body>
</html>`
    : `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6B7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .status-box { background-color: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .encouragement { background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #6366F1; }
    .encouragement h3 { margin-top: 0; color: #6366F1; }
    .encouragement li { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Update</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>Thank you for your interest in <strong>${propertyAddress}</strong> and for taking the time to submit your rental application.</p>
      <div class="status-box">
        <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
        ${denialReason ? `<p><strong>Reason:</strong> ${denialReason}</p>` : ''}
      </div>
      <div class="encouragement">
        <h3>Moving Forward</h3>
        <ul>
          <li>Continue searching for properties that match your needs</li>
          <li>Review your application for any areas that could be improved</li>
          <li>Consider reaching out if you have any questions</li>
        </ul>
      </div>
      <p>We wish you the best in your housing search.</p>
      <p>Best regards,<br><strong>RentalIQ Property Management</strong></p>
    </div>
  </div>
</body>
</html>`;

  // SMS content (shorter)
  const smsMessage = isApproved
    ? `🎉 Hi ${name}! Great news - your rental application for ${propertyAddress} has been APPROVED! We'll be in touch soon with next steps.`
    : `Hi ${name}, thank you for applying to ${propertyAddress}. Unfortunately, we're unable to approve your application at this time. Please check your email for details.`;

  // Send email (always)
  const emailSent = await sendEmail({ to: email, subject: emailSubject, body: emailBody, html: emailHtml });
  
  // Send SMS only if phone number provided
  let smsSent = false;
  if (phone) {
    smsSent = await sendSMS({ phoneNumber: phone, message: smsMessage });
  }

  return { emailSent, smsSent };
}
