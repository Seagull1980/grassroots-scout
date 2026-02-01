import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha
} from '@mui/material';
import {
  Insights,
  TrendingUp,
  Psychology,
  AutoGraph,
  Timeline,
  PieChart,
  Download,
  Lightbulb,
  Warning,
  CheckCircle,
  Info,
  Refresh
} from '@mui/icons-material';
import { API_URL, ngrokHeaders } from '../services/api';
import { Bar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';

interface InsightData {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  data?: any;
  actionable: boolean;
  timestamp: number;
}

interface FunnelStep {
  name: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

interface CohortData {
  cohort: string;
  size: number;
  retention: number[];
}

interface UserSegment {
  name: string;
  size: number;
  characteristics: string[];
  conversionRate: number;
  avgSessionDuration: number;
  topPages: string[];
}

const AdvancedAnalyticsInsights: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [userSegments, setUserSegments] = useState<UserSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<InsightData | null>(null);
  const [showInsightDetails, setShowInsightDetails] = useState(false);
  const [dateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  });
  const [analysisType, setAnalysisType] = useState('comprehensive');
  const [autoRefresh, setAutoRefresh] = useState(true);
  // const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    loadAnalyticsInsights();
    
    if (autoRefresh) {
      const interval = setInterval(loadAnalyticsInsights, 5 * 60 * 1000); // Every 5 minutes
      return () => clearInterval(interval);
    }
  }, [dateRange, analysisType, autoRefresh]);

  const loadAnalyticsInsights = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadInsights(),
        loadFunnelAnalysis(),
        loadCohortAnalysis(),
        loadUserSegmentation()
      ]);
    } catch (error) {
      console.error('Failed to load analytics insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...ngrokHeaders
        },
        body: JSON.stringify({
          dateRange,
          analysisType,
          userId: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else {
        console.error('Analytics insights API failed:', response.status);
        setInsights([]);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
      setInsights([]);
    }
  };

  const loadFunnelAnalysis = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics/funnel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...ngrokHeaders
        },
        body: JSON.stringify({
          steps: [
            { name: 'Landing Page' },
            { name: 'Registration' },
            { name: 'Profile Setup' },
            { name: 'First Action' },
            { name: 'Return Visit' }
          ],
          period: dateRange
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFunnelData(data);
      } else {
        console.error('Funnel analysis API failed:', response.status);
        setFunnelData([]);
      }
    } catch (error) {
      console.error('Failed to load funnel analysis:', error);
      setFunnelData([]);
    }
  };

  const loadCohortAnalysis = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics/cohort`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...ngrokHeaders
        },
        body: JSON.stringify({
          period: 'weekly',
          metric: 'retention'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCohortData(data);
      } else {
        console.error('Cohort analysis API failed:', response.status);
        setCohortData([]);
      }
    } catch (error) {
      console.error('Failed to load cohort analysis:', error);
      setCohortData([]);
    }
  };

  const loadUserSegmentation = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics/segments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...ngrokHeaders
        },
        body: JSON.stringify({
          period: dateRange
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUserSegments(data);
      } else {
        console.error('User segmentation API failed:', response.status);
        setUserSegments([]);
      }
    } catch (error) {
      console.error('Failed to load user segmentation:', error);
      setUserSegments([]);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp />;
      case 'anomaly': return <Warning />;
      case 'prediction': return <Psychology />;
      case 'recommendation': return <Lightbulb />;
      default: return <Insights />;
    }
  };

  const getInsightColor = (type: string, impact: string) => {
    if (type === 'anomaly') return 'warning';
    if (impact === 'high') return 'error';
    if (impact === 'medium') return 'info';
    return 'success';
  };

  const generateFunnelChart = (): import('chart.js').ChartData<'bar'> => {
    const labels = funnelData.map(step => step.name);
    const userData = funnelData.map(step => step.users);
    const conversionData = funnelData.map(step => step.conversionRate);

    return {
      labels,
      datasets: [
        {
          label: 'Users',
          data: userData,
          backgroundColor: alpha(theme.palette.primary.main, 0.8),
          borderColor: theme.palette.primary.main,
          borderWidth: 1
        },
        {
          label: 'Conversion Rate (%)',
          data: conversionData,
          type: 'line' as const,
          borderColor: theme.palette.secondary.main,
          backgroundColor: alpha(theme.palette.secondary.main, 0.1),
          yAxisID: 'y1',
          tension: 0.4
        }
      ]
    } as unknown as import('chart.js').ChartData<'bar'>;
  };

  const generateCohortHeatmap = () => {
    return cohortData.map((cohort) => (
      <TableRow key={cohort.cohort}>
        <TableCell>{cohort.cohort}</TableCell>
        <TableCell>{cohort.size}</TableCell>
        {cohort.retention.map((rate, weekIndex) => (
          <TableCell
            key={weekIndex}
            sx={{
              backgroundColor: alpha(
                theme.palette.primary.main,
                rate / 100 * 0.8 + 0.1
              ),
              color: rate > 50 ? 'white' : 'text.primary'
            }}
          >
            {rate.toFixed(0)}%
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const handleExportInsights = () => {
    const dataToExport = {
      insights,
      funnelData,
      cohortData,
      userSegments,
      generatedAt: new Date().toISOString(),
      dateRange
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-insights-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          <Insights sx={{ mr: 1, verticalAlign: 'middle' }} />
          Advanced Analytics Insights
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Analysis Type</InputLabel>
            <Select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              label="Analysis Type"
            >
              <MenuItem value="comprehensive">Comprehensive</MenuItem>
              <MenuItem value="behavioral">User Behavior</MenuItem>
              <MenuItem value="performance">Performance</MenuItem>
              <MenuItem value="business">Business Metrics</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportInsights}
          >
            Export
          </Button>
          
          <IconButton onClick={loadAnalyticsInsights} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* AI-Generated Insights */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: 500, overflow: 'hidden' }}>
            <Typography variant="h6" gutterBottom>
              <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
              AI-Powered Insights
            </Typography>
            
            <Box sx={{ height: 420, overflow: 'auto' }}>
              {insights.map((insight) => (
                <Card
                  key={insight.id}
                  sx={{
                    mb: 2,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-2px)' }
                  }}
                  onClick={() => {
                    setSelectedInsight(insight);
                    setShowInsightDetails(true);
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ color: getInsightColor(insight.type, insight.impact) + '.main' }}>
                        {getInsightIcon(insight.type)}
                      </Box>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {insight.title}
                          </Typography>
                          <Chip
                            label={`${insight.confidence}% confidence`}
                            size="small"
                            color={insight.confidence > 80 ? 'success' : 'warning'}
                          />
                          <Chip
                            label={insight.impact}
                            size="small"
                            color={getInsightColor(insight.type, insight.impact)}
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {insight.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip label={insight.category} size="small" variant="outlined" />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(insight.timestamp).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Conversion Funnel */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: 500 }}>
            <Typography variant="h6" gutterBottom>
              <AutoGraph sx={{ mr: 1, verticalAlign: 'middle' }} />
              Conversion Funnel Analysis
            </Typography>
            
            <Box sx={{ height: 350 }}>
              {funnelData.length > 0 && (
                <Bar
                  data={generateFunnelChart()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: false }
                    },
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        max: 100,
                        grid: { drawOnChartArea: false }
                      }
                    }
                  }}
                />
              )}
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Identify conversion bottlenecks and optimization opportunities
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* User Segmentation */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <PieChart sx={{ mr: 1, verticalAlign: 'middle' }} />
              User Segmentation Analysis
            </Typography>
            
            <Grid container spacing={3}>
              {userSegments.map((segment) => (
                <Grid item xs={12} md={4} key={segment.name}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        {segment.name}
                      </Typography>
                      
                      <Typography variant="h4" sx={{ mb: 1 }}>
                        {segment.size}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        users in segment
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Characteristics:
                        </Typography>
                        {segment.characteristics.map((char, index) => (
                          <Chip
                            key={index}
                            label={char}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Conversion Rate
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {segment.conversionRate}%
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Avg Session
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {Math.floor(segment.avgSessionDuration / 60)}m
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Cohort Retention Analysis */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 400, overflow: 'hidden' }}>
            <Typography variant="h6" gutterBottom>
              <Timeline sx={{ mr: 1, verticalAlign: 'middle' }} />
              Cohort Retention
            </Typography>
            
            <TableContainer sx={{ height: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Cohort</TableCell>
                    <TableCell>Size</TableCell>
                    {Array.from({ length: 8 }, (_, i) => (
                      <TableCell key={i}>W{i}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generateCohortHeatmap()}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Insight Details Dialog */}
      <Dialog
        open={showInsightDetails}
        onClose={() => setShowInsightDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedInsight && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getInsightIcon(selectedInsight.type)}
              {selectedInsight.title}
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedInsight && (
            <Box>
              <Alert severity={getInsightColor(selectedInsight.type, selectedInsight.impact)}>
                <Typography variant="body1">
                  {selectedInsight.description}
                </Typography>
              </Alert>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Confidence Level
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedInsight.confidence}
                      sx={{ mt: 1, mb: 1 }}
                    />
                    <Typography variant="body2">
                      {selectedInsight.confidence}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Impact Level
                    </Typography>
                    <Chip
                      label={selectedInsight.impact.toUpperCase()}
                      color={getInsightColor(selectedInsight.type, selectedInsight.impact)}
                      sx={{ mt: 1 }}
                    />
                  </Grid>
                </Grid>
              </Box>
              
              {selectedInsight.actionable && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Recommended Actions
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText primary="Monitor the trend for the next 7 days" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Info color="info" />
                      </ListItemIcon>
                      <ListItemText primary="Analyze user feedback for related patterns" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <TrendingUp color="primary" />
                      </ListItemIcon>
                      <ListItemText primary="Consider A/B testing related features" />
                    </ListItem>
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInsightDetails(false)}>Close</Button>
          {selectedInsight?.actionable && (
            <Button variant="contained">Take Action</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedAnalyticsInsights;
