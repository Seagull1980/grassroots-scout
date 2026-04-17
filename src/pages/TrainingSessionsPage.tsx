import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Stack,
  Chip,
  Divider } from '@mui/material';
import { Add, Edit, Delete, People } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { trainingAPI, TrainingSession, openTrainingAPI, OpenTrainingRegistration } from '../services/api';

type RegistrationStatusFilter = 'all' | OpenTrainingRegistration['status'];

const TrainingSessionsPage: React.FC = () => {
  const { user } = useAuth();
  const isCoach = user?.role === 'Coach' || user?.role === 'Admin';
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [success, setSuccess] = useState('');
  const [myRegistrations, setMyRegistrations] = useState<Record<number, { id: number; status: string; paymentStatus: string } | null>>({});
  const [joiningSessionId, setJoiningSessionId] = useState<number | null>(null);
  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);
  const [registrations, setRegistrations] = useState<OpenTrainingRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationStatusFilter>('all');
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [capacity, setCapacity] = useState<{ maxParticipants: number | null; currentParticipants: number; remaining: number | null } | null>(null);
  const [updatingRegistrationId, setUpdatingRegistrationId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    max_spaces: '',
    price: '',
    price_type: 'per_session' as 'per_session' | 'per_month' | 'free',
    includes_equipment: false,
    includes_facilities: false,
    payment_methods: 'cash,bank_transfer',
    refund_policy: '',
    special_offers: '' });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await trainingAPI.getSessions();
      setSessions(response.sessions);
      // Pre-populate player registration map from inline my_registration field
      const regMap: Record<number, { id: number; status: string; paymentStatus: string } | null> = {};
      response.sessions.forEach(s => { regMap[s.id] = s.my_registration ?? null; });
      setMyRegistrations(regMap);
    } catch (err) {
      setError('Failed to load training sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (session?: TrainingSession) => {
    if (session) {
      setEditingSession(session);
      setFormData({
        title: session.title,
        description: session.description || '',
        date: session.date,
        time: session.time,
        location: session.location,
        max_spaces: session.max_spaces.toString(),
        price: session.price.toString(),
        price_type: session.price_type || 'per_session',
        includes_equipment: session.includes_equipment || false,
        includes_facilities: session.includes_facilities || false,
        payment_methods: session.payment_methods || 'cash,bank_transfer',
        refund_policy: session.refund_policy || '',
        special_offers: session.special_offers || '' });
    } else {
      setEditingSession(null);
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        max_spaces: '',
        price: '',
        price_type: 'per_session',
        includes_equipment: false,
        includes_facilities: false,
        payment_methods: 'cash,bank_transfer',
        refund_policy: '',
        special_offers: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSession(null);
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      max_spaces: '',
      price: '',
      price_type: 'per_session',
      includes_equipment: false,
      includes_facilities: false,
      payment_methods: 'cash,bank_transfer',
      refund_policy: '',
      special_offers: '' });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      if (editingSession) {
        await trainingAPI.updateSession(editingSession.id, {
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          max_spaces: parseInt(formData.max_spaces),
          price: parseFloat(formData.price) || 0,
          price_type: formData.price_type,
          includes_equipment: formData.includes_equipment,
          includes_facilities: formData.includes_facilities,
          payment_methods: formData.payment_methods,
          refund_policy: formData.refund_policy,
          special_offers: formData.special_offers });
      } else {
        await trainingAPI.createSession({
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          max_spaces: parseInt(formData.max_spaces),
          price: parseFloat(formData.price) || 0,
          price_type: formData.price_type,
          includes_equipment: formData.includes_equipment,
          includes_facilities: formData.includes_facilities,
          payment_methods: formData.payment_methods,
          refund_policy: formData.refund_policy,
          special_offers: formData.special_offers });
      }
      handleCloseDialog();
      loadSessions();
      setSuccess(editingSession ? 'Training session updated successfully.' : 'Training session created successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save training session');
    }
  };

  const handleDelete = async (sessionId: number) => {
    if (window.confirm('Are you sure you want to delete this training session?')) {
      try {
        setError('');
        await trainingAPI.deleteSession(sessionId);
        loadSessions();
        setSuccess('Training session deleted successfully.');
      } catch (err) {
        setError('Failed to delete training session');
      }
    }
  };

  const loadRegistrations = async (sessionId: number) => {
    try {
      setRegistrationsLoading(true);
      setError('');
      const response = await openTrainingAPI.getRegistrations(sessionId);
      setRegistrations(response.registrations || []);
      setRegistrationCounts(response.counts || {});
      setCapacity(response.capacity || null);
    } catch (err: any) {
      setRegistrations([]);
      setRegistrationCounts({});
      setCapacity(null);
      const apiError = err?.response?.data?.error;
      setError(apiError || 'Could not load registrations for this session. Ensure this session exists in calendar events.');
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const handleOpenRegistrations = async (session: TrainingSession) => {
    setActiveSession(session);
    setRegistrationsDialogOpen(true);
    await loadRegistrations(session.id);
  };

  const handleCloseRegistrations = () => {
    setRegistrationsDialogOpen(false);
    setActiveSession(null);
    setRegistrations([]);
    setRegistrationCounts({});
    setCapacity(null);
    setRegistrationFilter('all');
    setUpdatingRegistrationId(null);
  };

  const handleUpdateRegistration = async (
    registrationId: number,
    updates: {
      status?: OpenTrainingRegistration['status'];
      paymentStatus?: OpenTrainingRegistration['paymentStatus'];
      dropReason?: string;
    }
  ) => {
    if (!activeSession) return;

    try {
      setUpdatingRegistrationId(registrationId);
      setError('');
      await openTrainingAPI.updateRegistration(activeSession.id, registrationId, updates);
      await loadRegistrations(activeSession.id);
      setSuccess('Registration updated successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update registration.');
    } finally {
      setUpdatingRegistrationId(null);
    }
  };

  const handleCancelRegistration = async (registrationId: number) => {
    if (!activeSession) return;

    try {
      setUpdatingRegistrationId(registrationId);
      setError('');
      await openTrainingAPI.cancelRegistration(activeSession.id, registrationId, 'Cancelled by coach');
      await loadRegistrations(activeSession.id);
      setSuccess('Registration cancelled and spot updated.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to cancel registration.');
    } finally {
      setUpdatingRegistrationId(null);
    }
  };

  const handleJoinSession = async (sessionId: number) => {
    try {
      setJoiningSessionId(sessionId);
      setError('');
      const response = await openTrainingAPI.register(sessionId, { allowWaitlist: true });
      setMyRegistrations(prev => ({
        ...prev,
        [sessionId]: { id: response.registration.id, status: response.registration.status, paymentStatus: response.registration.paymentStatus } }));
      setSuccess(response.message);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to register for this session.');
    } finally {
      setJoiningSessionId(null);
    }
  };

  const handleCancelMyRegistration = async (sessionId: number) => {
    const reg = myRegistrations[sessionId];
    if (!reg) return;
    try {
      setJoiningSessionId(sessionId);
      setError('');
      await openTrainingAPI.cancelRegistration(sessionId, reg.id, 'Cancelled by player');
      setMyRegistrations(prev => ({ ...prev, [sessionId]: null }));
      setSuccess('Registration cancelled.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to cancel registration.');
    } finally {
      setJoiningSessionId(null);
    }
  };

  const filteredRegistrations = registrations.filter(reg => registrationFilter === 'all' || reg.status === registrationFilter);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Training Sessions
        </Typography>
        {isCoach && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Create Session
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {sessions.map((session) => (
          <Grid item xs={12} md={6} lg={4} key={session.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {session.title}
                </Typography>
                {session.description && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {session.description}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>Date:</strong> {new Date(session.date).toLocaleDateString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Time:</strong> {session.time}
                </Typography>
                <Typography variant="body2">
                  <strong>Location:</strong> {session.location}
                </Typography>
                <Typography variant="body2">
                  <strong>Spaces:</strong> {session.max_spaces}
                </Typography>
                {session.price > 0 && (
                  <Typography variant="body2">
                    <strong>Price:</strong> £{session.price} {session.price_type === 'per_month' ? 'per month' : session.price_type === 'free' ? '(Free)' : 'per session'}
                  </Typography>
                )}
                {session.price_type === 'free' && session.price === 0 && (
                  <Typography variant="body2">
                    <strong>Price:</strong> Free
                  </Typography>
                )}
                {(session.includes_equipment || session.includes_facilities) && (
                  <Box mt={1}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Includes:
                    </Typography>
                    {session.includes_equipment && (
                      <Typography variant="body2" sx={{ display: 'inline-block', mr: 2, mb: 1, px: 1, py: 0.5, bgcolor: 'primary.main', color: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                        Equipment
                      </Typography>
                    )}
                    {session.includes_facilities && (
                      <Typography variant="body2" sx={{ display: 'inline-block', mr: 2, mb: 1, px: 1, py: 0.5, bgcolor: 'primary.main', color: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                        Facilities
                      </Typography>
                    )}
                  </Box>
                )}
                {session.payment_methods && (
                  <Typography variant="body2">
                    <strong>Payment:</strong> {session.payment_methods.replace(',', ', ')}
                  </Typography>
                )}
                {session.refund_policy && (
                  <Typography variant="body2">
                    <strong>Refund Policy:</strong> {session.refund_policy}
                  </Typography>
                )}
                {session.special_offers && (
                  <Typography variant="body2">
                    <strong>Special Offers:</strong> {session.special_offers}
                  </Typography>
                )}
                {!isCoach && session.coach_name && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Coach:</strong> {session.coach_name}
                  </Typography>
                )}
                {!isCoach && session.max_spaces > 0 && (
                  <Typography variant="body2">
                    <strong>Spaces:</strong> {session.current_participants}/{session.max_spaces}
                    {session.current_participants >= session.max_spaces
                      ? <Chip label="Full" size="small" color="warning" sx={{ ml: 1 }} />
                      : <Chip label={`${session.max_spaces - session.current_participants} left`} size="small" color="success" sx={{ ml: 1 }} />}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                {isCoach ? (
                  <>
                    <IconButton onClick={() => handleOpenDialog(session)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(session.id)}>
                      <Delete />
                    </IconButton>
                    <Button size="small" startIcon={<People />} onClick={() => handleOpenRegistrations(session)}>
                      Manage Players
                    </Button>
                  </>
                ) : (
                  <>
                    {myRegistrations[session.id] ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={myRegistrations[session.id]!.status.replace(/_/g, ' ')}
                          size="small"
                          color={myRegistrations[session.id]!.status === 'confirmed' ? 'success' : myRegistrations[session.id]!.status === 'waitlisted' ? 'warning' : 'default'}
                        />
                        {!['dropped_out', 'cancelled', 'declined'].includes(myRegistrations[session.id]!.status) && (
                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            disabled={joiningSessionId === session.id}
                            onClick={() => handleCancelMyRegistration(session.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </Stack>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={joiningSessionId === session.id}
                        onClick={() => handleJoinSession(session.id)}
                      >
                        {joiningSessionId === session.id
                          ? 'Joining…'
                          : session.max_spaces > 0 && session.current_participants >= session.max_spaces
                            ? 'Join Waitlist'
                            : 'Join Session'}
                      </Button>
                    )}
                  </>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSession ? 'Edit Training Session' : 'Create Training Session'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Max Spaces"
            type="number"
            value={formData.max_spaces}
            onChange={(e) => setFormData({ ...formData, max_spaces: e.target.value })}
            margin="normal"
            required
            inputProps={{ min: 1 }}
          />
          <TextField
            fullWidth
            label="Price (£)"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            margin="normal"
            inputProps={{ min: 0, step: 0.01 }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Price Type</InputLabel>
            <Select
              value={formData.price_type}
              label="Price Type"
              onChange={(e) => setFormData({ ...formData, price_type: e.target.value as 'per_session' | 'per_month' | 'free' })}
            >
              <MenuItem value="per_session">Per Session</MenuItem>
              <MenuItem value="per_month">Per Month</MenuItem>
              <MenuItem value="free">Free</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              What's Included:
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.includes_equipment}
                  onChange={(e) => setFormData({ ...formData, includes_equipment: e.target.checked })}
                />
              }
              label="Equipment"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.includes_facilities}
                  onChange={(e) => setFormData({ ...formData, includes_facilities: e.target.checked })}
                />
              }
              label="Facilities"
            />
          </Box>
          <TextField
            fullWidth
            label="Payment Methods (comma-separated)"
            value={formData.payment_methods}
            onChange={(e) => setFormData({ ...formData, payment_methods: e.target.value })}
            margin="normal"
            placeholder="cash, bank_transfer, paypal"
          />
          <TextField
            fullWidth
            label="Refund Policy"
            value={formData.refund_policy}
            onChange={(e) => setFormData({ ...formData, refund_policy: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            placeholder="e.g., Full refund up to 24 hours before session"
          />
          <TextField
            fullWidth
            label="Special Offers"
            value={formData.special_offers}
            onChange={(e) => setFormData({ ...formData, special_offers: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            placeholder="e.g., Bring a friend for 20% off"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSession ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={registrationsDialogOpen} onClose={handleCloseRegistrations} maxWidth="md" fullWidth>
        <DialogTitle>
          Player Registrations {activeSession ? `- ${activeSession.title}` : ''}
        </DialogTitle>
        <DialogContent>
          {capacity && (
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
              <Chip label={`Current: ${capacity.currentParticipants}`} color="primary" size="small" />
              <Chip label={`Max: ${capacity.maxParticipants ?? 'No limit'}`} size="small" />
              <Chip label={`Remaining: ${capacity.remaining ?? 'Unlimited'}`} color="success" size="small" />
            </Stack>
          )}

          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
            <Chip label={`All: ${registrations.length}`} size="small" />
            <Chip label={`Pending: ${registrationCounts.pending_confirmation || 0}`} size="small" />
            <Chip label={`Confirmed: ${registrationCounts.confirmed || 0}`} color="success" size="small" />
            <Chip label={`Waitlist: ${registrationCounts.waitlisted || 0}`} color="warning" size="small" />
            <Chip label={`Overdue: ${registrationCounts.payment_overdue || 0}`} color="error" size="small" />
          </Stack>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={registrationFilter}
              label="Status Filter"
              onChange={(e) => setRegistrationFilter(e.target.value as RegistrationStatusFilter)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending_confirmation">Pending confirmation</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="waitlisted">Waitlisted</MenuItem>
              <MenuItem value="payment_pending">Payment pending</MenuItem>
              <MenuItem value="payment_overdue">Payment overdue</MenuItem>
              <MenuItem value="declined">Declined</MenuItem>
              <MenuItem value="dropped_out">Dropped out</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          {registrationsLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={24} />
            </Box>
          ) : filteredRegistrations.length === 0 ? (
            <Alert severity="info">No registrations found for the selected filter.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {filteredRegistrations.map((registration) => {
                const name = `${registration.firstName || ''} ${registration.lastName || ''}`.trim() || `User ${registration.userId}`;
                const isUpdating = updatingRegistrationId === registration.id;

                return (
                  <Card key={registration.id} variant="outlined">
                    <CardContent sx={{ pb: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap">
                        <Typography variant="subtitle1">{name}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip label={registration.status.replace('_', ' ')} size="small" color={registration.status === 'confirmed' ? 'success' : registration.status === 'waitlisted' ? 'warning' : 'default'} />
                          <Chip label={`Payment: ${registration.paymentStatus.replace('_', ' ')}`} size="small" color={registration.paymentStatus === 'paid' ? 'success' : registration.paymentStatus === 'overdue' ? 'error' : 'default'} />
                        </Stack>
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {registration.email || 'No email available'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Registered: {new Date(registration.createdAt).toLocaleString()}
                      </Typography>

                      {registration.paymentDueAt && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Payment due: {new Date(registration.paymentDueAt).toLocaleString()}
                        </Typography>
                      )}
                    </CardContent>

                    <Divider />

                    <CardActions sx={{ flexWrap: 'wrap', gap: 1 }}>
                      <Button size="small" variant="outlined" disabled={isUpdating} onClick={() => handleUpdateRegistration(registration.id, { status: 'confirmed' })}>
                        Confirm
                      </Button>
                      <Button size="small" variant="outlined" disabled={isUpdating} onClick={() => handleUpdateRegistration(registration.id, { status: 'waitlisted' })}>
                        Waitlist
                      </Button>
                      <Button size="small" variant="outlined" disabled={isUpdating} onClick={() => handleUpdateRegistration(registration.id, { paymentStatus: 'overdue', status: 'payment_overdue' })}>
                        Mark Overdue
                      </Button>
                      <Button size="small" color="warning" variant="outlined" disabled={isUpdating} onClick={() => handleUpdateRegistration(registration.id, { status: 'dropped_out', dropReason: 'Dropped by coach' })}>
                        Drop Out
                      </Button>
                      <Button size="small" color="error" variant="text" disabled={isUpdating} onClick={() => handleCancelRegistration(registration.id)}>
                        Cancel
                      </Button>
                    </CardActions>
                  </Card>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRegistrations}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TrainingSessionsPage;
