import axios from 'axios';
import { 
  CalendarIntegration, 
  RecurringEvent, 
  ConflictDetection, 
  WeatherInfo,
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Weather API (using OpenWeatherMap)
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';

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

    const response = await axios.post(`${API_URL}/calendar/integrations`, integration);
    return response.data.integration;
  }

  async syncWithGoogleCalendar(integrationId: string): Promise<{ synced: number; conflicts: ConflictDetection[] }> {
    const response = await axios.post(`${API_URL}/calendar/integrations/${integrationId}/sync`);
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

    const apiResponse = await axios.post(`${API_URL}/calendar/integrations`, integration);
    return apiResponse.data.integration;
  }

  // Recurring Events
  async createRecurringEvent(eventData: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringEvent> {
    const response = await axios.post(`${API_URL}/calendar/recurring-events`, eventData);
    return response.data.event;
  }

  async getRecurringEvents(startDate: Date, endDate: Date): Promise<RecurringEvent[]> {
    const response = await axios.get(`${API_URL}/calendar/recurring-events`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
    return response.data.events;
  }

  async updateRecurringEvent(eventId: string, updates: Partial<RecurringEvent>, updateType: 'this' | 'future' | 'all'): Promise<void> {
    await axios.put(`${API_URL}/calendar/recurring-events/${eventId}`, {
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
    const response = await axios.post(`${API_URL}/calendar/conflicts/detect`, eventData);
    return response.data;
  }

  async getConflictsForPeriod(startDate: Date, endDate: Date, userId?: string): Promise<ConflictDetection[]> {
    const response = await axios.get(`${API_URL}/calendar/conflicts`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId
      }
    });
    return response.data.conflicts;
  }

  // Weather Integration
  async getWeatherForEvent(location: string, datetime: string): Promise<WeatherInfo> {
    if (!WEATHER_API_KEY) {
      throw new Error('Weather API key not configured');
    }

    // Geocoding to get coordinates
    const geocodeResponse = await axios.get(`${WEATHER_API_URL}/geocode/direct`, {
      params: {
        q: location,
        limit: 1,
        appid: WEATHER_API_KEY
      }
    });

    if (geocodeResponse.data.length === 0) {
      throw new Error('Location not found');
    }

    const { lat, lon, name } = geocodeResponse.data[0];

    // Get weather forecast
    const weatherResponse = await axios.get(`${WEATHER_API_URL}/forecast`, {
      params: {
        lat,
        lon,
        appid: WEATHER_API_KEY,
        units: 'metric'
      }
    });

    const eventDate = new Date(datetime);
    const forecast = weatherResponse.data.list.find((item: any) => {
      const forecastDate = new Date(item.dt * 1000);
      return Math.abs(forecastDate.getTime() - eventDate.getTime()) < 3 * 60 * 60 * 1000; // Within 3 hours
    });

    if (!forecast) {
      throw new Error('Weather forecast not available for the specified time');
    }

    const weather: WeatherInfo = {
      location: { lat, lng: lon, name },
      forecast: {
        datetime: datetime,
        temperature: forecast.main.temp,
        condition: forecast.weather[0].main,
        humidity: forecast.main.humidity,
        windSpeed: forecast.wind.speed,
        precipitation: forecast.rain?.['3h'] || forecast.snow?.['3h'] || 0,
        uvIndex: 0, // Not available in current API
        visibility: forecast.visibility / 1000 // Convert to km
      },
      alerts: [],
      recommendation: this.generateWeatherRecommendation(forecast)
    };

    // Generate alerts based on conditions
    if (forecast.main.temp < 5) {
      weather.alerts.push({
        type: 'temperature',
        severity: 'high',
        message: 'Very cold conditions expected',
        impact: 'Consider rescheduling outdoor activities'
      });
    }

    if (forecast.wind.speed > 15) {
      weather.alerts.push({
        type: 'wind',
        severity: 'medium',
        message: 'Strong winds expected',
        impact: 'May affect ball control and gameplay'
      });
    }

    if ((forecast.rain?.['3h'] || 0) > 5) {
      weather.alerts.push({
        type: 'rain',
        severity: 'high',
        message: 'Heavy rain expected',
        impact: 'Outdoor activities may need to be cancelled'
      });
    }

    return weather;
  }

  private generateWeatherRecommendation(forecast: any): WeatherInfo['recommendation'] {
    const temp = forecast.main.temp;
    const rain = forecast.rain?.['3h'] || 0;
    const wind = forecast.wind.speed;

    if (rain > 10) {
      return {
        suitable: false,
        message: 'Heavy rain expected - consider indoor alternatives',
        alternatives: ['Indoor training facility', 'Postpone to next available day', 'Virtual training session']
      };
    }

    if (temp < 0) {
      return {
        suitable: false,
        message: 'Freezing conditions - unsafe for outdoor activities',
        alternatives: ['Indoor venue', 'Postpone until temperature rises', 'Modified indoor training']
      };
    }

    if (wind > 20) {
      return {
        suitable: false,
        message: 'Very strong winds - may affect safety and gameplay',
        alternatives: ['Sheltered venue', 'Indoor facility', 'Reschedule for calmer conditions']
      };
    }

    if (rain > 2 || temp < 5 || wind > 15) {
      return {
        suitable: true,
        message: 'Playable but challenging conditions - ensure proper preparation',
        alternatives: ['Extra warm-up time', 'Waterproof equipment', 'Shorter session duration']
      };
    }

    return {
      suitable: true,
      message: 'Good conditions for outdoor activities',
      alternatives: []
    };
  }

  // Auto-scheduling
  async getSchedulingPreferences(userId: string): Promise<AutoSchedulingPreferences> {
    const response = await axios.get(`${API_URL}/calendar/preferences/${userId}`);
    return response.data.preferences;
  }

  async updateSchedulingPreferences(userId: string, preferences: Partial<AutoSchedulingPreferences>): Promise<void> {
    await axios.put(`${API_URL}/calendar/preferences/${userId}`, preferences);
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
      weatherInfo?: WeatherInfo;
      conflicts: number;
    }[];
  }> {
    const response = await axios.post(`${API_URL}/calendar/suggest-times`, eventData);
    return response.data;
  }

  // Reminders
  async setReminders(eventId: string, reminders: ReminderSettings[]): Promise<void> {
    await axios.put(`${API_URL}/calendar/events/${eventId}/reminders`, { reminders });
  }

  async getUpcomingReminders(userId: string): Promise<{
    eventId: string;
    eventTitle: string;
    reminderType: string;
    scheduledFor: string;
    sent: boolean;
  }[]> {
    const response = await axios.get(`${API_URL}/calendar/reminders/${userId}`);
    return response.data.reminders;
  }

  // Export/Import
  async exportToICS(eventIds: string[]): Promise<Blob> {
    const response = await axios.post(`${API_URL}/calendar/export/ics`, { eventIds }, {
      responseType: 'blob'
    });
    return response.data;
  }

  async importFromICS(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('icsFile', file);
    
    const response = await axios.post(`${API_URL}/calendar/import/ics`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
}

export const calendarIntegrationService = new CalendarIntegrationService();
export default calendarIntegrationService;
