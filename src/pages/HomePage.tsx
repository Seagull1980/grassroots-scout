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
          py: isMobile ? 4 : 10,
          px: isMobile ? 2 : 4,
          background: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
          borderRadius: 4,
          mb: sectionSpacing,
        }}
      >
        {/* Logo removed temporarily */}
        <Box sx={{ mb: 2 }} />
        
        <Typography 
          variant="h1" 
          component="h1" 
          gutterBottom 
          sx={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
            textAlign: 'center'
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
            background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 600,
            mb: 3,
            fontStyle: 'italic'
          }}
        >
          Discover. Connect. Develop
        </Typography>
        
        <Typography 
          variant="h5" 
          component="h3" 
          gutterBottom 
          color="text.secondary" 
          sx={{ mb: 6, maxWidth: '600px', mx: 'auto' }}
        >
          Scouting the perfect match between football players and grassroots teams
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{ px: 6, py: 2, fontSize: '1.1rem' }}
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
                sx={{ px: 6, py: 2, fontSize: '1.1rem' }}
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                size="large"
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
          sx={{ mb: 8, fontWeight: 700 }}
        >
          How It Works
        </Typography>
        <Grid container spacing={containerSpacing}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <Box 
                    sx={{ 
                      mb: 3,
                      p: 2,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                      display: 'inline-flex',
                      color: 'white',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button
                    size="medium"
                    onClick={() => navigate(feature.path)}
                    variant="contained"
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
          color: 'white', 
          mb: 8,
          borderRadius: 4,
        }}
      >
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
          Join Our Growing Community
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
