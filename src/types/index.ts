export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
  betaAccess?: boolean;
  isVerified?: boolean;
  createdAt: string;
}

// About page content types
export * from './about';

export interface League {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
}

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

export interface TeamVacancy {
  id: string;
  title: string;
  description: string;
  league: string;
  ageGroup: string;
  position: string;
  teamGender?: string; // Boys, Girls, or Mixed
  location: string;
  locationData?: Location;
  contactInfo: string;
  postedBy: string;
  firstName?: string;
  lastName?: string;
  hasMatchRecording?: boolean;
  hasPathwayToSenior?: boolean;
  createdAt: string;
  status: 'active' | 'filled' | 'expired';
}

export interface PlayerAvailability {
  id: string;
  title: string;
  description: string;
  preferredLeagues: string[];
  ageGroup: string;
  positions: string[];
  preferredTeamGender?: string; // Boys, Girls, or Mixed
  location: string;
  locationData?: Location;
  contactInfo: string;
  postedBy: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface SearchFilters {
  league?: string;
  ageGroup?: string;
  position?: string;
  location?: string;
  radius?: number; // in kilometers
  center?: { lat: number; lng: number };
}

export interface MapSearchResult {
  item: TeamVacancy | PlayerAvailability;
  distance?: number;
  type: 'vacancy' | 'availability';
}

export interface Team {
  id: string;
  name: string;
  description: string;
  league: string;
  ageGroup: string;
  homePitch?: Location;
  trainingLocation?: Location;
  contactInfo: string;
  coachId: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  userId: string;
  filters: SearchFilters;
  type: 'vacancy' | 'availability' | 'both';
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
  searchRegion?: {
    name: string;
    coordinates: { lat: number; lng: number }[];
  };
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
}

export interface TeamPlayer {
  id: string;
  teamId: string;
  playerName: string;
  bestPosition: string;
  alternativePositions: string[];
  preferredFoot: 'Left' | 'Right' | 'Both';
  age?: number;
  contactInfo?: string;
  notes?: string;
  isActive: boolean;
  addedAt: string;
  updatedAt: string;
}

export interface TeamRoster {
  id: string;
  coachId: string;
  teamName: string;
  clubName?: string;
  ageGroup: string;
  league: string;
  maxSquadSize?: number;
  players: TeamPlayer[];
  createdAt: string;
  updatedAt: string;
}

export interface PositionGap {
  position: string;
  currentCount: number;
  idealCount: number;
  gap: number;
  priority: 'low' | 'medium' | 'high';
}

export interface PlayingHistory {
  id: string;
  playerId: string;
  teamName: string;
  league: string;
  ageGroup: string;
  position: string;
  season: string;
  startDate: string;
  endDate?: string;
  isCurrentTeam: boolean;
  achievements?: string;
  matchesPlayed?: number;
  goalsScored?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchCompletion {
  id: string;
  vacancyId?: string;
  availabilityId?: string;
  childAvailabilityId?: string;
  coachId: string;
  playerId?: string;
  parentId?: string;
  matchType: 'player_to_team' | 'child_to_team';
  playerName: string;
  teamName: string;
  position: string;
  ageGroup: string;
  league: string;
  startDate?: string;
  completionStatus: 'pending' | 'confirmed' | 'declined';
  coachConfirmed: boolean;
  playerConfirmed: boolean;
  parentConfirmed: boolean;
  successStory?: string;
  rating?: number;
  feedback?: string;
  publicStory: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuccessStory {
  playerName: string;
  teamName: string;
  position: string;
  ageGroup: string;
  league: string;
  successStory: string;
  rating?: number;
  createdAt: string;
  completedAt: string;
}

export interface MatchCompletionFormData {
  vacancyId?: string;
  availabilityId?: string;
  childAvailabilityId?: string;
  matchType: 'player_to_team' | 'child_to_team';
  playerName: string;
  teamName: string;
  position: string;
  ageGroup: string;
  league: string;
  startDate?: string;
  playerId?: string;
  parentId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  message: string;
  messageType: 'general' | 'vacancy_interest' | 'player_inquiry' | 'training_invitation' | 'match_update' | 'system';
  relatedVacancyId?: string;
  relatedPlayerAvailabilityId?: string;
  relatedMatchId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  senderName?: string;
  recipientName?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: ConversationParticipant[];
  latestMessage: Message;
  unreadCount: number;
  relatedVacancyId?: string;
  relatedPlayerAvailabilityId?: string;
  matchProgressStage: MatchProgressStage;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  userId: string;
  firstName: string;
  lastName: string;
  role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
  lastReadAt?: string;
}

export type MatchProgressStage = 
  | 'initial_interest'
  | 'dialogue_active'
  | 'trial_invited' 
  | 'trial_scheduled'
  | 'trial_completed'
  | 'decision_pending'
  | 'match_confirmed'
  | 'match_declined'
  | 'completed';

export interface MatchProgress {
  id: string;
  conversationId: string;
  stage: MatchProgressStage;
  playerName: string;
  teamName: string;
  position?: string;
  ageGroup?: string;
  trialDate?: string;
  lastActivity: string;
  nextAction?: string;
  assignedTo?: 'coach' | 'player' | 'parent';
  createdAt: string;
  updatedAt: string;
}

export interface ForumPost {
  id: string;
  user_id: string;
  user_role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
  author_name: string;
  author_email?: string;
  title: string;
  content: string;
  category: 'General Discussions' | 'Website Discussions' | 'Grassroots Discussions';
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  replyCount?: number;
}

export interface ForumReply {
  id: string;
  post_id: string;
  parent_reply_id: string | null;
  parent_author_name: string | null;
  user_id: string;
  user_role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}
