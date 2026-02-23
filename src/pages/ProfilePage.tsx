import React, { useEffect, useRef, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Tabs,
  Tab,
  CircularProgress,
  SelectChangeEvent,
  InputAdornment,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Save, Person, Work, ContactMail, History, Lock, Visibility, VisibilityOff, CheckCircle, RadioButtonUnchecked, Close, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI, authAPI, UserProfile, ProfileUpdateData } from '../services/api';
import PlayingHistoryManagement from '../components/PlayingHistoryManagement';
import VerificationBadge from '../components/VerificationBadge';
import { LocationAutocomplete } from '../components/LocationAutocomplete';
import GoogleMapsWrapper from '../components/GoogleMapsWrapper';
import api, { API_URL } from '../services/api';

interface Team {
  id: number;
  teamName: string;
  clubName?: string;
  ageGroup: string;
  league: string;
  teamGender: string;
  userRole: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showCompletionAlert, setShowCompletionAlert] = useState(() => {
    return localStorage.getItem('profileCompletionAlertDismissed') !== 'true';
  });
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  
  // Form state
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    location: '',
    bio: '',
    position: '',
    preferredFoot: undefined,
    height: undefined,
    weight: undefined,
    experienceLevel: undefined,
    availability: [],
    coachingLicense: '',
    yearsExperience: undefined,
    specializations: [],
    trainingLocation: '',
    matchLocation: '',
    trainingDays: [],
    ageGroupsCoached: [],
    teamName: '',
    currentAgeGroup: '',
    trainingTime: '',
    matchDay: '',
    emergencyContact: '',
    emergencyPhone: '',
    medicalInfo: '',
  });

  // Options for dropdowns
  const positions = [
    'Goalkeeper', 'Centre-back', 'Left-back', 'Right-back', 'Defensive Midfielder',
    'Central Midfielder', 'Attacking Midfielder', 'Left Wing', 'Right Wing',
    'Striker', 'Centre Forward'
  ];

  const experienceLevels = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
  
  const availabilityOptions = [
    'Monday Morning', 'Monday Evening', 'Tuesday Morning', 'Tuesday Evening',
    'Wednesday Morning', 'Wednesday Evening', 'Thursday Morning', 'Thursday Evening',
    'Friday Morning', 'Friday Evening', 'Saturday Morning', 'Saturday Evening',
    'Sunday Morning', 'Sunday Evening'
  ];

  const specializationOptions = [
    'Youth Development', 'Technical Skills', 'Tactical Awareness', 'Physical Conditioning',
    'Goalkeeping', 'Set Pieces', 'Mental Coaching', 'Injury Prevention'
  ];

  const getProfileCompletion = () => {
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth'];
    const roleSpecificFields = user?.role === 'Player' 
      ? ['position', 'preferredFoot', 'experienceLevel']
      : user?.role === 'Coach'
      ? ['coachingLicense', 'yearsExperience', 'teamName']
      : [];
    
    const allFields = [...requiredFields, ...roleSpecificFields, 'location', 'bio'];
    const completedFields = allFields.filter(field => {
      const value = profileData[field as keyof ProfileUpdateData];
      return value !== undefined && value !== '' && value !== null;
    });
    
    const percentage = Math.round((completedFields.length / allFields.length) * 100);
    const checklist = [
      { field: 'firstName', label: 'First Name', completed: !!profileData.firstName },
      { field: 'lastName', label: 'Last Name', completed: !!profileData.lastName },
      { field: 'dateOfBirth', label: 'Date of Birth', completed: !!profileData.dateOfBirth },
      { field: 'location', label: 'Location', completed: !!profileData.location },
      { field: 'bio', label: 'Bio', completed: !!profileData.bio },
    ];
    
    if (user?.role === 'Player') {
      checklist.push(
        { field: 'position', label: 'Playing Position', completed: !!profileData.position },
        { field: 'preferredFoot', label: 'Preferred Foot', completed: !!profileData.preferredFoot },
        { field: 'experienceLevel', label: 'Experience Level', completed: !!profileData.experienceLevel }
      );
    } else if (user?.role === 'Coach') {
      checklist.push(
        { field: 'coachingLicense', label: 'Coaching License', completed: !!profileData.coachingLicense },
        { field: 'yearsExperience', label: 'Years of Experience', completed: !!profileData.yearsExperience },
        { field: 'teamName', label: 'Team Name', completed: !!profileData.teamName }
      );
    }
    
    return { percentage, checklist };
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (lastLoadedUserIdRef.current === user.id) {
      return;
    }

    lastLoadedUserIdRef.current = user.id;
    loadProfile();
    if (user.role === 'Coach') {
      loadTeams();
    }
  }, [user, navigate]);

  const handleDismissCompletionAlert = () => {
    localStorage.setItem('profileCompletionAlertDismissed', 'true');
    setShowCompletionAlert(false);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(`tab-${newValue}`);
      setShowUnsavedDialog(true);
    } else {
      setTabValue(newValue);
    }
  };

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
    
    if (pendingNavigation?.startsWith('tab-')) {
      const tabIndex = parseInt(pendingNavigation.split('-')[1]);
      setTabValue(tabIndex);
    }
    setPendingNavigation(null);
    loadProfile();
  };

  const handleKeepEditing = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const apiPrefix = API_URL ? '' : '/api';
      const response = await api.get(`${apiPrefix}/teams`);
      const teamsData = response.data.teams || response.data || [];
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (error: any) {
      console.error('Error loading teams:', error);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await profileAPI.get();
      setProfile(response.profile);
      
      // Parse JSON fields and populate form
      const profileResponse = response.profile;
      const normalizedDob = profileResponse.dateofbirth
        ? new Date(profileResponse.dateofbirth).toISOString().split('T')[0]
        : '';

      console.log('DOB load:', {
        raw: profileResponse.dateofbirth,
        normalized: normalizedDob
      });
      
      setProfileData({
        firstName: profileResponse.firstname || '',
        lastName: profileResponse.lastname || '',
        dateOfBirth: normalizedDob,
        location: profileResponse.location || '',
        bio: profileResponse.bio || '',
        position: profileResponse.position || '',
        preferredFoot: profileResponse.preferredfoot,
        height: profileResponse.height,
        weight: profileResponse.weight,
        experienceLevel: profileResponse.experiencelevel,
        availability: profileResponse.availability || [],
        coachingLicense: profileResponse.coachinglicense || '',
        yearsExperience: profileResponse.yearsexperience,
        specializations: profileResponse.specializations || [],
        trainingLocation: profileResponse.traininglocation || '',
        matchLocation: profileResponse.matchlocation || '',
        trainingDays: profileResponse.trainingDays || [],
        ageGroupsCoached: profileResponse.ageGroupsCoached || [],
        teamName: profileResponse.teamname || '',
        currentAgeGroup: profileResponse.currentagegroup || '',
        trainingTime: profileResponse.trainingtime || '',
        matchDay: profileResponse.matchday || '',
        emergencyContact: profileResponse.emergencycontact || '',
        emergencyPhone: profileResponse.emergencyphone || '',
        medicalInfo: profileResponse.medicalinfo || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileUpdateData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setProfileData(prev => ({
      ...prev,
      [field]: field === 'height' || field === 'weight' || field === 'yearsExperience' 
        ? (value === '' ? undefined : parseInt(value)) 
        : value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSelectChange = (field: keyof ProfileUpdateData) => (
    e: SelectChangeEvent<any>
  ) => {
    setProfileData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setHasUnsavedChanges(true);
  };

  const handleMultiSelectChange = (field: keyof ProfileUpdateData) => (
    e: SelectChangeEvent<string[]>
  ) => {
    const value = e.target.value;
    setProfileData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value.split(',') : value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setError('');
      
      // Filter out empty strings and undefined values for optional fields only
      // Required fields: firstName, lastName, dateOfBirth
      const requiredFields = ['firstName', 'lastName', 'dateOfBirth'];
      const cleanedProfileData = Object.fromEntries(
        Object.entries(profileData).filter(([key, value]) => {
          // Always include required fields
          if (requiredFields.includes(key)) return true;
          // Filter out empty/undefined optional fields
          if (value === undefined || value === '') return false;
          if (Array.isArray(value) && value.length === 0) return false;
          return true;
        })
      );
      
      console.log('DOB save:', {
        value: profileData.dateOfBirth,
        cleanedValue: cleanedProfileData.dateOfBirth
      });
      console.log('Sending profile data:', cleanedProfileData);
      await profileAPI.update(cleanedProfileData);
      setSuccess(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSuccess(false), 3000);
      
      // Reload profile to get updated data
      await loadProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.errors?.[0]?.msg || 
                          error.response?.data?.message ||
                          error.message || 
                          'Unknown error occurred';
      setError(`Failed to save profile: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setPasswordError('');
      setPasswordSuccess(false);

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError('All fields are required');
        return;
      }

      if (newPassword.length < 8) {
        setPasswordError('New password must be at least 8 characters');
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }

      setIsChangingPassword(true);
      await authAPI.changePassword(currentPassword, newPassword);
      
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (error: any) {
      console.error('Password change error:', error);
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const { percentage: completionPercentage, checklist: completionChecklist } = getProfileCompletion();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          My Profile
        </Typography>
        {user && <VerificationBadge isVerified={user.isVerified || false} verifiedRole={user.role === 'Admin' ? 'Coach' : user.role} />}
      </Box>
      
      {/* Welcome message and profile completion for new users */}
      {!profile?.isprofilecomplete && showCompletionAlert && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          onClose={handleDismissCompletionAlert}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleDismissCompletionAlert}
            >
              <Close fontSize="inherit" />
            </IconButton>
          }
        >
          <Typography variant="h6" gutterBottom>
            Welcome to The Grassroots Scout! 🎉
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Complete your profile to get started. This helps us connect you with the right {user?.role === 'Coach' ? 'players' : 'teams'} and opportunities.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                Profile Completion: {completionPercentage}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={completionPercentage} 
                sx={{ 
                  flex: 1, 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'grey.300',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: completionPercentage < 50 ? 'error.main' : completionPercentage < 80 ? 'warning.main' : 'success.main'
                  }
                }} 
              />
            </Box>
            <List dense>
              {completionChecklist.map((item) => (
                <ListItem key={item.field} disableGutters sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {item.completed ? (
                      <CheckCircle fontSize="small" color="success" />
                    ) : (
                      <RadioButtonUnchecked fontSize="small" color="disabled" />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label} 
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      color: item.completed ? 'text.primary' : 'text.secondary'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Profile updated successfully!
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<Person />} label="Basic Information" />
            {user?.role === 'Player' && <Tab icon={<Work />} label="Player Details" />}
            {user?.role === 'Coach' && <Tab icon={<Work />} label="Team Details" />}
            {user?.role === 'Player' && <Tab icon={<History />} label="Playing History" />}
            <Tab icon={<ContactMail />} label="Contact & Emergency" />
            <Tab icon={<Lock />} label="Security" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={profileData.firstName}
                onChange={handleInputChange('firstName')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={profileData.lastName}
                onChange={handleInputChange('lastName')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={user?.email || ''}
                disabled
                helperText="Contact support to change your email"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={profileData.dateOfBirth}
                onChange={handleInputChange('dateOfBirth')}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  max: new Date().toISOString().split('T')[0],
                }}
                required
                error={!profileData.dateOfBirth}
                helperText={!profileData.dateOfBirth ? 'Date of birth is required' : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <GoogleMapsWrapper>
                <LocationAutocomplete
                  fullWidth
                  label="Location"
                  value={profileData.location || ''}
                  onChange={(address) => {
                    setProfileData(prev => ({
                      ...prev,
                      location: address
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="City, County"
                />
              </GoogleMapsWrapper>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Bio"
                value={profileData.bio}
                onChange={handleInputChange('bio')}
                placeholder="Tell us about yourself..."
                helperText={`${profileData.bio?.length || 0}/500 characters`}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {user?.role === 'Player' && (
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Player Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Position</InputLabel>
                  <Select
                    value={profileData.position || ''}
                    onChange={handleSelectChange('position')}
                    label="Position"
                  >
                    {positions.map((position) => (
                      <MenuItem key={position} value={position}>
                        {position}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Foot</InputLabel>
                  <Select
                    value={profileData.preferredFoot || ''}
                    onChange={handleSelectChange('preferredFoot')}
                    label="Preferred Foot"
                  >
                    <MenuItem value="Left">Left</MenuItem>
                    <MenuItem value="Right">Right</MenuItem>
                    <MenuItem value="Both">Both</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Height (cm)"
                  type="number"
                  value={profileData.height || ''}
                  onChange={handleInputChange('height')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Weight (kg)"
                  type="number"
                  value={profileData.weight || ''}
                  onChange={handleInputChange('weight')}
                  inputProps={{ min: 30, max: 200 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Experience Level</InputLabel>
                  <Select
                    value={profileData.experienceLevel || ''}
                    onChange={handleSelectChange('experienceLevel')}
                    label="Experience Level"
                  >
                    {experienceLevels.map((level) => (
                      <MenuItem key={level} value={level}>
                        {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Availability</InputLabel>
                  <Select
                    multiple
                    value={profileData.availability || []}
                    onChange={handleMultiSelectChange('availability')}
                    input={<OutlinedInput label="Availability" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {availabilityOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        <Checkbox checked={(profileData.availability || []).indexOf(option) > -1} />
                        <ListItemText primary={option} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </TabPanel>
        )}

        {user?.role === 'Coach' && (
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                My Teams
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/teams')}
                endIcon={<ArrowForward />}
              >
                Manage Teams
              </Button>
            </Box>

            {loadingTeams ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : teams.length > 0 ? (
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {teams.map((team) => (
                  <Grid item xs={12} key={team.id}>
                    <Paper sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {team.teamName}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            {team.clubName && (
                              <Chip label={team.clubName} size="small" color="primary" variant="outlined" />
                            )}
                            <Chip label={team.ageGroup} size="small" />
                            <Chip label={team.league} size="small" />
                            <Chip label={team.teamGender} size="small" color="secondary" variant="outlined" />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Role: {team.userRole}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info" sx={{ mb: 4 }}>
                You haven't created any teams yet. Click "Manage Teams" to create your first team.
              </Alert>
            )}

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Coaching Profile
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Coaching License"
                  value={profileData.coachingLicense}
                  onChange={handleInputChange('coachingLicense')}
                  placeholder="UEFA A, FA Level 2, etc."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Years of Experience"
                  type="number"
                  value={profileData.yearsExperience || ''}
                  onChange={handleInputChange('yearsExperience')}
                  inputProps={{ min: 0, max: 50 }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Specializations</InputLabel>
                  <Select
                    multiple
                    value={profileData.specializations || []}
                    onChange={handleMultiSelectChange('specializations')}
                    input={<OutlinedInput label="Specializations" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {specializationOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        <Checkbox checked={(profileData.specializations || []).indexOf(option) > -1} />
                        <ListItemText primary={option} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </TabPanel>
        )}

        {/* Playing History Tab - Only for Players */}
        {user?.role === 'Player' && (
          <TabPanel value={tabValue} index={2}>
            <PlayingHistoryManagement />
          </TabPanel>
        )}

        <TabPanel value={tabValue} index={user?.role === 'Player' ? 3 : (user?.role === 'Coach' ? 2 : 1)}>
          <Typography variant="h6" gutterBottom>
            Contact & Emergency Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={profileData.emergencyContact}
                onChange={handleInputChange('emergencyContact')}
                placeholder="Full name of emergency contact"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={profileData.emergencyPhone}
                onChange={handleInputChange('emergencyPhone')}
                placeholder="+1 (555) 123-4567"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Medical Information"
                value={profileData.medicalInfo}
                onChange={handleInputChange('medicalInfo')}
                placeholder="Any medical conditions, allergies, or important health information..."
                helperText="This information will be kept confidential and used only for safety purposes"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Tab - Password Change */}
        <TabPanel value={tabValue} index={user?.role === 'Player' ? 4 : (user?.role === 'Coach' ? 3 : 2)}>
          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>
          
          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Password changed successfully!
            </Alert>
          )}
          
          {passwordError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {typeof passwordError === 'string' ? passwordError : JSON.stringify(passwordError)}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type={showCurrentPassword ? "text" : "password"}
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type={showNewPassword ? "text" : "password"}
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                helperText="Must be at least 8 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                startIcon={isChangingPassword ? <CircularProgress size={20} /> : <Lock />}
              >
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              {profile?.isprofilecomplete ? (
                <Chip label="Profile Complete" color="success" variant="outlined" />
              ) : (
                <Chip label="Profile Incomplete" color="warning" variant="outlined" />
              )}
            </Box>
            <Button
              variant="contained"
              startIcon={isSaving ? <CircularProgress size={20} /> : <Save />}
              onClick={handleSaveProfile}
              disabled={isSaving}
              size="large"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Profile completeness reminder */}
      {!profile?.isprofilecomplete && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Complete your profile to get the most out of The Grassroots Scout!
          </Typography>
          <Typography variant="body2">
            A complete profile helps {user?.role === 'Coach' ? 'players find you' : 'coaches discover your talents'} and increases your chances of finding the perfect match.
          </Typography>
        </Alert>
      )}

      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onClose={handleKeepEditing}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. Do you want to discard them?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleKeepEditing} color="primary">
            Keep Editing
          </Button>
          <Button onClick={handleDiscardChanges} color="error" variant="contained">
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfilePage;
