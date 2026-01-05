export interface PlayerPerformanceStats {
  playerId: string;
  playerName: string;
  position: string;
  teamId?: string;
  season: string;
  
  // Basic Info
  age: number;
  teamName: string;
  overallRating: number;
  
  // Match Statistics
  matchesPlayed: number;
  minutesPlayed: number;
  starts: number;
  substitutions: number;
  
  // Performance Metrics
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets?: number; // For goalkeepers
  saves?: number; // For goalkeepers
  
  // Advanced Metrics
  passAccuracy: number;
  tackleSuccessRate: number;
  aerialDuelsWon: number;
  distanceCovered: number; // km per match average
  sprintSpeed: number; // km/h max
  
  // Skill Ratings (0-10)
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  physical: number;
  technical: number;
  
  // Physical Metrics
  fitnessLevel: number; // 1-100
  injuryDays: number;
  trainingAttendance: number; // percentage
  
  // Performance Trends
  formRating: number; // Recent performance rating
  improvement: number; // % improvement over time
  consistency: number; // Performance consistency rating
  
  lastUpdated: string;
}

export interface TeamPerformanceStats {
  teamId: string;
  teamName: string;
  league: string;
  season: string;
  
  // Match Results
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  
  // Goals
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  
  // League Position
  currentPosition: number;
  previousPosition?: number;
  points: number;
  
  // Performance Metrics
  homeRecord: { wins: number; draws: number; losses: number };
  awayRecord: { wins: number; draws: number; losses: number };
  recentForm: string[]; // ['W', 'L', 'D', 'W', 'W'] - last 5 matches
  
  // Advanced Analytics
  expectedGoals: number;
  expectedGoalsAgainst: number;
  possessionAverage: number;
  passAccuracy: number;
  
  // Squad Analytics
  averageAge: number;
  squadValue: number;
  topScorer: { playerId: string; name: string; goals: number };
  topAssister: { playerId: string; name: string; assists: number };
  
  lastUpdated: string;
}

export interface MatchPerformance {
  id: string;
  matchId: string;
  teamId: string;
  opponentId: string;
  opponent: string;
  date: string;
  competition: string;
  venue: 'home' | 'away';
  result: 'win' | 'draw' | 'loss';
  
  score: {
    own: number;
    opponent: number;
  };
  
  // Convenient access to scores
  teamScore: number;
  opponentScore: number;
  
  // Player specific stats
  minutesPlayed: number;
  goals: number;
  assists: number;
  rating: number;
  
  // Team Performance
  possession: number;
  passes: number;
  passAccuracy: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  
  // Player Performances
  playerPerformances: PlayerMatchPerformance[];
  
  // Match Events
  events: MatchEvent[];
}

export interface PlayerMatchPerformance {
  playerId: string;
  playerName: string;
  position: string;
  minutesPlayed: number;
  wasStarting: boolean;
  
  // Performance Rating
  rating: number; // 1-10
  
  // Statistics
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  aerialDuelsWon: number;
  foulsCommitted: number;
  foulsWon: number;
  yellowCards: number;
  redCards: number;
  
  // Goalkeeper specific (if applicable)
  saves?: number;
  goalsConceded?: number;
  
  // Physical Data
  distanceCovered: number;
  sprintsCompleted: number;
  maxSpeed: number;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' | 'own_goal';
  playerId: string;
  playerName: string;
  teamId: string;
  minute: number;
  description: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
}

export interface PerformanceTrend {
  period: string; // '2024-01' or 'Week 1' etc.
  value: number;
  change: number; // % change from previous period
  rank?: number; // ranking if applicable
}

export interface ComparisonData {
  metric: string;
  playerValue: number;
  teamAverage: number;
  leagueAverage: number;
  percentile: number; // Player's percentile in league
}

export interface AnalyticsPeriod {
  type: 'season' | 'month' | 'last_10_matches' | 'custom';
  startDate?: string;
  endDate?: string;
  label: string;
}

export interface PerformanceGoal {
  id: string;
  playerId?: string;
  teamId?: string;
  type: 'individual' | 'team';
  category: 'goals' | 'assists' | 'fitness' | 'attendance' | 'wins' | 'clean_sheets' | 'custom';
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  isActive: boolean;
  progress: number; // 0-100%
  createdAt: string;
  updatedAt: string;
}

export interface InjuryRecord {
  id: string;
  playerId: string;
  type: string;
  severity: 'minor' | 'moderate' | 'major';
  injuryDate: string;
  date: string; // Alias for injuryDate for backward compatibility
  expectedReturnDate?: string;
  actualReturnDate?: string;
  daysOut: number;
  description: string;
  treatment: string[];
  status: 'active' | 'recovered' | 'recurring';
}

export interface TrainingMetrics {
  playerId: string;
  date: string;
  type: 'training' | 'match' | 'recovery';
  duration: number; // minutes
  intensity: number; // 1-10
  
  // Physical metrics
  heartRateAvg?: number;
  heartRateMax?: number;
  distanceCovered?: number;
  sprintsCompleted?: number;
  
  // Performance metrics
  technicalScore?: number;
  tacticalScore?: number;
  physicalScore?: number;
  mentalScore?: number;
  
  notes?: string;
  coachRating?: number;
}

export interface AnalyticsReport {
  id: string;
  type: 'player' | 'team' | 'match' | 'season' | 'comparison';
  title: string;
  description: string;
  period: AnalyticsPeriod;
  generatedAt: string;
  generatedBy: string;
  
  // Report Data
  summary: Record<string, any>;
  charts: AnalyticsChart[];
  tables: AnalyticsTable[];
  insights: string[];
  recommendations: string[];
  
  // Export settings
  isPublic: boolean;
  allowExport: boolean;
  expiresAt?: string;
}

export interface AnalyticsChart {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'radar' | 'area';
  title: string;
  data: any;
  options: any;
  description?: string;
}

export interface AnalyticsTable {
  id: string;
  title: string;
  columns: string[];
  rows: any[][];
  sortable: boolean;
  exportable: boolean;
}

export interface AnalyticsFilter {
  period?: AnalyticsPeriod;
  positions?: string[];
  ageRange?: [number, number];
  teams?: string[];
  competitions?: string[];
  venues?: ('home' | 'away')[];
  minMinutesPlayed?: number;
}

export interface AnalyticsDashboard {
  id: string;
  userId: string;
  name: string;
  description: string;
  widgets: AnalyticsWidget[];
  layout: LayoutConfig;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsWidget {
  id: string;
  type: 'stat_card' | 'chart' | 'table' | 'progress' | 'comparison' | 'trend';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  dataSource: string;
  refreshInterval?: number; // minutes
}

export interface LayoutConfig {
  columns: number;
  gap: number;
  autoArrange: boolean;
}

// Additional interfaces for components
export interface TrainingSession {
  id: string;
  playerId: string;
  date: string;
  type: string;
  focus: string;
  duration: number;
  performanceScore: number;
  notes?: string;
}

export interface PlayerRating {
  id: string;
  playerId: string;
  matchId: string;
  rating: number;
  date: string;
  source: 'coach' | 'self' | 'peer';
}

export interface AnalyticsNotification {
  id: string;
  userId: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  config: Record<string, any>;
}

export interface User {
  id: string;
  role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
  name: string;
  email: string;
  teamId?: string;
}
