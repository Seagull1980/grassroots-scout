import axios from 'axios';
import { 
  CalendarIntegration, 
  RecurringEvent, 
  ConflictDetection, 
  AutoSchedulingPreferences,
  ReminderSettings 
} from '../types/calendar';

// Global type declarations for external libraries
declare global {
  interface Window {
    gapi: any;
    msal: any;
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Google Calendar API
const GOOGLE_CALENDAR_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

class CalendarIntegrationService {
  // Google Calendar Integration
  async initGoogleCalendar(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window.gapi === 'undefined') {
        // Load Google API script
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client:auth2', () => {
            window.gapi.client.init({
              clientId: GOOGLE_CALENDAR_CLIENT_ID,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
              scope: 'https://www.googleapis.com/auth/calendar'
            }).then(resolve).catch(reject);
          });
        };
        document.head.appendChild(script);
      } else {
        resolve();
      }
    });
  }

  async connectGoogleCalendar(): Promise<CalendarIntegration> {
    await this.initGoogleCalendar();
    
    const authInstance = window.gapi.auth2.getAuthInstance();
    const user = await authInstance.signIn();
    
    const profile = user.getBasicProfile();
    const authResponse = user.getAuthResponse();
    
    const integration: Partial<CalendarIntegration> = {
      provider: 'google',
      accountEmail: profile.getEmail(),
      accessToken: authResponse.access_token,
      refreshToken: authResponse.refresh_token || '',
      isActive: true,
      syncEnabled: true,
    };

    const response = await axios.post(`${API_URL}/api/calendar/integrations`, integration);
    return response.data.integration;
  }

  async syncWithGoogleCalendar(integrationId: string): Promise<{ synced: number; conflicts: ConflictDetection[] }> {
    const response = await axios.post(`${API_URL}/api/calendar/integrations/${integrationId}/sync`);
    return response.data;
  }

  // Outlook Calendar Integration
  async connectOutlookCalendar(): Promise<CalendarIntegration> {
    // Microsoft Graph API integration
    const msalInstance = new window.msal.PublicClientApplication({
      auth: {
        clientId: import.meta.env.VITE_OUTLOOK_CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin
      }
    });

    const loginRequest = {
      scopes: ['https://graph.microsoft.com/calendars.readwrite']
    };

    const response = await msalInstance.loginPopup(loginRequest);
    
    const integration: Partial<CalendarIntegration> = {
      provider: 'outlook',
      accountEmail: response.account.username,
      accessToken: response.accessToken,
      isActive: true,
      syncEnabled: true,
    };

    const apiResponse = await axios.post(`${API_URL}/api/calendar/integrations`, integration);
    return apiResponse.data.integration;
  }

  // Recurring Events
  async createRecurringEvent(eventData: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringEvent> {
    const response = await axios.post(`${API_URL}/api/calendar/recurring-events`, eventData);
    return response.data.event;
  }

  async getRecurringEvents(startDate: Date, endDate: Date): Promise<RecurringEvent[]> {
    const response = await axios.get(`${API_URL}/api/calendar/recurring-events`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
    return response.data.events;
  }

  async updateRecurringEvent(eventId: string, updates: Partial<RecurringEvent>, updateType: 'this' | 'future' | 'all'): Promise<void> {
    await axios.put(`${API_URL}/api/calendar/recurring-events/${eventId}`, {
      ...updates,
      updateType
    });
  }

  // Conflict Detection
  async detectConflicts(eventData: {
    startTime: string;
    endTime: string;
    participants: string[];
    eventId?: string;
  }): Promise<ConflictDetection> {
    const response = await axios.post(`${API_URL}/api/calendar/conflicts/detect`, eventData);
    return response.data;
  }

  async getConflictsForPeriod(startDate: Date, endDate: Date, userId?: string): Promise<ConflictDetection[]> {
    const response = await axios.get(`${API_URL}/api/calendar/conflicts`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId
      }
    });
    return response.data.conflicts;
  }

  // Auto-scheduling
  async getSchedulingPreferences(userId: string): Promise<AutoSchedulingPreferences> {
    const response = await axios.get(`${API_URL}/api/calendar/preferences/${userId}`);
    return response.data.preferences;
  }

  async updateSchedulingPreferences(userId: string, preferences: Partial<AutoSchedulingPreferences>): Promise<void> {
    await axios.put(`${API_URL}/api/calendar/preferences/${userId}`, preferences);
  }

  async suggestOptimalTimes(eventData: {
    duration: number; // minutes
    participants: string[];
    preferredDate?: string;
    location?: string;
    eventType: 'training' | 'match' | 'trial';
  }): Promise<{
    suggestions: {
      startTime: string;
      endTime: string;
      score: number; // 0-100
      reasons: string[];
      conflicts: number;
    }[];
  }> {
    const response = await axios.post(`${API_URL}/api/calendar/suggest-times`, eventData);
    return response.data;
  }

  // Reminders
  async setReminders(eventId: string, reminders: ReminderSettings[]): Promise<void> {
    await axios.put(`${API_URL}/api/calendar/events/${eventId}/reminders`, { reminders });
  }

  async getUpcomingReminders(userId: string): Promise<{
    eventId: string;
    eventTitle: string;
    reminderType: string;
    scheduledFor: string;
    sent: boolean;
  }[]> {
    const response = await axios.get(`${API_URL}/api/calendar/reminders/${userId}`);
    return response.data.reminders;
  }

  // Export/Import
  async exportToICS(eventIds: string[]): Promise<Blob> {
    const response = await axios.post(`${API_URL}/api/calendar/export/ics`, { eventIds }, {
      responseType: 'blob'
    });
    return response.data;
  }

  async importFromICS(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('icsFile', file);
    
    const response = await axios.post(`${API_URL}/api/calendar/import/ics`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
}

export const calendarIntegrationService = new CalendarIntegrationService();
export default calendarIntegrationService;
