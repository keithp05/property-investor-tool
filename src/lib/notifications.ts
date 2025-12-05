import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize clients lazily
let snsClient: SNSClient | null = null;
let sesClient: SESClient | null = null;
let twilioClient: any = null;

const getSNSClient = () => {
  if (!snsClient) {
    const accessKeyId = process.env.SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      return null;
    }

    snsClient = new SNSClient({
      region: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return snsClient;
};

const getSESClient = () => {
  if (!sesClient) {
    const accessKeyId = process.env.SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      return null;
    }

    sesClient = new SESClient({
      region: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return sesClient;
};

const getTwilioClient = () => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return null;
    }

    try {
      const twilio = require('twilio');
      twilioClient = twilio(accountSid, authToken);
    } catch (e) {
      console.error('Failed to initialize Twilio client:', e);
      return null;
    }
  }
  return twilioClient;
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
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
function formatPhoneNumber(phoneNumber: string): string {
  let formatted = phoneNumber.replace(/\D/g, '');
  if (formatted.length === 10) {
    formatted = `+1${formatted}`;
  } else if (formatted.length === 11 && formatted.startsWith('1')) {
    formatted = `+${formatted}`;
  } else if (!formatted.startsWith('+')) {
    formatted = `+${formatted}`;
  }
  return formatted;
}

/**
 * Send SMS via Twilio (preferred) or AWS SNS (fallback)
 */
export async function sendSMS({ phoneNumber, message }: SendSMSParams): Promise<boolean> {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  console.log('📱 Attempting to send SMS to:', formattedPhone);

  // Try Twilio first (easier to set up)
  const twilio = getTwilioClient();
  if (twilio) {
    try {
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      if (!twilioPhoneNumber) {
        console.error('❌ TWILIO_PHONE_NUMBER not configured');
      } else {
        console.log('📱 Sending SMS via Twilio from:', twilioPhoneNumber);
        const result = await twilio.messages.create({
          body: message,
          from: twilioPhoneNumber,
          to: formattedPhone,
        });
        console.log('✅ SMS sent via Twilio. SID:', result.sid);
        return true;
      }
    } catch (error: any) {
      console.error('❌ Twilio SMS failed:', error.message);
      // Fall through to try SNS
    }
  }

  // Fallback to AWS SNS
  const sns = getSNSClient();
  if (sns) {
    try {
      console.log('📱 Sending SMS via AWS SNS');
      const command = new PublishCommand({
        PhoneNumber: formattedPhone,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      });

      const result = await sns.send(command);
      console.log('✅ SMS sent via AWS SNS. MessageId:', result.MessageId);
      return true;
    } catch (error: any) {
      console.error('❌ AWS SNS SMS failed:', error.message);
    }
  }

  console.error('❌ No SMS provider configured. Set TWILIO_* or AWS SNS_* environment variables.');
  console.error('To set up Twilio:');
  console.error('  1. Sign up at https://www.twilio.com/');
  console.error('  2. Get your Account SID and Auth Token from dashboard');
  console.error('  3. Get a phone number from Twilio');
  console.error('  4. Set these env vars:');
  console.error('     TWILIO_ACCOUNT_SID=ACxxxxxxxxxx');
  console.error('     TWILIO_AUTH_TOKEN=your_auth_token');
  console.error('     TWILIO_PHONE_NUMBER=+1xxxxxxxxxx');
  return false;
}

/**
 * Send Email via AWS SES
 */
export async function sendEmail({ to, subject, body, html }: SendEmailParams): Promise<boolean> {
  try {
    console.log('📧 Sending email to:', to);

    const client = getSESClient();
    if (!client) {
      console.error('❌ AWS SES not configured - cannot send email');
      return false;
    }

    const fromAddress = process.env.EMAIL_FROM || 'keith.p05@gmail.com';

    const command = new SendEmailCommand({
      Source: fromAddress,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: body, Charset: 'UTF-8' },
          Html: { Data: html || body, Charset: 'UTF-8' },
        },
      },
    });

    const result = await client.send(command);
    console.log('✅ Email sent. MessageId:', result.MessageId);
    return true;
  } catch (error: any) {
    console.error('❌ Email failed:', error.message);
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
      <p>Please complete your rental application:</p>
      <center>
        <a href="${applicationLink}" class="button">Complete Application</a>
      </center>
      <div class="checklist">
        <p><strong>You'll need:</strong></p>
        <ul>
          <li>✓ Employment information</li>
          <li>✓ Current and previous addresses</li>
          <li>✓ References</li>
          <li>✓ Photo ID</li>
        </ul>
      </div>
      <p><small>⚠️ This link is unique to you and should not be shared.</small></p>
      <p>Best regards,<br><strong>RentalIQ Property Management</strong></p>
    </div>
  </div>
</body>
</html>`;

  const smsMessage = `Hi ${name}! Complete your rental application for ${propertyAddress}: ${applicationLink}`;

  const [emailSent, smsSent] = await Promise.all([
    sendEmail({ to: email, subject: emailSubject, body: emailBody, html: emailHtml }),
    phone ? sendSMS({ phoneNumber: phone, message: smsMessage }) : Promise.resolve(false),
  ]);

  return { emailSent, smsSent };
}

/**
 * Send application status notification (approval/denial)
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

Best regards,
RentalIQ Property Management`
    : `Hi ${name},

Thank you for your interest in ${propertyAddress}.

After careful review, we regret to inform you that we are unable to approve your application at this time.${denialReason ? `\n\nReason: ${denialReason}` : ''}

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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Update</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>Thank you for your interest in <strong>${propertyAddress}</strong>.</p>
      <div class="status-box">
        <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
        ${denialReason ? `<p><strong>Reason:</strong> ${denialReason}</p>` : ''}
      </div>
      <p>We wish you the best in your housing search.</p>
      <p>Best regards,<br><strong>RentalIQ Property Management</strong></p>
    </div>
  </div>
</body>
</html>`;

  const smsMessage = isApproved
    ? `🎉 Hi ${name}! Great news - your rental application for ${propertyAddress} has been APPROVED! We'll be in touch soon.`
    : `Hi ${name}, thank you for applying to ${propertyAddress}. Unfortunately, we're unable to approve your application. Please check your email for details.`;

  const emailSent = await sendEmail({ to: email, subject: emailSubject, body: emailBody, html: emailHtml });

  let smsSent = false;
  if (phone) {
    smsSent = await sendSMS({ phoneNumber: phone, message: smsMessage });
  }

  return { emailSent, smsSent };
}

/**
 * Send general SMS notification
 */
export async function sendSMSNotification({
  phone,
  message,
}: {
  phone: string;
  message: string;
}): Promise<boolean> {
  return sendSMS({ phoneNumber: phone, message });
}
