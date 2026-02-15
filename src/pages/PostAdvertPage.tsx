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
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Snackbar,
  Fade,
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
  const [showValidation, setShowValidation] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [leagueRequestOpen, setLeagueRequestOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [drafts, setDrafts] = useState<Array<{ id: string; name: string; role: string; data: any; createdAt: string }>>(() => {
    try {
      const stored = localStorage.getItem('post_advert_drafts');
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [draftName, setDraftName] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'info' | 'error' });
  const [loadedDraftName, setLoadedDraftName] = useState<string | null>(null);

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
          { id: 1, name: 'Premier League', region: 'National' },
          { id: 2, name: 'Championship', region: 'National' },
          { id: 3, name: 'Local League', region: 'Local' },
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
    await submitAdvert();
  };

  const submitAdvert = async () => {
    setError('');
    setShowValidation(true);

    // Validation
    const isCoach = user?.role === 'Coach';
    const positionValid = isCoach ? formData.position : formData.positions.length > 0;
    const teamValid = isCoach ? !!formData.teamId : true;
    const leagueValid = isCoach ? !!formData.league : true; // League is optional for players
    
    if (!formData.title || !formData.description || !leagueValid || !formData.ageGroup || !positionValid || !teamValid) {
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
          preferredLeagues: formData.league ? [formData.league] : [], // Only include league if selected
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
  const positionValidForForm = isCoach ? !!formData.position : formData.positions.length > 0;
  const teamValidForForm = isCoach ? !!formData.teamId : true;
  const leagueValidForForm = isCoach ? !!formData.league : true;
  const isFormValid = !!formData.title && !!formData.description && leagueValidForForm && !!formData.ageGroup && positionValidForForm && teamValidForForm;
  const previewPositions = isCoach
    ? [formData.position].filter(Boolean)
    : formData.positions.filter(Boolean);
  const previewTitle = formData.title || (isCoach ? 'Team Vacancy Title' : 'Player Availability Title');
  const previewDescription = formData.description || 'Your advert description will appear here.';
  const steps = ['Basic Info', 'Details', 'Review'];

  const isStepOneComplete = !!formData.title && !!formData.description;
  const isStepTwoComplete = leagueValidForForm && !!formData.ageGroup && positionValidForForm && !!formData.location;
  const activeStep = isFormValid ? 2 : isStepTwoComplete ? 1 : 0;

  const selectedTeam = teams.find((team) => team.id.toString() === formData.teamId);
  const titleSuggestions = isCoach
    ? [
        `${formData.position || 'Striker'} Wanted - ${formData.ageGroup || 'U14'} ${selectedTeam?.teamName || 'Team'}`,
        `${formData.ageGroup || 'U16'} ${selectedTeam?.teamName || 'Team'} seeking ${formData.position || 'midfielder'}`,
      ]
    : [
        `${formData.positions[0] || 'Player'} Looking for Team`,
        `${formData.ageGroup || 'U18'} ${formData.positions[0] || 'midfielder'} available`,
      ];

  const applyTemplate = () => {
    if (isCoach) {
      const teamLabel = selectedTeam?.teamName || 'Our team';
      setFormData((prev) => ({
        ...prev,
        title: prev.title || `${prev.position || 'Striker'} Wanted - ${prev.ageGroup || 'U14'} ${teamLabel}`,
        description: prev.description || `${teamLabel} is looking for a committed ${prev.position || 'player'} to join our ${prev.ageGroup || 'youth'} squad. Training sessions run weekly, and we focus on development, teamwork, and match readiness.`
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      title: prev.title || `${prev.positions[0] || 'Player'} Looking for Team`,
      description: prev.description || `I am a dedicated ${prev.positions[0] || 'player'} seeking a competitive team. I am available for training, open to feedback, and eager to contribute on match days.`
    }));
  };

  const handleSaveDraft = () => {
    if (!draftName.trim()) return;
    const newDraft = {
      id: Date.now().toString(),
      name: draftName.trim(),
      role: user.role,
      data: { formData, locationData },
      createdAt: new Date().toISOString(),
    };
    const updated = [newDraft, ...drafts];
    setDrafts(updated);
    localStorage.setItem('post_advert_drafts', JSON.stringify(updated));
    setSnackbar({ open: true, message: `Draft "${draftName.trim()}" saved successfully!`, severity: 'success' });
    setDraftName('');
  };

  const handleLoadDraft = () => {
    const draft = drafts.find((item) => item.id === selectedDraftId);
    if (!draft) return;
    setFormData(draft.data.formData);
    setLocationData(draft.data.locationData || null);
    setLoadedDraftName(draft.name);
    setSnackbar({ open: true, message: `Draft "${draft.name}" loaded successfully!`, severity: 'info' });
    setSelectedDraftId('');
  };

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
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label} completed={index === 0 ? isStepOneComplete : index === 1 ? isStepTwoComplete : isFormValid}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your advert has been posted successfully! Redirecting to dashboard...
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Grid container spacing={3}>
                {/* Draft Management Section - Moved to top */}
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 2, bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      📋 Draft Management
                    </Typography>
                    {loadedDraftName && (
                      <Alert severity="info" sx={{ mb: 2 }} onClose={() => setLoadedDraftName(null)}>
                        Currently editing: <strong>{loadedDraftName}</strong>
                      </Alert>
                    )}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        label="Draft name"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="e.g. U16 Striker Draft"
                        sx={{ minWidth: 200 }}
                      />
                      <Button variant="contained" onClick={handleSaveDraft} disabled={!draftName.trim()}>
                        💾 Save Draft
                      </Button>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Load Draft</InputLabel>
                        <Select
                          value={selectedDraftId}
                          label="Load Draft"
                          onChange={(e) => setSelectedDraftId(e.target.value)}
                        >
                          {drafts.filter((draft) => draft.role === user.role).map((draft) => (
                            <MenuItem key={draft.id} value={draft.id}>
                              {draft.name} - {new Date(draft.createdAt).toLocaleDateString()}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button variant="outlined" onClick={handleLoadDraft} disabled={!selectedDraftId}>
                        📂 Load
                      </Button>
                    </Box>
                  </Paper>
                </Grid>

                {/* Section 1: Basic Information */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="1. Basic Information" color="primary" variant="outlined" />
                  </Divider>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder={titlePlaceholder}
                    error={showValidation && !formData.title}
                    helperText={showValidation && !formData.title ? 'Title is required' : undefined}
                  />
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {titleSuggestions.map((suggestion) => (
                      <Chip
                        key={suggestion}
                        label={suggestion}
                        size="small"
                        variant="outlined"
                        onClick={() => setFormData((prev) => ({ ...prev, title: suggestion }))}
                      />
                    ))}
                  </Box>
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
                    error={showValidation && !formData.description}
                    helperText={showValidation && !formData.description
                      ? 'Description is required'
                      : (isCoach
                          ? 'Include training days, expectations, and facilities.'
                          : 'Include availability, experience, and travel radius.')}
                  />
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" onClick={applyTemplate}>
                      Use Suggested Template
                    </Button>
                  </Box>
                </Grid>

                {/* Section 2: Team & League Details */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label={isCoach ? "2. Team & League" : "2. Preferences"} color="primary" variant="outlined" />
                  </Divider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    fullWidth
                    options={[...leagues, { id: -1, name: '+ Request New League', region: '', isPending: false }]}
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
                        label={isCoach ? "League *" : "Preferred League"}
                        placeholder="Type to search leagues..."
                        required={isCoach}
                        error={showValidation && isCoach && !formData.league}
                        helperText={showValidation && isCoach && !formData.league ? 'League is required' : undefined}
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
                              {(() => {
                                const regions = (option.region || '')
                                  .split(',')
                                  .map((region) => region.trim())
                                  .filter(Boolean);
                                if (regions.includes('All Regions')) {
                                  return (
                                    <Chip
                                      label="All Regions"
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem', height: '20px' }}
                                    />
                                  );
                                }
                                if (regions.length > 1) {
                                  return (
                                    <Chip
                                      label="Multi-region"
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem', height: '20px' }}
                                    />
                                  );
                                }
                                return null;
                              })()}
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
                          (option.region && option.region.toLowerCase().includes(inputValue.toLowerCase()));
                      });
                      return filtered;
                    }}
                  />
                </Grid>

                {isCoach && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required error={showValidation && !formData.teamId}>
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
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            No teams found. Create a team first to post vacancies.
                          </Typography>
                          <Button size="small" variant="outlined" onClick={() => navigate('/team-management')}>
                            Create Team
                          </Button>
                        </Box>
                      )}
                      {showValidation && !formData.teamId && (
                        <FormHelperText>Team is required</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={showValidation && !formData.ageGroup}>
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
                    {showValidation && !formData.ageGroup && (
                      <FormHelperText>Age group is required</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={showValidation && !positionValidForForm}>
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
                    {showValidation && !positionValidForForm && (
                      <FormHelperText>Position is required</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                {/* Section 3: Location & Contact */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="3. Location & Contact" color="primary" variant="outlined" />
                  </Divider>
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
                      debugId="post-advert-location"
                    />
                  </GoogleMapsWrapper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Contact Information"
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleChange}
                    placeholder="Email or phone number for interested parties"
                    helperText="Visible to logged-in users. Use a contact email you check regularly."
                  />
                </Grid>

            {/* Section 4: Additional Details (Coach only) */}
                {isCoach && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }}>
                        <Chip label="4. Team Facilities & Opportunities" color="primary" variant="outlined" />
                      </Divider>
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
                      variant="outlined"
                      onClick={() => setReviewOpen(true)}
                      disabled={!isStepOneComplete}
                    >
                      Review Advert
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={!isFormValid}
                    >
                      Post Advert
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper
                elevation={1}
                sx={{
                  p: 3,
                  position: { md: 'sticky' },
                  top: { md: 24 },
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Live Preview
                </Typography>
                <Typography variant="h6" gutterBottom>
                  {previewTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {previewDescription}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {formData.league && <Chip label={formData.league} size="small" color="primary" />}
                  {formData.ageGroup && <Chip label={formData.ageGroup} size="small" color="secondary" />}
                  {previewPositions.map((position) => (
                    <Chip key={position} label={position} size="small" />
                  ))}
                  {isCoach && formData.hasMatchRecording && (
                    <Chip label="Match Recording" size="small" color="info" variant="outlined" />
                  )}
                  {isCoach && formData.hasPathwayToSenior && (
                    <Chip label="Pathway to Senior" size="small" color="success" variant="outlined" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Location: {formData.location || 'Add a location'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Contact: {formData.contactInfo || 'Add contact info'}
                </Typography>
                {isCoach && formData.playingTimePolicy && (
                  <Typography variant="body2" color="text.secondary">
                    Playing time policy: {formData.playingTimePolicy}
                  </Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Step {activeStep + 1} of {steps.length}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Your Advert</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {previewTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {previewDescription}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" gutterBottom>
            <strong>League:</strong> {formData.league || 'Not specified'}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Age Group:</strong> {formData.ageGroup || 'Not specified'}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Positions:</strong> {previewPositions.join(', ') || 'Not specified'}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Location:</strong> {formData.location || 'Not specified'}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Contact:</strong> {formData.contactInfo || 'Not specified'}
          </Typography>
          {isCoach && (
            <Typography variant="body2" gutterBottom>
              <strong>Playing Time Policy:</strong> {formData.playingTimePolicy || 'Not specified'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>
            Back to Edit
          </Button>
          <Button variant="contained" onClick={submitAdvert} disabled={!isFormValid}>
            Submit Advert
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Draft Save/Load Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={Fade}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PostAdvertPage;
