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
  Chip,
  IconButton,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, People } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { trainingAPI, TrainingSession } from '../services/api';

const TrainingSessionsPage: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    max_spaces: '',
    price: '',
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await trainingAPI.getSessions();
      setSessions(response.sessions);
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
      });
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
      });
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
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingSession) {
        await trainingAPI.updateSession(editingSession.id, {
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          max_spaces: parseInt(formData.max_spaces),
          price: parseFloat(formData.price) || 0,
        });
      } else {
        await trainingAPI.createSession({
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          max_spaces: parseInt(formData.max_spaces),
          price: parseFloat(formData.price) || 0,
        });
      }
      handleCloseDialog();
      loadSessions();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save training session');
    }
  };

  const handleDelete = async (sessionId: number) => {
    if (window.confirm('Are you sure you want to delete this training session?')) {
      try {
        await trainingAPI.deleteSession(sessionId);
        loadSessions();
      } catch (err) {
        setError('Failed to delete training session');
      }
    }
  };

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
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Create Session
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
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
                    <strong>Price:</strong> £{session.price}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <IconButton onClick={() => handleOpenDialog(session)}>
                  <Edit />
                </IconButton>
                <IconButton onClick={() => handleDelete(session.id)}>
                  <Delete />
                </IconButton>
                <Button size="small" startIcon={<People />}>
                  View Bookings
                </Button>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSession ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TrainingSessionsPage;