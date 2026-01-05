import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  IconButton,
  useTheme,
  useMediaQuery,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Alert,
  Skeleton
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Bookmark as BookmarkIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

interface BookmarkData {
  id: number;
  targetType: string;
  targetData?: {
    title?: string;
    description?: string;
  };
  createdAt: string;
}
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Recommendations from '../components/Recommendations';
import SocialShare from '../components/SocialShare';

interface DashboardStats {
  totalViews: number;
  totalActions: number;
  bookmarksCount: number;
  alertsCount: number;
  weeklyGrowth: number;
}

interface RecentActivity {
  id: number;
  type: 'vacancy' | 'player_availability' | 'trial' | 'bookmark';
  title: string;
  description: string;
  createdAt: string;
  status?: string;
}

const EnhancedDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    totalViews: 0,
    totalActions: 0,
    bookmarksCount: 0,
    alertsCount: 0,
    weeklyGrowth: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
    trackPageView();
  }, []);

  const trackPageView = async () => {
    try {
      await api.post('/engagement/track', {
        actionType: 'page_view',
        targetType: 'dashboard',
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      });
    } catch (error) {
      console.warn('Failed to track page view:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user stats and recent activity in parallel
      const [, , bookmarksResponse] = await Promise.all([
        api.get('/analytics/user-stats'),
        api.get('/user/recent-activity'),
        api.get('/bookmarks?limit=5')
      ]);

      // Mock stats for now - replace with actual API response
      setStats({
        totalViews: Math.floor(Math.random() * 100) + 20,
        totalActions: Math.floor(Math.random() * 50) + 10,
        bookmarksCount: bookmarksResponse.data.pagination?.total || 0,
        alertsCount: Math.floor(Math.random() * 10),
        weeklyGrowth: Math.floor(Math.random() * 30) + 5
      });

      // Transform bookmarks to recent activity format
      const bookmarkActivities = bookmarksResponse.data.bookmarks.map((bookmark: BookmarkData) => ({
        id: bookmark.id,
        type: bookmark.targetType,
        title: bookmark.targetData?.title || 'Bookmarked Item',
        description: bookmark.targetData?.description || '',
        createdAt: bookmark.createdAt,
        status: 'bookmarked'
      }));

      setRecentActivity(bookmarkActivities);
      
    } catch (error: any) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackAction = async (actionType: string, metadata: Record<string, unknown> = {}) => {
    try {
      await api.post('/engagement/track', {
        actionType,
        metadata: {
          ...metadata,
          source: 'dashboard'
        }
      });
    } catch (error) {
      console.warn('Failed to track action:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    trackAction(`quick_action_${action}`);
    
    switch (action) {
      case 'create_vacancy':
        navigate('/post-vacancy');
        break;
      case 'create_availability':
        navigate('/post-availability');
        break;
      case 'search':
        navigate('/search');
        break;
      case 'calendar':
        navigate('/calendar');
        break;
      case 'bookmarks':
        navigate('/bookmarks');
        break;
      case 'alerts':
        navigate('/alerts');
        break;
      default:
        break;
    }
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    
    if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    else if (hour >= 17) timeGreeting = 'Good evening';
    
    return `${timeGreeting}, ${user?.firstName}!`;
  };

  const renderStatsCard = (title: string, value: number, icon: React.ReactNode, trend?: number) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {loading ? <Skeleton width={60} /> : value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
                <Typography variant="body2" sx={{ color: 'success.main' }}>
                  +{trend}% this week
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const renderActivityItem = (activity: RecentActivity) => (
    <Card key={activity.id} sx={{ mb: 2 }}>
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Chip
                label={activity.type === 'vacancy' ? 'Team Vacancy' : 'Player Available'}
                size="small"
                color={activity.type === 'vacancy' ? 'primary' : 'secondary'}
                sx={{ mr: 1 }}
              />
              {activity.status && (
                <Chip
                  label={activity.status}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            <Typography variant="body1" fontWeight="medium">
              {activity.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {activity.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(activity.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 2 }}>
            <IconButton
              size="small"
              onClick={() => navigate(`/search?tab=${activity.type}s&id=${activity.id}`)}
            >
              <SearchIcon />
            </IconButton>
            <SocialShare
              shareType={activity.type === 'vacancy' ? 'vacancy' : 'player_availability'}
              targetId={activity.id}
              title={activity.title}
              description={activity.description}
              size="small"
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const speedDialActions = [
    { 
      icon: <GroupIcon />, 
      name: user?.role === 'Coach' ? 'Post Vacancy' : 'Find Team',
      action: () => handleQuickAction(user?.role === 'Coach' ? 'create_vacancy' : 'search')
    },
    { 
      icon: <PersonIcon />, 
      name: user?.role === 'Coach' ? 'Find Players' : 'Post Availability',
      action: () => handleQuickAction(user?.role === 'Coach' ? 'search' : 'create_availability')
    },
    { 
      icon: <CalendarIcon />, 
      name: 'Calendar',
      action: () => handleQuickAction('calendar')
    },
    { 
      icon: <BookmarkIcon />, 
      name: 'Bookmarks',
      action: () => handleQuickAction('bookmarks')
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {getWelcomeMessage()}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to your grassroots football dashboard. Here's what's happening in your network.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatsCard('Profile Views', stats.totalViews, <PersonIcon />, stats.weeklyGrowth)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatsCard('Actions Taken', stats.totalActions, <TrendingUpIcon />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatsCard('Bookmarks', stats.bookmarksCount, <BookmarkIcon />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatsCard('Active Alerts', stats.alertsCount, <NotificationsIcon />)}
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Recent Activity
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/activity')}
                  endIcon={<SearchIcon />}
                >
                  View All
                </Button>
              </Box>
              
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Skeleton variant="rectangular" height={80} sx={{ mb: 1 }} />
                  </Box>
                ))
              ) : recentActivity.length > 0 ? (
                recentActivity.slice(0, 3).map(renderActivityItem)
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography color="text.secondary">
                    No recent activity. Start exploring to see updates here!
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Quick Actions
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<GroupIcon />}
                    onClick={() => handleQuickAction(user?.role === 'Coach' ? 'create_vacancy' : 'search')}
                    sx={{ py: 2 }}
                  >
                    {user?.role === 'Coach' ? 'Post Vacancy' : 'Find Team'}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PersonIcon />}
                    onClick={() => handleQuickAction(user?.role === 'Coach' ? 'search' : 'create_availability')}
                    sx={{ py: 2 }}
                  >
                    {user?.role === 'Coach' ? 'Find Players' : 'Post Availability'}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<CalendarIcon />}
                    onClick={() => handleQuickAction('calendar')}
                    sx={{ py: 2 }}
                  >
                    Calendar
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={() => navigate('/alerts')}
                    sx={{ py: 2 }}
                  >
                    Alert Settings
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={() => handleQuickAction('search')}
                  size="large"
                >
                  Explore Opportunities
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Recommendations limit={6} showHeader={true} />
        </Grid>
      </Grid>

      {/* Mobile Floating Action Button */}
      {isMobile && (
        <SpeedDial
          ariaLabel="Quick Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.action}
            />
          ))}
        </SpeedDial>
      )}
    </Container>
  );
};

export default EnhancedDashboard;
