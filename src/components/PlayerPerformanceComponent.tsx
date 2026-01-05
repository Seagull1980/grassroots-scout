import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Person,
  SportsSoccer,
  Timer,
  FitnessCenter,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  EmojiEvents,
  HealthAndSafety,
  ExpandMore,
  Visibility,
  Warning,
  CheckCircle,
  Star,
  StarBorder,
} from '@mui/icons-material';
import { Line, Radar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { advancedAnalyticsService } from '../services/advancedAnalytics';
import {
  PlayerPerformanceStats,
  MatchPerformance,
  InjuryRecord,
  PerformanceTrend,
  ComparisonData,
  AnalyticsPeriod,
} from '../types/analytics';

interface PlayerPerformanceProps {
  playerId?: string;
  showComparisons?: boolean;
  embedded?: boolean;
}

const PlayerPerformanceComponent: React.FC<PlayerPerformanceProps> = ({
  playerId,
  showComparisons = true,
  embedded = false
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>({
    type: 'season',
    label: 'Current Season'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data States
  const [playerStats, setPlayerStats] = useState<PlayerPerformanceStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchPerformance[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<any[]>([]);
  const [injuries, setInjuries] = useState<InjuryRecord[]>([]);
  const [performanceTrends, setPerformanceTrends] = useState<PerformanceTrend[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);

  const targetPlayerId = playerId || user?.id;

  useEffect(() => {
    if (targetPlayerId) {
      loadPlayerData();
    }
  }, [targetPlayerId, selectedPeriod]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        stats,
        matches,
        training,
        injuryRecords,
        trends,
        comps
      ] = await Promise.all([
        advancedAnalyticsService.getPlayerStats(targetPlayerId!, selectedPeriod),
        advancedAnalyticsService.getPlayerMatches(targetPlayerId!, selectedPeriod),
        advancedAnalyticsService.getPlayerTrainingSessions(targetPlayerId!, selectedPeriod),
        advancedAnalyticsService.getPlayerInjuries(targetPlayerId!),
        advancedAnalyticsService.getPlayerTrends(targetPlayerId!, 'rating', selectedPeriod),
        showComparisons ? advancedAnalyticsService.getPlayerComparisons(targetPlayerId!, 'team') : []
      ]);

      setPlayerStats(stats);
      setRecentMatches(matches);
      setTrainingSessions(training);
      setInjuries(injuryRecords);
      setPerformanceTrends(trends);
      setComparisons(comps);

    } catch (err) {
      setError('Failed to load player performance data');
      console.error('Player performance loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const renderPlayerHeader = () => {
    if (!playerStats) return null;

    return (
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', color: 'white' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
              <Person sx={{ fontSize: 48 }} />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {playerStats.playerName}
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip label={playerStats.position} color="secondary" />
              <Chip label={`Age: ${(playerStats as any).age || 22}`} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }} />
              <Chip label={`Team: ${(playerStats as any).teamName || 'Team Name'}`} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }} />
            </Box>
          </Grid>
          <Grid item>
            <Box textAlign="center">
              <Typography variant="h3" fontWeight="bold">
                {((playerStats as any).overallRating || playerStats.formRating || 7.5).toFixed(1)}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Overall Rating
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderKeyMetrics = () => {
    if (!playerStats) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SportsSoccer color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary" fontWeight="bold">
                {playerStats.goals}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Goals Scored
              </Typography>
              <Box mt={1}>
                <Chip
                  size="small"
                  label={`${(playerStats.goals / Math.max(playerStats.matchesPlayed, 1)).toFixed(2)} per match`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <EmojiEvents color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {playerStats.assists}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Assists
              </Typography>
              <Box mt={1}>
                <Chip
                  size="small"
                  label={`${(playerStats.assists / Math.max(playerStats.matchesPlayed, 1)).toFixed(2)} per match`}
                  color="success"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Timer color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {playerStats.minutesPlayed}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Minutes Played
              </Typography>
              <Box mt={1}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((playerStats.minutesPlayed / (playerStats.matchesPlayed * 90)) * 100, 100)}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {playerStats.formRating.toFixed(1)}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Current Form
              </Typography>
              <Box mt={1}>
                <Box display="flex" justifyContent="center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    star <= Math.round(playerStats.formRating) ? 
                    <Star key={star} color="warning" /> : 
                    <StarBorder key={star} color="disabled" />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderPerformanceChart = () => {
    if (performanceTrends.length === 0) return null;

    const chartData = {
      labels: performanceTrends.map(t => t.period),
      datasets: [
        {
          label: 'Rating',
          data: performanceTrends.map(t => t.value),
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Performance Trend</Typography>
        <Box height={300}>
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: { min: 0, max: 10 }
              }
            }}
          />
        </Box>
      </Paper>
    );
  };

  const renderRecentMatches = () => {
    return (
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Match</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>Minutes</TableCell>
              <TableCell>Goals</TableCell>
              <TableCell>Assists</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentMatches.map((match, index) => (
              <TableRow key={match.id || index}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">
                      {match.opponent || `Opponent ${index + 1}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(match.date).toLocaleDateString()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${match.teamScore || match.score?.own || 0}-${match.opponentScore || match.score?.opponent || 0}`}
                    color={(match.teamScore || match.score?.own || 0) > (match.opponentScore || match.score?.opponent || 0) ? 'success' : 
                           (match.teamScore || match.score?.own || 0) < (match.opponentScore || match.score?.opponent || 0) ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{match.minutesPlayed || 90}'</TableCell>
                <TableCell>
                  <Badge badgeContent={match.goals || 0} color="primary">
                    <SportsSoccer />
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge badgeContent={match.assists || 0} color="secondary">
                    <EmojiEvents />
                  </Badge>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Typography fontWeight="bold" mr={1}>
                      {(match.rating || 7.0).toFixed(1)}
                    </Typography>
                    {(match.rating || 7.0) >= 7.5 ? <TrendingUp color="success" /> :
                     (match.rating || 7.0) >= 6.5 ? <TrendingFlat color="warning" /> :
                     <TrendingDown color="error" />}
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title="View Match Details">
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderSkillRadar = () => {
    if (!playerStats) return null;

    const radarData = {
      labels: ['Pace', 'Shooting', 'Passing', 'Defending', 'Physical', 'Technical'],
      datasets: [
        {
          label: 'Player Skills',
          data: [
            (playerStats as any).pace || Math.random() * 10,
            (playerStats as any).shooting || Math.random() * 10,
            (playerStats as any).passing || Math.random() * 10,
            (playerStats as any).defending || Math.random() * 10,
            (playerStats as any).physical || Math.random() * 10,
            (playerStats as any).technical || Math.random() * 10,
          ],
          backgroundColor: 'rgba(25, 118, 210, 0.2)',
          borderColor: '#1976d2',
          pointBackgroundColor: '#1976d2',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#1976d2'
        }
      ]
    };

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Skill Analysis</Typography>
        <Box height={400} display="flex" justifyContent="center">
          <Radar
            data={radarData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                r: {
                  angleLines: { display: true },
                  suggestedMin: 0,
                  suggestedMax: 10
                }
              }
            }}
          />
        </Box>
      </Paper>
    );
  };

  const renderTrainingProgress = () => {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Recent Training Sessions</Typography>
        <List>
          {trainingSessions.slice(0, 5).map((session) => (
            <ListItem key={session.id} divider>
              <ListItemIcon>
                <FitnessCenter color={session.performanceScore >= 8 ? 'success' : 
                                   session.performanceScore >= 6 ? 'warning' : 'error'} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">
                      {session.type} - {session.focus}
                    </Typography>
                    <Chip
                      label={`${session.performanceScore.toFixed(1)}/10`}
                      color={session.performanceScore >= 8 ? 'success' : 
                             session.performanceScore >= 6 ? 'warning' : 'error'}
                      size="small"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(session.date).toLocaleDateString()} • {session.duration} minutes
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={session.performanceScore * 10}
                      sx={{ mt: 1, height: 4, borderRadius: 2 }}
                      color={session.performanceScore >= 8 ? 'success' : 
                             session.performanceScore >= 6 ? 'warning' : 'error'}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  };

  const renderHealthStatus = () => {
    const activeInjuries = injuries.filter(injury => injury.status === 'active');
    const recentInjuries = injuries.filter(injury => 
      new Date(injury.date || injury.injuryDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Health & Fitness Status</Typography>
          <Chip
            icon={activeInjuries.length > 0 ? <Warning /> : <CheckCircle />}
            label={activeInjuries.length > 0 ? 'Injured' : 'Healthy'}
            color={activeInjuries.length > 0 ? 'error' : 'success'}
          />
        </Box>

        {activeInjuries.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">Active Injuries</Typography>
            {activeInjuries.map(injury => (
              <Typography key={injury.id} variant="body2">
                {injury.type} - {injury.description}
              </Typography>
            ))}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary" fontWeight="bold">
                {playerStats?.fitnessLevel || 0}%
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Fitness Level
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {injuries.length}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Total Injuries
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {recentInjuries.length > 0 && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Recent Injury History</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {recentInjuries.map(injury => (
                  <ListItem key={injury.id}>
                    <ListItemIcon>
                      <HealthAndSafety color={injury.severity === 'major' ? 'error' : 
                                             injury.severity === 'moderate' ? 'warning' : 'info'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={injury.type}
                      secondary={`${new Date(injury.date || injury.injuryDate).toLocaleDateString()} - ${injury.severity}`}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading player performance data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!playerStats) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No performance data available for this player.
      </Alert>
    );
  }

  return (
    <Box>
      {!embedded && renderPlayerHeader()}
      
      {/* Period Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="subtitle1" fontWeight="bold">Period:</Typography>
          {[
            { type: 'season', label: 'Season' },
            { type: 'month', label: 'This Month' },
            { type: 'last_10_matches', label: 'Last 10 Matches' }
          ].map((period) => (
            <Chip
              key={period.type}
              label={period.label}
              onClick={() => setSelectedPeriod(period as AnalyticsPeriod)}
              color={selectedPeriod.type === period.type ? 'primary' : 'default'}
              variant={selectedPeriod.type === period.type ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Paper>

      {/* Key Metrics */}
      {renderKeyMetrics()}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Overview" />
          <Tab label="Match History" />
          <Tab label="Skills Analysis" />
          <Tab label="Training" />
          <Tab label="Health" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {renderPerformanceChart()}
          {showComparisons && comparisons.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Performance Comparison</Typography>
              {/* Add comparison chart here */}
            </Paper>
          )}
        </Box>
      )}
      {activeTab === 1 && renderRecentMatches()}
      {activeTab === 2 && renderSkillRadar()}
      {activeTab === 3 && renderTrainingProgress()}
      {activeTab === 4 && renderHealthStatus()}
    </Box>
  );
};

export default PlayerPerformanceComponent;
