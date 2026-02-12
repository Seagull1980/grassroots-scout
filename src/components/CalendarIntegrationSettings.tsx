import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardActions,
  Grid,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Google,
  Microsoft,
  Apple,
  Settings,
  ExpandMore,
  Add,
  Delete,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { calendarIntegrationService } from '../services/calendarIntegration';
import { 
  CalendarIntegration, 
  AutoSchedulingPreferences
} from '../types/calendar';

interface CalendarIntegrationSettingsProps {
  onClose?: () => void;
}

const CalendarIntegrationSettings: React.FC<CalendarIntegrationSettingsProps> = () => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [preferences, setPreferences] = useState<AutoSchedulingPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);

  useEffect(() => {
    loadIntegrations();
    loadPreferences();
  }, []);

  const loadIntegrations = async () => {
    try {
      // This would be implemented in the backend
      setIntegrations([]);
    } catch (err) {
      console.error('Error loading integrations:', err);
    }
  };

  const loadPreferences = async () => {
    try {
      if (user?.id) {
        const prefs = await calendarIntegrationService.getSchedulingPreferences(user.id);
        setPreferences(prefs);
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      // Set default preferences
      setPreferences({
        userId: user?.id || '',
        preferredTimes: [
          { dayOfWeek: 1, startHour: 18, endHour: 20 }, // Monday 6-8 PM
          { dayOfWeek: 3, startHour: 18, endHour: 20 }, // Wednesday 6-8 PM
          { dayOfWeek: 6, startHour: 10, endHour: 16 }, // Saturday 10 AM-4 PM
        ],
        blackoutDates: [],
        minimumNoticePeriod: 24,
        maximumEventsPerDay: 3,
        preferredLocations: [],
        travelTime: 30,
        autoAcceptTrials: false,
        conflictResolution: 'manual',
      });
    }
  };

  const connectCalendar = async (provider: 'google' | 'outlook' | 'apple') => {
    setLoading(true);
    setError('');
    
    try {
      let integration: CalendarIntegration;
      
      switch (provider) {
        case 'google':
          integration = await calendarIntegrationService.connectGoogleCalendar();
          break;
        case 'outlook':
          integration = await calendarIntegrationService.connectOutlookCalendar();
          break;
        case 'apple':
          // Apple Calendar would require different approach (WebDAV/CalDAV)
          throw new Error('Apple Calendar integration coming soon');
        default:
          throw new Error('Unsupported calendar provider');
      }
      
      setIntegrations(prev => [...prev, integration]);
      setSuccess(`Successfully connected ${provider} calendar!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect calendar');
    } finally {
      setLoading(false);
    }
  };

  const toggleSync = async (integrationId: string, enabled: boolean) => {
    try {
      // API call to toggle sync
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, syncEnabled: enabled }
            : integration
        )
      );
      
      if (enabled) {
        await calendarIntegrationService.syncWithGoogleCalendar(integrationId);
        setSuccess('Calendar sync enabled and completed!');
      }
    } catch (err) {
      setError('Failed to toggle calendar sync');
    }
  };

  const savePreferences = async () => {
    if (!preferences || !user?.id) return;
    
    try {
      await calendarIntegrationService.updateSchedulingPreferences(user.id, preferences);
      setSuccess('Preferences saved successfully!');
      setShowPreferencesDialog(false);
    } catch (err) {
      setError('Failed to save preferences');
    }
  };

  const addPreferredTime = () => {
    if (!preferences) return;
    
    setPreferences(prev => prev ? {
      ...prev,
      preferredTimes: [
        ...prev.preferredTimes,
        { dayOfWeek: 1, startHour: 18, endHour: 20 }
      ]
    } : null);
  };

  const updatePreferredTime = (index: number, field: string, value: number) => {
    if (!preferences) return;
    
    setPreferences(prev => prev ? {
      ...prev,
      preferredTimes: prev.preferredTimes.map((time, i) => 
        i === index ? { ...time, [field]: value } : time
      )
    } : null);
  };

  const removePreferredTime = (index: number) => {
    if (!preferences) return;
    
    setPreferences(prev => prev ? {
      ...prev,
      preferredTimes: prev.preferredTimes.filter((_, i) => i !== index)
    } : null);
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Calendar & Scheduling Integration
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{typeof error === 'string' ? error : JSON.stringify(error)}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Calendar Integrations */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Calendar Integrations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Google Calendar */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Google color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Google Calendar</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Sync with Google Calendar for seamless scheduling
                  </Typography>
                </CardContent>
                <CardActions>
                  {integrations.find(i => i.provider === 'google') ? (
                    <Box display="flex" alignItems="center" width="100%">
                      <Chip label="Connected" color="success" size="small" />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={integrations.find(i => i.provider === 'google')?.syncEnabled || false}
                            onChange={(e) => {
                              const integration = integrations.find(i => i.provider === 'google');
                              if (integration) {
                                toggleSync(integration.id, e.target.checked);
                              }
                            }}
                          />
                        }
                        label="Sync"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => connectCalendar('google')}
                      disabled={loading}
                      startIcon={<Google />}
                    >
                      Connect
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>

            {/* Outlook Calendar */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Microsoft color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Outlook Calendar</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Sync with Outlook/Office 365 calendar
                  </Typography>
                </CardContent>
                <CardActions>
                  {integrations.find(i => i.provider === 'outlook') ? (
                    <Box display="flex" alignItems="center" width="100%">
                      <Chip label="Connected" color="success" size="small" />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={integrations.find(i => i.provider === 'outlook')?.syncEnabled || false}
                            onChange={(e) => {
                              const integration = integrations.find(i => i.provider === 'outlook');
                              if (integration) {
                                toggleSync(integration.id, e.target.checked);
                              }
                            }}
                          />
                        }
                        label="Sync"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => connectCalendar('outlook')}
                      disabled={loading}
                      startIcon={<Microsoft />}
                    >
                      Connect
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>

            {/* Apple Calendar */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Apple sx={{ mr: 1 }} />
                    <Typography variant="h6">Apple Calendar</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Sync with iCloud calendar (coming soon)
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    disabled
                    startIcon={<Apple />}
                  >
                    Coming Soon
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Auto-scheduling Preferences */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Auto-scheduling Preferences</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Button
            variant="outlined"
            onClick={() => setShowPreferencesDialog(true)}
            startIcon={<Settings />}
            sx={{ mb: 2 }}
          >
            Configure Preferences
          </Button>

          {preferences && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Current Settings:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Preferred Times"
                    secondary={`${preferences.preferredTimes.length} time slots configured`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Minimum Notice Period"
                    secondary={`${preferences.minimumNoticePeriod} hours`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Maximum Events Per Day"
                    secondary={preferences.maximumEventsPerDay}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Auto-accept Trials"
                    secondary={preferences.autoAcceptTrials ? 'Enabled' : 'Disabled'}
                  />
                </ListItem>
              </List>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Preferences Dialog */}
      <Dialog
        open={showPreferencesDialog}
        onClose={() => setShowPreferencesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Auto-scheduling Preferences</DialogTitle>
        <DialogContent>
          {preferences && (
            <Box sx={{ pt: 2 }}>
              {/* Preferred Times */}
              <Typography variant="h6" gutterBottom>
                Preferred Times
              </Typography>
              
              {preferences.preferredTimes.map((time, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={3}>
                        <FormControl fullWidth>
                          <InputLabel>Day</InputLabel>
                          <Select
                            value={time.dayOfWeek}
                            onChange={(e) => updatePreferredTime(index, 'dayOfWeek', Number(e.target.value))}
                          >
                            {[0, 1, 2, 3, 4, 5, 6].map(day => (
                              <MenuItem key={day} value={day}>
                                {getDayName(day)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          label="Start Hour"
                          type="number"
                          value={time.startHour}
                          onChange={(e) => updatePreferredTime(index, 'startHour', Number(e.target.value))}
                          inputProps={{ min: 0, max: 23 }}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          label="End Hour"
                          type="number"
                          value={time.endHour}
                          onChange={(e) => updatePreferredTime(index, 'endHour', Number(e.target.value))}
                          inputProps={{ min: 0, max: 23 }}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <IconButton
                          onClick={() => removePreferredTime(index)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
              
              <Button
                variant="outlined"
                onClick={addPreferredTime}
                startIcon={<Add />}
                sx={{ mb: 3 }}
              >
                Add Time Slot
              </Button>

              <Divider sx={{ my: 3 }} />

              {/* Other Preferences */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Minimum Notice Period (hours)"
                    type="number"
                    value={preferences.minimumNoticePeriod}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      minimumNoticePeriod: Number(e.target.value)
                    } : null)}
                    fullWidth
                    helperText="How much advance notice do you need?"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Maximum Events Per Day"
                    type="number"
                    value={preferences.maximumEventsPerDay}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      maximumEventsPerDay: Number(e.target.value)
                    } : null)}
                    fullWidth
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Travel Time Between Events (minutes)"
                    type="number"
                    value={preferences.travelTime}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      travelTime: Number(e.target.value)
                    } : null)}
                    fullWidth
                    helperText="Buffer time needed between events"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Conflict Resolution</InputLabel>
                    <Select
                      value={preferences.conflictResolution}
                      onChange={(e) => setPreferences(prev => prev ? {
                        ...prev,
                        conflictResolution: e.target.value as any
                      } : null)}
                    >
                      <MenuItem value="manual">Manual Review</MenuItem>
                      <MenuItem value="auto_decline">Auto Decline</MenuItem>
                      <MenuItem value="auto_reschedule">Auto Reschedule</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.autoAcceptTrials}
                        onChange={(e) => setPreferences(prev => prev ? {
                          ...prev,
                          autoAcceptTrials: e.target.checked
                        } : null)}
                      />
                    }
                    label="Automatically accept trial invitations (if no conflicts)"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreferencesDialog(false)}>
            Cancel
          </Button>
          <Button onClick={savePreferences} variant="contained">
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarIntegrationSettings;
