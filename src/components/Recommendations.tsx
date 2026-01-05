import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Alert,
  IconButton,
  Skeleton
} from '@mui/material';
import {
  Recommend as RecommendIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Sports as SportsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import SocialShare from './SocialShare';

interface Recommendation {
  type: 'vacancy' | 'player';
  id: number;
  title: string;
  description: string;
  metadata: {
    league?: string;
    position?: string;
    positions?: string[];
    ageGroup: string;
    location: string;
    postedBy: string;
    preferredLeagues?: string;
  };
  score: number;
}

interface RecommendationsProps {
  limit?: number;
  showHeader?: boolean;
}

const Recommendations: React.FC<RecommendationsProps> = ({ 
  limit = 6, 
  showHeader = true 
}) => {
  const navigate = useNavigate();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRecommendations();
  }, [limit]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/recommendations?limit=${limit}`);
      setRecommendations(response.data.recommendations);
    } catch (error: any) {
      setError('Failed to load recommendations');
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (recommendation: Recommendation) => {
    const path = recommendation.type === 'vacancy' 
      ? `/search?tab=vacancies&id=${recommendation.id}`
      : `/search?tab=players&id=${recommendation.id}`;
    navigate(path);

    // Track interaction
    trackInteraction('view_recommendation', recommendation);
  };

  const trackInteraction = async (actionType: string, recommendation: Recommendation) => {
    try {
      await api.post('/engagement/track', {
        actionType,
        targetId: recommendation.id,
        targetType: recommendation.type === 'vacancy' ? 'vacancy' : 'player_availability',
        metadata: {
          recommendationScore: recommendation.score,
          source: 'recommendations_widget'
        }
      });
    } catch (error) {
      console.warn('Failed to track interaction:', error);
    }
  };

  const renderRecommendationCard = (recommendation: Recommendation) => {
    const isVacancy = recommendation.type === 'vacancy';
    
    return (
      <Grid item xs={12} sm={6} md={4} key={`${recommendation.type}-${recommendation.id}`}>
        <Card 
          sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4
            }
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {isVacancy ? (
                <SportsIcon sx={{ color: 'primary.main', mr: 1 }} />
              ) : (
                <PersonIcon sx={{ color: 'secondary.main', mr: 1 }} />
              )}
              <Chip
                label={isVacancy ? 'Team Vacancy' : 'Player Available'}
                color={isVacancy ? 'primary' : 'secondary'}
                size="small"
                variant="outlined"
              />
            </Box>

            <Typography variant="h6" component="h3" gutterBottom>
              {recommendation.title}
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {recommendation.description}
            </Typography>

            <Box sx={{ mb: 2 }}>
              {isVacancy ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SportsIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {recommendation.metadata.position} • {recommendation.metadata.league}
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SportsIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {recommendation.metadata.positions?.join(', ')} • {recommendation.metadata.preferredLeagues}
                    </Typography>
                  </Box>
                </>
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {recommendation.metadata.ageGroup}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {recommendation.metadata.location}
                </Typography>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Posted by {recommendation.metadata.postedBy}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => handleViewDetails(recommendation)}
                sx={{ flexGrow: 1, mr: 1 }}
              >
                View Details
              </Button>
              
              <SocialShare
                shareType={recommendation.type === 'vacancy' ? 'vacancy' : 'player_availability'}
                targetId={recommendation.id}
                title={recommendation.title}
                description={recommendation.description}
                size="small"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderSkeleton = () => {
    return Array.from({ length: limit }).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Skeleton variant="rectangular" height={24} sx={{ mb: 2 }} />
            <Skeleton variant="text" height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
            <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" height={20} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={36} />
          </CardContent>
        </Card>
      </Grid>
    ));
  };

  return (
    <Box>
      {showHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <RecommendIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h5" component="h2">
              Recommended for You
            </Typography>
          </Box>
          
          <IconButton 
            onClick={loadRecommendations}
            disabled={loading}
            sx={{ 
              color: 'primary.main',
              '&:hover': { backgroundColor: 'primary.main', color: 'white' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {loading ? (
          renderSkeleton()
        ) : recommendations.length > 0 ? (
          recommendations.map(renderRecommendationCard)
        ) : (
          <Grid item xs={12}>
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <CardContent>
                <RecommendIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No recommendations available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  We're learning about your preferences. Check back soon for personalized recommendations!
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={loadRecommendations}
                  startIcon={<RefreshIcon />}
                >
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {recommendations.length > 0 && showHeader && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/search')}
            size="large"
          >
            Explore More Opportunities
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Recommendations;
