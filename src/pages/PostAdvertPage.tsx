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
  Chip,
  OutlinedInput,
  FormHelperText,
  Autocomplete,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vacanciesAPI, playerAvailabilityAPI, leaguesAPI, League } from '../services/api';
import GoogleMapsWrapper from '../components/GoogleMapsWrapper';
import LocationInput from '../components/LocationInput';
import LeagueRequestDialog from '../components/LeagueRequestDialog';
import { Location } from '../types';

interface Team {
  id: number;
  teamName: string;
  clubName?: string;
  userRole: string;
  permissions: {
    canPostVacancies: boolean;
  };
}

const PostAdvertPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [leagueRequestOpen, setLeagueRequestOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    league: '',
    ageGroup: '',
    position: '', // For coaches (single position)
    positions: [] as string[], // For players (multiple positions in order of preference)
    location: '',
    contactInfo: '',
    hasMatchRecording: false,
    hasPathwayToSenior: false,
    playingTimePolicy: '',
    teamId: '', // For team-based posting
  });

  const [locationData, setLocationData] = useState<Location | null>(null);

  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handlePositionsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      positions: typeof value === 'string' ? value.split(',') : value,
    });
    setError('');
  };

  // Fetch leagues and teams on component mount
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setLoadingLeagues(true);
        const response = await leaguesAPI.getForSearch(true); // Include pending leagues
        setLeagues(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error('Error fetching leagues:', err);
        // Fallback to default leagues if API fails
        setLeagues([
          { id: 1, name: 'Premier League', region: 'National', ageGroup: 'Senior' },
          { id: 2, name: 'Championship', region: 'National', ageGroup: 'Senior' },
          { id: 3, name: 'Local League', region: 'Local', ageGroup: 'Youth' },
        ]);
      } finally {
        setLoadingLeagues(false);
      }
    };

    const fetchTeams = async () => {
      if (user?.role === 'Coach') {
        try {
          setLoadingTeams(true);
          const response = await fetch('/api/teams', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setTeams(data.teams || []);
          }
        } catch (err) {
          console.error('Error fetching teams:', err);
        } finally {
          setLoadingTeams(false);
        }
      }
    };

    fetchLeagues();
    if (user?.role === 'Coach') {
      fetchTeams();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    const isCoach = user?.role === 'Coach';
    const positionValid = isCoach ? formData.position : formData.positions.length > 0;
    const teamValid = isCoach ? !!formData.teamId : true;
    
    if (!formData.title || !formData.description || !formData.league || !formData.ageGroup || !positionValid || !teamValid) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (isCoach) {
        const submitData = {
          ...formData,
          teamId: formData.teamId ? parseInt(formData.teamId) : undefined,
          locationData: locationData
        };
        await vacanciesAPI.create(submitData);
      } else {
        const submitData = {
          title: formData.title,
          description: formData.description,
          preferredLeagues: [formData.league], // Convert to array as expected by backend
          ageGroup: formData.ageGroup,
          positions: formData.positions,
          location: formData.location,
          contactInfo: formData.contactInfo,
          locationData: locationData || undefined
        };
        await playerAvailabilityAPI.create(submitData);
      }
      
      setSuccess(true);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        league: '',
        ageGroup: '',
        position: '',
        positions: [],
        location: '',
        contactInfo: '',
        hasMatchRecording: false,
        hasPathwayToSenior: false,
        playingTimePolicy: '',
        teamId: '',
      });
      setLocationData(null);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Failed to post advert:', err);
      setError('Failed to post advert. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  const isCoach = user.role === 'Coach';
  const pageTitle = isCoach ? 'Post Team Vacancy' : 'Post Player Availability';
  const titlePlaceholder = isCoach ? 'e.g. Striker Wanted - U16 League Team' : 'e.g. Experienced Midfielder Available';
  const descriptionPlaceholder = isCoach 
    ? 'Describe the position, team expectations, training schedule, etc.'
    : 'Describe your playing experience, availability, goals, etc.';

  const ageGroups = [
    'Under 6',
    'Under 7',
    'Under 8',
    'Under 9',
    'Under 10',
    'Under 11',
    'Under 12',
    'Under 13',
    'Under 14',
    'Under 15',
    'Under 16',
    'Under 17',
    'Under 18',
    'Under 19',
    'Under 20',
    'Under 21',
    'Adult (18+)',
    'Veterans (35+)',
  ];

  const positions = [
    'Goalkeeper',
    'Right Back',
    'Left Back',
    'Centre Back',
    'Defensive Midfielder',
    'Central Midfielder',
    'Attacking Midfielder',
    'Right Winger',
    'Left Winger',
    'Striker',
    'Any Position',
  ];

  return (
    <Container maxWidth="md">      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {pageTitle}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {isCoach 
            ? 'Let players know about opportunities in your team'
            : 'Let coaches know you\'re available and looking for a team'
          }
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your advert has been posted successfully! Redirecting to dashboard...
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={titlePlaceholder}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={4}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={descriptionPlaceholder}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                options={[...leagues, { id: -1, name: '+ Request New League', region: '', ageGroup: '', isPending: false }]}
                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || '')}
                value={leagues.find(l => l.name === formData.league) || null}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'object' && newValue?.id === -1) {
                    setLeagueRequestOpen(true);
                  } else if (typeof newValue === 'object' && newValue?.name) {
                    setFormData(prev => ({
                      ...prev,
                      league: newValue.name,
                    }));
                  } else if (typeof newValue === 'string') {
                    setFormData(prev => ({
                      ...prev,
                      league: newValue,
                    }));
                  }
                }}
                freeSolo={true}
                onInputChange={(_, inputValue, reason) => {
                  if (reason === 'input') {
                    setFormData(prev => ({
                      ...prev,
                      league: inputValue,
                    }));
                  }
                }}
                loading={loadingLeagues}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="League *"
                    placeholder="Type to search leagues..."
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingLeagues ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  if (option.id === -1) {
                    const { key, ...otherProps } = props;
                    return (
                      <Box 
                        component="li" 
                        key={key}
                        {...otherProps}
                        sx={{ 
                          borderTop: '1px solid #e0e0e0',
                          backgroundColor: '#f5f5f5',
                          fontStyle: 'italic',
                          color: 'primary.main'
                        }}
                      >
                        <Typography variant="body2" color="primary">
                          {option.name}
                        </Typography>
                      </Box>
                    );
                  }
                  
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                            {option.name}
                          </Typography>
                          {option.isPending && (
                            <Chip 
                              label="Under Review" 
                              size="small" 
                              color="warning" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                          )}
                        </Box>
                        {option.isPending && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            Awaiting Admin Approval
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                }}
                noOptionsText={loadingLeagues ? "Loading leagues..." : "No leagues found"}
                filterOptions={(options, { inputValue }) => {
                  const filtered = options.filter(option => {
                    if (option.id === -1) return true; // Always show "Request New League"
                    if (!inputValue) return true;
                    return option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                      (option.region && option.region.toLowerCase().includes(inputValue.toLowerCase())) ||
                      (option.ageGroup && option.ageGroup.toLowerCase().includes(inputValue.toLowerCase()));
                  });
                  return filtered;
                }}
              />
            </Grid>

            {isCoach && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Team</InputLabel>
                  <Select
                    name="teamId"
                    value={formData.teamId}
                    label="Team"
                    onChange={handleSelectChange}
                    disabled={loadingTeams}
                  >
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.teamName}
                      </MenuItem>
                    ))}
                  </Select>
                  {loadingTeams && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Loading teams...
                      </Typography>
                    </Box>
                  )}
                  {teams.length === 0 && !loadingTeams && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      No teams found. Create a team first to post vacancies.
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Age Group</InputLabel>
                <Select
                  name="ageGroup"
                  value={formData.ageGroup}
                  label="Age Group"
                  onChange={handleSelectChange}
                >
                  {ageGroups.map((age) => (
                    <MenuItem key={age} value={age}>
                      {age}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>{isCoach ? 'Position' : 'Preferred Positions'}</InputLabel>
                {isCoach ? (
                  <Select
                    name="position"
                    value={formData.position}
                    label="Position"
                    onChange={handleSelectChange}
                  >
                    {positions.map((position) => (
                      <MenuItem key={position} value={position}>
                        {position}
                      </MenuItem>
                    ))}
                  </Select>
                ) : (
                  <>
                    <Select
                      multiple
                      value={formData.positions}
                      label="Preferred Positions"
                      onChange={handlePositionsChange}
                      input={<OutlinedInput label="Preferred Positions" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value, index) => (
                            <Chip 
                              key={value} 
                              label={`${index + 1}. ${value}`} 
                              size="small"
                              color={index === 0 ? 'primary' : 'default'}
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {positions.map((position) => (
                        <MenuItem key={position} value={position}>
                          {position}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Select positions in order of preference (1st choice will be highlighted)
                    </FormHelperText>
                  </>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <GoogleMapsWrapper>
                <LocationInput
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(location) => {
                    setLocationData(location);
                    setFormData(prev => ({
                      ...prev,
                      location: location?.address || ''
                    }));
                  }}
                  placeholder="Start typing an address..."
                />
              </GoogleMapsWrapper>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contact Information"
                name="contactInfo"
                value={formData.contactInfo}
                onChange={handleChange}
                placeholder="Email or phone number for interested parties"
                helperText="This will be visible to users who view your advert"
              />
            </Grid>

            {/* Additional coach-only fields */}
            {isCoach && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 500 }}>
                    Team Facilities & Opportunities
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Playing Time Policy</InputLabel>
                    <Select
                      name="playingTimePolicy"
                      value={formData.playingTimePolicy}
                      label="Playing Time Policy"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="equal">Equal Playing Time - All players get roughly equal time</MenuItem>
                      <MenuItem value="merit">Merit Based - Playing time earned through performance</MenuItem>
                      <MenuItem value="dependent">Dependent on Circumstances - Varies based on situation</MenuItem>
                    </Select>
                    <FormHelperText>Helps players and parents understand your approach</FormHelperText>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.hasMatchRecording}
                        onChange={(e) => setFormData({ ...formData, hasMatchRecording: e.target.checked })}
                        name="hasMatchRecording"
                      />
                    }
                    label="We have match recording facilities (e.g. VEO)"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.hasPathwayToSenior}
                        onChange={(e) => setFormData({ ...formData, hasPathwayToSenior: e.target.checked })}
                        name="hasPathwayToSenior"
                      />
                    }
                    label="We provide a pathway to a senior team"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                >
                  Post Advert
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* League Request Dialog */}
      <LeagueRequestDialog
        open={leagueRequestOpen}
        onClose={() => setLeagueRequestOpen(false)}
        onSuccess={() => {
          // Refresh leagues list after successful submission
          const fetchLeagues = async () => {
            try {
              setLoadingLeagues(true);
              const response = await leaguesAPI.getForSearch(true);
              setLeagues(Array.isArray(response) ? response : []);
            } catch (err) {
              console.error('Error fetching leagues:', err);
            } finally {
              setLoadingLeagues(false);
            }
          };
          fetchLeagues();
        }}
      />
    </Container>
  );
};

export default PostAdvertPage;
