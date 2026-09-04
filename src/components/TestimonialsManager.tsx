import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Rating,
  Tabs,
  Tab
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { testimonialAPI, Testimonial } from '../services/api';

const TestimonialsManager: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [received, setReceived] = useState<Testimonial[]>([]);
  const [given, setGiven] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [requesting, setRequesting] = useState(false);

  const loadTestimonials = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [receivedResult, givenResult] = await Promise.all([
        testimonialAPI.getReceived(),
        testimonialAPI.getGiven()
      ]);
      setReceived(receivedResult.testimonials || []);
      setGiven(givenResult.testimonials || []);
    } catch (err) {
      console.error('Failed to load testimonials:', err);
      setError('Failed to load testimonials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTestimonials();
  }, []);

  const handleToggleVisibility = async (testimonial: Testimonial) => {
    setUpdatingId(testimonial.id);
    try {
      await testimonialAPI.setVisibility(testimonial.id, !testimonial.isPublic);
      setReceived((prev) =>
        prev.map((item) => (item.id === testimonial.id ? { ...item, isPublic: !item.isPublic } : item))
      );
    } catch (err) {
      console.error('Failed to update testimonial visibility:', err);
      setError('Failed to update visibility. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (testimonialId: number, listType: 'received' | 'given') => {
    setUpdatingId(testimonialId);
    try {
      await testimonialAPI.delete(testimonialId);
      if (listType === 'received') {
        setReceived((prev) => prev.filter((item) => item.id !== testimonialId));
      } else {
        setGiven((prev) => prev.filter((item) => item.id !== testimonialId));
      }
    } catch (err) {
      console.error('Failed to delete testimonial:', err);
      setError('Failed to delete testimonial. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRequest = async () => {
    setRequesting(true);
    setError('');
    try {
      await testimonialAPI.request(recipientEmail.trim());
      setRequestOpen(false);
      setRecipientEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send testimonial request.');
    } finally {
      setRequesting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Testimonials
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Coaches can write testimonials for players, and players or parents/guardians can write testimonials for
        coaches. Choose which received testimonials appear publicly on your profile.
      </Typography>

      <Button variant="contained" onClick={() => setRequestOpen(true)} sx={{ mb: 2 }}>
        Request a Testimonial
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label={`Received (${received.length})`} />
        <Tab label={`Given (${given.length})`} />
      </Tabs>

      {tab === 0 && (
        received.length === 0 ? (
          <Alert severity="info">You haven't received any testimonials yet.</Alert>
        ) : (
          <Stack spacing={2}>
            {received.map((testimonial) => (
              <Paper key={testimonial.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle2">
                        {testimonial.authorFirstName} {testimonial.authorLastName}
                      </Typography>
                      <Chip size="small" label={testimonial.authorRole} variant="outlined" />
                    </Stack>
                    {testimonial.rating && <Rating value={testimonial.rating} readOnly size="small" />}
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {testimonial.content}
                    </Typography>
                  </Box>
                  <Stack alignItems="flex-end" spacing={1}>
                    <IconButton
                      size="small"
                      aria-label="delete testimonial"
                      onClick={() => handleDelete(testimonial.id, 'received')}
                      disabled={updatingId === testimonial.id}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <FormControlLabel
                      labelPlacement="start"
                      control={
                        <Switch
                          size="small"
                          checked={testimonial.isPublic}
                          onChange={() => handleToggleVisibility(testimonial)}
                          disabled={updatingId === testimonial.id}
                        />
                      }
                      label={testimonial.isPublic ? 'Public' : 'Private'}
                    />
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )
      )}

      {tab === 1 && (
        given.length === 0 ? (
          <Alert severity="info">You haven't written any testimonials yet.</Alert>
        ) : (
          <Stack spacing={2}>
            {given.map((testimonial) => (
              <Paper key={testimonial.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle2">
                        For {testimonial.recipientFirstName} {testimonial.recipientLastName}
                      </Typography>
                      <Chip size="small" label={testimonial.recipientRole} variant="outlined" />
                      <Chip
                        size="small"
                        label={testimonial.isPublic ? 'Public on their profile' : 'Not yet public'}
                        color={testimonial.isPublic ? 'success' : 'default'}
                      />
                    </Stack>
                    {testimonial.rating && <Rating value={testimonial.rating} readOnly size="small" />}
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {testimonial.content}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    aria-label="retract testimonial"
                    onClick={() => handleDelete(testimonial.id, 'given')}
                    disabled={updatingId === testimonial.id}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )
      )}

      <Dialog open={requestOpen} onClose={() => setRequestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request a Testimonial</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the email address of a Coach you have worked with. They will receive a private link to write a testimonial. It will not appear publicly until you choose to show it.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="email"
            label="Coach email address"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRequest} disabled={requesting || !recipientEmail.trim()}>
            {requesting ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestimonialsManager;
