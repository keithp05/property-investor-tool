/**
 * SMS Service - Supports Twilio, Telnyx, and AWS SNS
 * Handles SMS notifications for tenant applications, reminders, etc.
 */

import { SNSClient, PublishCommand, PublishCommandInput } from '@aws-sdk/client-sns';

// ============================================================================
// CONFIGURATION CHECK
// ============================================================================

interface SMSConfig {
  provider: 'twilio' | 'telnyx' | 'sns' | 'none';
  isConfigured: boolean;
  details: string;
}

function getSMSConfig(): SMSConfig {
  // Check Twilio first (recommended)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  
  if (twilioSid && twilioToken && twilioPhone) {
    return {
      provider: 'twilio',
      isConfigured: true,
      details: `Twilio configured with phone: ${twilioPhone}`,
    };
  }
  
  // Check Telnyx (second priority)
  const telnyxApiKey = process.env.TELNYX_API_KEY;
  const telnyxPhone = process.env.TELNYX_PHONE_NUMBER;
  
  if (telnyxApiKey && telnyxPhone) {
    return {
      provider: 'telnyx',
      isConfigured: true,
      details: `Telnyx configured with phone: ${telnyxPhone}`,
    };
  }
  
  // Check AWS SNS (fallback)
  const snsAccessKey = process.env.SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const snsSecretKey = process.env.SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  
  if (snsAccessKey && snsSecretKey) {
    return {
      provider: 'sns',
      isConfigured: true,
      details: `AWS SNS configured in region: ${process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1'}`,
    };
  }
  
  return {
    provider: 'none',
    isConfigured: false,
    details: 'No SMS provider configured. Set TWILIO_*, TELNYX_*, or SNS_* environment variables.',
  };
}

// ============================================================================
// TWILIO IMPLEMENTATION
// ============================================================================

async function sendViaTwilio(phoneNumber: string, message: string): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !fromPhone) {
    return {
      success: false,
      error: 'Twilio credentials not configured',
    };
  }
  
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Twilio REST API call
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: fromPhone,
        Body: message,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Twilio error response:', data);
      return {
        success: false,
        error: data.message || `Twilio error: ${response.status}`,
      };
    }
    
    console.log(`📱 SMS sent via Twilio to ${formattedPhone}:`, data.sid);
    
    return {
      success: true,
      messageId: data.sid,
    };
  } catch (error: any) {
    console.error('Twilio send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS via Twilio',
    };
  }
}

// ============================================================================
// TELNYX IMPLEMENTATION
// ============================================================================

async function sendViaTelnyx(phoneNumber: string, message: string): Promise<SMSResult> {
  const apiKey = process.env.TELNYX_API_KEY;
  const fromPhone = process.env.TELNYX_PHONE_NUMBER;
  
  if (!apiKey || !fromPhone) {
    return {
      success: false,
      error: 'Telnyx credentials not configured',
    };
  }
  
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const formattedFrom = formatPhoneNumber(fromPhone);
    
    console.log(`📱 Sending SMS via Telnyx to: ${formattedPhone}`);
    
    // Telnyx REST API call
    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: formattedFrom,
        to: formattedPhone,
        text: message,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Telnyx error response:', data);
      const errorMsg = data.errors?.[0]?.detail || data.errors?.[0]?.title || `Telnyx error: ${response.status}`;
      return {
        success: false,
        error: errorMsg,
      };
    }
    
    console.log(`✅ SMS sent via Telnyx to ${formattedPhone}:`, data.data?.id);
    
    return {
      success: true,
      messageId: data.data?.id,
    };
  } catch (error: any) {
    console.error('❌ Telnyx send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS via Telnyx',
    };
  }
}

// ============================================================================
// AWS SNS IMPLEMENTATION
// ============================================================================

// Initialize SNS client lazily
let snsClient: SNSClient | null = null;

function getSNSClient(): SNSClient {
  if (!snsClient) {
    snsClient = new SNSClient({
      region: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return snsClient;
}

async function sendViaSNS(phoneNumber: string, message: string): Promise<SMSResult> {
  const accessKey = process.env.SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1';
  
  console.log('📱 SNS Config Check:', {
    hasAccessKey: !!accessKey,
    accessKeyPrefix: accessKey?.substring(0, 8),
    hasSecretKey: !!secretKey,
    region,
  });
  
  if (!accessKey || !secretKey) {
    console.error('❌ SNS credentials missing');
    return {
      success: false,
      error: 'AWS SNS credentials not configured',
    };
  }

  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log(`📱 Sending SMS to: ${formattedPhone}`);
    
    // Create a fresh client with explicit credentials
    const client = new SNSClient({
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
    
    const params: PublishCommandInput = {
      Message: message,
      PhoneNumber: formattedPhone,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    };

    console.log('📱 SNS Publish params:', { ...params, Message: params.Message?.substring(0, 50) + '...' });

    const command = new PublishCommand(params);
    const response = await client.send(command);

    console.log(`✅ SMS sent via SNS to ${formattedPhone}:`, response.MessageId);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error: any) {
    console.error('❌ SNS send error:', {
      name: error.name,
      message: error.message,
      code: error.Code || error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
    });
    
    // Provide helpful error messages
    let userMessage = error.message || 'Failed to send SMS via SNS';
    
    if (error.name === 'InvalidParameterValue' || error.message?.includes('Invalid parameter')) {
      userMessage = 'Invalid phone number format. Use E.164 format (+1XXXXXXXXXX)';
    } else if (error.name === 'AuthorizationError' || error.message?.includes('not authorized')) {
      userMessage = 'IAM user lacks SNS:Publish permission. Check IAM policy.';
    } else if (error.message?.includes('endpoint') || error.message?.includes('sandbox')) {
      userMessage = 'SMS is in sandbox mode. Verify phone number in AWS SNS console or request production access.';
    } else if (error.message?.includes('spending')) {
      userMessage = 'SMS spending limit reached. Increase limit in AWS SNS console.';
    }
    
    return {
      success: false,
      error: userMessage,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If already has + at start, validate and return
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Remove any remaining + signs
  const digitsOnly = cleaned.replace(/\+/g, '');
  
  // If it starts with 1 and is 11 digits, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If it's 10 digits, assume US and add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // Default: add +1 for US
  return `+1${digitsOnly}`;
}

// ============================================================================
// MAIN SEND FUNCTION
// ============================================================================

/**
 * Send an SMS message via configured provider (Twilio, Telnyx, or AWS SNS)
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  const config = getSMSConfig();
  
  console.log(`📱 SMS Config: ${config.provider} - ${config.details}`);
  
  if (!config.isConfigured) {
    console.error('❌ SMS not configured:', config.details);
    return {
      success: false,
      error: config.details,
      provider: 'none',
    };
  }
  
  let result: SMSResult;
  
  switch (config.provider) {
    case 'twilio':
      result = await sendViaTwilio(phoneNumber, message);
      result.provider = 'twilio';
      break;
    case 'telnyx':
      result = await sendViaTelnyx(phoneNumber, message);
      result.provider = 'telnyx';
      break;
    case 'sns':
      result = await sendViaSNS(phoneNumber, message);
      result.provider = 'sns';
      break;
    default:
      result = { success: false, error: 'No provider configured', provider: 'none' };
  }
  
  return result;
}

/**
 * Get current SMS configuration status
 */
export function getSMSStatus(): SMSConfig {
  return getSMSConfig();
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Send application received notification
 */
export async function sendApplicationReceivedSMS(
  phoneNumber: string,
  applicantName: string,
  propertyAddress: string
): Promise<SMSResult> {
  const message = `Hi ${applicantName}, your rental application for ${propertyAddress} has been received. We'll review it and get back to you within 2-3 business days. - RentalIQ`;
  return sendSMS(phoneNumber, message);
}

/**
 * Send application status update
 */
export async function sendApplicationStatusSMS(
  phoneNumber: string,
  applicantName: string,
  status: 'approved' | 'denied' | 'pending_info' | 'under_review',
  propertyAddress?: string
): Promise<SMSResult> {
  let message: string;
  
  switch (status) {
    case 'approved':
      message = `Congratulations ${applicantName}! Your rental application has been APPROVED. Please check your email for next steps and lease signing instructions. - RentalIQ`;
      break;
    case 'denied':
      message = `Hi ${applicantName}, we regret to inform you that your rental application was not approved at this time. Please check your email for more details. - RentalIQ`;
      break;
    case 'pending_info':
      message = `Hi ${applicantName}, we need additional information to process your application. Please check your email or log in to complete your application. - RentalIQ`;
      break;
    case 'under_review':
      message = `Hi ${applicantName}, your application is currently under review. We'll notify you of our decision within 2-3 business days. - RentalIQ`;
      break;
    default:
      message = `Hi ${applicantName}, there's an update on your rental application. Please check your email or log in for details. - RentalIQ`;
  }
  
  return sendSMS(phoneNumber, message);
}

/**
 * Send rent reminder
 */
export async function sendRentReminderSMS(
  phoneNumber: string,
  tenantName: string,
  amount: number,
  dueDate: string,
  propertyAddress?: string
): Promise<SMSResult> {
  const message = `Hi ${tenantName}, friendly reminder: Your rent payment of $${amount.toLocaleString()} is due on ${dueDate}. Pay online at RentalIQ to avoid late fees. - RentalIQ`;
  return sendSMS(phoneNumber, message);
}

/**
 * Send rent overdue notification
 */
export async function sendRentOverdueSMS(
  phoneNumber: string,
  tenantName: string,
  amount: number,
  daysOverdue: number
): Promise<SMSResult> {
  const message = `Hi ${tenantName}, your rent payment of $${amount.toLocaleString()} is ${daysOverdue} day(s) overdue. Please pay immediately to avoid additional late fees. - RentalIQ`;
  return sendSMS(phoneNumber, message);
}

/**
 * Send maintenance update
 */
export async function sendMaintenanceUpdateSMS(
  phoneNumber: string,
  tenantName: string,
  ticketId: string,
  status: 'received' | 'scheduled' | 'in_progress' | 'completed'
): Promise<SMSResult> {
  let message: string;
  
  switch (status) {
    case 'received':
      message = `Hi ${tenantName}, we've received your maintenance request (Ticket #${ticketId}). We'll schedule a technician soon. - RentalIQ`;
      break;
    case 'scheduled':
      message = `Hi ${tenantName}, a technician has been scheduled for your maintenance request (Ticket #${ticketId}). Check your email for date/time details. - RentalIQ`;
      break;
    case 'in_progress':
      message = `Hi ${tenantName}, work on your maintenance request (Ticket #${ticketId}) is in progress. We'll notify you when complete. - RentalIQ`;
      break;
    case 'completed':
      message = `Hi ${tenantName}, your maintenance request (Ticket #${ticketId}) has been completed. Please let us know if you have any issues. - RentalIQ`;
      break;
    default:
      message = `Hi ${tenantName}, there's an update on your maintenance request (Ticket #${ticketId}). Check your email for details. - RentalIQ`;
  }
  
  return sendSMS(phoneNumber, message);
}

/**
 * Send lease expiration reminder
 */
export async function sendLeaseExpirationSMS(
  phoneNumber: string,
  tenantName: string,
  expirationDate: string,
  daysRemaining: number
): Promise<SMSResult> {
  const message = `Hi ${tenantName}, your lease expires on ${expirationDate} (${daysRemaining} days). Please contact your landlord to discuss renewal options. - RentalIQ`;
  return sendSMS(phoneNumber, message);
}

/**
 * Send custom message
 */
export async function sendCustomSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  const brandedMessage = message.includes('RentalIQ') 
    ? message 
    : `${message} - RentalIQ`;
  return sendSMS(phoneNumber, brandedMessage);
}

export const smsService = {
  sendSMS,
  getSMSStatus,
  sendApplicationReceivedSMS,
  sendApplicationStatusSMS,
  sendRentReminderSMS,
  sendRentOverdueSMS,
  sendMaintenanceUpdateSMS,
  sendLeaseExpirationSMS,
  sendCustomSMS,
};

export default smsService;
