import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  IconButton,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Analytics,
  Refresh,
  Visibility,
  PeopleAlt,
  Schedule,
  Speed,
  Error as ErrorIcon,
  CheckCircle,
  Warning,
  Info,
  PlayArrow,
  Fullscreen,
  FullscreenExit
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
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
  Filler
} from 'chart.js';
// import { analyticsTracking } from '../services/analyticsTracking';
import { useAuth } from '../contexts/AuthContext';

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

interface RealTimeMetrics {
  activeUsers: number;
  pageViews: number;
  conversionRate: number;
  avgSessionDuration: number;
  bounceRate: number;
  errorRate: number;
  apiResponseTime: number;
  newSignups: number;
}

interface LiveEvent {
  id: string;
  timestamp: number;
  event: string;
  userId?: string;
  page: string;
  type: 'page_view' | 'user_action' | 'conversion' | 'error';
  metadata?: Record<string, any>;
}

interface PerformanceAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  actionRequired: boolean;
}

const RealTimeAnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  useAuth(); // ensure context initialization; not using user directly
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    activeUsers: 0,
    pageViews: 0,
    conversionRate: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    errorRate: 0,
    apiResponseTime: 0,
    newSignups: 0
  });

  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  // const [selectedMetric, setSelectedMetric] = useState('pageViews');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [chartData, setChartData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initializeRealTimeData();
    if (isRealTimeEnabled) {
      startRealTimeUpdates();
    }

    return () => {
      stopRealTimeUpdates();
    };
  }, [isRealTimeEnabled, timeRange]);

  const initializeRealTimeData = async () => {
    setLoading(true);
    try {
      // Load initial metrics
      await loadMetrics();
      await loadRecentEvents();
      await loadAlerts();
      generateChartData();
    } catch (error) {
      console.error('Failed to initialize real-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch(`/api/analytics/real-time/metrics?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        // Simulate real-time metrics for demo
        setMetrics({
          activeUsers: Math.floor(Math.random() * 50) + 10,
          pageViews: Math.floor(Math.random() * 500) + 100,
          conversionRate: Math.random() * 5 + 2,
          avgSessionDuration: Math.floor(Math.random() * 300) + 120,
          bounceRate: Math.random() * 30 + 20,
          errorRate: Math.random() * 2,
          apiResponseTime: Math.floor(Math.random() * 200) + 50,
          newSignups: Math.floor(Math.random() * 10) + 1
        });
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const loadRecentEvents = async () => {
    try {
      const response = await fetch('/api/analytics/real-time/events?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const events = await response.json();
        setLiveEvents(events);
      } else {
        // Simulate live events
        const simulatedEvents: LiveEvent[] = [];
        for (let i = 0; i < 20; i++) {
          simulatedEvents.push({
            id: `event_${i}`,
            timestamp: Date.now() - (i * 30000),
            event: ['page_view', 'user_action', 'conversion'][Math.floor(Math.random() * 3)],
            page: ['/dashboard', '/search', '/profile', '/analytics'][Math.floor(Math.random() * 4)],
            type: ['page_view', 'user_action', 'conversion', 'error'][Math.floor(Math.random() * 4)] as any,
            userId: Math.random() > 0.3 ? `user_${Math.floor(Math.random() * 100)}` : undefined
          });
        }
        setLiveEvents(simulatedEvents);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/analytics/alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const alertsData = await response.json();
        setAlerts(alertsData);
      } else {
        // Simulate alerts
        const simulatedAlerts: PerformanceAlert[] = [
          {
            id: 'alert_1',
            type: 'warning',
            title: 'High Error Rate',
            message: 'Error rate has increased by 15% in the last hour',
            timestamp: Date.now() - 600000,
            isRead: false,
            actionRequired: true
          },
          {
            id: 'alert_2',
            type: 'info',
            title: 'Traffic Spike',
            message: 'Page views increased by 40% compared to yesterday',
            timestamp: Date.now() - 1200000,
            isRead: false,
            actionRequired: false
          }
        ];
        setAlerts(simulatedAlerts);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const startRealTimeUpdates = () => {
    // Set up Server-Sent Events connection
    eventSourceRef.current = new EventSource('/api/analytics/real-time/stream');
    
    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRealTimeUpdate(data);
      } catch (error) {
        console.error('Failed to parse real-time data:', error);
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('Real-time connection error:', error);
      // Fallback to polling
      startPolling();
    };

    // Backup polling mechanism
    refreshIntervalRef.current = setInterval(() => {
      loadMetrics();
      loadRecentEvents();
    }, 30000); // Update every 30 seconds
  };

  const stopRealTimeUpdates = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const startPolling = () => {
    if (refreshIntervalRef.current) return;
    
    refreshIntervalRef.current = setInterval(() => {
      loadMetrics();
      loadRecentEvents();
    }, 5000); // Poll every 5 seconds
  };

  const handleRealTimeUpdate = (data: any) => {
    switch (data.type) {
      case 'metrics_update':
        setMetrics(prev => ({ ...prev, ...data.metrics }));
        break;
      case 'new_event':
        setLiveEvents(prev => [data.event, ...prev.slice(0, 49)]);
        break;
      case 'alert':
        setAlerts(prev => [data.alert, ...prev]);
        break;
      default:
        console.log('Unknown real-time update type:', data.type);
    }
  };

  const generateChartData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - i);
      return hour.getHours() + ':00';
    }).reverse();

    const pageViewData = hours.map(() => Math.floor(Math.random() * 100) + 20);
    const userActionData = hours.map(() => Math.floor(Math.random() * 50) + 10);
    const conversionData = hours.map(() => Math.floor(Math.random() * 10) + 2);

    setChartData({
      labels: hours,
      datasets: [
        {
          label: 'Page Views',
          data: pageViewData,
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          fill: true,
          tension: 0.4,
        },
        {
          label: 'User Actions',
          data: userActionData,
          borderColor: theme.palette.secondary.main,
          backgroundColor: alpha(theme.palette.secondary.main, 0.1),
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Conversions',
          data: conversionData,
          borderColor: theme.palette.success.main,
          backgroundColor: alpha(theme.palette.success.main, 0.1),
          fill: true,
          tension: 0.4,
        }
      ]
    });
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'activeUsers': return <PeopleAlt />;
      case 'pageViews': return <Visibility />;
      case 'conversionRate': return <TrendingUp />;
      case 'avgSessionDuration': return <Schedule />;
      case 'bounceRate': return <TrendingDown />;
      case 'errorRate': return <ErrorIcon />;
      case 'apiResponseTime': return <Speed />;
      case 'newSignups': return <PeopleAlt />;
      default: return <Analytics />;
    }
  };

  const getMetricColor = (metric: string, value: number) => {
    switch (metric) {
      case 'conversionRate':
        return value > 3 ? 'success' : value > 1.5 ? 'warning' : 'error';
      case 'bounceRate':
        return value < 30 ? 'success' : value < 50 ? 'warning' : 'error';
      case 'errorRate':
        return value < 1 ? 'success' : value < 3 ? 'warning' : 'error';
      case 'apiResponseTime':
        return value < 100 ? 'success' : value < 300 ? 'warning' : 'error';
      default:
        return 'primary';
    }
  };

  const formatMetricValue = (metric: string, value: number) => {
    switch (metric) {
      case 'conversionRate':
      case 'bounceRate':
        return `${value.toFixed(1)}%`;
      case 'avgSessionDuration':
        return `${Math.floor(value / 60)}m ${Math.floor(value % 60)}s`;
      case 'apiResponseTime':
        return `${value}ms`;
      default:
        return value.toLocaleString();
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'page_view': return <Visibility fontSize="small" />;
      case 'user_action': return <PlayArrow fontSize="small" />;
      case 'conversion': return <CheckCircle fontSize="small" />;
      case 'error': return <ErrorIcon fontSize="small" />;
      default: return <Info fontSize="small" />;
    }
  };

  // getAlertIcon helper removed (not currently used)

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
          Real-Time Analytics
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="15m">Last 15min</MenuItem>
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24h</MenuItem>
              <MenuItem value="7d">Last 7 days</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={isRealTimeEnabled}
                onChange={(e) => setIsRealTimeEnabled(e.target.checked)}
                color="primary"
              />
            }
            label="Real-time"
          />
          
          <Badge badgeContent={alerts.filter(a => !a.isRead).length} color="error">
            <IconButton onClick={() => setShowAlerts(true)}>
              <Warning />
            </IconButton>
          </Badge>
          
          <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
          
          <IconButton onClick={initializeRealTimeData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Real-time Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(metrics).map(([key, value]) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
              // onClick={() => setSelectedMetric(key)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Typography>
                    <Typography variant="h4" component="div" color={getMetricColor(key, value)}>
                      {formatMetricValue(key, value)}
                    </Typography>
                  </Box>
                  <Box sx={{ color: getMetricColor(key, value) + '.main' }}>
                    {getMetricIcon(key)}
                  </Box>
                </Box>
                
                {isRealTimeEnabled && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                          '100%': { opacity: 1 }
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ ml: 1, color: 'success.main' }}>
                      Live
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Real-time Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Activity Timeline</Typography>
              <Chip 
                label={isRealTimeEnabled ? 'Live' : 'Paused'} 
                color={isRealTimeEnabled ? 'success' : 'warning'}
                size="small"
              />
            </Box>
            
            {chartData.labels && (
              <Box sx={{ height: 320 }}>
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: false }
                    },
                    scales: {
                      y: { beginAtZero: true },
                      x: { display: true }
                    },
                    animation: { duration: isRealTimeEnabled ? 750 : 0 }
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Live Events Feed */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 400, overflow: 'hidden' }}>
            <Typography variant="h6" gutterBottom>
              Live Events
            </Typography>
            
            <Box sx={{ height: 320, overflow: 'auto' }}>
              {liveEvents.map((event) => (
                <Box
                  key={event.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    mb: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderRadius: 1,
                    animation: 'fadeIn 0.5s ease-in',
                    '@keyframes fadeIn': {
                      from: { opacity: 0, transform: 'translateY(-10px)' },
                      to: { opacity: 1, transform: 'translateY(0)' }
                    }
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    {getEventTypeIcon(event.type)}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {event.event}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {event.page} • {new Date(event.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                  {event.userId && (
                    <Chip label={event.userId} size="small" variant="outlined" />
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Alerts Dialog */}
      <Dialog open={showAlerts} onClose={() => setShowAlerts(false)} maxWidth="md" fullWidth>
        <DialogTitle>Performance Alerts</DialogTitle>
        <DialogContent>
          {alerts.length === 0 ? (
            <Alert severity="success">No alerts at this time</Alert>
          ) : (
            <Box>
              {alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  severity={alert.type}
                  sx={{ mb: 2 }}
                  action={
                    alert.actionRequired && (
                      <Button size="small" variant="outlined">
                        Take Action
                      </Button>
                    )
                  }
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    {alert.title}
                  </Typography>
                  <Typography variant="body2">
                    {alert.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(alert.timestamp).toLocaleString()}
                  </Typography>
                </Alert>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAlerts(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RealTimeAnalyticsDashboard;
