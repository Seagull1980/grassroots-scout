import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  Chip,
  Button,
  Alert,
} from '@mui/material';
import {
  CalendarMonth,
  Event,
  PersonAdd,
  CheckCircle,
  Cancel,
  AccessTime,
  LocationOn,
  Map as MapIcon,
} from '@mui/icons-material';
import Calendar from '../components/Calendar';
import TrainingMapView from '../components/TrainingMapView';
import { useAuth } from '../contexts/AuthContext';
import { calendarAPI } from '../services/api';

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
      id={`calendar-tabpanel-${index}`}
      aria-labelledby={`calendar-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [trialInvitations, setTrialInvitations] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Load calendar events for upcoming events tab
  useEffect(() => {
    if (tabValue === 1) {
      loadCalendarEvents();
    }
  }, [tabValue]);

  // Load trial invitations when component mounts or when player tab is selected
  useEffect(() => {
    if (user?.role === 'Player' && tabValue === 2) {
      loadTrialInvitations();
    }
  }, [user, tabValue]);

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const response = await calendarAPI.getEvents(today, thirtyDaysFromNow);
      setCalendarEvents(response.events || []);
    } catch (err: any) {
      console.error('Error loading calendar events:', err);
      setError('Failed to load upcoming events');
    } finally {
      setLoading(false);
    }
  };

  const loadTrialInvitations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await calendarAPI.getTrialInvitations();
      setTrialInvitations(data.invitations || []);
    } catch (err: any) {
      console.error('Error loading trial invitations:', err);
      setError('Failed to load trial invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleTrialResponse = async (invitationId: number, response: 'accepted' | 'declined') => {
    try {
      setError('');
      await calendarAPI.respondToTrial(invitationId, response);
      setSuccess(`Trial invitation ${response} successfully!`);
      
      // Update the local state to reflect the change
      setTrialInvitations(prev => 
        prev.map(invitation => 
          invitation.id === invitationId 
            ? { ...invitation, status: response }
            : invitation
        )
      );
    } catch (err: any) {
      console.error('Error responding to trial:', err);
      setError(`Failed to ${response} trial invitation`);
    }
  };

  // Filter calendar events to show only upcoming events (within next 30 days)
  const upcomingEvents = calendarEvents
    .filter(event => {
      const eventDate = new Date(event.date);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      return eventDate >= today && eventDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'training': return 'primary';
      case 'match': return 'secondary';
      case 'trial': return 'success';
      default: return 'default';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'training': return <Event />;
      case 'match': return <Event />;
      case 'trial': return <PersonAdd />;
      default: return <Event />;
    }
  };

  const renderTrialInvitations = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Trial Invitations
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      {loading ? (
        <Typography>Loading trial invitations...</Typography>
      ) : trialInvitations.length === 0 ? (
        <Alert severity="info">
          No trial invitations at the moment. Keep checking back for new opportunities!
        </Alert>
      ) : (
        <List>
          {trialInvitations.map((invitation) => (
            <ListItem key={invitation.id} sx={{ mb: 2 }}>
              <Paper sx={{ width: '100%', p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6">{invitation.trial?.title || invitation.trialTitle}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Invited by: {invitation.coach?.firstName} {invitation.coach?.lastName}
                    </Typography>
                  </Box>
                  <Chip
                    label={invitation.status}
                    color={invitation.status === 'accepted' ? 'success' : invitation.status === 'declined' ? 'error' : 'warning'}
                    variant="outlined"
                  />
                </Box>
                
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AccessTime fontSize="small" />
                      <Typography variant="body2">
                        {new Date(invitation.trial?.date || invitation.date).toLocaleDateString()} at {invitation.trial?.startTime || invitation.startTime}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationOn fontSize="small" />
                      <Typography variant="body2">{invitation.trial?.location || invitation.location}</Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Box mb={2}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    Positions: {Array.isArray(invitation.trial?.positions) ? invitation.trial.positions.join(', ') : (invitation.positions || 'Not specified')}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Age Group: {invitation.trial?.ageGroup || invitation.ageGroup}
                  </Typography>
                  {(invitation.trial?.description || invitation.description) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {invitation.trial?.description || invitation.description}
                    </Typography>
                  )}
                  {invitation.message && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                      Coach's message: {invitation.message}
                    </Typography>
                  )}
                </Box>
                
                {invitation.status === 'pending' && (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      size="small"
                      onClick={() => handleTrialResponse(invitation.id, 'accepted')}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      size="small"
                      onClick={() => handleTrialResponse(invitation.id, 'declined')}
                    >
                      Decline
                    </Button>
                  </Box>
                )}
              </Paper>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  const renderUpcomingEvents = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Upcoming Events
      </Typography>
      
      {upcomingEvents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Event sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Upcoming Events
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There are no events scheduled in the next 30 days.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {upcomingEvents.map((event) => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => setTabValue(0)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {getEventTypeIcon(event.eventType || event.type)}
                    <Chip
                      label={event.eventType || event.type}
                      size="small"
                      color={getEventTypeColor(event.eventType || event.type) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {event.title}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AccessTime fontSize="small" />
                    <Typography variant="body2">
                      {new Date(event.date).toLocaleDateString()} at {event.time}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationOn fontSize="small" />
                    <Typography variant="body2">{event.location}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Calendar & Events
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<CalendarMonth />} label="Calendar" />
          <Tab icon={<Event />} label="Upcoming Events" />
          <Tab icon={<MapIcon />} label="Training Map" />
          {user?.role === 'Player' && (
            <Tab icon={<PersonAdd />} label="Trial Invitations" />
          )}
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <Calendar />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {renderUpcomingEvents()}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <TrainingMapView />
      </TabPanel>

      {user?.role === 'Player' && (
        <TabPanel value={tabValue} index={3}>
          {renderTrialInvitations()}
        </TabPanel>
      )}
    </Container>
  );
};

export default CalendarPage;
