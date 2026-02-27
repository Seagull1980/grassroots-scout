/* eslint-disable jsx-a11y/accessible-name, jsx-a11y/select-has-associated-label */
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
  Autocomplete,
  Alert,
  Slider,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
import { leaguesAPI, League, API_URL } from '../services/api';
import { AGE_GROUP_OPTIONS, TEAM_GENDER_OPTIONS } from '../constants/options';
import LeagueRequestDialog from './LeagueRequestDialog';
import { LocationAutocomplete } from './LocationAutocomplete';
import GoogleMapsWrapper from './GoogleMapsWrapper';
import axios from 'axios';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  optional?: boolean;
}

// Helper function to validate date of birth
const validateDateOfBirth = (dob: string): { valid: boolean; error?: string; age?: number } => {
  if (!dob) return { valid: false, error: 'Date of birth is required' };
  
  const birthDate = new Date(dob);
  const today = new Date();
  
  // Check if date is valid
  if (isNaN(birthDate.getTime())) {
    return { valid: false, error: 'Invalid date' };
  }
  
  // Check if date is in the future
  if (birthDate > today) {
    return { valid: false, error: 'Date cannot be in the future' };
  }
  
  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  // Check minimum age (13 for GDPR compliance)
  if (age < 13) {
    return { valid: false, error: 'You must be at least 13 years old', age };
  }
  
  // Check maximum age (reasonable upper limit)
  if (age > 100) {
    return { valid: false, error: 'Please enter a valid date of birth', age };
  }
  
  return { valid: true, age };
};

// Helper function to calculate age from date of birth
const calculateAge = (dob: string): number | null => {
  if (!dob) return null;
  
  const birthDate = new Date(dob);
  const today = new Date();
  
  if (isNaN(birthDate.getTime())) return null;
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  const [dobError, setDobError] = useState<string>('');
  const [clubs, setClubs] = useState<string[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userData, setUserData] = useState({
    interests: [] as string[],
    location: '',
    preferredLeagues: [] as string[],
    searchRadius: 10,
    playingTimePolicy: '' as string,
    dateOfBirth: '',
    phone: '',
    bio: '',
    position: '',
    experienceLevel: '',
    notifications: {
      newVacancies: true,
      matchUpdates: true,
      messages: true
    }
  });

  // Team creation state for coaches
  const [teamData, setTeamData] = useState({
    teamName: '',
    clubName: '',
    ageGroup: '',
    league: '',
    teamGender: 'Mixed'
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
          { id: 1, name: 'County Youth League', region: 'Local' },
          { id: 2, name: 'Sunday League', region: 'Local' },
          { id: 3, name: 'Community League', region: 'Local' },
          { id: 4, name: 'Local Girls League', region: 'Local' },
          { id: 5, name: 'Development League', region: 'Local' }
        ] as League[]);
      } finally {
        setLoadingLeagues(false);
      }
    };

    loadLeagues();
  }, []);

  // Search for existing clubs
  const searchClubs = async (searchTerm: string) => {
    try {
      setLoadingClubs(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL || ''}/api/clubs/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const clubResults = Array.isArray(response.data.clubs) ? response.data.clubs : [];
      setClubs(clubResults.filter(Boolean));
    } catch (error: any) {
      console.error('Error searching clubs:', error);
      setClubs([]);
    } finally {
      setLoadingClubs(false);
    }
  };

  // Reset onboarding state when user changes
  useEffect(() => {
    if (user) {
      // Reset internal state to defaults for new user
      setCurrentStep(0);
      setUserData({
        interests: [] as string[],
        location: '',
        preferredLeagues: [] as string[],
        searchRadius: 10,
        playingTimePolicy: '' as string,
        dateOfBirth: '',
        phone: '',
        bio: '',
        position: '',
        experienceLevel: '',
        notifications: {
          newVacancies: true,
          matchUpdates: true,
          messages: true
        }
      });
      setLocationCoords(null);
      setTeamData({
        teamName: '',
        clubName: '',
        ageGroup: '',
        league: '',
        teamGender: 'Mixed'
      });
    }
  }, [user?.id]);

  // Load saved progress from localStorage
  useEffect(() => {
    if (user) {
      const savedProgress = storage.getItem(`onboarding_progress_${user.id}`);
      if (savedProgress) {
        try {
          const parsed = JSON.parse(savedProgress);
          setUserData(parsed.userData || userData);
          setCurrentStep(parsed.currentStep || 0);
          if (parsed.locationCoords) {
            setLocationCoords(parsed.locationCoords);
          }
        } catch (error) {
          console.error('Failed to load onboarding progress:', error);
        }
      }
    }
  }, [user?.id]); // Only depend on user.id to ensure consistent loading

  // Save progress to localStorage whenever userData or currentStep changes
  useEffect(() => {
    if (user && open) {
      const progress = {
        userData,
        currentStep,
        locationCoords,
        lastSaved: new Date().toISOString()
      };
      storage.setItem(`onboarding_progress_${user.id}`, JSON.stringify(progress));
    }
  }, [userData, currentStep, locationCoords, user, open]);

  // Check if user needs onboarding - show for new registrations and all users on first login after beta access
  useEffect(() => {
    if (user) {
      // Never show onboarding for admins
      if (user.role === 'Admin') {
        setOpen(false);
        return;
      }

      const hasBetaAccess =
        user.betaAccess === true ||
        user.betaAccess === 1 ||
        user.betaAccess === '1';

      if (!hasBetaAccess) {
        setOpen(false);
        return;
      }

      const hasCompletedOnboarding = storage.getItem(`onboarding_completed_${user.id}`);
      const hasSeenOnboarding = storage.getItem(`seen_onboarding_${user.id}`);

      const shouldShowOnboarding = !hasCompletedOnboarding && !hasSeenOnboarding;

      if (!shouldShowOnboarding) {
        storage.removeItem(`new_user_${user.id}`);
        localStorage.removeItem('pending_new_user');
        return;
      }
      
      // Show onboarding after a short delay
      if (shouldShowOnboarding) {
        setTimeout(() => setOpen(true), 1000);
      }
    }
  }, [user]);

  const handleSkipOnboarding = () => {
    if (user) {
      storage.setItem(`onboarding_completed_${user.id}`, 'true');
      storage.removeItem(`new_user_${user.id}`);
      storage.setItem(`seen_onboarding_${user.id}`, 'true');
    }
    setOpen(false);
  };

  const handleComplete = async () => {
    if (user) {
      try {
        // Validate date of birth before saving
        if (userData.dateOfBirth) {
          const dobValidation = validateDateOfBirth(userData.dateOfBirth);
          if (!dobValidation.valid) {
            setSnackbar({ 
              open: true, 
              message: dobValidation.error || 'Invalid date of birth', 
              severity: 'error' 
            });
            return;
          }
        }

        // Save profile data to backend
        const token = localStorage.getItem('token');
        const profileData: any = {};

        // Add profile fields if they exist
        if (userData.location) profileData.location = userData.location;
        if (userData.dateOfBirth) profileData.dateofbirth = userData.dateOfBirth;
        if (userData.phone) profileData.phone = userData.phone;
        if (userData.bio) profileData.bio = userData.bio;
        if (userData.position) profileData.position = userData.position;
        if (userData.experienceLevel) profileData.experiencelevel = userData.experienceLevel;

        // Only save if we have profile data
        if (Object.keys(profileData).length > 0) {
          await axios.put(
            `${API_URL}/api/profile`,
            profileData,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          console.log('✅ Profile data saved from onboarding');
          setSnackbar({ 
            open: true, 
            message: 'Profile saved successfully!', 
            severity: 'success' 
          });
        }

        storage.setItem(`onboarding_completed_${user.id}`, 'true');
        storage.removeItem(`new_user_${user.id}`);
        storage.removeItem(`onboarding_progress_${user.id}`);
        // Mark onboarding as seen for all users granting beta access
        if (user.role !== 'Admin') {
          storage.setItem(`seen_onboarding_${user.id}`, 'true');
        }
        
        // Apply user preferences with actual geocoded location
        if (locationCoords && userData.searchRadius) {
          subscribeToArea(locationCoords.lat, locationCoords.lng, userData.searchRadius);
        }
        
        if (user.role !== 'Coach' && userData.preferredLeagues.length > 0) {
          userData.preferredLeagues.forEach(league => {
            subscribeToLeague(league, '');
          });
        }

        // Create team if coach provided team information
        if (user.role === 'Coach' && teamData.teamName && teamData.ageGroup) {
          try {
            await axios.post(
              `${API_URL}/api/teams`,
              teamData,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            console.log('✅ Team created from onboarding');
            setSnackbar({ 
              open: true, 
              message: 'Team created successfully!', 
              severity: 'success' 
            });
          } catch (error) {
            console.error('Failed to create team from onboarding:', error);
            // Don't block onboarding completion if team creation fails
            // User can create team later from Team Management page
          }
        }
      } catch (error) {
        console.error('Failed to save onboarding data:', error);
        setSnackbar({ 
          open: true, 
          message: 'Failed to save profile. Please try again or update from your profile page later.', 
          severity: 'error' 
        });
        // Don't close dialog on error - let user retry
        return;
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
            ].filter(Boolean).map((interest) => (
              <Grid item xs={12} sm={6} key={interest.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: userData.interests.includes(interest.id) ? 2 : 1,
                    borderColor: userData.interests.includes(interest.id) ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' },
                    '&:focus': { borderColor: 'primary.main', outline: '2px solid', outlineColor: 'primary.main' }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={userData.interests.includes(interest.id)}
                  onClick={() => {
                    setUserData(prev => ({
                      ...prev,
                      interests: prev.interests.includes(interest.id)
                        ? prev.interests.filter(i => i !== interest.id)
                        : [...prev.interests, interest.id]
                    }));
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setUserData(prev => ({
                        ...prev,
                        interests: prev.interests.includes(interest.id)
                          ? prev.interests.filter(i => i !== interest.id)
                          : [...prev.interests, interest.id]
                      }));
                    }
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                    {interest?.icon}
                    <Typography variant="body2">{interest?.label || 'Interest'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )
    },
    {
      id: 'profile-details',
      title: 'Complete Your Profile',
      description: 'Help others learn more about you',
      component: (
        <Box py={2}>
          <Typography variant="h6" gutterBottom>
            Tell us a bit about yourself
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This information helps teams and players find the right matches
          </Typography>
          
          <Stack spacing={3}>
            <Box>
              <TextField
                fullWidth
                label="Date of Birth *"
                type="date"
                value={userData.dateOfBirth}
                onChange={(e) => {
                  const newDob = e.target.value;
                  setUserData(prev => ({ ...prev, dateOfBirth: newDob }));
                  
                  // Validate on change
                  const validation = validateDateOfBirth(newDob);
                  if (!validation.valid && newDob) {
                    setDobError(validation.error || '');
                  } else {
                    setDobError('');
                  }
                }}
                InputLabelProps={{ shrink: true }}
                helperText={dobError || 'Required for age verification and appropriate team matching'}
                error={!!dobError}
                required
              />
              {userData.dateOfBirth && !dobError && (() => {
                const age = calculateAge(userData.dateOfBirth);
                return age !== null ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Age: {age} years old
                  </Typography>
                ) : null;
              })()}
            </Box>

            <TextField
              fullWidth
              label="Phone Number"
              type="tel"
              value={userData.phone}
              onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="e.g., 07123 456789"
              helperText="For contact purposes (optional)"
            />

            {user?.role === 'Player' && (
              <TextField
                fullWidth
                select
                label="Playing Position"
                aria-label="Playing Position"
                value={userData.position}
                onChange={(e) => setUserData(prev => ({ ...prev, position: e.target.value }))}
                inputProps={{ title: 'Playing Position' }}
                SelectProps={{ native: true, title: 'Playing Position' }}
                helperText="Your primary position"
              >
                <option value=""></option>
                <option value="Goalkeeper">Goalkeeper</option>
                <option value="Defender">Defender</option>
                <option value="Midfielder">Midfielder</option>
                <option value="Forward">Forward</option>
                <option value="Winger">Winger</option>
                <option value="Striker">Striker</option>
              </TextField>
            )}

            <TextField
              fullWidth
              select
              label="Experience Level"
              value={userData.experienceLevel}
              onChange={(e) => setUserData(prev => ({ ...prev, experienceLevel: e.target.value }))}
              SelectProps={{ native: true, title: 'Experience Level' }}
              helperText="Your current football experience level"
            >
              <option value=""></option>
              <option value="Grassroots">Grassroots</option>
              <option value="Amateur">Amateur</option>
              <option value="Semi-Pro">Semi-Pro</option>
              <option value="Professional">Professional</option>
            </TextField>

            <TextField
              fullWidth
              label="Bio"
              multiline
              rows={3}
              value={userData.bio}
              onChange={(e) => setUserData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about your football journey, goals, or what you're looking for..."
              helperText="Share what makes you unique (optional)"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Don't worry!</strong> You can update or complete this information anytime from your Profile page.
              </Typography>
            </Alert>
          </Stack>
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
            ].filter(Boolean).map((policy) => (
              <Card
                key={policy.value}
                sx={{
                  cursor: 'pointer',
                  border: userData.playingTimePolicy === policy.value ? 2 : 1,
                  borderColor: userData.playingTimePolicy === policy.value ? 'primary.main' : 'divider',
                  '&:hover': { borderColor: 'primary.main' },
                  '&:focus': { borderColor: 'primary.main', outline: '2px solid', outlineColor: 'primary.main' }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={userData.playingTimePolicy === policy.value}
                onClick={() => {
                  setUserData(prev => ({
                    ...prev,
                    playingTimePolicy: policy.value
                  }));
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setUserData(prev => ({
                      ...prev,
                      playingTimePolicy: policy.value
                    }));
                  }
                }}
              >
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {policy?.label || 'Policy'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {policy?.description || ''}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )
    }] : []),
    // Coach-specific step for creating their first team
    ...(user?.role === 'Coach' ? [{
      id: 'team-creation',
      title: 'Create Your First Team',
      description: 'Set up your team to start recruiting players',
      optional: true,
      component: (
        <Box py={2}>
          <Typography variant="h6" gutterBottom>
            Create Your First Team (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You can skip this and create a team later from the Team Management page
          </Typography>
          
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Team Name"
              value={teamData.teamName}
              onChange={(e) => setTeamData({ ...teamData, teamName: e.target.value })}
              placeholder="e.g., Manchester Youth Eagles"
            />
            <Autocomplete
              fullWidth
              freeSolo
              options={clubs.filter(Boolean)}
              getOptionLabel={(option) => option || ''}
              value={teamData.clubName || null}
              onChange={(_, newValue) => setTeamData({ ...teamData, clubName: newValue || '' })}
              onInputChange={(_, newValue) => {
                setTeamData({ ...teamData, clubName: newValue });
                if (newValue.length >= 1) {
                  searchClubs(newValue);
                } else {
                  setClubs([]);
                }
              }}
              loading={loadingClubs}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Club Name (Optional)"
                  placeholder="e.g., Manchester Athletic Club"
                  helperText="Start typing to search for your club. If found, your team will be linked to it. Otherwise, you can create a new club entry."
                />
              )}
              noOptionsText="No clubs found - you can create a new one"
              disableClearable={false}
            />
            <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2">
                <strong>Club Linking:</strong> We'll search our database for existing clubs. If your club is already registered, your team will be linked to it automatically. This helps keep all your club's teams organized in one place.
              </Typography>
            </Alert>
            <Autocomplete
              fullWidth
              options={AGE_GROUP_OPTIONS}
              value={teamData.ageGroup || null}
              onChange={(_, newValue) => setTeamData({ ...teamData, ageGroup: newValue || '' })}
              renderInput={(params) => (
                <TextField {...params} label="Age Group" />
              )}
              disableClearable={false}
            />
            <Autocomplete
              fullWidth
              options={availableLeagues.map(l => l.name)}
              value={teamData.league || null}
              onChange={(_, newValue) => setTeamData({ ...teamData, league: newValue || '' })}
              inputValue={teamData.league}
              onInputChange={(_, newValue) => setTeamData({ ...teamData, league: newValue })}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="League"
                  helperText={loadingLeagues ? 'Loading leagues...' : 'Start typing to search'}
                />
              )}
              loading={loadingLeagues}
              disableClearable={false}
              filterOptions={(options, state) => {
                const filtered = options.filter(option =>
                  option.toLowerCase().includes(state.inputValue.toLowerCase())
                );
                return filtered;
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Team Gender</InputLabel>
              <Select
                value={teamData.teamGender}
                onChange={(e) => setTeamData({ ...teamData, teamGender: e.target.value })}
              >
                {TEAM_GENDER_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Tip:</strong> Fill in at least the Team Name and Age Group to create your team. You can add more details later.
              </Typography>
            </Alert>
          </Stack>
        </Box>
      )
    }] : []),
    {
      id: 'location-setup',
      title: 'Set your location',
      description: 'Help us show you relevant opportunities nearby',
      component: (
        <GoogleMapsWrapper>
          <Box py={2}>
            <Typography variant="h6" gutterBottom>
              Where are you based?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This helps us show you teams and players in your area
            </Typography>
            
            <Stack spacing={3}>
              <LocationAutocomplete
                fullWidth
                label="Location (City, Town, or Postcode) *"
                required
                value={userData.location}
                onChange={(value) => {
                  setUserData(prev => ({ ...prev, location: value }));
                }}
                onLocationSelect={(location) => {
                  setLocationCoords({ lat: location.lat, lng: location.lng });
                  setUserData(prev => ({ ...prev, location: location.address }));
                }}
                placeholder="e.g., Manchester, London, B1 1AA"
                InputProps={{
                  startAdornment: <LocationIcon sx={{ color: 'text.secondary', mr: 1 }} />
                }}
              />
              
              <Box>
                <Typography variant="body2" gutterBottom>
                  Search radius: {userData.searchRadius} km
                </Typography>
                <Slider
                  value={userData.searchRadius}
                  onChange={(_, newValue) => setUserData(prev => ({ 
                    ...prev, 
                    searchRadius: newValue as number 
                  }))}
                  min={5}
                  max={50}
                  step={1}
                  marks={[
                    { value: 5, label: '5 km' },
                    { value: 25, label: '25 km' },
                    { value: 50, label: '50 km' }
                  ]}
                  valueLabelDisplay="auto"
                  aria-label="Search radius"
                />
              </Box>
              
              {user.role !== 'Coach' && (
                <Autocomplete
                  multiple
                  options={loadingLeagues ? [] : [...availableLeagues, { id: -1, name: '+ Request New League', region: '', url: '', hits: 0 }]}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    if (option.id === -1) return option.name || '';
                    return option.isPending ? `${option.name} (Under Review)` : (option.name || '');
                  }}
                  value={userData.preferredLeagues.map(leagueName => {
                    const league = availableLeagues.find(l => l.name === leagueName);
                    return league || { id: 0, name: leagueName, region: '', url: '', hits: 0 };
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
                        <Box component="li" {...props} sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                          {option.name}
                        </Box>
                      );
                    }
                    const isPending = option.isPending;
                    return (
                      <Box component="li" {...props} sx={isPending ? { backgroundColor: '#fff3e0' } : {}}>
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
                            {option.region || 'Region: N/A'}
                          </Typography>
                        </Box>
                      </Box>
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
              )}

              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  You can adjust your location preferences and add more leagues anytime from your account settings.
                </Typography>
              </Alert>
            </Stack>
          </Box>
        </GoogleMapsWrapper>
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

  const handleSkipStep = () => {
    // Skip current step and move to next
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  if (!user || !open) return null;

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          minHeight: 500,
          zIndex: 1400  // Higher than AppBar (1100) and most other components
        }
      }}
      slotProps={{
        backdrop: {
          sx: {
            zIndex: 1399  // Just below the dialog
          }
        }
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
          {steps && steps.length > 0 && currentStep >= 0 && currentStep < steps.length && steps[currentStep] ? steps[currentStep].component : <Typography>Loading...</Typography>}
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
          
          <Box display="flex" gap={2}>
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <Button onClick={handleSkipStep} color="inherit">
                Skip
              </Button>
            )}
            
            <Button onClick={handleSkipOnboarding} color="inherit" size="small">
              Exit Setup
            </Button>
          </Box>
          
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};
