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
  Alert,
  useTheme,
  useMediaQuery,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Skeleton,
  Paper,
  Divider,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Bookmark as BookmarkIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Dashboard as DashboardIcon,
  AdminPanelSettings as AdminIcon,
  Flag as FlagIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { profileAPI, UserProfile } from '../services/api';
import Recommendations from '../components/Recommendations';
import SocialShare from '../components/SocialShare';
import PageHeader from '../components/PageHeader';
import CoachOnboardingChecklist from '../components/CoachOnboardingChecklist';
import VacancyStatusWidget from '../components/VacancyStatusWidget';
import NotificationCenter from '../components/NotificationCenter';

interface BookmarkData {
  id: number;
  targetType: string;
  targetData?: {
    title?: string;
    description?: string;
  };
  createdAt: string;
}

interface RecentActivity {
  id: number;
  type: 'vacancy' | 'player_availability' | 'trial' | 'bookmark';
  title: string;
  description: string;
  createdAt: string;
  status?: string;
}

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user, isImpersonating } = useAuth();

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileCompletion, setProfileCompletion] = useState(0);

  const vacancyUpdates = recentActivity.filter((activity) => activity.type === 'vacancy').length;
  const playerUpdates = recentActivity.filter((activity) => activity.type === 'player_availability').length;
  const totalUpdates = recentActivity.length;

  useEffect(() => {
    loadDashboardData();
    trackPageView();
    calculateProfileCompletion();
  }, []);

  const calculateProfileCompletion = async () => {
    if (!user) return;
    try {
      const response = await profileAPI.get();
      const p: UserProfile = response.profile;
      const baseFields = [p.firstname, p.lastname, p.dateofbirth, p.location, p.bio];
      const roleFields =
        user.role === 'Player'
          ? [p.position, p.preferredfoot, p.experiencelevel]
          : user.role === 'Coach'
          ? [p.coachinglicense?.length ? 'ok' : '', p.yearsexperience, p.teamname]
          : [];
      const all = [...baseFields, ...roleFields];
      const filled = all.filter((f) => f !== undefined && f !== null && f !== '').length;
      const completion = Math.round((filled / all.length) * 100);
      setProfileCompletion(completion);
      localStorage.setItem('profile_completion', completion.toString());
    } catch {
      // Fallback: only mandatory auth fields are known — treat as incomplete
      setProfileCompletion(30);
      localStorage.setItem('profile_completion', '30');
    }
  };

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

      const bookmarksResponse = await api.get('/bookmarks?limit=10');
      const bookmarkActivities = (bookmarksResponse.data?.bookmarks || [])
        .map((bookmark: BookmarkData) => {
          if (bookmark.targetType !== 'vacancy' && bookmark.targetType !== 'player_availability') {
            return null;
          }

          const title = bookmark.targetData?.title?.trim();
          if (!title) {
            return null;
          }

          return {
            id: bookmark.id,
            type: bookmark.targetType as 'vacancy' | 'player_availability',
            title,
            description: bookmark.targetData?.description || '',
            createdAt: bookmark.createdAt,
            status: 'bookmarked'
          };
        })
        .filter((activity: RecentActivity | null): activity is RecentActivity => activity !== null);

      setRecentActivity(bookmarkActivities);
      
    } catch (error: any) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
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
      case 'profile':
        navigate('/profile');
        break;
      case 'alerts':
        navigate('/alert-preferences');
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'flagged-content':
        navigate('/admin/flagged-content');
        break;
      case 'team-profile':
        navigate('/team-profile');
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
    
    const firstName = user?.firstName?.trim();
    const name = (firstName && firstName.length > 0) ? firstName : (user?.email?.split('@')[0] || 'there');
    return `${timeGreeting}, ${name}!`;
  };

  const getContextualSubtitle = () => {
    // Context-aware subtitle based on user state
    if (profileCompletion < 50) {
      return `Complete your profile (${profileCompletion}%) to get better matches and opportunities!`;
    }
    
    if (totalUpdates > 0) {
      return `You have ${totalUpdates} new update${totalUpdates > 1 ? 's' : ''} in your network. Check them out below!`;
    }
    
    const lastLogin = localStorage.getItem('last_login');
    if (lastLogin) {
      const daysSince = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 7) {
        return `Welcome back! It's been ${daysSince} days. Here's what you missed.`;
      }
    }
    
    if (user?.role === 'Coach') {
      return 'Manage your team, post vacancies, and find talented players.';
    } else if (user?.role === 'Player' || user?.role === 'Parent/Guardian') {
      return 'Explore opportunities and connect with teams looking for players like you.';
    }
    
    return 'Welcome to your grassroots football dashboard.';
  };

  const handleQuickSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/search');
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'default';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('active') || statusLower.includes('open')) return 'success';
    if (statusLower.includes('pending') || statusLower.includes('bookmarked')) return 'warning';
    if (statusLower.includes('expired') || statusLower.includes('closed')) return 'error';
    return 'default';
  };

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
                  color={getStatusColor(activity.status) as any}
                  variant="outlined"
                  icon={
                    getStatusColor(activity.status) === 'success' ? <CheckCircleIcon /> :
                    getStatusColor(activity.status) === 'error' ? <ErrorIcon /> :
                    getStatusColor(activity.status) === 'warning' ? <WarningIcon /> : undefined
                  }
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
          
          <SocialShare
            shareType={activity.type === 'vacancy' ? 'vacancy' : 'player_availability'}
            targetId={activity.id}
            title={activity.title}
            description={activity.description}
            size="small"
          />
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
      action: () => navigate('/search')
    }
  ];

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <Alert severity="error">
          User not authenticated. Please log in.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Box sx={{ position: 'relative' }}>
        <PageHeader
          title={getWelcomeMessage()}
          subtitle={getContextualSubtitle()}
          icon={<DashboardIcon sx={{ fontSize: 32 }} />}
        />
        {/* Notification Center - Positioned absolutely in header */}
        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
          <NotificationCenter />
        </Box>
      </Box>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Quick Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Quick search teams, players, or opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleQuickSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleQuickSearch}
                  >
                    Search
                  </Button>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper'
              }
            }}
          />
        </Paper>

        {/* Profile Completion Alert */}
        {profileCompletion < 80 && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate('/profile')}
              >
                Complete
              </Button>
            }
            icon={<TrendingUpIcon />}
          >
            <Typography variant="body2">
              <strong>Boost your visibility!</strong> Your profile is {profileCompletion}% complete.
              {profileCompletion < 50
                ? ' Add more details to attract better opportunities.'
                : ' Just a few more fields to go!'}
            </Typography>
          </Alert>
        )}

        {/* Welcome Section with Impersonation Alert */}
        <Box sx={{ mb: 4 }}>
        {isImpersonating && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography>
                <strong>IMPERSONATING:</strong> {user.firstName} {user.lastName} ({user.role})
              </Typography>
            </Box>
          </Alert>
        )}
        </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* User Info Card (for quick reference) */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h6">{user.firstName} {user.lastName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email} • {user.role}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/profile')}
            >
              View Profile
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'Recent Updates',
            value: loading ? '—' : totalUpdates,
            helper: 'Last 7 days',
            icon: <AssessmentIcon />
          },
          {
            label: 'Team Vacancies',
            value: loading ? '—' : vacancyUpdates,
            helper: 'New or updated',
            icon: <GroupIcon />
          },
          {
            label: 'Player Availability',
            value: loading ? '—' : playerUpdates,
            helper: 'New or updated',
            icon: <PersonIcon />
          }
        ].map((stat) => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.06) 0%, rgba(255, 107, 53, 0.04) 100%)',
                border: '1px solid rgba(0, 102, 255, 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                }
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.helper}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(0, 102, 255, 0.12)',
                    color: 'primary.main',
                    width: 48,
                    height: 48
                  }}
                >
                  {stat.icon}
                </Avatar>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Coach Onboarding Checklist */}
      {user?.role === 'Coach' && !localStorage.getItem('coach_onboarding_dismissed') && (
        <CoachOnboardingChecklist
          onDismiss={() => window.location.reload()}
        />
      )}

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Vacancy Status Widget for Coaches */}
        {user?.role === 'Coach' && (
          <Grid item xs={12}>
            <VacancyStatusWidget compact={false} />
          </Grid>
        )}
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h6" component="h2">
                    Recent Activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Updates from your network
                  </Typography>
                </Box>
                {totalUpdates > 0 && (
                  <Chip
                    label={`${totalUpdates} new`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                <Button
                  size="small"
                  onClick={() => navigate('/search')}
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
                <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      mx: 'auto',
                      mb: 2
                    }}
                  >
                    <BookmarkIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                  <Typography variant="h6" gutterBottom>
                    {user?.role === 'Coach'
                      ? 'No Activity Yet'
                      : 'Start Your Journey'}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                    {user?.role === 'Coach'
                      ? 'Post your first team vacancy or search for talented players to get started. Your activity will appear here.'
                      : 'Explore teams and opportunities. Bookmark items you like and they\'ll show up here for quick access!'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      onClick={() => navigate(user?.role === 'Coach' ? '/post-vacancy' : '/search')}
                      startIcon={user?.role === 'Coach' ? <GroupIcon /> : <SearchIcon />}
                    >
                      {user?.role === 'Coach' ? 'Post Vacancy' : 'Find Teams'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/search')}
                      startIcon={<SearchIcon />}
                    >
                      Explore
                    </Button>
                  </Box>
                  {profileCompletion < 80 && (
                    <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                      <Typography variant="body2">
                        <strong>Tip:</strong> Complete your profile to get personalized recommendations!
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Quick Actions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Jump into the most common tasks
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                {/* Role-specific actions */}
                {user.role === 'Admin' && (
                  <>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AdminIcon />}
                        onClick={() => handleQuickAction('admin')}
                        sx={{ py: 2 }}
                      >
                        Admin Panel
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="warning"
                        startIcon={<FlagIcon />}
                        onClick={() => handleQuickAction('flagged-content')}
                        sx={{ py: 2 }}
                      >
                        Flagged Content
                      </Button>
                    </Grid>
                  </>
                )}
                
                {user.role === 'Coach' && (
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<GroupIcon />}
                      onClick={() => handleQuickAction('team-profile')}
                      sx={{ py: 2 }}
                    >
                      Team Profile
                    </Button>
                  </Grid>
                )}
                
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<GroupIcon />}
                    onClick={() => handleQuickAction(user.role === 'Coach' ? 'create_vacancy' : 'search')}
                    sx={{ py: 2 }}
                  >
                    {user.role === 'Coach' ? 'Post Vacancy' : 'Find Team'}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PersonIcon />}
                    onClick={() => handleQuickAction(user.role === 'Coach' ? 'search' : 'create_availability')}
                    sx={{ py: 2 }}
                  >
                    {user.role === 'Coach' ? 'Find Players' : 'Post Availability'}
                  </Button>
                </Grid>
                {user.role !== 'Admin' && (
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<AssessmentIcon />}
                      onClick={() => navigate('/my-adverts')}
                      sx={{ py: 2 }}
                    >
                      My Adverts
                    </Button>
                  </Grid>
                )}
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
                    onClick={() => handleQuickAction('alerts')}
                    sx={{ py: 2 }}
                  >
                    Alert Settings
                  </Button>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Button
                fullWidth
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={() => handleQuickAction('search')}
                size="large"
              >
                Explore Opportunities
              </Button>
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
          sx={{ position: 'fixed', bottom: 80, right: 16 }}
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
    </Box>
  );
};

export default DashboardPage;
