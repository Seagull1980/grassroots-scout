import {
  PlayerPerformanceStats,
  TeamPerformanceStats,
  MatchPerformance,
  PerformanceTrend,
  ComparisonData,
  AnalyticsPeriod,
  PerformanceGoal,
  InjuryRecord,
  TrainingMetrics,
  AnalyticsReport,
  AnalyticsFilter,
  AnalyticsDashboard,
  PlayerMatchPerformance,
} from '../types/analytics';

export class AdvancedAnalyticsService {
  private apiBase = '/api/analytics';

  // Player Performance Analytics
  async getPlayerStats(playerId: string, period?: AnalyticsPeriod): Promise<PlayerPerformanceStats> {
    const response = await fetch(`${this.apiBase}/players/${playerId}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    return response.json();
  }

  async getPlayerTrends(playerId: string, metric: string, period: AnalyticsPeriod): Promise<PerformanceTrend[]> {
    const response = await fetch(`${this.apiBase}/players/${playerId}/trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric, period }),
    });
    return response.json();
  }

  async getPlayerComparisons(playerId: string, compareWith: 'team' | 'league' | 'position'): Promise<ComparisonData[]> {
    const response = await fetch(`${this.apiBase}/players/${playerId}/compare/${compareWith}`);
    return response.json();
  }

  async getPlayerMatchHistory(playerId: string, limit = 10): Promise<PlayerMatchPerformance[]> {
    const response = await fetch(`${this.apiBase}/players/${playerId}/matches?limit=${limit}`);
    return response.json();
  }

  // Team Performance Analytics
  async getTeamStats(teamId: string, period?: AnalyticsPeriod): Promise<TeamPerformanceStats> {
    const response = await fetch(`${this.apiBase}/teams/${teamId}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    return response.json();
  }

  async getTeamMatchHistory(teamId: string, limit = 10): Promise<MatchPerformance[]> {
    const response = await fetch(`${this.apiBase}/teams/${teamId}/matches?limit=${limit}`);
    return response.json();
  }

  async getTeamPlayerRankings(teamId: string, metric: string): Promise<PlayerPerformanceStats[]> {
    const response = await fetch(`${this.apiBase}/teams/${teamId}/rankings?metric=${metric}`);
    return response.json();
  }

  async getLeagueTable(league: string, season: string): Promise<TeamPerformanceStats[]> {
    const response = await fetch(`${this.apiBase}/leagues/${league}/table?season=${season}`);
    return response.json();
  }

  // Advanced Analytics
  async getPerformancePredictions(playerId: string, matches: number = 5): Promise<{
    predictedRating: number;
    confidence: number;
    factors: string[];
  }> {
    const response = await fetch(`${this.apiBase}/predictions/player/${playerId}?matches=${matches}`);
    return response.json();
  }

  async getFormAnalysis(playerId: string): Promise<{
    currentForm: number;
    trend: 'improving' | 'declining' | 'stable';
    keyFactors: string[];
    recommendation: string;
  }> {
    const response = await fetch(`${this.apiBase}/analysis/form/player/${playerId}`);
    return response.json();
  }

  async getInjuryRiskAssessment(playerId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
    probability: number;
  }> {
    const response = await fetch(`${this.apiBase}/analysis/injury-risk/${playerId}`);
    return response.json();
  }

  // Goals and Tracking
  async getPerformanceGoals(userId: string, type?: 'individual' | 'team'): Promise<PerformanceGoal[]> {
    const url = type ? `${this.apiBase}/goals?userId=${userId}&type=${type}` : `${this.apiBase}/goals?userId=${userId}`;
    const response = await fetch(url);
    return response.json();
  }

  async createPerformanceGoal(goal: Omit<PerformanceGoal, 'id' | 'progress' | 'createdAt' | 'updatedAt'>): Promise<PerformanceGoal> {
    const response = await fetch(`${this.apiBase}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    return response.json();
  }

  async updatePerformanceGoal(goalId: string, updates: Partial<PerformanceGoal>): Promise<PerformanceGoal> {
    const response = await fetch(`${this.apiBase}/goals/${goalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  // Injury and Health Tracking
  async getInjuryHistory(playerId: string): Promise<InjuryRecord[]> {
    const response = await fetch(`${this.apiBase}/injuries/player/${playerId}`);
    return response.json();
  }

  async logInjury(injury: Omit<InjuryRecord, 'id'>): Promise<InjuryRecord> {
    const response = await fetch(`${this.apiBase}/injuries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(injury),
    });
    return response.json();
  }

  async updateInjuryStatus(injuryId: string, status: 'active' | 'recovered' | 'recurring', actualReturnDate?: string): Promise<InjuryRecord> {
    const response = await fetch(`${this.apiBase}/injuries/${injuryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, actualReturnDate }),
    });
    return response.json();
  }

  // Training Analytics
  async getTrainingMetrics(playerId: string, period?: AnalyticsPeriod): Promise<TrainingMetrics[]> {
    const response = await fetch(`${this.apiBase}/training/player/${playerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    return response.json();
  }

  async logTrainingSession(training: Omit<TrainingMetrics, 'id'>): Promise<TrainingMetrics> {
    const response = await fetch(`${this.apiBase}/training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(training),
    });
    return response.json();
  }

  // Reports and Exports
  async generateReport(config: {
    type: 'player' | 'team' | 'match' | 'season' | 'comparison';
    targetId: string;
    period: AnalyticsPeriod;
    includeCharts: boolean;
    includeTables: boolean;
    customMetrics?: string[];
  }): Promise<AnalyticsReport> {
    const response = await fetch(`${this.apiBase}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  }

  async getReports(userId: string, type?: string): Promise<AnalyticsReport[]> {
    const url = type ? `${this.apiBase}/reports?userId=${userId}&type=${type}` : `${this.apiBase}/reports?userId=${userId}`;
    const response = await fetch(url);
    return response.json();
  }

  async exportReport(reportId: string, format: 'pdf' | 'excel' | 'csv'): Promise<Blob> {
    const response = await fetch(`${this.apiBase}/reports/${reportId}/export?format=${format}`);
    return response.blob();
  }

  // Dashboard Management
  async getDashboards(userId: string): Promise<AnalyticsDashboard[]> {
    const response = await fetch(`${this.apiBase}/dashboards?userId=${userId}`);
    return response.json();
  }

  async createDashboard(dashboard: Omit<AnalyticsDashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnalyticsDashboard> {
    const response = await fetch(`${this.apiBase}/dashboards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dashboard),
    });
    return response.json();
  }

  async updateDashboard(dashboardId: string, updates: Partial<AnalyticsDashboard>): Promise<AnalyticsDashboard> {
    const response = await fetch(`${this.apiBase}/dashboards/${dashboardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  // Data Filtering and Search
  async searchPlayers(query: string, filters?: AnalyticsFilter): Promise<PlayerPerformanceStats[]> {
    const response = await fetch(`${this.apiBase}/search/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, filters }),
    });
    return response.json();
  }

  async getTopPerformers(metric: string, period: AnalyticsPeriod, limit = 10): Promise<PlayerPerformanceStats[]> {
    const response = await fetch(`${this.apiBase}/leaderboards/${metric}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, limit }),
    });
    return response.json();
  }

  // Machine Learning Insights
  async getPersonalizedInsights(userId: string): Promise<{
    insights: string[];
    recommendations: string[];
    trends: { metric: string; trend: 'up' | 'down' | 'stable'; significance: number }[];
  }> {
    const response = await fetch(`${this.apiBase}/insights/personalized/${userId}`);
    return response.json();
  }

  async getTeamInsights(teamId: string): Promise<{
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  }> {
    const response = await fetch(`${this.apiBase}/insights/team/${teamId}`);
    return response.json();
  }

  // Real-time Analytics
  async subscribeToLiveStats(matchId: string, callback: (data: any) => void): Promise<() => void> {
    const eventSource = new EventSource(`${this.apiBase}/live/match/${matchId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return () => {
      eventSource.close();
    };
  }

  // Utility Methods
  async calculateAge(birthDate: string): Promise<number> {
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    
    return age;
  }

  formatPerformanceRating(rating: number): string {
    if (rating >= 9) return 'Exceptional';
    if (rating >= 8) return 'Excellent';
    if (rating >= 7) return 'Good';
    if (rating >= 6) return 'Average';
    if (rating >= 5) return 'Below Average';
    return 'Poor';
  }

  calculatePercentileRank(value: number, dataset: number[]): number {
    const sorted = dataset.sort((a, b) => a - b);
    const rank = sorted.filter(v => v <= value).length;
    return Math.round((rank / sorted.length) * 100);
  }

  getFormTrend(recentRatings: number[]): 'improving' | 'declining' | 'stable' {
    if (recentRatings.length < 3) return 'stable';
    
    const firstHalf = recentRatings.slice(0, Math.floor(recentRatings.length / 2));
    const secondHalf = recentRatings.slice(Math.floor(recentRatings.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, rating) => sum + rating, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, rating) => sum + rating, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 0.3) return 'improving';
    if (diff < -0.3) return 'declining';
    return 'stable';
  }

  // Additional missing methods
  async getPlayerMatches(playerId: string, period?: AnalyticsPeriod): Promise<MatchPerformance[]> {
    const response = await fetch(`${this.apiBase}/players/${playerId}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    return response.json();
  }

  async getPlayerTrainingSessions(playerId: string, period?: AnalyticsPeriod): Promise<any[]> {
    const response = await fetch(`${this.apiBase}/players/${playerId}/training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    return response.json();
  }

  async getPlayerInjuries(playerId: string): Promise<InjuryRecord[]> {
    const response = await fetch(`${this.apiBase}/players/${playerId}/injuries`);
    return response.json();
  }

  async getPlayerRatings(playerId: string, period?: AnalyticsPeriod): Promise<any[]> {
    const response = await fetch(`${this.apiBase}/players/${playerId}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    return response.json();
  }

  async getDashboard(userId: string): Promise<AnalyticsDashboard | null> {
    const response = await fetch(`${this.apiBase}/dashboard/${userId}`);
    if (response.status === 404) return null;
    return response.json();
  }

  async getNotifications(userId: string): Promise<any[]> {
    const response = await fetch(`${this.apiBase}/notifications/${userId}`);
    return response.json();
  }

  async exportData(userId: string, format: 'csv' | 'pdf'): Promise<Blob> {
    const response = await fetch(`${this.apiBase}/export/${userId}?format=${format}`);
    return response.blob();
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
