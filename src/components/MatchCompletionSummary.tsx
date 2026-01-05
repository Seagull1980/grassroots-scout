import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  LinearProgress,
  Alert,
  Grid,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { MatchCompletion } from '../types';

interface MatchCompletionSummaryProps {
  showTitle?: boolean;
  maxItems?: number;
}

const MatchCompletionSummary: React.FC<MatchCompletionSummaryProps> = ({
  showTitle = true,
  maxItems = 3
}) => {
  const navigate = useNavigate();
  const [completions, setCompletions] = useState<MatchCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompletions();
  }, []);

  const fetchCompletions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/match-completions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompletions(data.completions);
      } else {
        setError('Failed to fetch match completions');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const pendingCompletions = completions.filter(c => c.completionStatus === 'pending');
  const confirmedCompletions = completions.filter(c => c.completionStatus === 'confirmed');
  const recentCompletions = completions.slice(0, maxItems);

  const averageRating = confirmedCompletions.length > 0
    ? confirmedCompletions.reduce((acc, comp) => acc + (comp.rating || 0), 0) / confirmedCompletions.filter(c => c.rating).length
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Match Completions
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">{error}</Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        {showTitle && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Match Completions
            </Typography>
            <Button 
              size="small" 
              onClick={() => navigate('/match-completions')}
              variant="outlined"
            >
              View All
            </Button>
          </Box>
        )}

        {/* Statistics Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {pendingCompletions.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pending
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {confirmedCompletions.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Confirmed
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {averageRating > 0 ? averageRating.toFixed(1) : '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg Rating
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {completions.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Recent Completions */}
        {recentCompletions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <TrendingUpIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No match completions yet. Create your first one when you successfully connect with a team or player!
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ mt: 2 }}
              onClick={() => navigate('/match-completions')}
            >
              Report a Match
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Recent Activity
            </Typography>
            {recentCompletions.map((completion) => (
              <Box
                key={completion.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' }
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {completion.playerName} → {completion.teamName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {completion.position} | {completion.ageGroup}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {completion.rating && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StarIcon fontSize="small" color="warning" />
                      <Typography variant="caption">{completion.rating}</Typography>
                    </Box>
                  )}
                  
                  <Chip
                    icon={completion.completionStatus === 'confirmed' ? <CheckCircleIcon /> : <PendingIcon />}
                    label={completion.completionStatus.toUpperCase()}
                    size="small"
                    color={completion.completionStatus === 'confirmed' ? 'success' : 'warning'}
                  />
                </Box>
              </Box>
            ))}

            {completions.length > maxItems && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button 
                  size="small" 
                  onClick={() => navigate('/match-completions')}
                >
                  View {completions.length - maxItems} More
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Quick Actions */}
        {pendingCompletions.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You have {pendingCompletions.length} pending confirmation{pendingCompletions.length > 1 ? 's' : ''}.
            <Button 
              size="small" 
              sx={{ ml: 1 }}
              onClick={() => navigate('/match-completions')}
            >
              Review
            </Button>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchCompletionSummary;
