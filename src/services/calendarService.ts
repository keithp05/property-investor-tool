/**
 * Calendar Integration Service
 * Supports Google Calendar and Microsoft Outlook
 */

import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';

// Types
export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  reminders?: {
    method: 'email' | 'popup';
    minutes: number;
  }[];
  metadata?: Record<string, any>;
}

export interface CalendarProvider {
  type: 'google' | 'microsoft';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  email?: string;
  calendarId?: string;
}

export interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// =============================================================================
// GOOGLE CALENDAR
// =============================================================================

const googleOAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/calendar/google/callback`
);

/**
 * Get Google Calendar OAuth URL
 */
export function getGoogleAuthUrl(state?: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return googleOAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: state || '',
  });
}

/**
 * Exchange Google auth code for tokens
 */
export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const { tokens } = await googleOAuth2Client.getToken(code);
  
  googleOAuth2Client.setCredentials(tokens);
  
  // Get user email
  const oauth2 = google.oauth2({ version: 'v2', auth: googleOAuth2Client });
  const userInfo = await oauth2.userinfo.get();
  
  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: new Date(tokens.expiry_date!),
    email: userInfo.data.email!,
  };
}

/**
 * Refresh Google access token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  googleOAuth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await googleOAuth2Client.refreshAccessToken();
  
  return {
    accessToken: credentials.access_token!,
    expiresAt: new Date(credentials.expiry_date!),
  };
}

/**
 * Create event in Google Calendar
 */
export async function createGoogleEvent(
  accessToken: string,
  event: CalendarEvent,
  calendarId: string = 'primary'
): Promise<SyncResult> {
  try {
    googleOAuth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: 'America/Chicago', // TODO: Get from user settings
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: 'America/Chicago',
      },
      attendees: event.attendees?.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: event.reminders || [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 mins before
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: googleEvent,
      sendUpdates: 'all',
    });

    return {
      success: true,
      eventId: response.data.id!,
    };
  } catch (error: any) {
    console.error('Google Calendar error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Google Calendar event',
    };
  }
}

/**
 * Update event in Google Calendar
 */
export async function updateGoogleEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>,
  calendarId: string = 'primary'
): Promise<SyncResult> {
  try {
    googleOAuth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

    const updateData: any = {};
    if (event.title) updateData.summary = event.title;
    if (event.description) updateData.description = event.description;
    if (event.location) updateData.location = event.location;
    if (event.startTime) {
      updateData.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: 'America/Chicago',
      };
    }
    if (event.endTime) {
      updateData.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: 'America/Chicago',
      };
    }

    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: updateData,
    });

    return {
      success: true,
      eventId: response.data.id!,
    };
  } catch (error: any) {
    console.error('Google Calendar update error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update Google Calendar event',
    };
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<SyncResult> {
  try {
    googleOAuth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Google Calendar delete error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete Google Calendar event',
    };
  }
}

/**
 * List upcoming events from Google Calendar
 */
export async function listGoogleEvents(
  accessToken: string,
  maxResults: number = 10,
  calendarId: string = 'primary'
): Promise<CalendarEvent[]> {
  try {
    googleOAuth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

    const response = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (response.data.items || []).map(item => ({
      id: item.id!,
      title: item.summary || 'Untitled',
      description: item.description || undefined,
      location: item.location || undefined,
      startTime: new Date(item.start?.dateTime || item.start?.date || ''),
      endTime: new Date(item.end?.dateTime || item.end?.date || ''),
      attendees: item.attendees?.map(a => a.email!).filter(Boolean),
    }));
  } catch (error: any) {
    console.error('Google Calendar list error:', error);
    return [];
  }
}

// =============================================================================
// MICROSOFT OUTLOOK CALENDAR
// =============================================================================

/**
 * Get Microsoft OAuth URL
 */
export function getMicrosoftAuthUrl(state?: string): string {
  const clientId = process.env.MICROSOFT_CALENDAR_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_CALENDAR_REDIRECT_URI || 
    `${process.env.NEXTAUTH_URL}/api/calendar/microsoft/callback`;
  
  const scopes = [
    'openid',
    'profile',
    'email',
    'offline_access',
    'Calendars.ReadWrite',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId!,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    response_mode: 'query',
    state: state || '',
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange Microsoft auth code for tokens
 */
export async function exchangeMicrosoftCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const clientId = process.env.MICROSOFT_CALENDAR_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET!;
  const redirectUri = process.env.MICROSOFT_CALENDAR_REDIRECT_URI || 
    `${process.env.NEXTAUTH_URL}/api/calendar/microsoft/callback`;

  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json();
  
  if (tokens.error) {
    throw new Error(tokens.error_description || tokens.error);
  }

  // Get user email
  const client = Client.init({
    authProvider: (done) => done(null, tokens.access_token),
  });
  const user = await client.api('/me').get();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    email: user.mail || user.userPrincipalName,
  };
}

/**
 * Refresh Microsoft access token
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const clientId = process.env.MICROSOFT_CALENDAR_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET!;

  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    throw new Error(tokens.error_description || tokens.error);
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  };
}

/**
 * Create event in Microsoft Outlook Calendar
 */
export async function createMicrosoftEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<SyncResult> {
  try {
    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    const outlookEvent = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description || '',
      },
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: 'Central Standard Time',
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: 'Central Standard Time',
      },
      location: event.location ? { displayName: event.location } : undefined,
      attendees: event.attendees?.map(email => ({
        emailAddress: { address: email },
        type: 'required',
      })),
      isReminderOn: true,
      reminderMinutesBeforeStart: 30,
    };

    const response = await client.api('/me/calendar/events').post(outlookEvent);

    return {
      success: true,
      eventId: response.id,
    };
  } catch (error: any) {
    console.error('Microsoft Calendar error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Outlook Calendar event',
    };
  }
}

/**
 * Update event in Microsoft Outlook Calendar
 */
export async function updateMicrosoftEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<SyncResult> {
  try {
    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    const updateData: any = {};
    if (event.title) updateData.subject = event.title;
    if (event.description) {
      updateData.body = { contentType: 'text', content: event.description };
    }
    if (event.location) {
      updateData.location = { displayName: event.location };
    }
    if (event.startTime) {
      updateData.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: 'Central Standard Time',
      };
    }
    if (event.endTime) {
      updateData.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: 'Central Standard Time',
      };
    }

    const response = await client.api(`/me/calendar/events/${eventId}`).patch(updateData);

    return {
      success: true,
      eventId: response.id,
    };
  } catch (error: any) {
    console.error('Microsoft Calendar update error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update Outlook Calendar event',
    };
  }
}

/**
 * Delete event from Microsoft Outlook Calendar
 */
export async function deleteMicrosoftEvent(
  accessToken: string,
  eventId: string
): Promise<SyncResult> {
  try {
    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    await client.api(`/me/calendar/events/${eventId}`).delete();

    return { success: true };
  } catch (error: any) {
    console.error('Microsoft Calendar delete error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete Outlook Calendar event',
    };
  }
}

/**
 * List upcoming events from Microsoft Outlook Calendar
 */
export async function listMicrosoftEvents(
  accessToken: string,
  maxResults: number = 10
): Promise<CalendarEvent[]> {
  try {
    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    const now = new Date().toISOString();
    const response = await client
      .api('/me/calendar/events')
      .filter(`start/dateTime ge '${now}'`)
      .top(maxResults)
      .orderby('start/dateTime')
      .get();

    return (response.value || []).map((item: any) => ({
      id: item.id,
      title: item.subject || 'Untitled',
      description: item.body?.content || undefined,
      location: item.location?.displayName || undefined,
      startTime: new Date(item.start?.dateTime),
      endTime: new Date(item.end?.dateTime),
      attendees: item.attendees?.map((a: any) => a.emailAddress?.address).filter(Boolean),
    }));
  } catch (error: any) {
    console.error('Microsoft Calendar list error:', error);
    return [];
  }
}

// =============================================================================
// UNIFIED CALENDAR SERVICE
// =============================================================================

export class CalendarService {
  private provider: CalendarProvider;

  constructor(provider: CalendarProvider) {
    this.provider = provider;
  }

  /**
   * Create calendar event (auto-selects provider)
   */
  async createEvent(event: CalendarEvent): Promise<SyncResult> {
    if (this.provider.type === 'google') {
      return createGoogleEvent(
        this.provider.accessToken,
        event,
        this.provider.calendarId || 'primary'
      );
    } else {
      return createMicrosoftEvent(this.provider.accessToken, event);
    }
  }

  /**
   * Update calendar event
   */
  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<SyncResult> {
    if (this.provider.type === 'google') {
      return updateGoogleEvent(
        this.provider.accessToken,
        eventId,
        event,
        this.provider.calendarId || 'primary'
      );
    } else {
      return updateMicrosoftEvent(this.provider.accessToken, eventId, event);
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(eventId: string): Promise<SyncResult> {
    if (this.provider.type === 'google') {
      return deleteGoogleEvent(
        this.provider.accessToken,
        eventId,
        this.provider.calendarId || 'primary'
      );
    } else {
      return deleteMicrosoftEvent(this.provider.accessToken, eventId);
    }
  }

  /**
   * List upcoming events
   */
  async listEvents(maxResults: number = 10): Promise<CalendarEvent[]> {
    if (this.provider.type === 'google') {
      return listGoogleEvents(
        this.provider.accessToken,
        maxResults,
        this.provider.calendarId || 'primary'
      );
    } else {
      return listMicrosoftEvents(this.provider.accessToken, maxResults);
    }
  }
}

// =============================================================================
// PROPERTY MANAGEMENT EVENT HELPERS
// =============================================================================

/**
 * Create a property showing event
 */
export function createShowingEvent(
  propertyAddress: string,
  prospectName: string,
  prospectEmail: string,
  startTime: Date,
  durationMinutes: number = 30
): CalendarEvent {
  return {
    title: `Property Showing: ${propertyAddress}`,
    description: `Property showing with ${prospectName}\n\nProperty: ${propertyAddress}\nProspect: ${prospectName} (${prospectEmail})`,
    location: propertyAddress,
    startTime,
    endTime: new Date(startTime.getTime() + durationMinutes * 60 * 1000),
    attendees: [prospectEmail],
    reminders: [
      { method: 'email', minutes: 60 },
      { method: 'popup', minutes: 15 },
    ],
  };
}

/**
 * Create a maintenance appointment event
 */
export function createMaintenanceEvent(
  propertyAddress: string,
  tenantName: string,
  tenantEmail: string,
  issueDescription: string,
  startTime: Date,
  durationMinutes: number = 60
): CalendarEvent {
  return {
    title: `Maintenance: ${propertyAddress}`,
    description: `Maintenance appointment\n\nProperty: ${propertyAddress}\nTenant: ${tenantName}\nIssue: ${issueDescription}`,
    location: propertyAddress,
    startTime,
    endTime: new Date(startTime.getTime() + durationMinutes * 60 * 1000),
    attendees: [tenantEmail],
    reminders: [
      { method: 'email', minutes: 24 * 60 },
      { method: 'popup', minutes: 30 },
    ],
  };
}

/**
 * Create a lease signing event
 */
export function createLeaseSigningEvent(
  propertyAddress: string,
  tenantName: string,
  tenantEmail: string,
  startTime: Date,
  location?: string
): CalendarEvent {
  return {
    title: `Lease Signing: ${propertyAddress}`,
    description: `Lease signing appointment\n\nProperty: ${propertyAddress}\nTenant: ${tenantName}\n\nPlease bring:\n- Government-issued ID\n- Proof of income\n- Security deposit (certified check or money order)`,
    location: location || propertyAddress,
    startTime,
    endTime: new Date(startTime.getTime() + 60 * 60 * 1000), // 1 hour
    attendees: [tenantEmail],
    reminders: [
      { method: 'email', minutes: 24 * 60 },
      { method: 'popup', minutes: 60 },
    ],
  };
}

/**
 * Create a rent due reminder event
 */
export function createRentDueEvent(
  propertyAddress: string,
  tenantName: string,
  amount: number,
  dueDate: Date
): CalendarEvent {
  return {
    title: `Rent Due: ${propertyAddress}`,
    description: `Rent payment of $${amount.toLocaleString()} is due today for ${propertyAddress}\n\nTenant: ${tenantName}`,
    startTime: dueDate,
    endTime: new Date(dueDate.getTime() + 30 * 60 * 1000), // 30 min reminder
    reminders: [
      { method: 'email', minutes: 3 * 24 * 60 }, // 3 days before
      { method: 'popup', minutes: 24 * 60 }, // 1 day before
    ],
  };
}

/**
 * Create a lease expiration reminder event
 */
export function createLeaseExpirationEvent(
  propertyAddress: string,
  tenantName: string,
  expirationDate: Date
): CalendarEvent {
  return {
    title: `Lease Expires: ${propertyAddress}`,
    description: `Lease expiration reminder\n\nProperty: ${propertyAddress}\nTenant: ${tenantName}\n\nPlease contact tenant to discuss renewal options.`,
    startTime: expirationDate,
    endTime: new Date(expirationDate.getTime() + 60 * 60 * 1000),
    reminders: [
      { method: 'email', minutes: 60 * 24 * 60 }, // 60 days before
      { method: 'email', minutes: 30 * 24 * 60 }, // 30 days before
      { method: 'popup', minutes: 7 * 24 * 60 }, // 7 days before
    ],
  };
}

/**
 * Create a property inspection event
 */
export function createInspectionEvent(
  propertyAddress: string,
  inspectionType: 'move-in' | 'move-out' | 'annual' | 'hqs',
  tenantName: string,
  tenantEmail: string,
  startTime: Date
): CalendarEvent {
  const typeLabels = {
    'move-in': 'Move-In Inspection',
    'move-out': 'Move-Out Inspection',
    'annual': 'Annual Inspection',
    'hqs': 'HQS Inspection (Section 8)',
  };

  return {
    title: `${typeLabels[inspectionType]}: ${propertyAddress}`,
    description: `${typeLabels[inspectionType]}\n\nProperty: ${propertyAddress}\nTenant: ${tenantName}\n\nPlease ensure the property is accessible.`,
    location: propertyAddress,
    startTime,
    endTime: new Date(startTime.getTime() + 60 * 60 * 1000), // 1 hour
    attendees: [tenantEmail],
    reminders: [
      { method: 'email', minutes: 48 * 60 }, // 2 days before
      { method: 'popup', minutes: 60 }, // 1 hour before
    ],
  };
}

export default CalendarService;
