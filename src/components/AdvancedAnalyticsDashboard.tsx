import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  EmojiEvents,
  Timer,
  Assessment,
  Download,
  Share,
  Settings,
  Refresh,
  Add,
  Dashboard,
  SportsSoccer,
  BarChart,
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { advancedAnalyticsService } from '../services/advancedAnalytics';
import {
  PlayerPerformanceStats,
  TeamPerformanceStats,
  PerformanceTrend,
  ComparisonData,
  AnalyticsPeriod,
  PerformanceGoal,
  AnalyticsReport,
} from '../types/analytics';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface AdvancedAnalyticsDashboardProps {
  targetType?: 'player' | 'team';
  targetId?: string;
}

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  targetType = 'player',
  targetId
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
  const [teamStats, setTeamStats] = useState<TeamPerformanceStats | null>(null);
  const [performanceTrends, setPerformanceTrends] = useState<PerformanceTrend[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  
  // UI States
  const [showCreateGoalDialog, setShowCreateGoalDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMetric, setSelectedMetric] = useState('rating');

  // Load data on component mount and when filters change
  useEffect(() => {
    if (user && (targetId || user.id)) {
      loadAnalyticsData();
    }
  }, [user, targetType, targetId, selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');

      const id = targetId || user?.id;
      if (!id) return;

      if (targetType === 'player') {
        // Load player analytics
        const [stats, trends, comps, playerGoals] = await Promise.all([
          advancedAnalyticsService.getPlayerStats(id, selectedPeriod),
          advancedAnalyticsService.getPlayerTrends(id, selectedMetric, selectedPeriod),
          advancedAnalyticsService.getPlayerComparisons(id, 'team'),
          advancedAnalyticsService.getPerformanceGoals(user!.id, 'individual')
        ]);

        setPlayerStats(stats);
        setPerformanceTrends(trends);
        setComparisons(comps);
        setGoals(playerGoals);
      } else {
        // Load team analytics
        const [stats, teamGoals] = await Promise.all([
          advancedAnalyticsService.getTeamStats(id, selectedPeriod),
          advancedAnalyticsService.getPerformanceGoals(user!.id, 'team')
        ]);

        setTeamStats(stats);
        setGoals(teamGoals);
      }

      // Load reports
      const userReports = await advancedAnalyticsService.getReports(user!.id, targetType);
      setReports(userReports);

    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    setSelectedPeriod(period);
  };

  const handleCreateGoal = async (goalData: any) => {
    try {
      const newGoal = await advancedAnalyticsService.createPerformanceGoal({
        ...goalData,
        playerId: targetType === 'player' ? (targetId || user!.id) : undefined,
        teamId: targetType === 'team' ? (targetId || (user as any)?.teamId) : undefined,
        type: targetType === 'player' ? 'individual' : 'team',
        isActive: true,
        currentValue: 0
      });
      
      setGoals(prev => [...prev, newGoal]);
      setShowCreateGoalDialog(false);
    } catch (err) {
      setError('Failed to create goal');
    }
  };

  const generateChartData = (trends: PerformanceTrend[]) => {
    return {
      labels: trends.map(t => t.period),
      datasets: [
        {
          label: 'Performance',
          data: trends.map(t => t.value),
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: true,
        }
      ]
    };
  };

  const generateComparisonChart = (comparisons: ComparisonData[]) => {
    return {
      labels: comparisons.map(c => c.metric),
      datasets: [
        {
          label: 'Your Performance',
          data: comparisons.map(c => c.playerValue),
          backgroundColor: '#1976d2',
        },
        {
          label: 'Team Average',
          data: comparisons.map(c => c.teamAverage),
          backgroundColor: '#dc004e',
        },
        {
          label: 'League Average',
          data: comparisons.map(c => c.leagueAverage),
          backgroundColor: '#757575',
        }
      ]
    };
  };

  const renderPerformanceCards = () => {
    if (!playerStats && !teamStats) return null;

    return (
      <Grid container spacing={3}>
        {/* Key Performance Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {playerStats ? playerStats.goals : teamStats?.goalsFor || 0}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Goals {playerStats ? 'Scored' : 'For'}
                  </Typography>
                </Box>
                <SportsSoccer color="primary" sx={{ fontSize: 40 }} />
              </Box>
              {playerStats && (
                <Box mt={2}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(playerStats.goals * 10, 100)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main" gutterBottom>
                    {playerStats ? playerStats.assists : teamStats?.wins || 0}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {playerStats ? 'Assists' : 'Wins'}
                  </Typography>
                </Box>
                <EmojiEvents color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main" gutterBottom>
                    {playerStats ? `${playerStats.formRating.toFixed(1)}` : `${teamStats?.winRate.toFixed(0) || 0}%`}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {playerStats ? 'Form Rating' : 'Win Rate'}
                  </Typography>
                </Box>
                <TrendingUp color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main" gutterBottom>
                    {playerStats ? playerStats.minutesPlayed : teamStats?.matchesPlayed || 0}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {playerStats ? 'Minutes Played' : 'Matches Played'}
                  </Typography>
                </Box>
                <Timer color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderPerformanceTrends = () => {
    if (performanceTrends.length === 0) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Performance Trends</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Metric</InputLabel>
            <Select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              label="Metric"
            >
              <MenuItem value="rating">Rating</MenuItem>
              <MenuItem value="goals">Goals</MenuItem>
              <MenuItem value="assists">Assists</MenuItem>
              <MenuItem value="fitness">Fitness</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box height={400}>
          <Line data={generateChartData(performanceTrends)} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true },
              title: { display: false }
            },
            scales: {
              y: { beginAtZero: true }
            }
          }} />
        </Box>
      </Paper>
    );
  };

  const renderComparisons = () => {
    if (comparisons.length === 0) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Performance Comparison</Typography>
        <Box height={400}>
          <Bar data={generateComparisonChart(comparisons)} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true },
            },
            scales: {
              y: { beginAtZero: true }
            }
          }} />
        </Box>
      </Paper>
    );
  };

  const renderGoals = () => {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Performance Goals</Typography>
          <Button
            startIcon={<Add />}
            variant="outlined"
            onClick={() => setShowCreateGoalDialog(true)}
          >
            Add Goal
          </Button>
        </Box>
        
        {goals.length === 0 ? (
          <Alert severity="info">No performance goals set. Create one to start tracking your progress!</Alert>
        ) : (
          <Grid container spacing={2}>
            {goals.map((goal) => (
              <Grid item xs={12} md={6} lg={4} key={goal.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <EmojiEvents color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {goal.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {goal.description}
                    </Typography>
                    <Box mt={2}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">
                          {goal.currentValue} / {goal.targetValue} {goal.unit}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {goal.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={goal.progress}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Chip
                      size="small"
                      label={goal.isActive ? 'Active' : 'Completed'}
                      color={goal.isActive ? 'primary' : 'success'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    );
  };

  const renderReports = () => {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Analytics Reports</Typography>
          <Button
            startIcon={<Assessment />}
            variant="outlined"
            onClick={() => setShowReportDialog(true)}
          >
            Generate Report
          </Button>
        </Box>
        
        {reports.length === 0 ? (
          <Alert severity="info">No reports generated yet. Create a report to get detailed insights!</Alert>
        ) : (
          <List>
            {reports.map((report) => (
              <ListItem key={report.id} divider>
                <ListItemIcon>
                  <Assessment />
                </ListItemIcon>
                <ListItemText
                  primary={report.title}
                  secondary={`Generated ${new Date(report.generatedAt).toLocaleDateString()}`}
                />
                <Button
                  startIcon={<Download />}
                  size="small"
                  onClick={() => advancedAnalyticsService.exportReport(report.id, 'pdf')}
                >
                  Download
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
          Advanced Analytics
        </Typography>
        <Box>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Settings />
          </IconButton>
          <IconButton onClick={loadAnalyticsData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Period Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="subtitle1" fontWeight="bold">Period:</Typography>
          {[
            { type: 'season', label: 'Current Season' },
            { type: 'month', label: 'This Month' },
            { type: 'last_10_matches', label: 'Last 10 Matches' }
          ].map((period) => (
            <Chip
              key={period.type}
              label={period.label}
              onClick={() => handlePeriodChange(period as AnalyticsPeriod)}
              color={selectedPeriod.type === period.type ? 'primary' : 'default'}
              variant={selectedPeriod.type === period.type ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Overview" icon={<Dashboard />} />
          <Tab label="Performance" icon={<TrendingUp />} />
          <Tab label="Comparisons" icon={<BarChart />} />
          <Tab label="Goals" icon={<EmojiEvents />} />
          <Tab label="Reports" icon={<Assessment />} />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <Typography>Loading analytics data...</Typography>
        </Box>
      ) : (
        <>
          {activeTab === 0 && (
            <Box>
              {renderPerformanceCards()}
              <Box mt={3}>
                {renderPerformanceTrends()}
              </Box>
            </Box>
          )}
          {activeTab === 1 && renderPerformanceTrends()}
          {activeTab === 2 && renderComparisons()}
          {activeTab === 3 && renderGoals()}
          {activeTab === 4 && renderReports()}
        </>
      )}

      {/* Dialogs */}
      <CreateGoalDialog
        open={showCreateGoalDialog}
        onClose={() => setShowCreateGoalDialog(false)}
        onSave={handleCreateGoal}
        type={targetType}
      />

      <GenerateReportDialog
        open={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        targetType={targetType}
        targetId={targetId || user?.id || ''}
      />

      {/* Settings Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { /* TODO: Implement settings functionality */ }}>
          <Settings sx={{ mr: 1 }} /> Settings
        </MenuItem>
        <MenuItem onClick={() => {}}>
          <Share sx={{ mr: 1 }} /> Share Dashboard
        </MenuItem>
        <MenuItem onClick={() => {}}>
          <Download sx={{ mr: 1 }} /> Export Data
        </MenuItem>
      </Menu>
    </Box>
  );
};

// Helper Components
interface GoalData {
  title: string;
  description: string;
  category: string;
  targetValue: number;
  unit: string;
  deadline: string;
}

interface CreateGoalDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (goalData: GoalData) => void;
  type: 'player' | 'team';
}

const CreateGoalDialog = ({ open, onClose, onSave, type }: CreateGoalDialogProps) => {
  const [goalData, setGoalData] = useState({
    title: '',
    description: '',
    category: 'goals',
    targetValue: 0,
    unit: 'goals',
    deadline: ''
  });

  const handleSave = () => {
    onSave(goalData);
    setGoalData({
      title: '',
      description: '',
      category: 'goals',
      targetValue: 0,
      unit: 'goals',
      deadline: ''
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Performance Goal</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Goal Title"
              value={goalData.title}
              onChange={(e) => setGoalData(prev => ({ ...prev, title: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={goalData.description}
              onChange={(e) => setGoalData(prev => ({ ...prev, description: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={goalData.category}
                onChange={(e) => setGoalData(prev => ({ ...prev, category: e.target.value }))}
                label="Category"
              >
                <MenuItem value="goals">Goals</MenuItem>
                <MenuItem value="assists">Assists</MenuItem>
                <MenuItem value="fitness">Fitness</MenuItem>
                <MenuItem value="attendance">Attendance</MenuItem>
                {type === 'team' && <MenuItem value="wins">Wins</MenuItem>}
                {type === 'team' && <MenuItem value="clean_sheets">Clean Sheets</MenuItem>}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Target Value"
              value={goalData.targetValue}
              onChange={(e) => setGoalData(prev => ({ ...prev, targetValue: parseInt(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Unit"
              value={goalData.unit}
              onChange={(e) => setGoalData(prev => ({ ...prev, unit: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="Deadline"
              value={goalData.deadline}
              onChange={(e) => setGoalData(prev => ({ ...prev, deadline: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Create Goal</Button>
      </DialogActions>
    </Dialog>
  );
};

interface GenerateReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetType: 'player' | 'team';
  targetId: string;
}

const GenerateReportDialog: React.FC<GenerateReportDialogProps> = ({ open, onClose, targetType, targetId }) => {
  const [reportConfig, setReportConfig] = useState({
    type: targetType,
    period: { type: 'season', label: 'Current Season' } as AnalyticsPeriod,
    includeCharts: true,
    includeTables: true,
    customMetrics: [] as string[]
  });

  const handleGenerate = async () => {
    try {
      await advancedAnalyticsService.generateReport({
        ...reportConfig,
        targetId
      });
      onClose();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Analytics Report</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportConfig.type}
                onChange={(e) => setReportConfig(prev => ({ ...prev, type: e.target.value as any }))}
                label="Report Type"
              >
                <MenuItem value="player">Player Performance</MenuItem>
                <MenuItem value="team">Team Analysis</MenuItem>
                <MenuItem value="comparison">Comparison Report</MenuItem>
                <MenuItem value="season">Season Summary</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={reportConfig.includeCharts}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
                />
              }
              label="Include Charts"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={reportConfig.includeTables}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, includeTables: e.target.checked }))}
                />
              }
              label="Include Data Tables"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleGenerate} variant="contained">Generate Report</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedAnalyticsDashboard;
