import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Initialize SNS client lazily to avoid issues with missing credentials
let snsClient: SNSClient | null = null;

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
    console.log('📧 Sending email to:', to);

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return false;
    }

    // IMPORTANT: Resend test mode only allows sending to the account owner's email
    // In production, you need to verify a domain at resend.com/domains
    const isTestMode = !process.env.RESEND_DOMAIN_VERIFIED;
    const testEmail = 'keith.p05@gmail.com';

    if (isTestMode) {
      console.log('⚠️ Resend is in TEST MODE - emails can only be sent to:', testEmail);
      console.log('⚠️ To send to other emails, verify a domain at resend.com/domains');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: [isTestMode ? testEmail : to],
        subject: isTestMode ? `[TEST MODE] ${subject} (Original: ${to})` : subject,
        text: isTestMode ? `[Original recipient: ${to}]\n\n${body}` : body,
        html: isTestMode ? `<p><strong>[Original recipient: ${to}]</strong></p>${html || body}` : (html || body),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('❌ Failed to send email:', error);
      console.error('Response status:', response.status, response.statusText);
      console.error('Attempted to send to:', to);
      console.error('From address:', process.env.EMAIL_FROM || 'onboarding@resend.dev');
      return false;
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', result.id);
    if (isTestMode) {
      console.log('✅ Test mode: Email sent to', testEmail, 'instead of', to);
    }
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send email:', error.message || error);
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
