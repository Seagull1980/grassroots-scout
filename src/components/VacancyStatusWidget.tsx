import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface VacancyStatus {
  id: number;
  title: string;
  position: string;
  status: 'active' | 'expiring_soon' | 'filled';
  createdAt: string;
  enquiryCount: number;
  daysOld: number;
}

interface VacancyStatusWidgetProps {
  compact?: boolean;
}

const VacancyStatusWidget: React.FC<VacancyStatusWidgetProps> = ({ compact = false }) => {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState<VacancyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    active: 0,
    filled: 0,
    expiring: 0,
  });

  useEffect(() => {
    loadVacancies();
  }, []);

  const loadVacancies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/my-adverts');
      const allVacancies = response.data.vacancies || [];
      
      // Filter and organize vacancies
      const active = allVacancies.filter(
        (v: any) => v.status === 'active' && new Date(v.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
      );
      const expiring = allVacancies.filter(
        (v: any) => v.status === 'active' && new Date(v.createdAt).getTime() <= Date.now() - 25 * 24 * 60 * 60 * 1000
      );
      const filled = allVacancies.filter((v: any) => v.status === 'closed');

      setStats({
        active: active.length,
        expiring: expiring.length,
        filled: filled.length,
      });

      setVacancies([...active, ...expiring].map((v: any) => ({
        id: v.id,
        title: v.title,
        position: v.position || 'General',
        status: expiring.some((ve: any) => ve.id === v.id) ? 'expiring_soon' : 'active',
        createdAt: v.createdAt,
        enquiryCount: v.inquiries_count || 0,
        daysOld: Math.floor(
          (Date.now() - new Date(v.createdAt).getTime()) / (24 * 60 * 60 * 1000)
        ),
      })));
      
      setError('');
    } catch (err: any) {
      console.error('Error loading vacancies:', err);
      setError('Failed to load vacancy status');
    } finally {
      setLoading(false);
    }
  };

  const totalOpenPositions = stats.active + stats.expiring;

  const getStatusColor = (status: VacancyStatus['status']) => {
    const colors: Record<VacancyStatus['status'], 'primary' | 'success' | 'warning' | 'error'> = {
      active: 'success',
      expiring_soon: 'warning',
      filled: 'primary',
    };
    return colors[status];
  };

  const getStatusIcon = (status: VacancyStatus['status']) => {
    const icons = {
      active: <CheckCircleIcon />,
      expiring_soon: <TrendingUpIcon />,
      filled: <CheckCircleIcon />,
    };
    return icons[status];
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6">Vacancy Status</Typography>
          </Box>
          <Chip
            label={`${totalOpenPositions} Open`}
            color={totalOpenPositions > 0 ? 'success' : 'default'}
            icon={<TrendingUpIcon />}
          />
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                {stats.active}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#fff3e0', borderRadius: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#f57c00' }}>
                {stats.expiring}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Expiring Soon
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1565c0' }}>
                {vacancies.reduce((sum, v) => sum + v.enquiryCount, 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Enquiries
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#f3e5f5', borderRadius: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#7b1fa2' }}>
                {stats.filled}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Filled
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Vacancy List */}
        {vacancies.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Open Positions
            </Typography>
            <List sx={{ p: 0, maxHeight: compact ? '300px' : 'auto', overflow: 'auto' }}>
              {vacancies.slice(0, compact ? 3 : undefined).map((vacancy, index) => (
                <ListItem
                  key={vacancy.id}
                  sx={{
                    py: 1,
                    px: 0,
                    borderBottom: index < vacancies.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: getStatusColor(vacancy.status) }}>
                    {getStatusIcon(vacancy.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {vacancy.title}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption">
                          {vacancy.position}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption">
                          {vacancy.enquiryCount} interest{vacancy.enquiryCount !== 1 ? 's' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Chip
                          label={vacancy.status === 'expiring_soon' ? '⏰ Expires soon' : `${vacancy.daysOld}d old`}
                          size="small"
                          variant="outlined"
                          color={getStatusColor(vacancy.status)}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>

            {vacancies.length > 3 && compact && (
              <Button
                fullWidth
                variant="text"
                size="small"
                onClick={() => navigate('/my-adverts')}
                sx={{ mt: 1 }}
              >
                View All ({vacancies.length})
              </Button>
            )}
          </Box>
        ) : (
          <Alert severity="info">
            No open vacancies. Ready to post your first position?
          </Alert>
        )}
      </CardContent>

      {totalOpenPositions === 0 && (
        <CardActions>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => navigate('/post-advert')}
          >
            Post Your First Vacancy
          </Button>
        </CardActions>
      )}
    </Card>
  );
};

export default VacancyStatusWidget;
