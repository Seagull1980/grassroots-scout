import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  TrendingUp,
  People,
  SportsSoccer,
  Groups,
  Visibility,
  Schedule
} from '@mui/icons-material';

interface ActivityDashboardProps {
  // Optional: can accept props for customization later
}

const SiteActivityDashboard: React.FC<ActivityDashboardProps> = () => {
  // Simple static data that shows site activity trends
  const activityStats = {
    totalUsers: 127,
    totalTeams: 45,
    totalPlayers: 89,
    recentSignups: 12,
    activeListings: 34,
    pageViews: 1847
  };

  const recentActivity = [
    { action: 'New Coach Registered', user: 'Manchester United Youth', time: '2 hours ago', type: 'signup' },
    { action: 'Team Vacancy Posted', user: 'Liverpool FC Academy', time: '4 hours ago', type: 'vacancy' },
    { action: 'Player Available', user: 'Sarah Johnson', time: '6 hours ago', type: 'player' },
    { action: 'New Parent Registered', user: 'David Smith', time: '8 hours ago', type: 'signup' },
    { action: 'Team Vacancy Posted', user: 'Chelsea Youth', time: '1 day ago', type: 'vacancy' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'signup': return <People />;
      case 'vacancy': return <Groups />;
      case 'player': return <SportsSoccer />;
      default: return <Schedule />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'signup': return 'success';
      case 'vacancy': return 'primary';
      case 'player': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Site Overview Stats */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>
          Site Activity Overview
        </Typography>
      </Grid>

      {/* Quick Stats Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>
                  {activityStats.totalUsers}
                </Typography>
                <Typography color="textSecondary" variant="body2">
                  Total Users
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#3b82f6' }}>
                <People />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>
                  {activityStats.totalTeams}
                </Typography>
                <Typography color="textSecondary" variant="body2">
                  Active Teams
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#2563eb' }}>
                <Groups />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>
                  {activityStats.totalPlayers}
                </Typography>
                <Typography color="textSecondary" variant="body2">
                  Available Players
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#1e40af' }}>
                <SportsSoccer />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>
                  {activityStats.pageViews}
                </Typography>
                <Typography color="textSecondary" variant="body2">
                  Page Views
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#1e3a8a' }}>
                <Visibility />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Growth Indicators */}
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardHeader 
            title="Recent Growth" 
            titleTypographyProps={{ variant: 'h6', fontWeight: 'bold', color: '#1e3a8a' }}
          />
          <CardContent>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">New Signups (This Week)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{activityStats.recentSignups}</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={75} 
                sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200' }}
              />
            </Box>

            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Active Listings</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{activityStats.activeListings}</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={85} 
                sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200' }}
              />
            </Box>

            <Box display="flex" gap={1} mt={2}>
              <Chip 
                icon={<TrendingUp />} 
                label="+15% this month" 
                color="success" 
                size="small" 
              />
              <Chip 
                label="Growing" 
                color="primary" 
                size="small" 
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity Feed */}
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardHeader 
            title="Recent Activity" 
            titleTypographyProps={{ variant: 'h6', fontWeight: 'bold', color: '#1e3a8a' }}
          />
          <CardContent>
            <Box>
              {recentActivity.map((activity, index) => (
                <Box 
                  key={index} 
                  display="flex" 
                  alignItems="center" 
                  mb={2}
                  pb={2}
                  borderBottom={index < recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none'}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      mr: 2,
                      bgcolor: getActivityColor(activity.type) === 'success' ? '#10b981' : 
                              getActivityColor(activity.type) === 'primary' ? '#3b82f6' :
                              getActivityColor(activity.type) === 'secondary' ? '#8b5cf6' : '#6b7280'
                    }}
                  >
                    {getActivityIcon(activity.type)}
                  </Avatar>
                  <Box flexGrow={1}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {activity.action}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {activity.user} • {activity.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            
            <Box mt={2} textAlign="center">
              <Typography variant="caption" color="textSecondary">
                Showing recent platform activity
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SiteActivityDashboard;
