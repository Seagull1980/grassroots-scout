import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Snackbar
} from '@mui/material';
import { RateReview as RateReviewIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { testimonialAPI, PublicTestimonial } from '../services/api';

const isTestimonialRolePairAllowed = (authorRole?: string, recipientRole?: string) => {
  if (authorRole === 'Coach') return recipientRole === 'Player';
  if (authorRole === 'Player' || authorRole === 'Parent/Guardian') return recipientRole === 'Coach';
  return false;
};

const PublicProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profileUser, setProfileUser] = useState<{ id: number; firstName: string; lastName: string; role: string } | null>(null);
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [writeOpen, setWriteOpen] = useState(false);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!userId) return;

    const loadPublicProfile = async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = await testimonialAPI.getPublicForUser(Number(userId));
        setProfileUser(result.user);
        setTestimonials(result.testimonials || []);
      } catch (err) {
        console.error('Failed to load public profile:', err);
        setError('This profile could not be found.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPublicProfile();
  }, [userId]);

  const canWriteTestimonial =
    !!user &&
    profileUser !== null &&
    String(user.id) !== String(profileUser.id) &&
    isTestimonialRolePairAllowed(user.role, profileUser.role);

  const handleSubmit = async () => {
    if (!profileUser) return;

    setSubmitError('');
    setIsSubmitting(true);
    try {
      await testimonialAPI.create({
        recipientId: profileUser.id,
        content: content.trim(),
        rating: rating ?? undefined
      });
      setWriteOpen(false);
      setContent('');
      setRating(null);
      setSuccessMessage('Testimonial submitted. It will appear here once the recipient chooses to make it public.');
    } catch (err: any) {
      console.error('Failed to submit testimonial:', err);
      setSubmitError(err?.response?.data?.error || 'Failed to submit testimonial. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !profileUser) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Profile not found.'}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go back</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 64, height: 64 }}>
            {profileUser.firstName?.[0]}{profileUser.lastName?.[0]}
          </Avatar>
          <Box>
            <Typography variant="h5">
              {profileUser.firstName} {profileUser.lastName}
            </Typography>
            <Chip label={profileUser.role} size="small" color="primary" variant="outlined" />
          </Box>
        </Stack>

        {canWriteTestimonial && (
          <Button
            sx={{ mt: 2 }}
            variant="contained"
            startIcon={<RateReviewIcon />}
            onClick={() => setWriteOpen(true)}
          >
            Write a Testimonial
          </Button>
        )}
      </Paper>

      <Typography variant="h6" gutterBottom>
        Testimonials
      </Typography>

      {testimonials.length === 0 ? (
        <Alert severity="info">No public testimonials yet.</Alert>
      ) : (
        <Stack spacing={2}>
          {testimonials.map((testimonial) => (
            <Paper key={testimonial.id} variant="outlined" sx={{ p: 2 }}>
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
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={writeOpen} onClose={() => !isSubmitting && setWriteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Write a Testimonial for {profileUser.firstName}</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Rating
            value={rating}
            onChange={(_, value) => setRating(value)}
            sx={{ mb: 2 }}
          />
          <TextField
            multiline
            minRows={4}
            fullWidth
            autoFocus
            label="Your testimonial"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            helperText={`${content.length}/1000 characters`}
            inputProps={{ maxLength: 1000 }}
            disabled={isSubmitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWriteOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting || content.trim().length < 10}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PublicProfilePage;
