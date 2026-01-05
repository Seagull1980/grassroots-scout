export interface CalendarIntegration {
  id: string;
  userId: string;
  provider: 'google' | 'outlook' | 'apple';
  accountEmail: string;
  accessToken: string;
  refreshToken: string;
  isActive: boolean;
  syncEnabled: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

export interface RecurringEvent {
  id: string;
  title: string;
  description?: string;
  eventType: 'training' | 'match' | 'trial' | 'meeting';
  location: string;
  recurringPattern: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // every N days/weeks/months
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    dayOfMonth?: number; // 1-31
    endDate?: string;
    occurrences?: number;
  };
  startTime: string;
  endTime: string;
  createdBy: string;
  teamId?: string;
  maxParticipants?: number;
  participants: string[];
  reminders: ReminderSettings[];
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSettings {
  type: 'email' | 'sms' | 'push' | 'calendar';
  minutesBefore: number; // 15, 30, 60, 1440 (24h), etc.
  isEnabled: boolean;
}

export interface ConflictDetection {
  eventId: string;
  conflictingEvents: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    type: 'training' | 'match' | 'trial' | 'personal';
    severity: 'low' | 'medium' | 'high';
  }[];
  suggestions: {
    type: 'reschedule' | 'shorten' | 'split';
    newStartTime?: string;
    newEndTime?: string;
    reason: string;
  }[];
}

export interface WeatherInfo {
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  forecast: {
    datetime: string;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    uvIndex: number;
    visibility: number;
  };
  alerts: {
    type: 'rain' | 'wind' | 'temperature' | 'severe';
    severity: 'low' | 'medium' | 'high';
    message: string;
    impact: string;
  }[];
  recommendation: {
    suitable: boolean;
    message: string;
    alternatives?: string[];
  };
}

export interface AutoSchedulingPreferences {
  userId: string;
  preferredTimes: {
    dayOfWeek: number; // 0-6
    startHour: number; // 0-23
    endHour: number; // 0-23
  }[];
  blackoutDates: string[]; // ISO date strings
  minimumNoticePeriod: number; // hours
  maximumEventsPerDay: number;
  preferredLocations: string[];
  travelTime: number; // minutes between events
  autoAcceptTrials: boolean;
  conflictResolution: 'manual' | 'auto_decline' | 'auto_reschedule';
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  startDate: string;
  endDate: string;
  filters: {
    eventTypes: ('training' | 'match' | 'trial' | 'meeting')[];
    teams: string[];
    locations: string[];
    showWeather: boolean;
    showConflicts: boolean;
  };
}
