import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  Paper
} from '@mui/material';
import {
  Group,
  Sports,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive, useResponsiveSpacing } from '../hooks/useResponsive';
import { useAnalytics } from '../hooks/useAnalytics';
import { API_URL } from '../services/api';
import Footer from '../components/Footer';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackUserAction, trackConversion } = useAnalytics();
  const { isMobile } = useResponsive();
  const { containerSpacing } = useResponsiveSpacing();

  const [siteStats, setSiteStats] = useState({
    activeTeams: 0,
    registeredPlayers: 0,
    successfulMatches: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchSiteStats = async () => {
      try {
        const response = await fetch(`${API_URL}/public/site-stats`);
        if (response.ok) {
          const data = await response.json();
          setSiteStats(data);
          localStorage.setItem('site_stats_cache', JSON.stringify(data));
        } else {
          throw new Error('Failed to fetch stats');
        }
      } catch (error) {
        console.error('Failed to fetch site stats:', error);
        const cached = localStorage.getItem('site_stats_cache');
        if (cached) {
          try {
            setSiteStats(JSON.parse(cached));
          } catch {
            setSiteStats({ activeTeams: 0, registeredPlayers: 0, successfulMatches: 0 });
          }
        }
      } finally {
        setStatsLoading(false);
      }
    };

    fetchSiteStats();
  }, []);

  const trackLandingCta = (ctaName: string, destination: string, section: string, roleIntent?: string) => {
    trackUserAction('landing_cta_click', ctaName, {
      section,
      destination,
      roleIntent: roleIntent || null,
      isLoggedIn: !!user,
      page: 'home'
    });

    if (!user && destination.startsWith('/register')) {
      trackConversion('landing_register_intent', 1);
    }
  };

  const navigateWithTracking = (ctaName: string, destination: string, section: string, roleIntent?: string) => {
    trackLandingCta(ctaName, destination, section, roleIntent);
    navigate(destination);
  };

  // ===== HERO SECTION =====
  const renderHeroSection = () => (
    <Box
      sx={{
        textAlign: 'center',
        py: isMobile ? 8 : 14,
        px: isMobile ? 2 : 6,
        background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.05) 0%, rgba(255, 107, 53, 0.05) 100%)',
        borderRadius: 6,
        mb: 10,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #0066FF 0%, #FF6B35 100%)'
        }
      }}
    >
      <Box sx={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 102, 255, 0.1) 0%, transparent 70%)',
        display: isMobile ? 'none' : 'block'
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: -80,
        left: -80,
        width: 250,
        height: 250,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 107, 53, 0.08) 0%, transparent 70%)',
        display: isMobile ? 'none' : 'block'
      }} />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontSize: isMobile ? '2rem' : '3.5rem',
            fontWeight: 800,
            color: '#000',
            mb: 3,
            lineHeight: 1.2
          }}
        >
          Find your next opportunity in grassroots football
        </Typography>

        <Typography
          variant="h5"
          component="p"
          sx={{
            fontSize: isMobile ? '1rem' : '1.3rem',
            color: '#555',
            mb: 6,
            maxWidth: '700px',
            mx: 'auto',
            lineHeight: 1.7
          }}
        >
          Grassroots Scout connects players, clubs, and teams across local football — helping you move, sign, trial, or recruit at the right level.
        </Typography>

        {/* Primary CTAs - Split by Role */}
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigateWithTracking('hero_im_player', '/register?role=player', 'hero_primary_cta', 'Player')}
            sx={{
              px: 6,
              py: 2.5,
              fontSize: '1.1rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
              boxShadow: '0 4px 20px rgba(0, 102, 255, 0.25)'
            }}
          >
            I'm a Player (or Parent/Guardian)
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigateWithTracking('hero_im_club', '/register?role=coach', 'hero_primary_cta', 'Coach')}
            sx={{
              px: 6,
              py: 2.5,
              fontSize: '1.1rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF4500 100%)',
              boxShadow: '0 4px 20px rgba(255, 107, 53, 0.25)'
            }}
          >
            I'm a Coach
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
          Join a growing network built for grassroots football opportunities — not just visibility, but real movement.
        </Typography>
      </Box>
    </Box>
  );

  // ===== QUICK VALUE SNAPSHOT =====
  const renderValueSnapshot = () => (
    <Box sx={{ mb: 12 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} sm={6} md={4}>
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Box sx={{
              fontSize: '3rem',
              mb: 2
            }}>
              ⚽
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Players
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Find clubs looking for your position, level, and location
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Box sx={{
              fontSize: '3rem',
              mb: 2
            }}>
              🏟️
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Clubs
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Discover available players ready to join your squad
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Box sx={{
              fontSize: '3rem',
              mb: 2
            }}>
              🔁
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Opportunities
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Trials, signings, short-term cover, and long-term moves
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  // ===== CLEAR EXPLANATION SECTION =====
  const renderWhatThisSectionIs = () => (
    <Paper
      sx={{
        p: isMobile ? 4 : 6,
        mb: 12,
        background: '#f9f9f9',
        border: '1px solid #e0e0e0',
        borderRadius: 4
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          mb: 3,
          fontSize: isMobile ? '1.5rem' : '2rem'
        }}
      >
        Grassroots football moves fast. Opportunities get missed.
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.05rem', lineHeight: 1.8 }}>
        Grassroots Scout is a platform built to make sure players and clubs don't miss each other.
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.95rem' }}>
        Whether you're:
      </Typography>

      <Box sx={{ pl: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          ✓ A player looking for a new club
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          ✓ A club short on numbers
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          ✓ Or a team preparing for the new season
        </Typography>
      </Box>

      <Typography variant="body1" sx={{ fontWeight: 600, color: '#000' }}>
        You can connect directly and take action.
      </Typography>
    </Paper>
  );

  // ===== HOW IT WORKS =====
  const renderHowItWorks = () => (
    <Box sx={{ mb: 12 }}>
      <Typography
        variant="h4"
        component="h2"
        sx={{
          textAlign: 'center',
          fontWeight: 800,
          mb: 2,
          fontSize: isMobile ? '1.5rem' : '2rem'
        }}
      >
        How It Works
      </Typography>

      <Typography
        variant="body1"
        sx={{
          textAlign: 'center',
          color: '#666',
          mb: 8
        }}
      >
        4 simple steps to connect and move
      </Typography>

      <Grid container spacing={3}>
        {[
          {
            number: '1',
            title: 'Create your profile',
            description: 'Players and clubs set up their details in minutes.'
          },
          {
            number: '2',
            title: 'Mark what you\'re looking for',
            description: 'Players: position, level, availability\nClubs: positions needed, squad gaps, location'
          },
          {
            number: '3',
            title: 'Get discovered or search directly',
            description: 'Browse opportunities or be found by the right match.'
          },
          {
            number: '4',
            title: 'Connect and move forward',
            description: 'Chat, trial, sign — or build your squad.'
          }
        ].map((step, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                p: 3,
                border: '2px solid #e0e0e0',
                borderRadius: 3,
                background: '#fff'
              }}
            >
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  mb: 2
                }}
              >
                {step.number}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                {step.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                {step.description}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // ===== PLAYER SECTION =====
  const renderPlayerSection = () => (
    <Paper
      sx={{
        p: isMobile ? 4 : 6,
        mb: 8,
        background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.05) 0%, rgba(0, 102, 255, 0.02) 100%)',
        border: '2px solid rgba(0, 102, 255, 0.2)',
        borderRadius: 4
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Group sx={{ fontSize: '2rem', color: '#0066FF', mr: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          For Players
        </Typography>
      </Box>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          mb: 3,
          fontSize: isMobile ? '1.3rem' : '1.8rem',
          color: '#000'
        }}
      >
        Don't wait for opportunities — find them
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
          <Box sx={{ mr: 2, mt: 0.5, fontWeight: 700, color: '#0066FF' }}>✓</Box>
          <Box>Search clubs actively recruiting</Box>
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
          <Box sx={{ mr: 2, mt: 0.5, fontWeight: 700, color: '#0066FF' }}>✓</Box>
          <Box>Show your availability instantly</Box>
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
          <Box sx={{ mr: 2, mt: 0.5, fontWeight: 700, color: '#0066FF' }}>✓</Box>
          <Box>Apply to teams at your level</Box>
        </Typography>
        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <Box sx={{ mr: 2, mt: 0.5, fontWeight: 700, color: '#0066FF' }}>✓</Box>
          <Box>Move clubs when the timing is right</Box>
        </Typography>
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={() => navigateWithTracking('player_section_join', '/register?role=player', 'player_section')}
        sx={{
          background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
          px: 5,
          py: 1.5,
          fontWeight: 700
        }}
      >
        Join as a Player <ArrowForward sx={{ ml: 1 }} />
      </Button>
    </Paper>
  );

  // ===== CLUB SECTION =====
  const renderClubSection = () => (
    <Paper
      sx={{
        p: isMobile ? 4 : 6,
        mb: 8,
        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.02) 100%)',
        border: '2px solid rgba(255, 107, 53, 0.2)',
        borderRadius: 4
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Sports sx={{ fontSize: '2rem', color: '#FF6B35', mr: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          For Clubs
        </Typography>
      </Box>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          mb: 3,
          fontSize: isMobile ? '1.3rem' : '1.8rem',
          color: '#000'
        }}
      >
        Build your squad with the right players
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
          <Box sx={{ mr: 2, mt: 0.5, fontWeight: 700, color: '#FF6B35' }}>✓</Box>
          <Box>Find players available in your area</Box>
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
          <Box sx={{ mr: 2, mt: 0.5, fontWeight: 700, color: '#FF6B35' }}>✓</Box>
          <Box>Fill urgent squad gaps</Box>
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
          <Box sx={{ mr: 2, mt: 0.5, fontWeight: 700, color: '#FF6B35' }}>✓</Box>
          <Box>Recruit for trials or permanent signings</Box>
        </Typography>
        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <Box sx={{ mr: 2, mt: 0.5, fontWeight: 700, color: '#FF6B35' }}>✓</Box>
          <Box>Strengthen your team quickly</Box>
        </Typography>
      </Box>
        
        <Button
        variant="contained"
        size="large"
        onClick={() => navigateWithTracking('club_section_join', '/register?role=coach', 'club_section')}
        sx={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #FF4500 100%)',
          px: 5,
          py: 1.5,
          fontWeight: 700
        }}
        >
        Join as a Coach <ArrowForward sx={{ ml: 1 }} />
      </Button>
    </Paper>
  );

  // ===== STATS SECTION =====
  const renderStatsSection = () => (
    <Paper
      sx={{
        p: 6,
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
        color: 'white',
        mb: 8,
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(0, 102, 255, 0.25)'
      }}
    >
      <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 800, mb: 1 }}>
        Join Our Growing Community
      </Typography>
      <Typography variant="body1" sx={{ mb: 6, opacity: 0.9 }}>
        Real football. Real movement.
      </Typography>
      <Grid container spacing={containerSpacing} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={4}>
          <Typography
            variant="h2"
            component="div"
            sx={{
              fontWeight: 800,
              color: 'white'
            }}
          >
            {statsLoading ? '...' : siteStats.registeredPlayers > 0 ? `${siteStats.registeredPlayers}+` : '...'}
          </Typography>
          <Typography variant="h6" sx={{ mt: 1 }}>
            Players
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography
            variant="h2"
            component="div"
            sx={{
              fontWeight: 800,
              color: 'white'
            }}
          >
            {statsLoading ? '...' : siteStats.activeTeams > 0 ? `${siteStats.activeTeams}+` : '...'}
          </Typography>
          <Typography variant="h6" sx={{ mt: 1 }}>
            Clubs
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography
            variant="h2"
            component="div"
            sx={{
              fontWeight: 800,
              color: 'white'
            }}
          >
            {statsLoading ? '...' : siteStats.successfulMatches > 0 ? `${siteStats.successfulMatches}+` : '...'}
          </Typography>
          <Typography variant="h6" sx={{ mt: 1 }}>
            Connections
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );

  // ===== WHY GRASSROOTS SCOUT SECTION =====
  const renderWhySection = () => (
    <Box sx={{ mb: 8 }}>
      <Typography
        variant="h4"
        component="h2"
        sx={{
          textAlign: 'center',
          fontWeight: 800,
          mb: 6,
          fontSize: isMobile ? '1.5rem' : '2rem'
        }}
      >
        Why Grassroots Scout
      </Typography>

      <Typography
        variant="h6"
        sx={{
          textAlign: 'center',
          fontWeight: 700,
          mb: 4,
          color: '#666'
        }}
      >
        Built for real grassroots football movement
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', textAlign: 'center', p: 3, border: '1px solid #e0e0e0' }}>
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, color: '#0066FF' }}>
              ✓ Not just profiles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real opportunities
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', textAlign: 'center', p: 3, border: '1px solid #e0e0e0' }}>
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, color: '#FF6B35' }}>
              ✓ Not just scouting
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Direct recruitment
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', textAlign: 'center', p: 3, border: '1px solid #e0e0e0' }}>
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, color: '#0066FF' }}>
              ✓ Not just exposure
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Actual club movement
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', textAlign: 'center', p: 3, border: '1px solid #e0e0e0' }}>
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, color: '#FF6B35' }}>
              ✓ Built for grassroots
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Local football, not academies
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // ===== FINAL CTA SECTION =====
  const renderFinalCta = () => (
    <Box sx={{ textAlign: 'center', py: 6, mb: 2 }}>
      <Typography
        variant="h4"
        component="h2"
        sx={{
          fontWeight: 800,
          mb: 3,
          fontSize: isMobile ? '1.5rem' : '2rem'
        }}
      >
        Ready to find your next opportunity?
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          mb: 6,
          maxWidth: '600px',
          mx: 'auto',
          fontSize: '1.05rem'
        }}
      >
        Whether you're a player or a club, your next step is here.
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigateWithTracking('final_cta_player', '/register?role=player', 'final_cta', 'Player')}
          sx={{
            background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
            px: 6,
            py: 2,
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(0, 102, 255, 0.25)'
          }}
        >
          Join as a Player
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigateWithTracking('final_cta_club', '/register?role=coach', 'final_cta', 'Coach')}
          sx={{
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF4500 100%)',
            px: 6,
            py: 2,
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(255, 107, 53, 0.25)'
          }}
        >
          Join as a Coach
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <Helmet>
        <title>Grassroots Scout - Football Opportunity Network</title>
        <meta
          name="description"
          content="Find your next grassroots football opportunity. Connect with players and clubs at the right level. Real opportunities. Real movement."
        />
        <link rel="canonical" href="https://www.grassroots-scout.co.uk/" />
        <meta property="og:title" content="Grassroots Scout - Football Opportunity Network" />
        <meta property="og:description" content="Find your next grassroots football opportunity. Players discover clubs. Clubs recruit players." />
        <meta property="og:url" content="https://www.grassroots-scout.co.uk/" />
      </Helmet>

      <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
        {/* Hero Section */}
        {renderHeroSection()}

        {/* Quick Value Snapshot */}
        {renderValueSnapshot()}

        {/* What This Is */}
        {renderWhatThisSectionIs()}

        {/* How It Works */}
        {renderHowItWorks()}

        {/* Player Section */}
        {renderPlayerSection()}

        {/* Club Section */}
        {renderClubSection()}

        {/* Stats Section */}
        {renderStatsSection()}

        {/* Why Grassroots Scout */}
        {renderWhySection()}

        {/* Final CTA */}
        {renderFinalCta()}
      </Container>

      <Footer />
    </>
  );
};

export default HomePage;