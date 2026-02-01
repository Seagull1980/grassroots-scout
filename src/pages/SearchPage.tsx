import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AGE_GROUP_OPTIONS, TEAM_GENDER_OPTIONS, POSITION_OPTIONS } from '../constants/options';
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
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Pagination,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Slider,
  Checkbox,
  FormGroup,
  FormControlLabel,
  ListItemText,
  OutlinedInput,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  Autocomplete,
} from '@mui/material';
import { 
  Search, 
  LocationOn, 
  Group, 
  Sports, 
  ExpandMore, 
  FilterList, 
  OpenInNew, 
  Map,
  Bookmark as BookmarkIcon 
} from '@mui/icons-material';
import api, { leaguesAPI, League } from '../services/api';
import { useDebounce } from '../utils/performance';
import QuickMatchCompletion from '../components/QuickMatchCompletion';
// import TrainingInviteDialog from '../components/TrainingInviteDialog'; // Temporarily disabled
import QuickAddToTrialDialog from '../components/QuickAddToTrialDialog';
import LeagueRequestDialog from '../components/LeagueRequestDialog';
import { useAuth } from '../contexts/AuthContext';
import { useResponsiveSpacing } from '../hooks/useResponsive';
import { SearchResultsSkeleton } from '../components/SkeletonLoaders';
import { SavedSearchesDialog } from '../components/SavedSearches';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface TeamVacancy {
  id: number;
  title: string;
  description: string;
  league: string;
  ageGroup: string; // Backend uses ageGroup
  position: string;
  location: string;
  contactInfo?: string;
  status: string;
  teamGender?: string; // Add missing teamGender property
  hasMatchRecording?: boolean;
  hasPathwayToSenior?: boolean;
  createdAt: string;
  firstName: string;
  lastName: string;
  postedBy: number; // ID of the user who posted the vacancy
}

interface PlayerAvailability {
  id: number;
  playerId: number; // Match QuickAddToTrialDialog interface
  userId: number; // Add userId for training invitations
  playerName: string;
  firstName: string; // Add missing properties
  lastName: string; // Add missing properties
  age: number;
  position: string;
  positions: string[]; // Add positions array to match API
  location: string;
  experience: string;
  description: string;
  title: string; // Add title property
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // const { isMobile } = useResponsive();
  const { cardSpacing } = useResponsiveSpacing();
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    league: '',
    ageGroup: '',
    position: '',
    location: '',
    search: '',
    teamGender: '',
    // Advanced filters
    experienceLevel: '',
    travelDistance: 25, // kilometers
    trainingFrequency: '',
    availability: [] as string[],
    coachingLicense: '',
    hasMatchRecording: false,
    hasPathwayToSenior: false,
    playingTimePolicy: [] as string[],
  });

  // Handle URL parameters on component mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const idParam = searchParams.get('id');
    
    // Set tab based on URL parameter
    if (tabParam === 'vacancies') {
      setTabValue(0);
    } else if (tabParam === 'availability') {
      setTabValue(1);
    }

    // If there's an ID parameter, we could highlight the specific advert
    // For now, we'll just ensure the correct tab is selected
    if (idParam) {
      // In a real implementation, you might want to:
      // 1. Fetch the specific advert
      // 2. Highlight it in the results
      // 3. Or scroll to it if it's in the current results
    }
  }, [searchParams]);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [vacancies, setVacancies] = useState<TeamVacancy[]>([]);
  const [playerAvailability, setPlayerAvailability] = useState<PlayerAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [savedSearchesOpen, setSavedSearchesOpen] = useState(false);
  // const { recentSearches, addRecentSearch } = useRecentSearches();
  
  // Contact dialog state
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<TeamVacancy | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Quick add to trial dialog state
  const [quickAddTrialOpen, setQuickAddTrialOpen] = useState(false);
  const [selectedPlayerForTrial, setSelectedPlayerForTrial] = useState<PlayerAvailability | null>(null);

  // League request dialog state
  const [leagueRequestOpen, setLeagueRequestOpen] = useState(false);

  // Add debounced search for better performance
  const debouncedSearch = useDebounce(filters.search, 300);

  // Advanced filter options
  const experienceLevels = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
  const trainingFrequencies = ['1x per week', '2x per week', '3x per week', '4+ per week', 'Flexible'];
  const availabilityOptions = ['Weekdays', 'Weekends', 'Evenings', 'Mornings', 'Afternoons'];
  const coachingLicenses = ['UEFA C', 'UEFA B', 'UEFA A', 'UEFA Pro', 'FA Level 1', 'FA Level 2', 'FA Level 3'];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
    setPage(1);
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
    setPage(1);
  };

  const handleMultiSelectChange = (name: string, value: string[]) => {
    setFilters({
      ...filters,
      [name]: value,
    });
    setPage(1);
  };

  const handleSliderChange = (name: string, value: number) => {
    setFilters({
      ...filters,
      [name]: value,
    });
    setPage(1);
  };

  const handleContact = (vacancy: TeamVacancy) => {
    setSelectedVacancy(vacancy);
    setContactDialogOpen(true);
  };

  const handleCloseContactDialog = () => {
    setContactDialogOpen(false);
    setSelectedVacancy(null);
    setMessage('');
    setSendingMessage(false);
  };

  const handleSendMessage = async () => {
    if (!selectedVacancy || !message.trim()) return;

    try {
      setSendingMessage(true);
      
      // Send message through internal messaging system
      const response = await api.post('/messages', {
        recipientId: selectedVacancy.postedBy,
        subject: `Interest in ${selectedVacancy.title}`,
        message: message.trim(),
        relatedVacancyId: selectedVacancy.id,
        messageType: 'vacancy_interest'
      });

      if (response.data.success) {
        // Show success message
        alert('Your message has been sent successfully! The coach will receive your interest and can respond through the platform.');
        handleCloseContactDialog();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('There was an error sending your message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendTrainingInvite = (_player: PlayerAvailability) => {
    // Training invite flow temporarily disabled
    // setSelectedPlayer({ id: player.userId, name: player.playerName });
    // setTrainingInviteOpen(true);
  };

  // const handleCloseTrainingInvite = () => {
  //   setTrainingInviteOpen(false);
  //   setSelectedPlayer(null);
  // };

  const clearFilters = () => {
    setFilters({
      league: '',
      ageGroup: '',
      position: '',
      location: '',
      search: '',
      teamGender: '',
      experienceLevel: '',
      travelDistance: 25,
      trainingFrequency: '',
      availability: [],
      coachingLicense: '',
      hasMatchRecording: false,
      hasPathwayToSenior: false,
      playingTimePolicy: [],
    });
    setPage(1);
  };

  const fetchVacancies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create filters object with current filter values including advanced filters
      const apiFilters = {
        league: filters.league || undefined,
        ageGroup: filters.ageGroup || undefined,
        position: filters.position || undefined,
        location: filters.location || undefined,
        search: filters.search || undefined,
        teamGender: filters.teamGender || undefined,
        // Advanced filters
        experienceLevel: filters.experienceLevel || undefined,
        travelDistance: filters.travelDistance || undefined,
        trainingFrequency: filters.trainingFrequency || undefined,
        availability: filters.availability?.length > 0 ? filters.availability.join(',') : undefined,
        coachingLicense: filters.coachingLicense || undefined,
        hasMatchRecording: filters.hasMatchRecording || undefined,
        hasPathwayToSenior: filters.hasPathwayToSenior || undefined,
        playingTimePolicy: filters.playingTimePolicy?.length > 0 ? filters.playingTimePolicy.join(',') : undefined,
        // Location data for distance calculation (if available)
        centerLat: undefined, // Could be set from user's location
        centerLng: undefined, // Could be set from user's location
      };
      
      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(apiFilters).filter(([_, value]) => value !== undefined && value !== '')
      );
      
      const response = await api.get('/vacancies', { params: cleanFilters });
      // Handle the API response structure
      const vacanciesData = response.data.vacancies || response.data;
      setVacancies(vacanciesData);
    } catch (err) {
      console.error('Error fetching vacancies:', err);
      setError('Failed to load team vacancies');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagues = async () => {
    try {
      setLoadingLeagues(true);
      const response = await leaguesAPI.getForSearch();
      // Ensure response is always an array
      if (Array.isArray(response)) {
        setLeagues(response);
      } else if (response && typeof response === 'object' && 'leagues' in response) {
        // Handle case where response has a leagues property
        setLeagues((response as any).leagues || []);
      } else {
        console.warn('Unexpected response format from leagues API:', response);
        setLeagues([]);
      }
    } catch (err) {
      console.error('Error fetching leagues:', err);
      // Fallback to default leagues if API fails
      setLeagues([
        { id: 1, name: 'Premier League', region: 'National', ageGroups: ['Senior'] },
        { id: 2, name: 'Championship', region: 'National', ageGroups: ['Senior'] },
        { id: 3, name: 'Local League', region: 'Local', ageGroups: ['Youth'] },
      ]);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const fetchPlayerAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create filters object with current filter values including advanced filters
      const apiFilters = {
        league: filters.league || undefined,
        ageGroup: filters.ageGroup || undefined,
        position: filters.position || undefined,
        location: filters.location || undefined,
        search: filters.search || undefined,
        preferredTeamGender: filters.teamGender || undefined,
        // Advanced filters
        experienceLevel: filters.experienceLevel || undefined,
        travelDistance: filters.travelDistance || undefined,
        trainingFrequency: filters.trainingFrequency || undefined,
        availability: filters.availability?.length > 0 ? filters.availability.join(',') : undefined,
        // Location data for distance calculation (if available)
        centerLat: undefined, // Could be set from user's location
        centerLng: undefined, // Could be set from user's location
      };
      
      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(apiFilters).filter(([_, value]) => value !== undefined && value !== '')
      );
      
      const response = await api.get('/player-availability', { params: cleanFilters });
      // Handle the API response structure
      const playersData = response.data.players || response.data;
      
      // Transform API data to match the frontend interface
      const transformedPlayers = Array.isArray(playersData) ? playersData.map((player: any) => ({
        id: player.id,
        playerId: player.id, // playerId matches id
        userId: player.userId || player.id, // Add userId field
        playerName: `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown Player',
        firstName: player.firstName || '',
        lastName: player.lastName || '',
        age: typeof player.age === 'number' ? player.age : 0,
        position: Array.isArray(player.positions) ? player.positions.join(', ') : (player.position || 'Any Position'),
        positions: Array.isArray(player.positions) ? player.positions : [player.position || 'Any Position'],
        location: player.location || '',
        experience: player.experience || 'Unknown',
        description: player.description || player.title || '',
        title: player.title || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Player Available',
      })) : [];
      
      setPlayerAvailability(transformedPlayers);
    } catch (err) {
      console.error('Error fetching player availability:', err);
      // Keep mock data as fallback for now
      setPlayerAvailability([
        {
          id: 1,
          playerId: 1,
          userId: 1,
          playerName: 'James Wilson',
          firstName: 'James',
          lastName: 'Wilson',
          age: 17,
          position: 'Central Midfielder',
          positions: ['Central Midfielder'],
          location: 'London, UK',
          experience: '8 years',
          title: 'Looking for competitive team',
          description: 'Experienced central midfielder with excellent passing and vision.',
        },
        {
          id: 2,
          playerId: 2,
          userId: 2,
          playerName: 'Alex Thompson',
          firstName: 'Alex',
          lastName: 'Thompson',
          age: 15,
          position: 'Striker',
          positions: ['Striker'],
          location: 'Leeds, UK',
          experience: '3 years',
          title: 'Seeking striker position',
          description: 'Fast and aggressive striker seeking opportunities in competitive league.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
    fetchPlayerAvailability();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchVacancies();
    fetchPlayerAvailability();
  }, [
    filters.league, 
    filters.ageGroup, 
    filters.position, 
    filters.location, 
    filters.search, 
    filters.teamGender,
    // Advanced filters
    filters.experienceLevel,
    filters.travelDistance,
    filters.trainingFrequency,
    filters.availability,
    filters.coachingLicense,
  ]);

  // Age groups and team gender options
  const ageGroups = AGE_GROUP_OPTIONS;
  const teamGenders = TEAM_GENDER_OPTIONS;
  const positions = POSITION_OPTIONS;

  // Filter and search logic
  const filteredVacancies = (vacancies || []).filter((vacancy) => {
    const matchesSearch = !debouncedSearch || 
      vacancy.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      vacancy.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      vacancy.location.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesLeague = !filters.league || vacancy.league === filters.league;
    const matchesAgeGroup = !filters.ageGroup || vacancy.ageGroup === filters.ageGroup;
    const matchesPosition = !filters.position || vacancy.position === filters.position;
    const matchesTeamGender = !filters.teamGender || vacancy.teamGender === filters.teamGender;
    const matchesLocation = !filters.location || 
      vacancy.location.toLowerCase().includes(filters.location.toLowerCase());

    return matchesSearch && matchesLeague && matchesAgeGroup && matchesPosition && matchesTeamGender && matchesLocation;
  });

  const filteredPlayers = (playerAvailability || []).filter((player) => {
    const matchesSearch = !debouncedSearch || 
      player.playerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      player.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      player.location.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesPosition = !filters.position || player.position === filters.position;
    const matchesLocation = !filters.location || 
      player.location.toLowerCase().includes(filters.location.toLowerCase());

    return matchesSearch && matchesPosition && matchesLocation;
  });

  const currentData = tabValue === 0 ? filteredVacancies : filteredPlayers;
  const tabLabel = tabValue === 0 ? 'Team Vacancies' : 'Player Availability';

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Search & Browse
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Find the perfect match for your football journey
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<BookmarkIcon />}
              onClick={() => setSavedSearchesOpen(true)}
              sx={{ mt: 1 }}
            >
              Saved Searches
            </Button>
            <Button
              variant="outlined"
              startIcon={<Map />}
              onClick={() => navigate('/maps')}
              sx={{ mt: 1 }}
            >
              Map Search
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="search tabs">
          <Tab
            label="Team Vacancies"
            icon={<Sports />}
            iconPosition="start"
            id="search-tab-0"
            aria-controls="search-tabpanel-0"
          />
          <Tab
            label="Player Availability"
            icon={<Group />}
            iconPosition="start"
            id="search-tab-1"
            aria-controls="search-tabpanel-1"
          />
        </Tabs>
      </Box>

      {/* Search and Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Search Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="search"
              label="Search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder={`Search ${tabLabel.toLowerCase()}...`}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              fullWidth
              options={Array.isArray(leagues) ? [...leagues, { id: -1, name: '+ Request New League', region: '', ageGroups: [], url: '', hits: 0 }] : []}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                if (option.id === -1) return option.name || '';
                return option.isPending ? `${option.name} (Under Review)` : (option.name || '');
              }}
              value={leagues.find(l => l.name === filters.league) || null}
              onChange={(_, newValue) => {
                if (typeof newValue === 'object' && newValue?.id === -1) {
                  // Open league request dialog
                  setLeagueRequestOpen(true);
                } else if (typeof newValue === 'object' && newValue?.name) {
                  setFilters({
                    ...filters,
                    league: newValue.name,
                  });
                  setPage(1);
                } else if (typeof newValue === 'string') {
                  setFilters({
                    ...filters,
                    league: newValue,
                  });
                  setPage(1);
                }
              }}
              onInputChange={(_, inputValue, reason) => {
                // Allow users to type and use custom league names (including pending ones)
                if (reason === 'input') {
                  setFilters({
                    ...filters,
                    league: inputValue,
                  });
                }
              }}
              freeSolo={true}
              selectOnFocus={true}
              clearOnBlur={false}
              handleHomeEndKeys={true}
              loading={loadingLeagues}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="League"
                  placeholder="Type to search leagues..."
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
                  // Render special "Request New League" option
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
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                        <Typography variant="body2" color="primary">
                          {option.name}
                        </Typography>
                      </Box>
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
                  if (option.id === -1) return true; // Always show the "Request New League" option
                  if (!inputValue) return true;
                  return option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                    (option.region && option.region.toLowerCase().includes(inputValue.toLowerCase())) ||
                    (option.ageGroups && option.ageGroups.some(age => age.toLowerCase().includes(inputValue.toLowerCase())));
                });
                return filtered;
              }}
            />
            {/* Show league URL if a specific league is selected */}
            {filters.league && (
              <Box sx={{ mt: 1 }}>
                {(() => {
                  const selectedLeague = leagues.find(l => l.name === filters.league);
                  if (selectedLeague?.url) {
                    return (
                      <Link
                        href={selectedLeague.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5,
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        <OpenInNew sx={{ fontSize: 14 }} />
                        Visit League Page
                      </Link>
                    );
                  }
                  return null;
                })()}
              </Box>
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Age Group</InputLabel>
              <Select
                name="ageGroup"
                value={filters.ageGroup}
                label="Age Group"
                onChange={handleSelectChange}
              >
                <MenuItem value="">All Ages</MenuItem>
                {ageGroups.map((age) => (
                  <MenuItem key={age} value={age}>
                    {age}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Position</InputLabel>
              <Select
                name="position"
                value={filters.position}
                label="Position"
                onChange={handleSelectChange}
              >
                <MenuItem value="">All Positions</MenuItem>
                {positions.map((position) => (
                  <MenuItem key={position} value={position}>
                    {position}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {tabValue === 0 && ( // Only show team gender filter for team vacancies
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Team Type</InputLabel>
                <Select
                  name="teamGender"
                  value={filters.teamGender}
                  label="Team Type"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="">All Teams</MenuItem>
                  {teamGenders.map((gender) => (
                    <MenuItem key={gender} value={gender}>
                      {gender} Team
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              name="location"
              label="Location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Enter location"
              InputProps={{
                startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={clearFilters}
              sx={{ height: '56px' }}
            >
              Clear Filters
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              sx={{ height: '56px' }}
            >
              {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
            </Button>
          </Grid>
        </Grid>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Accordion expanded sx={{ mt: 3, mb: 0 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Advanced Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {/* Experience Level Filter */}
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Experience Level</InputLabel>
                    <Select
                      name="experienceLevel"
                      value={filters.experienceLevel}
                      label="Experience Level"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="">Any Level</MenuItem>
                      {experienceLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Travel Distance Filter */}
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ px: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      Max Travel Distance: {filters.travelDistance} km
                    </Typography>
                    <Slider
                      value={filters.travelDistance}
                      onChange={(_, value) => handleSliderChange('travelDistance', value as number)}
                      valueLabelDisplay="auto"
                      step={5}
                      marks
                      min={5}
                      max={100}
                      valueLabelFormat={(value) => `${value} km`}
                    />
                  </Box>
                </Grid>

                {/* Training Frequency Filter */}
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Training Frequency</InputLabel>
                    <Select
                      name="trainingFrequency"
                      value={filters.trainingFrequency}
                      label="Training Frequency"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="">Any Frequency</MenuItem>
                      {trainingFrequencies.map((frequency) => (
                        <MenuItem key={frequency} value={frequency}>
                          {frequency}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Availability Filter */}
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Availability</InputLabel>
                    <Select
                      multiple
                      value={filters.availability}
                      onChange={(e) => handleMultiSelectChange('availability', e.target.value as string[])}
                      input={<OutlinedInput label="Availability" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {availabilityOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          <Checkbox checked={filters.availability.indexOf(option) > -1} />
                          <ListItemText primary={option} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Coaching License Filter (for coaches) */}
                {tabValue === 0 && (
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Coaching License</InputLabel>
                      <Select
                        name="coachingLicense"
                        value={filters.coachingLicense}
                        label="Coaching License"
                        onChange={handleSelectChange}
                      >
                        <MenuItem value="">Any License</MenuItem>
                        {coachingLicenses.map((license) => (
                          <MenuItem key={license} value={license}>
                            {license}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {/* Team Facilities & Opportunities (for team vacancy searches) */}
                {tabValue === 0 && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, fontWeight: 500 }}>
                        Playing Time Policy
                      </Typography>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={filters.playingTimePolicy.includes('equal')}
                              onChange={(e) => {
                                const newPolicies = e.target.checked
                                  ? [...filters.playingTimePolicy, 'equal']
                                  : filters.playingTimePolicy.filter(p => p !== 'equal');
                                setFilters({ ...filters, playingTimePolicy: newPolicies });
                              }}
                            />
                          }
                          label="Equal Playing Time"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={filters.playingTimePolicy.includes('merit')}
                              onChange={(e) => {
                                const newPolicies = e.target.checked
                                  ? [...filters.playingTimePolicy, 'merit']
                                  : filters.playingTimePolicy.filter(p => p !== 'merit');
                                setFilters({ ...filters, playingTimePolicy: newPolicies });
                              }}
                            />
                          }
                          label="Merit Based Playing Time"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={filters.playingTimePolicy.includes('dependent')}
                              onChange={(e) => {
                                const newPolicies = e.target.checked
                                  ? [...filters.playingTimePolicy, 'dependent']
                                  : filters.playingTimePolicy.filter(p => p !== 'dependent');
                                setFilters({ ...filters, playingTimePolicy: newPolicies });
                              }}
                            />
                          }
                          label="Dependent on Circumstances"
                        />
                      </FormGroup>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, fontWeight: 500 }}>
                        Team Facilities & Opportunities
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Checkbox
                          checked={filters.hasMatchRecording}
                          onChange={(e) => setFilters({ ...filters, hasMatchRecording: e.target.checked })}
                          name="hasMatchRecording"
                        />
                        <Typography variant="body2">
                          Match recording facilities (e.g. VEO)
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Checkbox
                          checked={filters.hasPathwayToSenior}
                          onChange={(e) => setFilters({ ...filters, hasPathwayToSenior: e.target.checked })}
                          name="hasPathwayToSenior"
                        />
                        <Typography variant="body2">
                          Pathway to senior team
                        </Typography>
                      </Box>
                    </Grid>
                  </>
                )}

                {/* Quick Filter Presets */}
                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Quick Presets:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label="Nearby (5km)" 
                        onClick={() => handleSliderChange('travelDistance', 5)}
                        variant={filters.travelDistance === 5 ? 'filled' : 'outlined'}
                      />
                      <Chip 
                        label="Weekends Only" 
                        onClick={() => handleMultiSelectChange('availability', ['Weekends'])}
                        variant={filters.availability.includes('Weekends') ? 'filled' : 'outlined'}
                      />
                      <Chip 
                        label="Beginner Friendly" 
                        onClick={() => handleSelectChange({ target: { name: 'experienceLevel', value: 'Beginner' } } as SelectChangeEvent)}
                        variant={filters.experienceLevel === 'Beginner' ? 'filled' : 'outlined'}
                      />
                      <Chip 
                        label="Professional Level" 
                        onClick={() => handleSelectChange({ target: { name: 'experienceLevel', value: 'Professional' } } as SelectChangeEvent)}
                        variant={filters.experienceLevel === 'Professional' ? 'filled' : 'outlined'}
                      />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </Paper>

      {/* Map Search Suggestion */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, backgroundColor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Map color="primary" />
            <Box>
              <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 600 }}>
                Try Map Search for Location-Based Results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use our interactive map to search by area, draw custom regions, and see results with precise locations
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Map />}
            onClick={() => navigate('/maps')}
            sx={{ minWidth: 120 }}
          >
            Open Maps
          </Button>
        </Box>
      </Paper>

      {/* Results */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Team Vacancies ({loading ? '...' : filteredVacancies.length})
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse available positions in football teams
          </Typography>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Available Players ({filteredPlayers.length})
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse players looking for teams
          </Typography>
        </Box>
      </TabPanel>

      {/* Loading State */}
      {loading ? (
        <SearchResultsSkeleton count={6} />
      ) : (
        <>
          {/* Results Grid */}
          <Grid container spacing={cardSpacing}>
            {(currentData || []).map((item) => (
              <Grid item xs={12} md={6} key={item.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    {tabValue === 0 ? (
                      // Team Vacancy Card
                      <>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {(item as TeamVacancy).title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {(item as TeamVacancy).description}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          <Chip label={(item as TeamVacancy).league} size="small" color="primary" />
                          <Chip label={(item as TeamVacancy).ageGroup} size="small" color="secondary" />
                          <Chip label={(item as TeamVacancy).position} size="small" />
                          {(item as TeamVacancy).hasMatchRecording && (
                            <Chip label="Match Recording" size="small" color="info" variant="outlined" />
                          )}
                          {(item as TeamVacancy).hasPathwayToSenior && (
                            <Chip label="Pathway to Senior" size="small" color="success" variant="outlined" />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {(item as TeamVacancy).location}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Posted by {(item as TeamVacancy).firstName} {(item as TeamVacancy).lastName} • {new Date((item as TeamVacancy).createdAt).toLocaleDateString()}
                        </Typography>
                      </>
                    ) : (
                      // Player Availability Card
                      <>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {(item as PlayerAvailability).playerName} - {(item as PlayerAvailability).position}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {(item as PlayerAvailability).description}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          <Chip label={`Age ${(item as PlayerAvailability).age}`} size="small" color="primary" />
                          <Chip label={(item as PlayerAvailability).position} size="small" color="secondary" />
                          <Chip label={`${(item as PlayerAvailability).experience} experience`} size="small" />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {(item as PlayerAvailability).location}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained"
                      onClick={() => {
                        if (tabValue === 0) {
                          handleContact(item as TeamVacancy);
                        } else {
                          // For player availability - coaches can send training invites
                          if (user?.role === 'Coach') {
                            handleSendTrainingInvite(item as PlayerAvailability);
                          } else {
                            alert('Only coaches can send training invitations to players.');
                          }
                        }
                      }}
                    >
                      {tabValue === 0 ? 'Express Interest' : (user?.role === 'Coach' ? 'Send Training Invite' : 'Contact Player')}
                    </Button>
                    {tabValue === 1 && user?.role === 'Coach' && (
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          setSelectedPlayerForTrial(item as PlayerAvailability);
                          setQuickAddTrialOpen(true);
                        }}
                      >
                        Add to Trial
                      </Button>
                    )}
                    <Button size="small" variant="outlined">
                      Save
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={3}
              page={page}
              onChange={(_event, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}

      {/* Contact Dialog */}
      <Dialog 
        open={contactDialogOpen} 
        onClose={handleCloseContactDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Express Interest - {selectedVacancy?.title}
        </DialogTitle>
        <DialogContent>
          {selectedVacancy && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Team: {selectedVacancy.title}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Position:</strong> {selectedVacancy.position}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>League:</strong> {selectedVacancy.league}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Age Group:</strong> {selectedVacancy.ageGroup}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Location:</strong> {selectedVacancy.location}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Coach:</strong> {selectedVacancy.firstName} {selectedVacancy.lastName}
              </Typography>
              
              {/* Team Facilities & Opportunities */}
              {(selectedVacancy.hasMatchRecording || selectedVacancy.hasPathwayToSenior) && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedVacancy.hasMatchRecording && (
                    <Chip 
                      label="Match Recording Available" 
                      color="primary" 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                  {selectedVacancy.hasPathwayToSenior && (
                    <Chip 
                      label="Pathway to Senior Team" 
                      color="success" 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                </Box>
              )}
              
              <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>About the Position:</strong>
                </Typography>
                <Typography variant="body2">
                  {selectedVacancy.description}
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Send a Message to the Coach
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  All communication happens safely within our platform. The coach will receive your message 
                  and can respond through their dashboard.
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Tell the coach about yourself and why you're interested in this position..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  sx={{ mt: 2 }}
                  disabled={sendingMessage}
                />
                
                <Box sx={{ mt: 2, p: 1, backgroundColor: 'info.50', borderRadius: 1, border: 1, borderColor: 'info.200' }}>
                  <Typography variant="caption" color="info.main">
                    💡 Tip: Mention your experience, availability, and what you hope to achieve with the team.
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContactDialog} disabled={sendingMessage}>
            Cancel
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleSendMessage}
            disabled={sendingMessage || !message.trim()}
          >
            {sendingMessage ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Training Invite Dialog - Temporarily Disabled */}
      {/* {selectedPlayer && (
        <TrainingInviteDialog
          open={trainingInviteOpen}
          onClose={handleCloseTrainingInvite}
          playerId={selectedPlayer.id}
          playerName={selectedPlayer.name}
          onSuccess={() => {
            // Refresh data or show success message
          }}
        />
      )} */}

      {/* Quick Add to Trial Dialog */}
      <QuickAddToTrialDialog
        open={quickAddTrialOpen}
        onClose={() => {
          setQuickAddTrialOpen(false);
          setSelectedPlayerForTrial(null);
        }}
        player={selectedPlayerForTrial}
        onSuccess={() => {
          // Player added successfully
        }}
      />

      {/* League Request Dialog */}
      <LeagueRequestDialog
        open={leagueRequestOpen}
        onClose={() => setLeagueRequestOpen(false)}
        onSuccess={() => {
          // Refresh leagues list after successful submission
          fetchLeagues();
        }}
      />

      {/* Saved Searches Dialog */}
      <SavedSearchesDialog
        open={savedSearchesOpen}
        onClose={() => setSavedSearchesOpen(false)}
        onApplySearch={(search) => {
          setFilters({
            ...filters,
            ...search.filters,
            hasMatchRecording: search.filters.hasMatchRecording || false,
            hasPathwayToSenior: search.filters.hasPathwayToSenior || false,
          });
          setTabValue(search.tabIndex);
        }}
        currentFilters={filters}
        currentTab={tabValue}
      />

      {/* Quick Match Completion Floating Button */}
      <QuickMatchCompletion 
        hideFab={contactDialogOpen || quickAddTrialOpen || leagueRequestOpen || savedSearchesOpen}
      />
    </Container>
  );
};

export default SearchPage;
