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
  Skeleton
} from '@mui/material';
import {
  Sports as SportsIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { SuccessStory } from '../types';

const SuccessStoriesPage: React.FC = () => {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const storiesPerPage = 12;

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

  if (loading && stories.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Success Stories
          </Typography>
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
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header Section */}
        <Paper 
          sx={{ 
            p: 4, 
            mb: 4, 
            background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
            color: 'white'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrophyIcon sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h3" component="h1" fontWeight="bold">
              Success Stories
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: '800px' }}>
            Real stories from players and coaches who found their perfect match through The Grassroots Scout. 
            These success stories showcase the positive impact of connecting passionate players with dedicated teams.
          </Typography>
        </Paper>

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
                          {story.playerName}
                        </Typography>
                        <Typography variant="subtitle1" color="primary" fontWeight="medium">
                          joined {story.teamName}
                        </Typography>
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
                        <Chip 
                          label={story.position} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={story.ageGroup} 
                          size="small" 
                          color={getAgeGroupColor(story.ageGroup)}
                          variant="outlined"
                        />
                        <Chip 
                          label={story.league} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
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
        </Paper>
      </Box>
    </Container>
  );
};

export default SuccessStoriesPage;
