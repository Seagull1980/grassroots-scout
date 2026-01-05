import axios from 'axios';
import { storage } from '../utils/storage';
import { TeamRoster, TeamPlayer, PositionGap, PlayingHistory } from '../types';

// Dynamic API URL configuration for different environments
const getAPIUrl = () => {
  // Use environment variable if available (for production deployment)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default to localhost:3000 for local development (main backend server)
  return 'http://localhost:3000/api';
};

const getRosterAPIUrl = () => {
  // Use environment variable if available (for production deployment)
  if (import.meta.env.VITE_ROSTER_API_URL) {
    return import.meta.env.VITE_ROSTER_API_URL;
  }
  
  // Default to localhost:3000 for local development (main server)
  return 'http://localhost:3000/api';
};

const API_URL = getAPIUrl();
const ROSTER_API_URL = getRosterAPIUrl();

// Ngrok headers for tunneling (empty object for production)
export const ngrokHeaders = {};

// Export the URLs for use in other components
export { API_URL, ROSTER_API_URL };

// Create axios instance for auth/main API (server-simple on port 3001)
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for roster API (team-roster-server on port 3002)
const rosterApi = axios.create({
  baseURL: ROSTER_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests for both instances
api.interceptors.request.use((config) => {
  const token = storage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

rosterApi.interceptors.request.use((config) => {
  const token = storage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors for both instances
const handleAuthError = (error: any) => {
  if (error.response?.status === 401) {
    // Only redirect if we're not already on the login/register pages
    // and we're not in the middle of a login/register request
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath === '/login' || currentPath === '/register' || 
                       currentPath === '/forgot-password' || currentPath.startsWith('/reset-password') ||
                       currentPath.startsWith('/verify-email');
    const isAuthRequest = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register');
    
    if (!isAuthPage && !isAuthRequest) {
      console.warn('Authentication failed - clearing session and redirecting to login');
      storage.removeItem('token');
      storage.removeItem('user');
      // Only redirect if not already on an auth page
      window.location.href = '/login';
    } else {
      console.log('Auth error on auth page/request - not redirecting');
    }
  }
  return Promise.reject(error);
};

api.interceptors.response.use((response) => response, handleAuthError);
rosterApi.interceptors.response.use((response) => response, handleAuthError);

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
  createdAt: string;
  // Basic profile fields
  phone?: string;
  dateOfBirth?: string;
  location?: string;
  bio?: string;
  // Player-specific fields
  position?: string;
  preferredFoot?: 'Left' | 'Right' | 'Both';
  height?: number;
  weight?: number;
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  availability?: string[];
  // Coach-specific fields
  coachingLicense?: string;
  yearsExperience?: number;
  specializations?: string[];
  trainingLocation?: string;
  matchLocation?: string;
  trainingDays?: string[];
  ageGroupsCoached?: string[];
  // Team details for coaches
  teamName?: string;
  currentAgeGroup?: string;
  trainingTime?: string;
  matchDay?: string;
  // Contact and additional info
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  profilePicture?: string;
  isProfileComplete?: boolean;
  lastUpdated?: string;
}

export interface SearchFilters {
  league?: string;
  ageGroup?: string;
  position?: string;
  location?: string;
  radius?: number;
  center?: { lat: number; lng: number };
}

export interface EmailAlert {
  id: string;
  userId: string;
  email: string;
  alertType: 'new_match' | 'saved_search';
  filters?: SearchFilters;
  searchRegion?: {
    name: string;
    coordinates: { lat: number; lng: number }[];
  };
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export interface ProfileUpdateData {
  phone?: string;
  dateOfBirth?: string;
  location?: string;
  bio?: string;
  position?: string;
  preferredFoot?: 'Left' | 'Right' | 'Both';
  height?: number;
  weight?: number;
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  availability?: string[];
  coachingLicense?: string;
  yearsExperience?: number;
  specializations?: string[];
  trainingLocation?: string;
  matchLocation?: string;
  trainingDays?: string[];
  ageGroupsCoached?: string[];
  teamName?: string;
  currentAgeGroup?: string;
  trainingTime?: string;
  matchDay?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  profilePicture?: string;
}

export interface League {
  id: number | string;
  name: string;
  region: string;
  ageGroup: string;
  country?: string;
  url?: string;
  hits?: number;
  description?: string;
  isActive?: boolean;
  createdBy?: number;
  createdAt?: string;
  status?: 'approved' | 'pending';
  isPending?: boolean;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  eventType: 'training' | 'match' | 'trial';
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  createdBy: number;
  teamId?: number;
  isRecurring: boolean;
  recurringPattern?: 'weekly' | 'monthly';
  participants?: number[];
  maxParticipants?: number;
  createdAt: string;
}

export interface TrialInvitation {
  id: number;
  trialId: number;
  playerId: number;
  coachId: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: string;
  respondedAt?: string;
  trial: CalendarEvent;
  player: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  coach: {
    id: number;
    firstName: string;
    lastName: string;
    teamName?: string;
  };
}

export interface CreateEventData {
  title: string;
  description?: string;
  eventType: 'training' | 'match' | 'trial';
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  isRecurring?: boolean;
  recurringPattern?: 'weekly' | 'monthly';
  maxParticipants?: number;
}

export interface CreateTrialData extends CreateEventData {
  ageGroup: string;
  positions: string[];
  requirements?: string;
  invitePlayerIds?: number[];
}

export interface TrialInviteData {
  trialId: number;
  playerIds: number[];
  message?: string;
}

export interface LoginResponse {
  message: string;
  token?: string;
  user?: User;
  requiresVerification?: boolean;
}

export interface RegisterResponse {
  message: string;
  requiresVerification?: boolean;
  tempToken?: string;
  user?: User;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
  dateOfBirth?: string;
}

export interface VacancyData {
  title: string;
  description: string;
  league: string;
  ageGroup: string;
  position: string;
  location?: string;
  contactInfo?: string;
}

export interface TeamVacancy {
  id: number;
  title: string;
  description: string;
  league: string;
  ageGroup: string;
  position: string;
  location: string;
  contactInfo: string;
  postedBy: number;
  status: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  locationData?: {
    address: string;
    latitude: number;
    longitude: number;
    placeId?: string;
  };
}

export interface PlayerAvailability {
  id: string;
  title: string;
  description: string;
  preferredLeagues: string[];
  ageGroup: string;
  positions: string[]; // Changed from position: string to positions: string[]
  location: string;
  contactInfo: string;
  postedBy: string;
  createdAt: string;
  status: 'active' | 'inactive';
  locationData?: {
    address: string;
    latitude: number;
    longitude: number;
    placeId?: string;
  };
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: RegisterData): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  resendVerification: async (data: { email: string }): Promise<{ message: string }> => {
    const response = await api.post('/auth/resend-verification', data);
    return response.data;
  },

  verifyEmail: async (token: string): Promise<{ message: string; verified: boolean }> => {
    const response = await api.get(`/auth/verify-email/${token}`);
    return response.data;
  },
};

// Profile API
export const profileAPI = {
  get: async (): Promise<{ profile: UserProfile }> => {
    const response = await api.get('/profile');
    return response.data;
  },

  update: async (profileData: ProfileUpdateData): Promise<{ message: string }> => {
    const response = await api.put('/profile', profileData);
    return response.data;
  },
};

// Vacancies API
export const vacanciesAPI = {
  create: async (vacancyData: VacancyData): Promise<{ message: string; vacancyId: number }> => {
    const response = await api.post('/vacancies', vacancyData);
    return response.data;
  },

  getAll: async (filters?: {
    league?: string;
    ageGroup?: string;
    position?: string;
    location?: string;
    search?: string;
    teamGender?: string;
  }): Promise<{ vacancies: TeamVacancy[] }> => {
    const response = await api.get('/vacancies', { params: filters });
    return response.data;
  },
};

// Leagues API
export const leaguesAPI = {
  // Get leagues for search (includes user's pending requests if authenticated)
  getForSearch: async (includePending: boolean = true): Promise<League[]> => {
    const token = localStorage.getItem('token');
    const params = token && includePending ? '?includePending=true' : '';
    const response = await api.get(`/leagues${params}`);
    return response.data.leagues || response.data;
  },

  // Admin endpoints for league management
  getAll: async (): Promise<{ leagues: League[] }> => {
    const response = await rosterApi.get('/admin/leagues');
    // Normalize response shape: some servers return { leagues: { rows: [...] } }
    const data = response.data || {};
    if (data.leagues && data.leagues.rows) {
      data.leagues = data.leagues.rows;
    }
    return data;
  },

  create: async (leagueData: { 
    name: string; 
    region?: string; 
    ageGroup?: string; 
    country?: string;
    url?: string; 
    description?: string 
  }): Promise<{ message: string; league: League }> => {
    const response = await rosterApi.post('/admin/leagues', leagueData);
    return response.data;
  },

  update: async (id: number, leagueData: { 
    name: string; 
    region?: string; 
    ageGroup?: string; 
    country?: string;
    url?: string; 
    description?: string; 
    isActive?: boolean 
  }): Promise<{ message: string; league: League }> => {
    const response = await rosterApi.put(`/admin/leagues/${id}`, leagueData);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await rosterApi.delete(`/admin/leagues/${id}`);
    return response.data;
  },


};

// Calendar API
export const calendarAPI = {
  getEvents: async (startDate: Date, endDate: Date): Promise<{ events: CalendarEvent[] }> => {
    const response = await api.get('/calendar/events', {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    });
    return response.data;
  },

  createEvent: async (eventData: CreateEventData): Promise<{ message: string; event: CalendarEvent }> => {
    const response = await api.post('/calendar/events', eventData);
    return response.data;
  },

  updateEvent: async (id: number, eventData: Partial<CreateEventData>): Promise<{ message: string }> => {
    const response = await api.put(`/calendar/events/${id}`, eventData);
    return response.data;
  },

  deleteEvent: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/calendar/events/${id}`);
    return response.data;
  },

  createTrial: async (trialData: CreateTrialData): Promise<{ message: string; trial: CalendarEvent }> => {
    const response = await api.post('/calendar/trials', trialData);
    return response.data;
  },

  getTrialInvitations: async (): Promise<{ invitations: TrialInvitation[] }> => {
    const response = await api.get('/calendar/trial-invitations');
    return response.data;
  },

  respondToTrial: async (invitationId: number, response: 'accepted' | 'declined'): Promise<{ message: string }> => {
    const apiResponse = await api.put(`/calendar/trial-invitations/${invitationId}`, { status: response });
    return apiResponse.data;
  },

  sendTrialInvites: async (inviteData: TrialInviteData): Promise<{ message: string; invitesSent: number }> => {
    const response = await api.post('/calendar/send-trial-invites', inviteData);
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<{ status: string; message: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Admin management (Admin only)
export const adminAPI = {
  createAdmin: async (adminData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{ message: string; admin: User }> => {
    const response = await api.post('/admin/create-admin', adminData);
    return response.data;
  },
  
  freezeLeague: async (id: number, freeze: boolean): Promise<{ message: string; league: League }> => {
    const response = await api.patch(`/admin/leagues/${id}/freeze`, { freeze });
    return response.data;
  },
};

// Maps API - temporary implementation using existing vacancies
export const getTeamVacancies = async (): Promise<TeamVacancy[]> => {
  const response = await vacanciesAPI.getAll();
  return response.vacancies;
};

// Player availability API
export const playerAvailabilityAPI = {
  create: async (data: Omit<PlayerAvailability, 'id' | 'createdAt' | 'status' | 'postedBy'>): Promise<{ message: string; availabilityId: number }> => {
    const response = await api.post('/player-availability', data);
    return response.data;
  },

  getAll: async (filters?: {
    league?: string;
    ageGroup?: string;
    position?: string;
    location?: string;
    search?: string;
    preferredTeamGender?: string;
  }): Promise<{ availability: PlayerAvailability[] }> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const url = `/player-availability${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get(url);
    return response.data;
  }
};

export const getPlayerAvailability = async (): Promise<PlayerAvailability[]> => {
  const response = await playerAvailabilityAPI.getAll();
  return response.availability;
};

// Get team vacancies with location type filtering
export const getTeamVacanciesWithLocationType = async (params: {
  latitude?: number;
  longitude?: number;
  radius?: number;
  locationType?: 'training' | 'match';
  hasVacancies?: boolean;
}): Promise<{ trainingLocations: any[] }> => {
  try {
    const response = await axios.get(`${API_URL}/calendar/training-locations`, {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching team vacancies with location type:', error);
    return { trainingLocations: [] };
  }
};

// Email Alert API
export const emailAlertAPI = {
  // Create a new email alert
  create: async (alertData: {
    alertType: 'new_match' | 'saved_search';
    filters?: SearchFilters;
    searchRegion?: {
      name: string;
      coordinates: { lat: number; lng: number }[];
    };
  }): Promise<{ message: string; alertId: string }> => {
    const response = await api.post('/email-alerts', alertData);
    return response.data;
  },

  // Get all email alerts for the current user
  getAll: async (): Promise<{ alerts: EmailAlert[] }> => {
    const response = await api.get('/email-alerts');
    return response.data;
  },

  // Update an email alert
  update: async (alertId: string, updates: {
    isActive?: boolean;
    filters?: SearchFilters;
    searchRegion?: {
      name: string;
      coordinates: { lat: number; lng: number }[];
    };
  }): Promise<{ message: string }> => {
    const response = await api.put(`/email-alerts/${alertId}`, updates);
    return response.data;
  },

  // Delete an email alert
  delete: async (alertId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/email-alerts/${alertId}`);
    return response.data;
  },

  // Test an email alert (send test email)
  test: async (alertId: string): Promise<{ message: string }> => {
    const response = await api.post(`/email-alerts/${alertId}/test`);
    return response.data;
  }
};

// Team Roster API
export const teamRosterAPI = {
  // Get all rosters for the authenticated coach
  getAll: async (): Promise<{ rosters: TeamRoster[] }> => {
    const response = await api.get('/team-rosters');
    return response.data;
  },

  // Get a specific roster with players
  getById: async (rosterId: string): Promise<{ roster: TeamRoster }> => {
    const response = await api.get(`/team-rosters/${rosterId}`);
    return response.data;
  },

  // Create a new team roster
  create: async (rosterData: {
    teamName: string;
    clubName?: string;
    ageGroup: string;
    league: string;
  }): Promise<{ message: string; roster: TeamRoster }> => {
    const response = await api.post('/team-rosters', rosterData);
    return response.data;
  },

  // Update team roster details
  update: async (rosterId: string, updates: {
    teamName?: string;
    clubName?: string;
    ageGroup?: string;
    league?: string;
  }): Promise<{ message: string; roster: TeamRoster }> => {
    const response = await api.put(`/team-rosters/${rosterId}`, updates);
    return response.data;
  },

  // Delete a team roster
  delete: async (rosterId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/team-rosters/${rosterId}`);
    return response.data;
  },

  // Add a player to the roster
  addPlayer: async (rosterId: string, playerData: {
    playerName: string;
    bestPosition: string;
    alternativePositions: string[];
    preferredFoot: 'Left' | 'Right' | 'Both';
    age?: number;
    contactInfo?: string;
    notes?: string;
  }): Promise<{ message: string; player: TeamPlayer }> => {
    const response = await api.post(`/team-rosters/${rosterId}/players`, playerData);
    return response.data;
  },

  // Update player details
  updatePlayer: async (rosterId: string, playerId: string, updates: {
    playerName?: string;
    bestPosition?: string;
    alternativePositions?: string[];
    preferredFoot?: 'Left' | 'Right' | 'Both';
    age?: number;
    contactInfo?: string;
    notes?: string;
    isActive?: boolean;
  }): Promise<{ message: string; player: TeamPlayer }> => {
    const response = await api.put(`/team-rosters/${rosterId}/players/${playerId}`, updates);
    return response.data;
  },

  // Remove player from roster
  removePlayer: async (rosterId: string, playerId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/team-rosters/${rosterId}/players/${playerId}`);
    return response.data;
  },

  // Get position analysis for squad gaps
  getPositionAnalysis: async (rosterId: string): Promise<{ 
    gaps: PositionGap[];
    summary: {
      totalPlayers: number;
      activePositions: number;
      criticalGaps: number;
    };
  }> => {
    const response = await api.get(`/team-rosters/${rosterId}/analysis`);
    return response.data;
  },

  // Get club information - all teams and coaches from the same club
  getClubInfo: async (clubName: string): Promise<{
    clubName: string;
    totalTeams: number;
    totalCoaches: number;
    coaches: Array<{
      coachId: string;
      coachName: string;
      email: string;
      teams: Array<{
        id: string;
        teamName: string;
        ageGroup: string;
        league: string;
        playerCount: number;
        maxSquadSize?: number;
      }>;
    }>;
  }> => {
    const response = await api.get(`/club-info/${encodeURIComponent(clubName)}`);
    return response.data;
  }
};

// Playing History API
export const playingHistoryAPI = {
  // Get all playing history for a player
  getHistory: async (playerId?: string): Promise<{ history: PlayingHistory[] }> => {
    const endpoint = playerId ? `/playing-history/${playerId}` : '/playing-history';
    const historyAPI = axios.create({
      baseURL: ROSTER_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storage.getItem('token')}`
      }
    });
    const response = await historyAPI.get(endpoint);
    return response.data;
  },

  // Add new playing history entry
  create: async (historyData: Omit<PlayingHistory, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>): Promise<{ history: PlayingHistory }> => {
    const historyAPI = axios.create({
      baseURL: ROSTER_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storage.getItem('token')}`
      }
    });
    const response = await historyAPI.post('/playing-history', historyData);
    return response.data;
  },

  // Update playing history entry
  update: async (historyId: string, historyData: Partial<Omit<PlayingHistory, 'id' | 'playerId' | 'createdAt' | 'updatedAt'>>): Promise<{ history: PlayingHistory }> => {
    const historyAPI = axios.create({
      baseURL: ROSTER_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storage.getItem('token')}`
      }
    });
    const response = await historyAPI.put(`/playing-history/${historyId}`, historyData);
    return response.data;
  },

  // Delete playing history entry
  delete: async (historyId: string): Promise<{ message: string }> => {
    const historyAPI = axios.create({
      baseURL: ROSTER_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storage.getItem('token')}`
      }
    });
    const response = await historyAPI.delete(`/playing-history/${historyId}`);
    return response.data;
  },

  // Mark team as current/former
  updateCurrentStatus: async (historyId: string, isCurrentTeam: boolean): Promise<{ history: PlayingHistory }> => {
    const historyAPI = axios.create({
      baseURL: ROSTER_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storage.getItem('token')}`
      }
    });
    const response = await historyAPI.patch(`/playing-history/${historyId}/current-status`, { isCurrentTeam });
    return response.data;
  }
};

export { api, rosterApi };
export default api;




