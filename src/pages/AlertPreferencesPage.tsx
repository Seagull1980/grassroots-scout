import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  FormGroup,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import api from '../services/api';

interface AlertPreferences {
  emailNotifications: boolean;
  newVacancyAlerts: boolean;
  newPlayerAlerts: boolean;
  trialInvitations: boolean;
  weeklyDigest: boolean;
  instantAlerts: boolean;
  preferredLeagues: string[];
  ageGroups: string[];
  positions: string[];
  maxDistance: number;
}

const AlertPreferencesPage: React.FC = () => {
  const [preferences, setPreferences] = useState<AlertPreferences>({
    emailNotifications: true,
    newVacancyAlerts: true,
    newPlayerAlerts: true,
    trialInvitations: true,
    weeklyDigest: true,
    instantAlerts: false,
    preferredLeagues: [],
    ageGroups: [],
    positions: [],
    maxDistance: 50
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Available options
  const leagues = ['Premier League', 'Championship', 'League One', 'League Two', 'National League', 'Sunday League'];
  const ageGroups = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'U21', 'Senior', 'Veterans'];
  const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Winger', 'Striker'];

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/alerts/preferences');
      setPreferences(response.data.preferences);
    } catch (error: any) {
      setError('Failed to load alert preferences');
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      setError('');
      
      await api.put('/alerts/preferences', preferences);
      setMessage('Alert preferences saved successfully!');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchChange = (field: keyof AlertPreferences) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const handleArrayToggle = (field: 'preferredLeagues' | 'ageGroups' | 'positions', value: string) => {
    setPreferences(prev => {
      const currentArray = prev[field] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const handleDistanceChange = (_event: Event, newValue: number | number[]) => {
    setPreferences(prev => ({
      ...prev,
      maxDistance: newValue as number
    }));
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <NotificationsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Alert Preferences
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Customize your notification settings to stay informed about relevant opportunities
          and activities in the grassroots football community.
        </Typography>

        {message && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Basic Notification Settings */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Email Notifications</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.emailNotifications}
                    onChange={handleSwitchChange('emailNotifications')}
                    color="primary"
                  />
                }
                label="Enable email notifications"
              />
              
              <Box sx={{ ml: 4, mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.newVacancyAlerts}
                      onChange={handleSwitchChange('newVacancyAlerts')}
                      disabled={!preferences.emailNotifications}
                      size="small"
                    />
                  }
                  label="New team vacancy alerts"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.newPlayerAlerts}
                      onChange={handleSwitchChange('newPlayerAlerts')}
                      disabled={!preferences.emailNotifications}
                      size="small"
                    />
                  }
                  label="New player availability alerts"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.trialInvitations}
                      onChange={handleSwitchChange('trialInvitations')}
                      disabled={!preferences.emailNotifications}
                      size="small"
                    />
                  }
                  label="Trial invitations"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.weeklyDigest}
                      onChange={handleSwitchChange('weeklyDigest')}
                      disabled={!preferences.emailNotifications}
                      size="small"
                    />
                  }
                  label="Weekly activity digest"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.instantAlerts}
                      onChange={handleSwitchChange('instantAlerts')}
                      disabled={!preferences.emailNotifications}
                      size="small"
                    />
                  }
                  label="Instant alerts (immediate notifications)"
                />
              </Box>
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Filter Preferences */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Alert Filters</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Preferred Leagues
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Only receive alerts for these leagues (leave empty for all leagues)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {leagues.map((league) => (
                  <Chip
                    key={league}
                    label={league}
                    clickable
                    color={preferences.preferredLeagues.includes(league) ? 'primary' : 'default'}
                    onClick={() => handleArrayToggle('preferredLeagues', league)}
                    variant={preferences.preferredLeagues.includes(league) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Age Groups
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Filter alerts by relevant age groups
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {ageGroups.map((ageGroup) => (
                  <Chip
                    key={ageGroup}
                    label={ageGroup}
                    clickable
                    color={preferences.ageGroups.includes(ageGroup) ? 'primary' : 'default'}
                    onClick={() => handleArrayToggle('ageGroups', ageGroup)}
                    variant={preferences.ageGroups.includes(ageGroup) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Positions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Filter alerts by specific playing positions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {positions.map((position) => (
                  <Chip
                    key={position}
                    label={position}
                    clickable
                    color={preferences.positions.includes(position) ? 'primary' : 'default'}
                    onClick={() => handleArrayToggle('positions', position)}
                    variant={preferences.positions.includes(position) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Location Preferences */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Location Settings</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Maximum Distance: {preferences.maxDistance} km
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Only show opportunities within this distance from your location
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={preferences.maxDistance}
                  onChange={handleDistanceChange}
                  min={5}
                  max={200}
                  step={5}
                  marks={[
                    { value: 5, label: '5km' },
                    { value: 50, label: '50km' },
                    { value: 100, label: '100km' },
                    { value: 200, label: '200km' }
                  ]}
                  valueLabelDisplay="auto"
                  color="primary"
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Action Buttons */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={loadPreferences}
            disabled={saving}
          >
            Reset to Saved
          </Button>
          
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : null}
            sx={{ minWidth: 120 }}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </Box>

        {/* Help Text */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>💡 Tip:</strong> Set up your alert preferences to receive personalized notifications 
            about relevant opportunities. You can always adjust these settings later. Weekly digests 
            are sent every Sunday morning to keep you updated on platform activity.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default AlertPreferencesPage;
