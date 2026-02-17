import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Rating,
  Grid,
  Chip,
  Paper,
  Pagination,
  Alert,
  Skeleton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Snackbar
} from '@mui/material';
import {
  Sports as SportsIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { SuccessStory } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const SuccessStoriesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const storiesPerPage = 12;
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitData, setSubmitData] = useState({
    story: '',
    rating: 5,
    role: 'Player',
    teamName: '',
    position: '',
    ageGroup: '',
    league: '',
    isAnonymous: false,
    displayName: ''
  });

  useEffect(() => {
    fetchSuccessStories();
  }, [page]);

  const fetchSuccessStories = async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * storiesPerPage;
      const response = await fetch(`/api/success-stories?limit=${storiesPerPage}&offset=${offset}`);

      if (response.ok) {
        const data = await response.json();
        setStories(data.stories);
        setTotalPages(Math.ceil(data.total / storiesPerPage));
      } else {
        setError('Failed to fetch success stories');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getAgeGroupColor = (ageGroup: string) => {
    if (ageGroup.includes('Under')) {
      const age = parseInt(ageGroup.replace('Under ', ''));
      if (age <= 10) return 'primary';
      if (age <= 16) return 'secondary';
      return 'info';
    }
    return 'default';
  };

  const handleOpenSubmit = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSubmitError('');
    setSubmitSuccess('');
    const fallbackName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || '';
    setSubmitData((prev) => ({
      ...prev,
      displayName: prev.displayName || fallbackName
    }));
    setSubmitOpen(true);
  };

  const handleSubmitStory = async () => {
    setSubmitError('');
    setSubmitSuccess('');

    if (!submitData.story.trim()) {
      setSubmitError('Please share your story.');
      return;
    }

    if (!submitData.isAnonymous && !submitData.displayName.trim()) {
      setSubmitError('Please enter a display name or choose anonymous.');
      return;
    }

    try {
      setSubmitLoading(true);
      const response = await fetch('/api/success-stories/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          story: submitData.story,
          rating: submitData.rating,
          role: submitData.role,
          teamName: submitData.teamName || undefined,
          position: submitData.position || undefined,
          ageGroup: submitData.ageGroup || undefined,
          league: submitData.league || undefined,
          isAnonymous: submitData.isAnonymous,
          displayName: submitData.isAnonymous ? undefined : submitData.displayName
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data?.error || data?.errors?.[0]?.msg || 'Failed to submit success story.';
        setSubmitError(errorMessage);
        return;
      }

      setSubmitSuccess('Your story has been submitted for admin approval.');
      setSubmitData({
        story: '',
        rating: 5,
        role: 'Player',
        teamName: '',
        position: '',
        ageGroup: '',
        league: '',
        isAnonymous: false,
        displayName: ''
      });
      setSubmitOpen(false);
    } catch (submitErr) {
      setSubmitError('Network error occurred while submitting your story.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && stories.length === 0) {
    return (
      <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
        <PageHeader
          title="Success Stories"
          subtitle="Real stories from players and coaches who found their perfect match through The Grassroots Scout."
          icon={<TrophyIcon sx={{ fontSize: 32 }} />}
          actions={(
            <Button
              variant="outlined"
              onClick={handleOpenSubmit}
              sx={{
                borderColor: 'rgba(255,255,255,0.6)',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.12)' }
              }}
            >
              {user ? 'Share Your Story' : 'Sign in to Share'}
            </Button>
          )}
        />
        <Container maxWidth="lg">
          <Box sx={{ py: 4 }}>
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <Card>
                    <CardContent>
                      <Skeleton variant="text" width="60%" height={32} />
                      <Skeleton variant="text" width="80%" height={24} sx={{ mt: 1 }} />
                      <Skeleton variant="text" width="100%" height={80} sx={{ mt: 2 }} />
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Skeleton variant="rounded" width={60} height={24} />
                        <Skeleton variant="rounded" width={80} height={24} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Success Stories"
        subtitle="Real stories from players and coaches who found their perfect match through The Grassroots Scout."
        icon={<TrophyIcon sx={{ fontSize: 32 }} />}
        actions={(
          <Button
            variant="outlined"
            onClick={handleOpenSubmit}
            sx={{
              borderColor: 'rgba(255,255,255,0.6)',
              color: 'white',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.12)' }
            }}
          >
            {user ? 'Share Your Story' : 'Sign in to Share'}
          </Button>
        )}
      />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </Alert>
        )}

        {stories.length === 0 && !loading ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <SportsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              No Success Stories Yet
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Be the first to share your success story! Complete a match and tell us about your experience.
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Stats Section */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Grid container spacing={3} textAlign="center">
                <Grid item xs={12} sm={4}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {stories.length > 0 ? Math.max(stories.length, 15) : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Successful Matches
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="h4" color="secondary" fontWeight="bold">
                    {stories.length > 0 ? Math.round(stories.reduce((acc, story) => acc + (story.rating || 5), 0) / stories.length * 10) / 10 : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Rating
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {new Set(stories.map(story => story.league)).size || 3}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Leagues
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Success Stories Grid */}
            <Grid container spacing={3}>
              {stories.map((story, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Header with player and team names */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" component="h2" gutterBottom>
                          {story.playerName || 'Community Member'}
                        </Typography>
                        {story.teamName ? (
                          <Typography variant="subtitle1" color="primary" fontWeight="medium">
                            joined {story.teamName}
                          </Typography>
                        ) : (
                          <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                            shared their story
                          </Typography>
                        )}
                      </Box>

                      {/* Rating */}
                      {story.rating && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Rating value={story.rating} readOnly size="small" />
                          <Typography variant="caption" sx={{ ml: 1 }}>
                            ({story.rating}/5)
                          </Typography>
                        </Box>
                      )}

                      {/* Success Story Text */}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          flexGrow: 1, 
                          mb: 2, 
                          fontStyle: 'italic',
                          lineHeight: 1.6,
                          color: 'text.secondary'
                        }}
                      >
                        "{story.successStory}"
                      </Typography>

                      {/* Tags */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {story.position && (
                          <Chip 
                            label={story.position} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        )}
                        {story.ageGroup && (
                          <Chip 
                            label={story.ageGroup} 
                            size="small" 
                            color={getAgeGroupColor(story.ageGroup)}
                            variant="outlined"
                          />
                        )}
                        {story.league && (
                          <Chip 
                            label={story.league} 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {/* Date */}
                      <Typography variant="caption" color="text.secondary">
                        Matched on {formatDate(story.completedAt)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        )}

        {/* Call to Action */}
        <Paper sx={{ p: 4, mt: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="h5" gutterBottom>
            Have Your Own Success Story?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            If you've successfully connected with a team or player through The Grassroots Scout, 
            we'd love to hear about your experience!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete a match through your dashboard and share your story to inspire others in the grassroots football community.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" onClick={handleOpenSubmit}>
              {user ? 'Share Your Story' : 'Sign in to Share'}
            </Button>
          </Box>
        </Paper>

        <Dialog open={submitOpen} onClose={() => setSubmitOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Share Your Success Story</DialogTitle>
          <DialogContent>
            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={submitData.isAnonymous}
                    onChange={(e) =>
                      setSubmitData((prev) => ({
                        ...prev,
                        isAnonymous: e.target.checked,
                        displayName: e.target.checked ? '' : prev.displayName
                      }))
                    }
                  />
                }
                label="Submit anonymously"
              />

              <TextField
                label="Display Name"
                value={submitData.displayName}
                onChange={(e) => setSubmitData((prev) => ({ ...prev, displayName: e.target.value }))}
                disabled={submitData.isAnonymous}
                placeholder="Your name or nickname"
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={submitData.role}
                  onChange={(e) => setSubmitData((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <MenuItem value="Player">Player</MenuItem>
                  <MenuItem value="Coach">Coach</MenuItem>
                  <MenuItem value="Parent/Guardian">Parent/Guardian</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Team Name (optional)"
                value={submitData.teamName}
                onChange={(e) => setSubmitData((prev) => ({ ...prev, teamName: e.target.value }))}
                fullWidth
              />

              <TextField
                label="Position (optional)"
                value={submitData.position}
                onChange={(e) => setSubmitData((prev) => ({ ...prev, position: e.target.value }))}
                fullWidth
              />

              <TextField
                label="Age Group (optional)"
                value={submitData.ageGroup}
                onChange={(e) => setSubmitData((prev) => ({ ...prev, ageGroup: e.target.value }))}
                fullWidth
              />

              <TextField
                label="League (optional)"
                value={submitData.league}
                onChange={(e) => setSubmitData((prev) => ({ ...prev, league: e.target.value }))}
                fullWidth
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Rating (optional)
                </Typography>
                <Rating
                  value={submitData.rating}
                  onChange={(_, value) =>
                    setSubmitData((prev) => ({ ...prev, rating: value || 5 }))
                  }
                />
              </Box>

              <TextField
                label="Your Story"
                value={submitData.story}
                onChange={(e) => setSubmitData((prev) => ({ ...prev, story: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                helperText={`${submitData.story.length}/1000 characters`}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmitStory} disabled={submitLoading}>
              {submitLoading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={!!submitSuccess}
          autoHideDuration={4000}
          onClose={() => setSubmitSuccess('')}
        >
          <Alert severity="success" onClose={() => setSubmitSuccess('')}>
            {submitSuccess}
          </Alert>
        </Snackbar>
        </Box>
      </Container>
    </Box>
  );
};

export default SuccessStoriesPage;
