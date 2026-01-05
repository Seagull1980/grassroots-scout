import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Groups as GroupsIcon,
  Sports as SportsIcon,
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface AnalyticsOverview {
  totalUsers: number;
  totalTeams: number;
  totalPlayers: number;
  totalMatches: number;
  todayUsers: number;
  todayTeams: number;
  todayPlayers: number;
  activeSessions: number;
  todayPageViews: number;
  todayUniqueVisitors: number;
}

interface UserTypeBreakdown {
  userType: string;
  count: number;
}

interface PopularPage {
  page: string;
  views: number;
}

interface DailyStats {
  dailyUsers: Array<{ date: string; count: number }>;
  dailyPageViews: Array<{ date: string; page_views: number; unique_visitors: number }>;
  dailyTeams: Array<{ date: string; count: number }>;
  dailyPlayers: Array<{ date: string; count: number }>;
  dailyMatches: Array<{ date: string; count: number }>;
}

interface UserActivity {
  activeUsers: Array<{
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    page_views: number;
  }>;
  registrationTrends: Array<{
    date: string;
    userType: string;
    count: number;
  }>;
  sessionStats: {
    avg_session_minutes: number;
    total_sessions: number;
    unique_users: number;
  };
}

const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [userTypeBreakdown, setUserTypeBreakdown] = useState<UserTypeBreakdown[]>([]);
  const [popularPages, setPopularPages] = useState<PopularPage[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30');

  // Show loading while authentication is being checked
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Check if user is admin after loading is complete
  if (!user || user.role !== 'Admin') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>
            This page is only accessible to administrators. Please contact an administrator if you need access to analytics data.
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Current user role: {user.role}
            </Typography>
          )}
        </Alert>
      </Container>
    );
  }

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch overview data
      const overviewResponse = await fetch('/api/analytics/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!overviewResponse.ok) {
        if (overviewResponse.status === 403) {
          throw new Error('Access denied: Admin privileges required');
        } else if (overviewResponse.status === 401) {
          throw new Error('Authentication failed: Please log in again');
        } else {
          throw new Error(`Failed to fetch overview data: ${overviewResponse.statusText}`);
        }
      }

      const overviewData = await overviewResponse.json();
      setOverview(overviewData.overview);
      setUserTypeBreakdown(overviewData.userTypeBreakdown);
      setPopularPages(overviewData.popularPages);

      // Fetch daily stats
      const dailyStatsResponse = await fetch(`/api/analytics/daily-stats?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!dailyStatsResponse.ok) {
        if (dailyStatsResponse.status === 403) {
          throw new Error('Access denied: Admin privileges required');
        } else if (dailyStatsResponse.status === 401) {
          throw new Error('Authentication failed: Please log in again');
        } else {
          throw new Error(`Failed to fetch daily stats: ${dailyStatsResponse.statusText}`);
        }
      }

      const dailyStatsData = await dailyStatsResponse.json();
      setDailyStats(dailyStatsData);

      // Fetch user activity
      const userActivityResponse = await fetch('/api/analytics/user-activity', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!userActivityResponse.ok) {
        if (userActivityResponse.status === 403) {
          throw new Error('Access denied: Admin privileges required');
        } else if (userActivityResponse.status === 401) {
          throw new Error('Authentication failed: Please log in again');
        } else {
          throw new Error(`Failed to fetch user activity: ${userActivityResponse.statusText}`);
        }
      }

      const userActivityData = await userActivityResponse.json();
      setUserActivity(userActivityData);

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setError(error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
    setTimeRange(event.target.value);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const getPageDisplayName = (page: string): string => {
    const pageNames: { [key: string]: string } = {
      '/': 'Home',
      '/dashboard': 'Dashboard',
      '/search': 'Search',
      '/post-advert': 'Post Advert',
      '/profile': 'Profile',
      '/success-stories': 'Success Stories',
      '/match-completions': 'Match Completions',
      '/team-roster': 'Team Roster',
      '/calendar': 'Calendar',
      '/maps': 'Maps'
    };
    return pageNames[page] || page;
  };

  const getUserTypeColor = (userType: string): 'primary' | 'secondary' | 'success' => {
    switch (userType) {
      case 'admin': return 'secondary';
      case 'coach': return 'primary';
      case 'player': return 'success';
      default: return 'primary';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon color="primary" />
            Platform Analytics
          </Typography>
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={handleTimeRangeChange}
            >
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Overview Cards */}
        {overview && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => navigate('/admin/users')}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{formatNumber(overview.totalUsers)}</Typography>
                      <Typography color="text.secondary">Total Users</Typography>
                      <Typography variant="body2" color="success.main">
                        +{overview.todayUsers} today
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <GroupsIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{formatNumber(overview.totalTeams)}</Typography>
                      <Typography color="text.secondary">Team Vacancies</Typography>
                      <Typography variant="body2" color="success.main">
                        +{overview.todayTeams} today
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SportsIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{formatNumber(overview.totalPlayers)}</Typography>
                      <Typography color="text.secondary">Player Listings</Typography>
                      <Typography variant="body2" color="success.main">
                        +{overview.todayPlayers} today
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TrendingUpIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{formatNumber(overview.totalMatches)}</Typography>
                      <Typography color="text.secondary">Successful Matches</Typography>
                      <Typography variant="body2" color="primary">
                        Confirmed connections
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <VisibilityIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{formatNumber(overview.todayPageViews)}</Typography>
                      <Typography color="text.secondary">Page Views Today</Typography>
                      <Typography variant="body2" color="info.main">
                        {formatNumber(overview.todayUniqueVisitors)} unique visitors
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ScheduleIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{formatNumber(overview.activeSessions)}</Typography>
                      <Typography color="text.secondary">Active Sessions</Typography>
                      <Typography variant="body2" color="warning.main">
                        Last 24 hours
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Grid container spacing={3}>
          {/* User Type Breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                User Type Distribution
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {userTypeBreakdown.map((type) => (
                  <Chip
                    key={type.userType}
                    label={`${type.userType}: ${formatNumber(type.count)}`}
                    color={getUserTypeColor(type.userType)}
                    variant="outlined"
                    size="medium"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Popular Pages */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Most Popular Pages (Last 7 Days)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Page</TableCell>
                      <TableCell align="right">Views</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {popularPages.slice(0, 5).map((page, index) => (
                      <TableRow key={index}>
                        <TableCell>{getPageDisplayName(page.page)}</TableCell>
                        <TableCell align="right">{formatNumber(page.views)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Session Statistics */}
          {userActivity && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Session Statistics (Last 7 Days)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Average Session Duration:</Typography>
                    <Typography variant="h6">
                      {Math.round(userActivity.sessionStats.avg_session_minutes)} minutes
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Total Sessions:</Typography>
                    <Typography variant="h6">
                      {formatNumber(userActivity.sessionStats.total_sessions)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Unique Users:</Typography>
                    <Typography variant="h6">
                      {formatNumber(userActivity.sessionStats.unique_users)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Most Active Users */}
          {userActivity && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Most Active Users (Last 30 Days)
                </Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Page Views</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {userActivity.activeUsers.slice(0, 10).map((user, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {user.firstName} {user.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.email}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.userType}
                              color={getUserTypeColor(user.userType)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{formatNumber(user.page_views)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          )}

          {/* Daily Statistics Summary */}
          {dailyStats && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Daily Activity Summary (Last {timeRange} Days)
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {dailyStats.dailyUsers.reduce((sum, day) => sum + day.count, 0)}
                      </Typography>
                      <Typography color="text.secondary">New Users</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {dailyStats.dailyPageViews.reduce((sum, day) => sum + day.page_views, 0)}
                      </Typography>
                      <Typography color="text.secondary">Total Page Views</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {dailyStats.dailyTeams.reduce((sum, day) => sum + day.count, 0)}
                      </Typography>
                      <Typography color="text.secondary">New Teams</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {dailyStats.dailyMatches.reduce((sum, day) => sum + day.count, 0)}
                      </Typography>
                      <Typography color="text.secondary">Matches Completed</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    </Container>
  );
};

export default AnalyticsPage;
