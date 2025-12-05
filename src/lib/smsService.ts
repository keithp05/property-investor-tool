/**
 * AWS SNS Service for Text Messaging
 * Handles SMS notifications for tenant applications, reminders, etc.
 */

import { SNSClient, PublishCommand, PublishCommandInput } from '@aws-sdk/client-sns';

// Initialize SNS client
// Uses SNS_* prefix for Amplify compatibility (Amplify blocks AWS_* prefix)
const snsClient = new SNSClient({
  region: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 1 and is 11 digits, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it's 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If already has country code (starts with +), return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: add +1 for US
  return `+1${cleaned}`;
}

/**
 * Send an SMS message via AWS SNS
 */
export async function sendSMS(
  phoneNumber: string,
  message: string,
  senderId?: string
): Promise<SMSResult> {
  // Check if AWS credentials are configured (supports both AWS_* and SNS_* prefixes)
  const accessKey = process.env.SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!accessKey || !secretKey) {
    console.error('AWS credentials not configured for SMS');
    return {
      success: false,
      error: 'SMS service not configured. Please set AWS credentials.',
    };
  }

  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    const params: PublishCommandInput = {
      Message: message,
      PhoneNumber: formattedPhone,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: senderId || 'RentalIQ',
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // Higher delivery priority
        },
      },
    };

    const command = new PublishCommand(params);
    const response = await snsClient.send(command);

    console.log(`SMS sent successfully to ${formattedPhone}:`, response.MessageId);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error: any) {
    console.error('SMS send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

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
  // Ensure message ends with branding
  const brandedMessage = message.includes('RentalIQ') 
    ? message 
    : `${message} - RentalIQ`;
  
  return sendSMS(phoneNumber, brandedMessage);
}

export const smsService = {
  sendSMS,
  sendApplicationReceivedSMS,
  sendApplicationStatusSMS,
  sendRentReminderSMS,
  sendRentOverdueSMS,
  sendMaintenanceUpdateSMS,
  sendLeaseExpirationSMS,
  sendCustomSMS,
};

export default smsService;
