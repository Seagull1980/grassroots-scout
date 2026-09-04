import React, { useEffect, useState } from 'react';
import { Alert, Button, Container, Paper, Rating, TextField, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { testimonialAPI, TestimonialRequestSummary } from '../services/api';

const TestimonialRequestPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<TestimonialRequestSummary | null>(null);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    testimonialAPI.getRequest(token)
      .then((result) => setRequest(result.request))
      .catch((err) => setError(err.response?.data?.error || 'This request is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!token || content.trim().length < 10) return;
    setSubmitting(true);
    setError('');
    try {
      await testimonialAPI.submitRequest(token, content.trim(), rating ?? undefined);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit testimonial.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: { xs: 3, sm: 5 } }}>
        {loading ? <Typography>Loading request...</Typography> : submitted ? (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>Your testimonial has been sent privately to the requester.</Alert>
            <Button variant="contained" onClick={() => navigate('/')}>Close</Button>
          </>
        ) : request ? (
          <>
            <Typography variant="h4" gutterBottom>Write a Testimonial</Typography>
            <Typography sx={{ mb: 3 }}>
              {request.firstName} {request.lastName} has asked you to share your experience of working with them.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              fullWidth
              multiline
              minRows={6}
              label="Your testimonial"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              helperText={`${content.length}/1000 characters`}
              inputProps={{ maxLength: 1000 }}
              sx={{ mb: 2 }}
            />
            <Typography component="legend">Optional rating</Typography>
            <Rating value={rating} onChange={(_, value) => setRating(value)} sx={{ mb: 3 }} />
            <Button fullWidth variant="contained" onClick={handleSubmit} disabled={submitting || content.trim().length < 10}>
              {submitting ? 'Submitting...' : 'Submit Testimonial'}
            </Button>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              This testimonial is private until the requester chooses to make it visible.
            </Typography>
          </>
        ) : (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>{error || 'This request is invalid or has expired.'}</Alert>
            <Button variant="outlined" onClick={() => navigate('/')}>Close</Button>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default TestimonialRequestPage;
