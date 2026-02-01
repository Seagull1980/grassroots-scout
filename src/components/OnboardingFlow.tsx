import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  IconButton,
  Chip,
  Stack,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Autocomplete
} from '@mui/material';
import {
  Close as CloseIcon,
  Sports as SportsIcon,
  Search as SearchIcon,
  Map as MapIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { storage } from '../utils/storage';
import { useNavigate } from 'react-router-dom';
import { leaguesAPI, League } from '../services/api';
import LeagueRequestDialog from './LeagueRequestDialog';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  optional?: boolean;
}

export const OnboardingFlow: React.FC = () => {
  const { user } = useAuth();
  const { subscribeToArea, subscribeToLeague } = useNotifications();
  const navigate = useNavigate();

  // Development utility - add global function to reset onboarding
  useEffect(() => {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      (window as any).resetOnboarding = () => {
        if (user) {
          storage.removeItem(`onboarding_completed_${user.id}`);
          storage.setItem(`new_user_${user.id}`, 'true');
          window.location.reload();
        }
      };
    }
  }, [user]);
  
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [, setCompletedSteps] = useState<Set<number>>(new Set());
  const [availableLeagues, setAvailableLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [leagueRequestOpen, setLeagueRequestOpen] = useState(false);
  const [userData, setUserData] = useState({
    interests: [] as string[],
    location: '',
    preferredLeagues: [] as string[],
    searchRadius: 10,
    playingTimePolicy: '' as string,
    notifications: {
      newVacancies: true,
      matchUpdates: true,
      messages: true
    }
  });

  // Load available leagues from database
  useEffect(() => {
    const loadLeagues = async () => {
      setLoadingLeagues(true);
      try {
        const leagues = await leaguesAPI.getForSearch(true); // Include pending leagues for the user
        // Ensure we have an array before filtering
        if (Array.isArray(leagues)) {
          setAvailableLeagues(leagues.filter(league => league.isActive !== false));
        } else {
          console.error('Leagues API returned non-array:', leagues);
          throw new Error('Invalid leagues data');
        }
      } catch (error) {
        console.error('Failed to load leagues:', error);
        // Fallback to default leagues if API fails (matching your database)
        setAvailableLeagues([
          { id: 1, name: 'County Youth League', region: 'Local', ageGroups: ['Youth'] },
          { id: 2, name: 'Sunday League', region: 'Local', ageGroups: ['Adult'] },
          { id: 3, name: 'Community League', region: 'Local', ageGroups: ['All Ages'] },
          { id: 4, name: 'Local Girls League', region: 'Local', ageGroups: ['Girls'] },
          { id: 5, name: 'Development League', region: 'Local', ageGroups: ['Youth'] }
        ] as League[]);
      } finally {
        setLoadingLeagues(false);
      }
    };

    loadLeagues();
  }, []);

  // Check if user needs onboarding - only show for new registrations
  useEffect(() => {
    if (user) {
      const hasCompletedOnboarding = storage.getItem(`onboarding_completed_${user.id}`);
      const isNewUser = storage.getItem(`new_user_${user.id}`);
      
      // Check if account was created within the last 24 hours
      const accountCreatedAt = new Date(user.createdAt);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60);
      const isRecentlyCreated = hoursSinceCreation < 24;
      
      // Check if beta access was granted in the last 24 hours
      let isBetaAccessRecent = false;
      if (user.betaAccessGrantedAt) {
        const betaGrantedAt = new Date(user.betaAccessGrantedAt);
        const hoursSinceBetaGrant = (now.getTime() - betaGrantedAt.getTime()) / (1000 * 60 * 60);
        isBetaAccessRecent = hoursSinceBetaGrant < 24;
      }
      
      // Clean up stale flags for accounts older than 24 hours (unless beta access is recent)
      if (!isRecentlyCreated && !isBetaAccessRecent) {
        storage.removeItem(`new_user_${user.id}`);
        localStorage.removeItem('pending_new_user');
        return;
      }
      
      // Only show onboarding for new users who haven't completed it AND (account is recent OR beta access is recent)
      // This prevents the popup from showing to existing users
      if (isNewUser && !hasCompletedOnboarding && (isRecentlyCreated || isBetaAccessRecent)) {
        // Show onboarding after a short delay
        setTimeout(() => setOpen(true), 1000);
      }
    }
  }, [user]);

  const handleSkipOnboarding = () => {
    if (user) {
      storage.setItem(`onboarding_completed_${user.id}`, 'true');
      storage.removeItem(`new_user_${user.id}`);
    }
    setOpen(false);
  };

  const handleComplete = () => {
    if (user) {
      storage.setItem(`onboarding_completed_${user.id}`, 'true');
      storage.removeItem(`new_user_${user.id}`);
      
      // Apply user preferences
      if (userData.location && userData.searchRadius) {
        // In a real app, you'd geocode the location
        subscribeToArea(51.5074, -0.1278, userData.searchRadius); // London coordinates as example
      }
      
      if (userData.preferredLeagues.length > 0) {
        userData.preferredLeagues.forEach(league => {
          subscribeToLeague(league, '');
        });
      }
    }
    
    setOpen(false);
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Grassroots Hub!',
      description: 'Let\'s get you set up to find the perfect football opportunities',
      component: (
        <Box textAlign="center" py={3}>
          <SportsIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Welcome to Grassroots Hub!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            We'll help you discover football teams, players, and opportunities in your area. 
            This quick setup will personalize your experience.
          </Typography>
          <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
            <Chip icon={<GroupIcon />} label="Find Teams" color="primary" variant="outlined" />
            <Chip icon={<PersonIcon />} label="Connect with Players" color="primary" variant="outlined" />
            <Chip icon={<MapIcon />} label="Discover Locally" color="primary" variant="outlined" />
          </Box>
        </Box>
      )
    },
    {
      id: 'role-setup',
      title: 'Tell us about yourself',
      description: 'Help us customize your experience based on your role',
      component: (
        <Box py={2}>
          <Typography variant="h6" gutterBottom>
            What are you most interested in?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select all that apply (you can change this later)
          </Typography>
          
          <Grid container spacing={2}>
            {[
              { id: 'finding-teams', label: 'Finding a team to join', icon: <GroupIcon /> },
              { id: 'recruiting-players', label: 'Recruiting players for my team', icon: <PersonIcon /> },
              { id: 'coaching-opportunities', label: 'Coaching opportunities', icon: <SportsIcon /> },
              { id: 'youth-football', label: 'Youth football (under 18)', icon: <PersonIcon /> },
              { id: 'match-results', label: 'Recording match results', icon: <CheckCircleIcon /> },
              { id: 'local-leagues', label: 'Following local leagues', icon: <MapIcon /> }
            ].map((interest) => (
              <Grid item xs={12} sm={6} key={interest.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: userData.interests.includes(interest.id) ? 2 : 1,
                    borderColor: userData.interests.includes(interest.id) ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => {
                    setUserData(prev => ({
                      ...prev,
                      interests: prev.interests.includes(interest.id)
                        ? prev.interests.filter(i => i !== interest.id)
                        : [...prev.interests, interest.id]
                    }));
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                    {interest.icon}
                    <Typography variant="body2">{interest.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )
    },
    // Coach-specific step for playing time policy
    ...(user?.role === 'Coach' ? [{
      id: 'playing-time-policy',
      title: 'Playing Time Policy',
      description: 'Help players and parents understand your team\'s approach',
      component: (
        <Box py={2}>
          <Typography variant="h6" gutterBottom>
            What's your team's playing time policy?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This helps players and parents find teams that match their expectations
          </Typography>
          
          <Stack spacing={2}>
            {[
              { 
                value: 'equal', 
                label: 'Equal Playing Time', 
                description: 'All players get roughly equal time on the pitch'
              },
              { 
                value: 'merit', 
                label: 'Merit Based Playing Time', 
                description: 'Playing time earned through performance and effort'
              },
              { 
                value: 'dependent', 
                label: 'Dependent on Circumstances', 
                description: 'Varies based on match situation, opponent, training attendance, etc.'
              }
            ].map((policy) => (
              <Card
                key={policy.value}
                sx={{
                  cursor: 'pointer',
                  border: userData.playingTimePolicy === policy.value ? 2 : 1,
                  borderColor: userData.playingTimePolicy === policy.value ? 'primary.main' : 'divider',
                  '&:hover': { borderColor: 'primary.main' }
                }}
                onClick={() => {
                  setUserData(prev => ({
                    ...prev,
                    playingTimePolicy: policy.value
                  }));
                }}
              >
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {policy.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {policy.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )
    }] : []),
    {
      id: 'location-setup',
      title: 'Set your location',
      description: 'Help us show you relevant opportunities nearby',
      component: (
        <Box py={2}>
          <Typography variant="h6" gutterBottom>
            Where are you based?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This helps us show you teams and players in your area
          </Typography>
          
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Location (City, Town, or Postcode)"
              value={userData.location}
              onChange={(e) => setUserData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Manchester, London, B1 1AA"
              InputProps={{
                startAdornment: <LocationIcon sx={{ color: 'text.secondary', mr: 1 }} />
              }}
            />
            
            <Box>
              <Typography variant="body2" gutterBottom>
                Search radius: {userData.searchRadius} km
              </Typography>
              <Box sx={{ px: 2 }}>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={userData.searchRadius}
                  onChange={(e) => setUserData(prev => ({ 
                    ...prev, 
                    searchRadius: parseInt(e.target.value) 
                  }))}
                  style={{ width: '100%' }}
                />
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">5 km</Typography>
                <Typography variant="caption" color="text.secondary">50 km</Typography>
              </Box>
            </Box>
            
            <Autocomplete
              multiple
              options={loadingLeagues ? [] : [...availableLeagues, { id: -1, name: '+ Request New League', region: '', ageGroups: [], url: '', hits: 0 }]}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                if (option.id === -1) return option.name || '';
                return option.isPending ? `${option.name} (Under Review)` : (option.name || '');
              }}
              value={userData.preferredLeagues.map(leagueName => {
                const league = availableLeagues.find(l => l.name === leagueName);
                return league || { id: 0, name: leagueName, region: '', ageGroups: [], url: '', hits: 0 };
              })}
              onChange={(_, newValue) => {
                const selectedLeagues = newValue.map(item => {
                  if (typeof item === 'string') return item;
                  if (item.id === -1) {
                    // Open league request dialog
                    setLeagueRequestOpen(true);
                    return null; // Don't add this to the selection
                  }
                  return item.name;
                }).filter(Boolean) as string[];

                setUserData(prev => ({
                  ...prev,
                  preferredLeagues: selectedLeagues
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Preferred Leagues"
                  placeholder="Select preferred leagues..."
                  disabled={loadingLeagues}
                />
              )}
              renderOption={(props, option) => {
                if (option.id === -1) {
                  return (
                    <li {...props} style={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {option.name}
                    </li>
                  );
                }
                const isPending = option.isPending;
                return (
                  <li {...props} style={isPending ? { backgroundColor: '#fff3e0' } : {}}>
                    <Box>
                      <Typography variant="body2">
                        {option.name}
                        {isPending && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, color: 'orange', fontWeight: 'bold' }}>
                            (Under Review)
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.region} • {option.ageGroups?.join(', ') || 'N/A'}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => (
                  <Chip
                    label={option.isPending ? `${option.name} (Under Review)` : option.name}
                    {...getTagProps({ index })}
                    size="small"
                    sx={option.isPending ? {
                      backgroundColor: '#fff3e0',
                      '& .MuiChip-label': { color: '#f57c00' }
                    } : {}}
                  />
                ))
              }
              loading={loadingLeagues}
              disabled={loadingLeagues}
            />
          </Stack>
        </Box>
      )
    },
    {
      id: 'notifications',
      title: 'Stay updated',
      description: 'Choose how you\'d like to be notified about opportunities',
      component: (
        <Box py={2}>
          <Typography variant="h6" gutterBottom>
            Notification preferences
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            We'll send you relevant updates based on your interests
          </Typography>
          
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={userData.notifications.newVacancies}
                  onChange={(e) => setUserData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, newVacancies: e.target.checked }
                  }))}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">New team vacancies</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Get notified when teams in your area are looking for players
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={userData.notifications.matchUpdates}
                  onChange={(e) => setUserData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, matchUpdates: e.target.checked }
                  }))}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Match updates</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Match results, fixture changes, and team news
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={userData.notifications.messages}
                  onChange={(e) => setUserData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, messages: e.target.checked }
                  }))}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Messages and invitations</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Direct messages and trial invitations
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </Box>
      )
    },
    {
      id: 'complete',
      title: 'You\'re all set!',
      description: 'Start exploring and connecting with your local football community',
      component: (
        <Box textAlign="center" py={3}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            You're ready to go!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
            Your profile is set up and you'll start receiving personalized recommendations 
            and notifications based on your preferences.
          </Typography>
          
          <Grid container spacing={2} sx={{ maxWidth: 400, mx: 'auto' }}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => {
                  handleComplete();
                  navigate('/search');
                }}
              >
                Start Searching
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<MapIcon />}
                onClick={() => {
                  handleComplete();
                  navigate('/maps');
                }}
              >
                Explore Maps
              </Button>
            </Grid>
          </Grid>
        </Box>
      )
    }
  ];

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: // Role setup
        return userData.interests.length > 0;
      case 2: // Location setup
        return userData.location.length > 0;
      default:
        return true;
    }
  };

  if (!user || !open) return null;

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
        <IconButton onClick={handleSkipOnboarding} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <DialogContent sx={{ p: 4 }}>
        {/* Progress */}
        <Box sx={{ mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">
              Step {currentStep + 1} of {steps.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% complete
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={((currentStep + 1) / steps.length) * 100}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Current Step */}
        <Box sx={{ minHeight: 400 }}>
          {steps[currentStep].component}
        </Box>

        {/* Navigation */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
          <Button
            onClick={handleBack}
            disabled={currentStep === 0}
            startIcon={<ArrowBackIcon />}
          >
            Back
          </Button>
          
          <Button onClick={handleSkipOnboarding} color="inherit">
            I'll complete my profile myself
          </Button>
          
          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleComplete}
              variant="contained"
              size="large"
            >
              Get Started
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
            >
              {currentStep === 0 ? 'Let\'s Start' : 'Continue'}
            </Button>
          )}
        </Box>
      </DialogContent>

      <LeagueRequestDialog
        open={leagueRequestOpen}
        onClose={() => setLeagueRequestOpen(false)}
        onSuccess={(leagueName?: string) => {
          setLeagueRequestOpen(false);
          // If a league name was provided, add it to the user's preferred leagues
          if (leagueName) {
            setUserData(prev => ({
              ...prev,
              preferredLeagues: [...(prev.preferredLeagues || []), leagueName]
            }));
          }
        }}
      />
    </Dialog>
  );
};
