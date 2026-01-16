import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import { Save, Person, Work, ContactMail, History, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI, authAPI, UserProfile, ProfileUpdateData } from '../services/api';
import PlayingHistoryManagement from '../components/PlayingHistoryManagement';
import VerificationBadge from '../components/VerificationBadge';

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

  const ageGroups = [
    'Under 6', 'Under 7', 'Under 8', 'Under 9', 'Under 10', 'Under 11',
    'Under 12', 'Under 13', 'Under 14', 'Under 15', 'Under 16', 'Under 17',
    'Under 18', 'Under 21', 'Senior', 'Veterans'
  ];

  const matchDayOptions = ['Saturday', 'Sunday', 'Midweek'];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await profileAPI.get();
      setProfile(response.profile);
      
      // Parse JSON fields and populate form
      const profileResponse = response.profile;
      setProfileData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        dateOfBirth: profileResponse.dateOfBirth || '',
        location: profileResponse.location || '',
        bio: profileResponse.bio || '',
        position: profileResponse.position || '',
        preferredFoot: profileResponse.preferredFoot,
        height: profileResponse.height,
        weight: profileResponse.weight,
        experienceLevel: profileResponse.experienceLevel,
        availability: profileResponse.availability || [],
        coachingLicense: profileResponse.coachingLicense || '',
        yearsExperience: profileResponse.yearsExperience,
        specializations: profileResponse.specializations || [],
        trainingLocation: profileResponse.trainingLocation || '',
        matchLocation: profileResponse.matchLocation || '',
        trainingDays: profileResponse.trainingDays || [],
        ageGroupsCoached: profileResponse.ageGroupsCoached || [],
        teamName: profileResponse.teamName || '',
        currentAgeGroup: profileResponse.currentAgeGroup || '',
        trainingTime: profileResponse.trainingTime || '',
        matchDay: profileResponse.matchDay || '',
        emergencyContact: profileResponse.emergencyContact || '',
        emergencyPhone: profileResponse.emergencyPhone || '',
        medicalInfo: profileResponse.medicalInfo || '',
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
  };

  const handleSelectChange = (field: keyof ProfileUpdateData) => (
    e: SelectChangeEvent<any>
  ) => {
    setProfileData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleMultiSelectChange = (field: keyof ProfileUpdateData) => (
    e: SelectChangeEvent<string[]>
  ) => {
    const value = e.target.value;
    setProfileData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value.split(',') : value
    }));
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
      
      console.log('Sending profile data:', cleanedProfileData);
      await profileAPI.update(cleanedProfileData);
      setSuccess(true);
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          My Profile
        </Typography>
        {user && <VerificationBadge isVerified={false} verifiedRole={user.role === 'Admin' ? 'Coach' : user.role} />}
      </Box>
      
      {/* Welcome message for new users */}
      {!profile?.isProfileComplete && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Welcome to The Grassroots Scout! 🎉
          </Typography>
          <Typography variant="body1">
            Complete your profile to get started. This helps us connect you with the right {user?.role === 'Coach' ? 'players' : 'teams'} and opportunities.
          </Typography>
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Profile updated successfully!
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
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
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={profileData.location}
                onChange={handleInputChange('location')}
                placeholder="City, County"
              />
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
            <Typography variant="h6" gutterBottom>
              Team Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Team Name"
                  value={profileData.teamName}
                  onChange={handleInputChange('teamName')}
                  placeholder="e.g., Manchester United FC Youth"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Current Age Group</InputLabel>
                  <Select
                    value={profileData.currentAgeGroup || ''}
                    onChange={handleSelectChange('currentAgeGroup')}
                    label="Current Age Group"
                  >
                    {ageGroups.map((group) => (
                      <MenuItem key={group} value={group}>
                        {group}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Training Location"
                  value={profileData.trainingLocation}
                  onChange={handleInputChange('trainingLocation')}
                  placeholder="Training ground, facility name"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Training Time"
                  value={profileData.trainingTime}
                  onChange={handleInputChange('trainingTime')}
                  placeholder="e.g., Tuesday 6:30 PM, Saturday 10:00 AM"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Match Day</InputLabel>
                  <Select
                    value={profileData.matchDay || ''}
                    onChange={handleSelectChange('matchDay')}
                    label="Match Day"
                  >
                    {matchDayOptions.map((day) => (
                      <MenuItem key={day} value={day}>
                        {day}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Home Match Location"
                  value={profileData.matchLocation}
                  onChange={handleInputChange('matchLocation')}
                  placeholder="Home ground, stadium name"
                />
              </Grid>
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
              {passwordError}
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
              {profile?.isProfileComplete ? (
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
      {!profile?.isProfileComplete && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Complete your profile to get the most out of The Grassroots Scout!
          </Typography>
          <Typography variant="body2">
            A complete profile helps {user?.role === 'Coach' ? 'players find you' : 'coaches discover your talents'} and increases your chances of finding the perfect match.
          </Typography>
        </Alert>
      )}
    </Container>
  );
};

export default ProfilePage;
