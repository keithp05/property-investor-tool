/**
 * Certn Background Check Service
 * Integrates with Certn API for tenant screening
 * 
 * Features:
 * - Criminal background checks
 * - Credit reports
 * - Eviction history
 * - Identity verification
 * 
 * API Docs: https://docs.certn.co/api
 */

// Types
export interface CertnApplicant {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  date_of_birth?: string; // YYYY-MM-DD
  addresses?: CertnAddress[];
}

export interface CertnAddress {
  address: string;
  city: string;
  province_state: string;
  country: string; // 'US' or 'CA'
  postal_code?: string;
  current?: boolean;
}

export interface CertnPropertyLocation {
  address: string;
  city: string;
  province_state: string;
  country: string;
  postal_code?: string;
  location_type?: string;
}

export interface CertnScreeningRequest {
  applicant: CertnApplicant;
  property: CertnPropertyLocation;
  // Screening options
  request_softcheck?: boolean;        // Criminal/public records
  request_us_criminal_record_check?: boolean;
  request_equifax?: boolean;          // Credit check (Canada)
  request_us_ssn_verification?: boolean;
  request_identity_verification?: boolean;
  request_eviction_check?: boolean;
}

export interface CertnApplicationResponse {
  id: string;
  created: string;
  modified: string;
  status: string;
  report_status: string;
  applicant_id?: string;
  applicants?: Array<{
    id: string;
    status: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
}

export interface CertnReportResult {
  id: string;
  status: string;
  report_status: string;
  result: string; // 'CLEARED', 'REVIEW', 'FAIL'
  risk_result?: string;
  credit_score?: number;
  report_url?: string;
  softcheck_result?: {
    status: string;
    result: string;
    criminal_records?: any[];
    public_records?: any[];
  };
  us_criminal_record_check_result?: {
    status: string;
    result: string;
    records?: any[];
  };
  equifax_result?: {
    status: string;
    credit_score?: number;
    report_url?: string;
  };
  identity_verification_result?: {
    status: string;
    result: string;
    verified?: boolean;
  };
}

export interface CertnResult {
  success: boolean;
  applicationId?: string;
  applicantId?: string;
  status?: string;
  error?: string;
  data?: any;
}

// Configuration
function getCertnConfig() {
  const apiKey = process.env.CERTN_API_KEY;
  const apiUrl = process.env.CERTN_API_URL || 'https://api.certn.co';
  const ownerId = process.env.CERTN_OWNER_ID;
  
  return {
    apiKey,
    apiUrl,
    ownerId,
    isConfigured: !!apiKey,
  };
}

/**
 * Check if Certn is configured
 */
export function getCertnStatus() {
  const config = getCertnConfig();
  return {
    isConfigured: config.isConfigured,
    apiUrl: config.apiUrl,
    hasOwnerId: !!config.ownerId,
  };
}

/**
 * Make authenticated request to Certn API
 */
async function certnRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: any
): Promise<any> {
  const config = getCertnConfig();
  
  if (!config.apiKey) {
    throw new Error('Certn API key not configured');
  }
  
  const url = `${config.apiUrl}${endpoint}`;
  
  console.log(`📋 Certn API ${method} ${endpoint}`);
  
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Certn API error:', {
      status: response.status,
      statusText: response.statusText,
      data,
    });
    throw new Error(data.message || data.error || `Certn API error: ${response.status}`);
  }
  
  return data;
}

/**
 * Initiate a quick screening (all info provided upfront)
 * This runs the background check immediately without sending an invite to the applicant
 */
export async function initiateQuickScreening(
  request: CertnScreeningRequest
): Promise<CertnResult> {
  const config = getCertnConfig();
  
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'Certn not configured. Set CERTN_API_KEY environment variable.',
    };
  }
  
  try {
    const body = {
      // Applicant information
      information: {
        first_name: request.applicant.first_name,
        last_name: request.applicant.last_name,
        email: request.applicant.email,
        phone_number: request.applicant.phone_number,
        date_of_birth: request.applicant.date_of_birth,
        addresses: request.applicant.addresses || [],
      },
      // Property location
      position_or_property_location: {
        address: request.property.address,
        city: request.property.city,
        province_state: request.property.province_state,
        country: request.property.country,
        postal_code: request.property.postal_code,
        location_type: 'Property Location',
      },
      // Owner ID (your Certn user ID)
      owner_id: config.ownerId,
      // Screening requests
      request_softcheck: request.request_softcheck ?? true,
      request_us_criminal_record_check: request.request_us_criminal_record_check ?? true,
      request_identity_verification: request.request_identity_verification ?? false,
    };
    
    console.log('📋 Initiating Certn quick screening:', {
      applicant: `${request.applicant.first_name} ${request.applicant.last_name}`,
      property: request.property.address,
    });
    
    const response = await certnRequest('/api/v1/pm/applications/quick/', 'POST', body);
    
    console.log('✅ Certn screening initiated:', response.id);
    
    // Extract applicant ID from response
    const applicantId = response.applicants?.[0]?.id || response.applicant_id;
    
    return {
      success: true,
      applicationId: response.id,
      applicantId,
      status: response.status,
      data: response,
    };
  } catch (error: any) {
    console.error('❌ Certn quick screening error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate Certn screening',
    };
  }
}

/**
 * Invite applicant to complete screening
 * Sends an email/SMS to the applicant with a link to complete the screening
 */
export async function inviteApplicantScreening(
  request: CertnScreeningRequest
): Promise<CertnResult> {
  const config = getCertnConfig();
  
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'Certn not configured. Set CERTN_API_KEY environment variable.',
    };
  }
  
  try {
    const body = {
      // Applicant information (pre-fill the form)
      information: {
        first_name: request.applicant.first_name,
        last_name: request.applicant.last_name,
        email: request.applicant.email,
        phone_number: request.applicant.phone_number,
      },
      // Property location
      position_or_property_location: {
        address: request.property.address,
        city: request.property.city,
        province_state: request.property.province_state,
        country: request.property.country,
        postal_code: request.property.postal_code,
        location_type: 'Property Location',
      },
      // Owner ID
      owner_id: config.ownerId,
      // Screening requests
      request_softcheck: request.request_softcheck ?? true,
      request_us_criminal_record_check: request.request_us_criminal_record_check ?? true,
    };
    
    console.log('📋 Sending Certn screening invite:', {
      applicant: `${request.applicant.first_name} ${request.applicant.last_name}`,
      email: request.applicant.email,
    });
    
    const response = await certnRequest('/api/v1/pm/applications/invite/', 'POST', body);
    
    console.log('✅ Certn invite sent:', response.id);
    
    const applicantId = response.applicants?.[0]?.id || response.applicant_id;
    
    return {
      success: true,
      applicationId: response.id,
      applicantId,
      status: response.status,
      data: response,
    };
  } catch (error: any) {
    console.error('❌ Certn invite error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send Certn screening invite',
    };
  }
}

/**
 * Get screening status and results
 */
export async function getScreeningStatus(applicantId: string): Promise<CertnResult> {
  const config = getCertnConfig();
  
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'Certn not configured',
    };
  }
  
  try {
    const response = await certnRequest(`/api/v1/pm/applicants/${applicantId}/`, 'GET');
    
    console.log('📋 Certn screening status:', {
      applicantId,
      status: response.status,
      reportStatus: response.report_status,
    });
    
    return {
      success: true,
      applicantId,
      status: response.report_status,
      data: response,
    };
  } catch (error: any) {
    console.error('❌ Certn get status error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get Certn screening status',
    };
  }
}

/**
 * Get the PDF report URL for a completed screening
 */
export async function getReportUrl(applicantId: string): Promise<string | null> {
  try {
    const result = await getScreeningStatus(applicantId);
    
    if (result.success && result.data) {
      // Try to get report URL from various result fields
      return result.data.report_url 
        || result.data.softcheck_result?.report_url
        || result.data.us_criminal_record_check_result?.report_url
        || null;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting report URL:', error);
    return null;
  }
}

/**
 * Parse webhook payload from Certn
 */
export function parseWebhookPayload(payload: any): {
  applicantId: string;
  status: string;
  result: string;
  reportStatus: string;
} | null {
  try {
    return {
      applicantId: payload.applicant_id || payload.id,
      status: payload.status,
      result: payload.result || payload.risk_result,
      reportStatus: payload.report_status,
    };
  } catch (error) {
    console.error('❌ Error parsing Certn webhook:', error);
    return null;
  }
}

/**
 * Map Certn status to our application status
 */
export function mapCertnStatusToAppStatus(certnStatus: string, result?: string): string {
  // Report status mapping
  switch (certnStatus?.toUpperCase()) {
    case 'COMPLETE':
    case 'RETURNED':
      // Check the result
      if (result === 'CLEARED' || result === 'PASS') {
        return 'CLEARED';
      } else if (result === 'REVIEW') {
        return 'REVIEW_NEEDED';
      } else if (result === 'FAIL') {
        return 'FAILED';
      }
      return 'COMPLETE';
    
    case 'PENDING':
    case 'PROCESSING':
    case 'IN_PROGRESS':
      return 'PENDING';
    
    case 'CANCELLED':
    case 'EXPIRED':
      return 'CANCELLED';
    
    default:
      return 'PENDING';
  }
}
