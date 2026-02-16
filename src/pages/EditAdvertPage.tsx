import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
  Grid,
  CircularProgress,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import LocationInput from '../components/LocationInput';
import { Location } from '../types';
import { Home } from '@mui/icons-material';

interface Advert {
  id: number;
  title: string;
  description: string;
  league: string;
  ageGroup: string;
  position?: string;
  positions?: string[];
  location: string;
  locationData?: Location;
  teamId?: number;
  createdAt: string;
}

const EditAdvertPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  const [advert, setAdvert] = useState<Advert | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    league: '',
    ageGroup: '',
    position: '',
    positions: [] as string[],
    location: '',
  });

  const [locationData, setLocationData] = useState<Location | null>(null);

  const ageGroups = [
    'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'Over 20'
  ];

  const positions = [
    'Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Winger', 'Striker', 'Full Back', 'Center Back', 'Attacking Midfielder', 'Defensive Midfielder'
  ];

  const leagues = ['Premier League', 'Championship', 'League One', 'League Two', 'National League', 'Conference', 'FA Cup', 'EFL Cup', 'FA Trophy', 'Other'];

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (id && user) {
      loadAdvert();
    }
  }, [id, user]);

  const loadAdvert = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch the advert - we'll need to determine if it's a vacancy or player availability
      const response = await api.get(`/api/adverts/${id}`);
      const advertData = response.data;
      
      setAdvert(advertData);
      setFormData({
        title: advertData.title || '',
        description: advertData.description || '',
        league: advertData.league || '',
        ageGroup: advertData.ageGroup || '',
        position: advertData.position || '',
        positions: advertData.positions || [],
        location: advertData.location || '',
      });
      
      if (advertData.locationData) {
        setLocationData(advertData.locationData);
      }
    } catch (err: any) {
      console.error('Error loading advert:', err);
      setError(err.response?.data?.error || 'Failed to load advert');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (location: Location | null) => {
    setLocationData(location);
    if (location) {
      setFormData(prev => ({ ...prev, location: location.address || '' }));
    }
  };

  const handlePositionToggle = (pos: string) => {
    setFormData(prev => {
      const newPositions = prev.positions.includes(pos)
        ? prev.positions.filter(p => p !== pos)
        : [...prev.positions, pos];
      return { ...prev, positions: newPositions };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.league || !formData.location) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const updateData = {
        title: formData.title,
        description: formData.description,
        league: formData.league,
        ageGroup: formData.ageGroup,
        position: user?.role === 'Coach' ? formData.position : undefined,
        positions: (user?.role === 'Player' || user?.role === 'Parent/Guardian') ? formData.positions : undefined,
        location: formData.location,
        locationData: locationData,
      };

      await api.put(`/api/adverts/${id}`, updateData);
      setSuccess('Advert updated successfully!');
      setTimeout(() => {
        navigate('/my-adverts');
      }, 1500);
    } catch (err: any) {
      console.error('Error updating advert:', err);
      setError(err.response?.data?.error || 'Failed to update advert');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">Please log in to edit adverts.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!advert) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">Advert not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<Home />}
          onClick={() => navigate('/my-adverts')}
          sx={{ mb: 2 }}
        >
          Back to My Adverts
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Advert
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update your advert details to improve visibility and engagement
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Experienced Goalkeeper Needed"
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={5}
                placeholder="Describe the role, requirements, and what you're looking for..."
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>League</InputLabel>
                <Select
                  name="league"
                  value={formData.league}
                  onChange={handleSelectChange}
                  label="League"
                >
                  {leagues.map(league => (
                    <MenuItem key={league} value={league}>{league}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Age Group</InputLabel>
                <Select
                  name="ageGroup"
                  value={formData.ageGroup}
                  onChange={handleSelectChange}
                  label="Age Group"
                >
                  {ageGroups.map(age => (
                    <MenuItem key={age} value={age}>{age}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {user?.role === 'Coach' ? (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Position (Coaches)</InputLabel>
                  <Select
                    name="position"
                    value={formData.position}
                    onChange={handleSelectChange}
                    label="Position"
                  >
                    {positions.map(pos => (
                      <MenuItem key={pos} value={pos}>{pos}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ) : (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Preferred Positions (Select up to 3 in order of preference)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {positions.map(pos => (
                    <Button
                      key={pos}
                      variant={formData.positions.includes(pos) ? 'contained' : 'outlined'}
                      onClick={() => handlePositionToggle(pos)}
                      size="small"
                    >
                      {pos}
                    </Button>
                  ))}
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <LocationInput
                onChange={handleLocationChange}
                value={formData.location}
                label="Location"
                placeholder="Enter location..."
              />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/my-adverts')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default EditAdvertPage;
