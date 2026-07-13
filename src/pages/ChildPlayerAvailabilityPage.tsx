import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Paper,
  Stack,
  IconButton,
  Autocomplete
  , FormControlLabel, Checkbox } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { leaguesAPI } from '../services/api';
import { Location } from '../types';
import { LocationAutocomplete } from '../components/LocationAutocomplete';

interface Child {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  preferredPosition?: string;
}

interface ChildPlayerAvailability {
  id: number;
  childId: number;
  parentId: number;
  title: string;
  description?: string;
  preferredLeagues: string[];
  ageGroup: string;
  positions: string[];
  preferredTeamGender?: string;
  location?: string;
  locationData?: Location;
  availability?: {
    monday?: string[];
    tuesday?: string[];
    wednesday?: string[];
    thursday?: string[];
    friday?: string[];
    saturday?: string[];
    sunday?: string[];
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  firstName?: string;
  lastName?: string;
  shareName?: boolean;
  displayName?: string;
}

interface AvailabilityFormData {
  childId: number;
  title: string;
  description: string;
  preferredLeagues: string[];
  ageGroup: string;
  positions: string[];
  preferredTeamGender: string;
  location: string;
  locationData: Location | null;
  shareName: boolean;
  availability: {
    days: string[];
    timeSlots: string[];
    notes: string;
  };
}

const ChildPlayerAvailabilityPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [availabilities, setAvailabilities] = useState<ChildPlayerAvailability[]>([]);
  const [availableLeagues, setAvailableLeagues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<ChildPlayerAvailability | null>(null);
  const [formData, setFormData] = useState<AvailabilityFormData>({
    childId: 0,
    title: '',
    description: '',
    preferredLeagues: [],
    ageGroup: '',
    positions: [],
    preferredTeamGender: 'Mixed',
    location: '',
    locationData: null,
    shareName: false,
    availability: {
      days: [],
      timeSlots: [],
      notes: ''
    }
  });

  const positions = [
    'Goalkeeper', 'Defender', 'Midfielder', 'Forward',
    'Centre-Back', 'Full-Back', 'Wing-Back', 'Defensive Midfielder',
    'Central Midfielder', 'Attacking Midfielder', 'Winger', 'Striker'
  ];
  const defaultLeagues = [
    'Premier League Youth', 'Championship Youth', 'League One Youth',
    'National League Youth', 'County League', 'District League',
    'Local Sunday League', 'School Football League', 'Academy League'
  ];
  const leagueOptions = ['All Leagues', ...(availableLeagues.length > 0 ? availableLeagues : defaultLeagues)];

  const ageGroups = [
    'Under 6', 'Under 7', 'Under 8', 'Under 9', 'Under 10',
    'Under 11', 'Under 12', 'Under 13', 'Under 14', 'Under 15', 'Under 16'
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const allDayOptions = [...daysOfWeek, 'All Days'];

  const timeSlots = [
    'Morning (6:00-12:00)', 'Afternoon (12:00-18:00)', 'Evening (18:00-22:00)',
    'Weekday Evenings', 'Weekend Mornings', 'Weekend Afternoons'
  ];

  const allTimeSlotOptions = [...timeSlots, 'All Times'];

  useEffect(() => {
    if (user?.role === 'Parent/Guardian') {
      loadData();
    }
  }, [user?.id]); // Only reload when user ID changes (login/logout), not on every user object update

  const loadData = async () => {
    try {
      setLoading(true);
      const [childrenResponse, availabilityResponse] = await Promise.all([
        api.get('/children'),
        api.get('/child-player-availability')
      ]);
      
      setChildren(normalizeChildren(childrenResponse.data.children));
      setAvailabilities(availabilityResponse.data.availability);

      try {
        const leagues = await leaguesAPI.getForSearch(false);
        const leagueNames = Array.from(new Set([
          ...leagues.map((league) => league.name).filter(Boolean),
          ...defaultLeagues
        ]));
        setAvailableLeagues(leagueNames);
      } catch (leagueErr) {
        console.warn('Failed to load leagues from API, using defaults:', leagueErr);
        setAvailableLeagues(defaultLeagues);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const pickFirst = <T,>(source: Record<string, unknown>, keys: string[], fallback: T): T => {
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== '') {
        return value as T;
      }
    }
    return fallback;
  };

  const normalizeDate = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const normalizeChild = (rawChild: Record<string, unknown>): Child => ({
    id: Number(pickFirst(rawChild, ['id'], 0)),
    firstName: String(pickFirst(rawChild, ['firstName', 'firstname', 'first_name'], '')),
    lastName: String(pickFirst(rawChild, ['lastName', 'lastname', 'last_name'], '')),
    dateOfBirth: normalizeDate(pickFirst(rawChild, ['dateOfBirth', 'dateofbirth', 'date_of_birth'], '')),
    preferredPosition: pickFirst(rawChild, ['preferredPosition', 'preferredposition', 'preferred_position'], undefined)
  });

  const normalizeChildren = (rawChildren: unknown): Child[] => {
    if (!Array.isArray(rawChildren)) return [];
    return rawChildren.map((child) => normalizeChild(child as Record<string, unknown>));
  };

  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;

    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return null;

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getAgeGroupFromBirthDate = (dateOfBirth: string): string => {
    const age = calculateAge(dateOfBirth);
    if (age === null) {
      return '';
    }
    return `Under ${age + 1}`;
  };

  const handleInputChange = (field: string, value: unknown) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof AvailabilityFormData] as Record<string, unknown>),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleChildChange = (childId: number) => {
    const selectedChild = children.find(child => child.id === childId);
    if (selectedChild) {
      const suggestedAgeGroup = getAgeGroupFromBirthDate(selectedChild.dateOfBirth);
      const suggestedPositions = selectedChild.preferredPosition ? [selectedChild.preferredPosition] : [];
      
      setFormData(prev => ({
        ...prev,
        childId,
        ageGroup: suggestedAgeGroup || prev.ageGroup,
        positions: suggestedPositions,
        // Default to a neutral title and do not expose child's name unless parent opts in
        title: `${selectedChild.preferredPosition || 'Player'} - Player Available`,
        shareName: false
      }));
    }
  };

  const handleCreateAvailability = async () => {
    try {
      setError('');
      
      // Validate required fields
      if (!formData.childId || !formData.title || !formData.ageGroup || formData.positions.length === 0) {
        setError('Please fill in all required fields');
        return;
      }

      await api.post('/child-player-availability', formData);
      
      setSuccess('Player availability created successfully!');
      setShowAddDialog(false);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error('Error creating availability:', err);
      setError(err.response?.data?.error || 'Failed to create player availability');
    }
  };

  const handleUpdateAvailability = async () => {
    if (!editingAvailability) return;

    try {
      setError('');
      
      // Validate required fields
      if (!formData.title || !formData.ageGroup || formData.positions.length === 0) {
        setError('Please fill in all required fields');
        return;
      }

      await api.put(`/child-player-availability/${editingAvailability.id}`, formData);
      
      setSuccess('Player availability updated successfully!');
      setEditingAvailability(null);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error('Error updating availability:', err);
      setError(err.response?.data?.error || 'Failed to update player availability');
    }
  };

  const handleDeleteAvailability = async (availabilityId: number, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}"?`)) {
      return;
    }

    try {
      await api.delete(`/child-player-availability/${availabilityId}`);
      setSuccess('Player availability removed successfully!');
      loadData();
    } catch (err: any) {
      console.error('Error deleting availability:', err);
      setError(err.response?.data?.error || 'Failed to remove player availability');
    }
  };

  const toggleAvailabilityStatus = async (availability: ChildPlayerAvailability) => {
    try {
      const newStatus = availability.status === 'active' ? 'paused' : 'active';
      await api.put(`/child-player-availability/${availability.id}`, { status: newStatus });
      setSuccess(`Player availability ${newStatus === 'active' ? 'activated' : 'paused'} successfully!`);
      loadData();
    } catch (err: any) {
      console.error('Error toggling availability status:', err);
      setError(err.response?.data?.error || 'Failed to update availability status');
    }
  };

  const resetForm = () => {
    setFormData({
      childId: 0,
      title: '',
      description: '',
      preferredLeagues: [],
      ageGroup: '',
      positions: [],
      preferredTeamGender: 'Mixed',
      location: '',
      locationData: null,
      shareName: false,
      availability: {
        days: [],
        timeSlots: [],
        notes: ''
      }
    });
  };

  const openEditDialog = (availability: ChildPlayerAvailability) => {
    setEditingAvailability(availability);
    setFormData({
      childId: availability.childId,
      title: availability.title,
      description: availability.description || '',
      preferredLeagues: availability.preferredLeagues || [],
      ageGroup: availability.ageGroup,
      positions: availability.positions || [],
      preferredTeamGender: availability.preferredTeamGender || 'Mixed',
      location: availability.location || '',
      locationData: availability.locationData || null,
      shareName: availability.shareName ?? false,
      availability: availability.availability ? {
        days: (availability.availability as any).days || [],
        timeSlots: (availability.availability as any).timeSlots || [],
        notes: (availability.availability as any).notes || ''
      } : {
        days: [],
        timeSlots: [],
        notes: ''
      }
    });
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingAvailability(null);
    resetForm();
    setError('');
  };

  if (user?.role !== 'Parent/Guardian') {
    return (
      <Box p={3}>
        <Alert severity="error">
          Access denied. This page is only available to Parent/Guardian accounts.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Parent View
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowAddDialog(true)}
          disabled={children.length === 0}
        >
          Create Availability
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {children.length === 0 && (
        <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'info.light', backgroundColor: 'info.50' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Add a child profile before posting availability
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Parent/Guardian accounts need at least one child profile before creating availability adverts.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/children')}>
            Go to Manage Children
          </Button>
        </Paper>
      )}

      {loading ? (
        <Typography>Loading player availability...</Typography>
      ) : availabilities.length === 0 && children.length > 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Player Availability Created Yet
          </Typography>
          <Typography color="text.secondary" mb={2}>
            Create player availability postings to help your children connect with football teams and coaches.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            Create First Availability
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {availabilities.map((availability) => (
            <Grid item xs={12} md={6} lg={4} key={availability.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
                      {availability.title}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => toggleAvailabilityStatus(availability)}
                        color={availability.status === 'active' ? 'success' : 'default'}
                        sx={{ mr: 1 }}
                      >
                        {availability.status === 'active' ? <ViewIcon /> : <HideIcon />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(availability)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteAvailability(availability.id, availability.title)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        {availability.displayName ?? (availability.shareName ? `${availability.firstName || ''} ${availability.lastName || ''}`.trim() : 'Anonymous Player')}
                      </Typography>
                      <Chip 
                        label={availability.status.toUpperCase()} 
                        size="small" 
                        color={availability.status === 'active' ? 'success' : 'default'}
                        sx={{ mb: 1 }}
                      />
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Age Group & Positions
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {availability.ageGroup}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {availability.positions.map((position, index) => (
                          <Chip 
                            key={index}
                            label={position} 
                            size="small" 
                            variant="outlined" 
                          />
                        ))}
                      </Stack>
                    </Box>

                    {availability.preferredLeagues && availability.preferredLeagues.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Preferred Leagues
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {availability.preferredLeagues.slice(0, 2).map((league, index) => (
                            <Chip 
                              key={index}
                              label={league} 
                              size="small" 
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                          {availability.preferredLeagues.length > 2 && (
                            <Chip 
                              label={`+${availability.preferredLeagues.length - 2} more`}
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </Box>
                    )}

                    {availability.location && (
                      <Box display="flex" alignItems="center">
                        <LocationIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {availability.location}
                        </Typography>
                      </Box>
                    )}

                    {availability.description && (
                      <Typography variant="body2" color="text.secondary">
                        {availability.description.length > 100 
                          ? `${availability.description.substring(0, 100)}...`
                          : availability.description}
                      </Typography>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(availability.createdAt).toLocaleDateString()}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Availability Dialog */}
      <Dialog 
        open={showAddDialog || editingAvailability !== null} 
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAvailability ? 'Edit Player Availability' : 'Create Player Availability'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {!editingAvailability && (
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={formData.childId}
                    label="Select Child"
                    onChange={(e) => handleChildChange(Number(e.target.value))}
                  >
                    {children.map((child) => (
                      <MenuItem key={child.id} value={child.id}>
                          {child.firstName} {child.lastName}{calculateAge(child.dateOfBirth) !== null ? ` (Age: ${calculateAge(child.dateOfBirth)})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                label="Title"
                fullWidth
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Talented Midfielder Seeking Team"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!formData.shareName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('shareName', e.target.checked)}
                  />
                }
                label="Share child's name in adverts and messages"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Age Group</InputLabel>
                <Select
                  value={formData.ageGroup}
                  label="Age Group"
                  onChange={(e) => handleInputChange('ageGroup', e.target.value)}
                >
                  {ageGroups.map((ageGroup) => (
                    <MenuItem key={ageGroup} value={ageGroup}>
                      {ageGroup}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={positions}
                value={formData.positions}
                onChange={(_, newValue) => handleInputChange('positions', newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Positions"
                    placeholder="Select positions..."
                    required={formData.positions.length === 0}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Preferred Team Type</InputLabel>
                <Select
                  value={formData.preferredTeamGender}
                  label="Preferred Team Type"
                  onChange={(e) => handleInputChange('preferredTeamGender', e.target.value)}
                >
                  <MenuItem value="Boys">Boys Team</MenuItem>
                  <MenuItem value="Girls">Girls Team</MenuItem>
                  <MenuItem value="Mixed">Mixed Team</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={leagueOptions}
                value={formData.preferredLeagues}
                onChange={(_, newValue) => {
                  const chosenLeagues = newValue.includes('All Leagues')
                    ? (availableLeagues.length > 0 ? availableLeagues : defaultLeagues)
                    : newValue;
                  handleInputChange('preferredLeagues', chosenLeagues);
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Preferred Leagues"
                    placeholder="Select preferred leagues..."
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <LocationAutocomplete
                label="Location"
                fullWidth
                value={formData.location}
                onChange={(value, placeDetails) => {
                  const geometry = placeDetails?.geometry?.location;
                  setFormData((prev) => ({
                    ...prev,
                    location: value,
                    locationData: geometry
                      ? {
                          address: value,
                          latitude: geometry.lat(),
                          longitude: geometry.lng(),
                          placeId: placeDetails?.place_id || undefined
                        }
                      : null,
                  }));
                }}
                placeholder="Start typing an address or postcode..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your child's football experience, strengths, and what kind of team they're looking for..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={allDayOptions}
                value={formData.availability.days}
                onChange={(_, newValue) => {
                  if (newValue.includes('All Days')) {
                    handleInputChange('availability.days', daysOfWeek);
                    return;
                  }

                  handleInputChange('availability.days', newValue.filter((day) => day !== 'All Days'));
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Available Days"
                    placeholder="Select days..."
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={allTimeSlotOptions}
                value={formData.availability.timeSlots}
                onChange={(_, newValue) => {
                  if (newValue.includes('All Times')) {
                    handleInputChange('availability.timeSlots', timeSlots);
                    return;
                  }

                  handleInputChange('availability.timeSlots', newValue.filter((slot) => slot !== 'All Times'));
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Available Time Slots"
                    placeholder="Select time slots..."
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Availability Notes"
                fullWidth
                value={formData.availability.notes}
                onChange={(e) => handleInputChange('availability.notes', e.target.value)}
                placeholder="Any additional notes about availability..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>
            Cancel
          </Button>
          <Button 
            onClick={editingAvailability ? handleUpdateAvailability : handleCreateAvailability}
            variant="contained"
          >
            {editingAvailability ? 'Update' : 'Create'} Availability
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChildPlayerAvailabilityPage;
