import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fab,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  AlertTitle,
} from '@mui/material';
import { CalendarEvent, calendarAPI } from '../services/api';
import {
  CalendarIntegration,
  ConflictDetection,
} from '../types/calendar';
import CalendarIntegrationSettings from './CalendarIntegrationSettings';
// import EnhancedEventDialog from './EnhancedEventDialog'; // Temporarily disabled

import {
  ChevronLeft,
  ChevronRight,
  Add,
  Sports,
  FitnessCenter,
  Event,
  PersonAdd,
  Settings,
  CalendarToday,
  Google,
  Microsoft,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface TrialData {
  title: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
  participants?: string[];
}

// Mock calendar API for now - this should be replaced with the actual calendarAPI import once it supports trials
const mockCalendarAPI = {
  ...calendarAPI,
  createTrial: async (trialData: TrialData) => {
    // Mock API call for trial creation
    return { id: Date.now(), ...trialData };
  },
};

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [conflicts, setConflicts] = useState<ConflictDetection[]>([]);
  
  // View settings
  const [calendarViewType, setCalendarViewType] = useState<'month' | 'week' | 'agenda'>('month');
  
  // Dialog states
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [showIntegrationSettings, setShowIntegrationSettings] = useState(false);
  
  // Calendar Integration states
  const [integrations] = useState<CalendarIntegration[]>([]);
  // const [showEnhancedEventDialog, setShowEnhancedEventDialog] = useState<boolean>(false);
  const [showConflictsDialog, setShowConflictsDialog] = useState<boolean>(false);
  
  // Menu and UI states
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventType: 'training' as 'training' | 'match' | 'trial',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    isRecurring: false,
    recurringPattern: 'weekly' as 'weekly' | 'monthly',
  });

  // Trial form state
  const [trialForm, setTrialForm] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    maxParticipants: 20,
    ageGroup: '',
    positions: [] as string[],
    requirements: '',
  });

  const eventTypes = [
    { value: 'training', label: 'Training Session', icon: <FitnessCenter />, color: 'primary' },
    { value: 'match', label: 'Match', icon: <Sports />, color: 'secondary' },
    { value: 'trial', label: 'Trial', icon: <PersonAdd />, color: 'success' },
  ];

  const positions = [
    'Goalkeeper', 'Centre-back', 'Left-back', 'Right-back', 'Defensive Midfielder',
    'Central Midfielder', 'Attacking Midfielder', 'Left Wing', 'Right Wing',
    'Striker', 'Centre Forward'
  ];

  const ageGroups = [
    'Under 6', 'Under 7', 'Under 8', 'Under 9', 'Under 10', 'Under 11',
    'Under 12', 'Under 13', 'Under 14', 'Under 15', 'Under 16', 'Under 17',
    'Under 18', 'Under 21', 'Senior', 'Veterans'
  ];

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await mockCalendarAPI.getEvents(startDate, endDate);
      
      // Detect conflicts - for now, just initialize empty array
      setConflicts([]);
      
      setEvents(response.events);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setEventForm({
      ...eventForm,
      date: date.toISOString().split('T')[0],
    });
    setTrialForm({
      ...trialForm,
      date: date.toISOString().split('T')[0],
    });
    setShowEventDialog(true);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleAddEvent = async () => {
    try {
      setLoading(true);
      await mockCalendarAPI.createEvent(eventForm);
      setShowEventDialog(false);
      setEventForm({
        title: '',
        description: '',
        eventType: 'training',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        isRecurring: false,
        recurringPattern: 'weekly',
      });
      await loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrial = async () => {
    try {
      setLoading(true);
      const trialData = {
        ...trialForm,
        eventType: 'trial' as const,
        time: `${trialForm.startTime} - ${trialForm.endTime}`,
      };
      await mockCalendarAPI.createTrial(trialData);
      setShowTrialDialog(false);
      setTrialForm({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        maxParticipants: 20,
        ageGroup: '',
        positions: [],
        requirements: '',
      });
      await loadEvents();
    } catch (error) {
      console.error('Error creating trial:', error);
      setError('Failed to create trial');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventTypeConfig = (type: string) => {
    return eventTypes.find(t => t.value === type) || eventTypes[0];
  };

  const renderMonthView = () => {
    const days = getDaysInMonth();
    const today = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Typography>
          <Box>
            <IconButton onClick={handlePrevMonth}>
              <ChevronLeft />
            </IconButton>
            <IconButton onClick={handleNextMonth}>
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={1}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Grid item xs key={day}>
              <Typography variant="subtitle2" align="center" sx={{ py: 1, fontWeight: 'bold' }}>
                {day}
              </Typography>
            </Grid>
          ))}
          
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === today.toDateString();
            const dayEvents = getEventsForDate(date);

            return (
              <Grid item xs key={index}>
                <Card
                  sx={{
                    minHeight: 120,
                    cursor: 'pointer',
                    opacity: isCurrentMonth ? 1 : 0.3,
                    border: isToday ? 2 : 1,
                    borderColor: isToday ? 'primary.main' : 'divider',
                    '&:hover': {
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => handleDateClick(date)}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="body2" align="center" sx={{ fontWeight: isToday ? 'bold' : 'normal' }}>
                      {date.getDate()}
                    </Typography>
                    <Box mt={1}>
                      {dayEvents.slice(0, 3).map((event, eventIndex) => {
                        const typeConfig = getEventTypeConfig(event.eventType);
                        return (
                          <Box key={eventIndex} sx={{ mb: 0.5 }}>
                            <Chip
                              label={event.title}
                              size="small"
                              color={typeConfig.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                              variant="outlined"
                              sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                display: 'block',
                                '& .MuiChip-label': {
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                },
                              }}
                            />
                          </Box>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{dayEvents.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    );
  };

  const renderEventDialog = () => (
    <Dialog open={showEventDialog} onClose={() => setShowEventDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Event />
          Create New Event
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Event Title"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={eventForm.eventType}
                onChange={(e: SelectChangeEvent) => setEventForm({ ...eventForm, eventType: e.target.value as "training" | "match" | "trial" })}
              >
                {eventTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {type.icon}
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={eventForm.date}
              onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Start Time"
              type="time"
              value={eventForm.startTime}
              onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="End Time"
              type="time"
              value={eventForm.endTime}
              onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Location"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowEventDialog(false)}>Cancel</Button>
        <Button onClick={handleAddEvent} variant="contained" disabled={!eventForm.title || loading}>
          Create Event
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderTrialDialog = () => (
    <Dialog open={showTrialDialog} onClose={() => setShowTrialDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PersonAdd />
          Create Trial & Send Invitations
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Trial Title"
              value={trialForm.title}
              onChange={(e) => setTrialForm({ ...trialForm, title: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={trialForm.date}
              onChange={(e) => setTrialForm({ ...trialForm, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Age Group</InputLabel>
              <Select
                value={trialForm.ageGroup}
                onChange={(e: SelectChangeEvent) => setTrialForm({ ...trialForm, ageGroup: e.target.value })}
              >
                {ageGroups.map(group => (
                  <MenuItem key={group} value={group}>{group}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Start Time"
              type="time"
              value={trialForm.startTime}
              onChange={(e) => setTrialForm({ ...trialForm, startTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="End Time"
              type="time"
              value={trialForm.endTime}
              onChange={(e) => setTrialForm({ ...trialForm, endTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Location"
              value={trialForm.location}
              onChange={(e) => setTrialForm({ ...trialForm, location: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Max Participants"
              type="number"
              value={trialForm.maxParticipants}
              onChange={(e) => setTrialForm({ ...trialForm, maxParticipants: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Positions Needed</InputLabel>
              <Select
                multiple
                value={trialForm.positions}
                onChange={(e: SelectChangeEvent<string[]>) => 
                  setTrialForm({ ...trialForm, positions: e.target.value as string[] })
                }
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {positions.map(position => (
                  <MenuItem key={position} value={position}>{position}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={trialForm.description}
              onChange={(e) => setTrialForm({ ...trialForm, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Requirements (Optional)"
              value={trialForm.requirements}
              onChange={(e) => setTrialForm({ ...trialForm, requirements: e.target.value })}
              placeholder="e.g., Bring boots, water bottle, previous experience preferred..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowTrialDialog(false)}>Cancel</Button>
        <Button onClick={handleCreateTrial} variant="contained" disabled={!trialForm.title || loading}>
          Create Trial & Send Invites
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading && events.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading calendar...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Calendar Integration Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday />
            Team Calendar
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            {/* Calendar View Selector */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>View</InputLabel>
              <Select
                value={calendarViewType}
                onChange={(e) => setCalendarViewType(e.target.value as 'month' | 'week' | 'agenda')}
                label="View"
              >
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="week">Week</MenuItem>
                <MenuItem value="agenda">Agenda</MenuItem>
              </Select>
            </FormControl>

            {/* Integration Settings */}
            <IconButton 
              onClick={() => setShowIntegrationSettings(true)}
              color="primary"
              title="Calendar Integration Settings"
            >
              <Settings />
            </IconButton>
          </Box>
        </Box>

        {/* Integration Status */}
        {integrations.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Connected Calendars:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {integrations.map((integration) => (
                <Chip
                  key={integration.id}
                  size="small"
                  label={`${integration.provider} - ${integration.accountEmail}`}
                  color={integration.isActive ? 'success' : 'default'}
                  icon={integration.provider === 'google' ? <Google /> : <Microsoft />}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle>Schedule Conflicts Detected</AlertTitle>
            {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found in your calendar.
            <Button size="small" sx={{ ml: 1 }} onClick={() => setShowConflictsDialog(true)}>
              View Details
            </Button>
          </Alert>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {renderMonthView()}

      {/* Floating Action Button for Coaches - Hidden when dialogs are open */}
      {user?.role === 'Coach' && !showEventDialog && !showTrialDialog && !showIntegrationSettings && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={(e) => setAddMenuAnchor(e.currentTarget)}
        >
          <Add />
        </Fab>
      )}

      {/* Add Menu */}
      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={() => setAddMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setShowEventDialog(true);
          setAddMenuAnchor(null);
        }}>
          <Event sx={{ mr: 1 }} />
          Add Training/Match
        </MenuItem>
        <MenuItem onClick={() => {
          setShowTrialDialog(true);
          setAddMenuAnchor(null);
        }}>
          <PersonAdd sx={{ mr: 1 }} />
          Create Trial
        </MenuItem>
      </Menu>

      {renderEventDialog()}
      {renderTrialDialog()}

      {/* Calendar Integration Settings */}
      <Dialog
        open={showIntegrationSettings}
        onClose={() => setShowIntegrationSettings(false)}
        maxWidth="lg"
        fullWidth
      >
        <CalendarIntegrationSettings
          onClose={() => setShowIntegrationSettings(false)}
        />
      </Dialog>

      {/* Enhanced Event Dialog - Temporarily Disabled */}
      {/* <EnhancedEventDialog
        open={showEnhancedEventDialog}
        onClose={() => setShowEnhancedEventDialog(false)}
        onSave={async (_eventData) => {
          // Handle event save with weather and conflict checking
          setShowEnhancedEventDialog(false);
        }}
        mode="create"
      /> */}

      {/* Conflicts Dialog */}
      <Dialog
        open={showConflictsDialog}
        onClose={() => setShowConflictsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Schedule Conflicts</DialogTitle>
        <DialogContent>
          {conflicts.length === 0 ? (
            <Typography>No conflicts detected.</Typography>
          ) : (
            conflicts.map((conflict, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'warning.main' }}>
                <Typography variant="h6" color="warning.main" gutterBottom>
                  Conflict #{index + 1}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Event:</strong> {conflict.eventId}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Conflicts:</strong> {conflict.conflictingEvents.map(e => e.title).join(', ')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Type:</strong> {conflict.conflictingEvents[0]?.type || 'Unknown'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Severity:</strong> {conflict.conflictingEvents[0]?.severity || 'Unknown'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Suggestions:</strong> {conflict.suggestions.map(s => s.reason).join(', ')}
                </Typography>
                <Box mt={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      // Handle conflict resolution
                      // TODO: Implement conflict resolution
                    }}
                  >
                    Resolve Conflict
                  </Button>
                </Box>
              </Paper>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConflictsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar;
