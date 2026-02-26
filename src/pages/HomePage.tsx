import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
} from '@mui/material';
import {
  Group,
  Search,
  Notifications,
  Psychology,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive, useResponsiveSpacing } from '../hooks/useResponsive';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const { containerSpacing, sectionSpacing } = useResponsiveSpacing();

  const [siteStats, setSiteStats] = useState({
    activeTeams: 0,
    registeredPlayers: 0,
    successfulMatches: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchSiteStats = async () => {
      try {
        const response = await fetch('/api/public/site-stats');
        if (response.ok) {
          const data = await response.json();
          setSiteStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch site stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchSiteStats();
  }, []);

  const features = [
    {
      icon: <Psychology fontSize="large" color="primary" />,
      title: 'For Coaches',
      description: 'Post team vacancies and find talented players for your grassroots football team.',
      action: 'Post Vacancy',
      path: '/post-advert',
    },
    {
      icon: <Group fontSize="large" color="primary" />,
      title: 'For Players & Parents',
      description: 'Find the perfect team that matches your playing style and aspirations.',
      action: 'Find Teams',
      path: '/search',
    },
    {
      icon: <Search fontSize="large" color="primary" />,
      title: 'Smart Search',
      description: 'Filter by league, age group, position, and location to find exactly what you need.',
      action: 'Start Searching',
      path: '/search',
    },
    {
      icon: <Notifications fontSize="large" color="primary" />,
      title: 'Alert System',
      description: 'Set up alerts and get notified when new opportunities match your criteria.',
      action: 'Set Alerts',
      path: user ? '/dashboard' : '/register',
    },
  ];

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box 
        sx={{ 
          textAlign: 'center', 
          py: isMobile ? 6 : 12,
          px: isMobile ? 3 : 6,
          background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.03) 0%, rgba(255, 107, 53, 0.03) 100%)',
          borderRadius: 6,
          mb: 8,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #0066FF 0%, #FF6B35 100%)',
          },
        }}
      >
        {/* Decorative circles */}
        <Box sx={{ 
          position: 'absolute', 
          top: -50, 
          right: -50, 
          width: 200, 
          height: 200, 
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 102, 255, 0.1) 0%, transparent 70%)',
          display: isMobile ? 'none' : 'block',
        }} />
        <Box sx={{ 
          position: 'absolute', 
          bottom: -80, 
          left: -80, 
          width: 250, 
          height: 250, 
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 107, 53, 0.08) 0%, transparent 70%)',
          display: isMobile ? 'none' : 'block',
        }} />
        
        <Box sx={{ mb: 3, position: 'relative', zIndex: 1 }} />
        
        <Typography 
          variant="h1" 
          component="h1" 
          gutterBottom 
          sx={{
            background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 3,
            textAlign: 'center',
            fontSize: isMobile ? '2.5rem' : '3.5rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          The Grassroots Scout
        </Typography>
        
        {/* Motto */}
        <Typography 
          variant="h4" 
          component="h2" 
          gutterBottom 
          sx={{
            color: '#FF6B35',
            fontWeight: 700,
            mb: 4,
            fontStyle: 'italic',
            fontSize: isMobile ? '1.5rem' : '2rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          Discover. Connect. Develop
        </Typography>
        
        <Typography 
          variant="h5" 
          component="h3" 
          gutterBottom 
          color="text.secondary" 
          sx={{ 
            mb: 6, 
            maxWidth: '700px', 
            mx: 'auto',
            fontSize: isMobile ? '1.1rem' : '1.3rem',
            lineHeight: 1.8,
            position: 'relative',
            zIndex: 1,
          }}
        >
          Scouting the perfect match between football players and grassroots teams
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          {user ? (
            <>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{ 
                  px: 6, 
                  py: 2, 
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 20px rgba(0, 102, 255, 0.25)',
                }}
              >
                Go to Dashboard
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/search')}
                sx={{ px: 6, py: 2, fontSize: '1.1rem' }}
              >
                Search Now
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{ 
                  px: 6, 
                  py: 2, 
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 20px rgba(0, 102, 255, 0.25)',
                }}
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                size="large"
                color="secondary"
                onClick={() => navigate('/login')}
                sx={{ px: 6, py: 2, fontSize: '1.1rem' }}
              >
                Sign In
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 8 }}>
        <Typography 
          variant="h3" 
          component="h2" 
          textAlign="center" 
          gutterBottom 
          sx={{ mb: 2, fontWeight: 700 }}
        >
          How It Works
        </Typography>
        <Typography 
          variant="body1" 
          textAlign="center" 
          color="text.secondary" 
          sx={{ mb: 8, maxWidth: '600px', mx: 'auto' }}
        >
          Connect with the right opportunities in just a few simple steps
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: 'none',
                  position: 'relative',
                  overflow: 'visible',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: index % 2 === 0 ? '#0066FF' : '#FF6B35',
                    borderRadius: '20px 0 0 20px',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <Box 
                    sx={{ 
                      mb: 3,
                      p: 2.5,
                      borderRadius: '50%',
                      background: index % 2 === 0 
                        ? 'linear-gradient(135deg, rgba(0, 102, 255, 0.1) 0%, rgba(0, 102, 255, 0.2) 100%)' 
                        : 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 107, 53, 0.2) 100%)',
                      display: 'inline-flex',
                      color: index % 2 === 0 ? '#0066FF' : '#FF6B35',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button
                    size="medium"
                    onClick={() => navigate(feature.path)}
                    variant="contained"
                    color={index % 2 === 0 ? 'primary' : 'secondary'}
                    sx={{ borderRadius: 3 }}
                  >
                    {feature.action}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Stats Section */}
      <Paper 
        sx={{ 
          p: 6, 
          textAlign: 'center', 
          background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)', 
          color: 'white', 
          mb: 8,
          borderRadius: 6,
          boxShadow: '0 8px 32px rgba(0, 102, 255, 0.25)',
        }}
      >
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
          Join Our Growing Community
        </Typography>
        <Typography variant="body1" sx={{ mb: 6, opacity: 0.9 }}>
          Thousands of players and teams have already connected
        </Typography>
        <Grid container spacing={containerSpacing} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={4}>
            <Typography 
              variant="h2" 
              component="div" 
              sx={{ 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {statsLoading ? '...' : `${siteStats.activeTeams}+`}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              Active Teams
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography 
              variant="h2" 
              component="div" 
              sx={{ 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {statsLoading ? '...' : `${siteStats.registeredPlayers}+`}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              Registered Players
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography 
              variant="h2" 
              component="div" 
              sx={{ 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {statsLoading ? '...' : `${siteStats.successfulMatches}+`}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              Successful Matches
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Call to Action */}
      {!user && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Join The Grassroots Scout today and let us find your perfect match
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/register')}
            sx={{ px: 6, py: 2 }}
          >
            Sign Up Now
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default HomePage;
