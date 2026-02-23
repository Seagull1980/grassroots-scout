import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AGE_GROUP_OPTIONS, TEAM_GENDER_OPTIONS, POSITION_OPTIONS } from '../constants/options';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  IconButton,
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
  Collapse,
  Pagination,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Tooltip,
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
  Switch,
  Divider,
  Autocomplete,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search,
  LocationOn,
  Group,
  Sports,
  ExpandMore,
  FilterList,
  OpenInNew,
  Map as MapIcon,
  Bookmark as BookmarkIcon,
  NotificationsActive,
  Send,
  Folder,
  Add,
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
import { SavedSearchesDialog, useRecentSearches } from '../components/SavedSearches';
import { requestNotificationPermission } from '../utils/pwa';
import { UK_REGIONS } from '../constants/locations';
import PageHeader from '../components/PageHeader';

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
  createdAt?: string;
}

interface SavedAd {
  id: number;
  type: 'vacancy' | 'player';
  title: string;
  subtitle: string;
  location: string;
  createdAt?: string;
  contactUserId?: number;
  contactName?: string;
}

interface SavedCollection {
  id: string;
  name: string;
  createdAt: string;
}

interface AdActivity {
  views: number;
  contacts: number;
  lastViewedAt?: string;
  lastContactedAt?: string;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // const { isMobile } = useResponsive();
  const { cardSpacing } = useResponsiveSpacing();
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    league: '',
    ageGroup: '',
    position: '',
    region: '',
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
  const [sortBy, setSortBy] = useState('newest');

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
    
    // Pre-fill search filters from user role
    if (user && !tabParam) {
      if (user.role === 'Player' || user.role === 'Parent/Guardian') {
        // Set to vacancies tab since players are looking for teams
        setTabValue(0);
      } else if (user.role === 'Coach') {
        // Set to player availability tab since coaches are looking for players
        setTabValue(1);
      }
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
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [vacancies, setVacancies] = useState<TeamVacancy[]>([]);
  const [playerAvailability, setPlayerAvailability] = useState<PlayerAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [savedSearchesOpen, setSavedSearchesOpen] = useState(false);
  const [savedAdsOpen, setSavedAdsOpen] = useState(false);
  const [savedAds, setSavedAds] = useState<SavedAd[]>(() => {
    try {
      const stored = localStorage.getItem('savedAdverts');
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const recentSearchKeyRef = useRef<string>('');

  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activityByAd, setActivityByAd] = useState<Record<string, AdActivity>>(() => {
    try {
      const stored = localStorage.getItem('adActivity');
      const parsed = stored ? JSON.parse(stored) : {};
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  });

  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    try {
      return localStorage.getItem('grassroots_alerts_enabled') === 'true';
    } catch {
      return false;
    }
  });

  const [collections, setCollections] = useState<SavedCollection[]>(() => {
    try {
      const stored = localStorage.getItem('savedAdCollections');
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [savedAdCollections, setSavedAdCollections] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem('savedAdCollectionsMap');
      const parsed = stored ? JSON.parse(stored) : {};
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  });
  const [collectionName, setCollectionName] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [selectedSavedAds, setSelectedSavedAds] = useState<string[]>([]);
  const [bulkMessageOpen, setBulkMessageOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  
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
    setSortBy('newest');
  };

  const handleToggleSave = (item: TeamVacancy | PlayerAvailability, type: 'vacancy' | 'player') => {
    const id = item.id;
    const exists = savedAds.some((ad) => ad.id === id && ad.type === type);

    if (exists) {
      setSavedAds((prev) => prev.filter((ad) => !(ad.id === id && ad.type === type)));
      return;
    }

    const title = type === 'vacancy'
      ? (item as TeamVacancy).title
      : (item as PlayerAvailability).playerName;
    const subtitle = type === 'vacancy'
      ? `${(item as TeamVacancy).ageGroup} • ${(item as TeamVacancy).position}`
      : `${(item as PlayerAvailability).age} • ${(item as PlayerAvailability).position}`;
    const location = item.location;
    const createdAt = type === 'vacancy'
      ? (item as TeamVacancy).createdAt
      : (item as PlayerAvailability).createdAt;
    const contactUserId = type === 'vacancy'
      ? (item as TeamVacancy).postedBy
      : (item as PlayerAvailability).userId;
    const contactName = type === 'vacancy'
      ? `${(item as TeamVacancy).firstName} ${(item as TeamVacancy).lastName}`.trim()
      : (item as PlayerAvailability).playerName;

    setSavedAds((prev) => [
      {
        id,
        type,
        title,
        subtitle,
        location,
        createdAt,
        contactUserId,
        contactName,
      },
      ...prev,
    ]);
  };

  const handleRemoveSaved = (ad: SavedAd) => {
    setSavedAds((prev) => prev.filter((item) => !(item.id === ad.id && item.type === ad.type)));
  };

  const formatRelativeDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Calculate days until expiration (adverts typically expire after 30 days)
  const getDaysUntilExpiration = (createdAt?: string) => {
    if (!createdAt) return null;
    const createdDate = new Date(createdAt);
    if (Number.isNaN(createdDate.getTime())) return null;
    const expirationDate = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const daysLeft = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  // Get expiration badge color and text
  const getExpirationBadge = (createdAt?: string) => {
    const daysLeft = getDaysUntilExpiration(createdAt);
    if (daysLeft === null) return null;
    if (daysLeft === 0) return { color: 'error' as const, text: 'Expires today' };
    if (daysLeft <= 3) return { color: 'error' as const, text: `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` };
    if (daysLeft <= 7) return { color: 'warning' as const, text: `Expires in ${daysLeft} days` };
    return { color: 'default' as const, text: null };
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
        recordContact(`vacancy-${selectedVacancy.id}`);
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
    recordContact(`player-${_player.id}`);
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
      region: '',
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
        region: filters.region || undefined,
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
      setVacancies(Array.isArray(vacanciesData) ? vacanciesData : []);
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
        { id: 1, name: 'Premier League', region: 'National' },
        { id: 2, name: 'Championship', region: 'National' },
        { id: 3, name: 'Local League', region: 'Local' },
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
        region: filters.region || undefined,
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
        createdAt: player.createdAt || player.created_at,
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
          createdAt: new Date().toISOString(),
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
          createdAt: new Date(Date.now() - 86400000).toISOString(),
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

  useEffect(() => {
    try {
      localStorage.setItem('savedAdverts', JSON.stringify(savedAds));
    } catch {
      // Ignore storage errors
    }
  }, [savedAds]);

  useEffect(() => {
    try {
      localStorage.setItem('adActivity', JSON.stringify(activityByAd));
    } catch {
      // Ignore storage errors
    }
  }, [activityByAd]);

  useEffect(() => {
    try {
      localStorage.setItem('savedAdCollections', JSON.stringify(collections));
      localStorage.setItem('savedAdCollectionsMap', JSON.stringify(savedAdCollections));
    } catch {
      // Ignore storage errors
    }
  }, [collections, savedAdCollections]);

  useEffect(() => {
    try {
      localStorage.setItem('grassroots_alerts_enabled', alertsEnabled ? 'true' : 'false');
    } catch {
      // Ignore storage errors
    }
  }, [alertsEnabled]);

  // Fetch data when filters change
  useEffect(() => {
    fetchVacancies();
    fetchPlayerAvailability();
  }, [
    filters.league, 
    filters.ageGroup, 
    filters.position, 
    filters.region,
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
  const leagueRegionByName = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(leagues) ? leagues : []).forEach((league) => {
      if (league?.name) {
        map.set(league.name, league.region || '');
      }
    });
    return map;
  }, [leagues]);

  const normalizeRegions = (value: string) =>
    value
      .split(',')
      .map((region) => region.trim().toLowerCase())
      .filter(Boolean);

  const matchesLeagueRegion = (leagueRegion: string, normalizedRegion: string) => {
    if (!normalizedRegion) {
      return true;
    }
    if (!leagueRegion) {
      return false;
    }
    const regions = normalizeRegions(leagueRegion);
    if (regions.includes('all regions')) {
      return true;
    }
    return regions.includes(normalizedRegion);
  };

  // Filter and search logic
  const filteredVacancies = (Array.isArray(vacancies) ? vacancies : []).filter((vacancy) => {
    const normalizedRegion = filters.region ? filters.region.toLowerCase() : '';
    const leagueRegion = leagueRegionByName.get(vacancy.league) || '';
    const matchesSearch = !debouncedSearch || 
      vacancy.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      vacancy.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      vacancy.location.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesLeague = !filters.league || vacancy.league === filters.league;
    const matchesAgeGroup = !filters.ageGroup || vacancy.ageGroup === filters.ageGroup;
    const matchesPosition = !filters.position || vacancy.position === filters.position;
    const matchesTeamGender = !filters.teamGender || vacancy.teamGender === filters.teamGender;
    const matchesRegion = !filters.region ||
      vacancy.location.toLowerCase().includes(normalizedRegion) ||
      matchesLeagueRegion(leagueRegion, normalizedRegion);
    const matchesLocation = !filters.location || 
      vacancy.location.toLowerCase().includes(filters.location.toLowerCase());

    return matchesSearch && matchesLeague && matchesAgeGroup && matchesPosition && matchesTeamGender && matchesRegion && matchesLocation;
  });

  const filteredPlayers = (Array.isArray(playerAvailability) ? playerAvailability : []).filter((player) => {
    const normalizedRegion = filters.region ? filters.region.toLowerCase() : '';
    const matchesSearch = !debouncedSearch || 
      player.playerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      player.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      player.location.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesPosition = !filters.position ||
      player.position === filters.position ||
      (Array.isArray(player.positions) && player.positions.includes(filters.position));
    const matchesRegion = !filters.region ||
      player.location.toLowerCase().includes(normalizedRegion);
    const matchesLocation = !filters.location || 
      player.location.toLowerCase().includes(filters.location.toLowerCase());

    return matchesSearch && matchesPosition && matchesRegion && matchesLocation;
  });

  const currentData = tabValue === 0 ? filteredVacancies : filteredPlayers;
  const tabLabel = tabValue === 0 ? 'Team Vacancies' : 'Player Availability';
  const sortOptions = tabValue === 0
    ? [
        { value: 'newest', label: 'Newest' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'league', label: 'League (A-Z)' },
        { value: 'ageGroup', label: 'Age Group' },
        { value: 'position', label: 'Position' },
        { value: 'location', label: 'Location' },
      ]
    : [
        { value: 'newest', label: 'Newest' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'age', label: 'Age' },
        { value: 'position', label: 'Position' },
        { value: 'location', label: 'Location' },
      ];

  const sortedData = useMemo(() => {
    const items = [...(currentData || [])];
    if (items.length === 0) return items;

    const getDate = (value?: string) => value ? new Date(value).getTime() : 0;

    if (tabValue === 0) {
      const vacanciesData = items as TeamVacancy[];
      switch (sortBy) {
        case 'newest':
          return vacanciesData.sort((a, b) => getDate(b.createdAt) - getDate(a.createdAt));
        case 'oldest':
          return vacanciesData.sort((a, b) => getDate(a.createdAt) - getDate(b.createdAt));
        case 'league':
          return vacanciesData.sort((a, b) => a.league.localeCompare(b.league));
        case 'ageGroup':
          return vacanciesData.sort((a, b) => a.ageGroup.localeCompare(b.ageGroup));
        case 'position':
          return vacanciesData.sort((a, b) => a.position.localeCompare(b.position));
        case 'location':
          return vacanciesData.sort((a, b) => a.location.localeCompare(b.location));
        default:
          return vacanciesData;
      }
    }

    const playerData = items as PlayerAvailability[];
    switch (sortBy) {
      case 'newest':
        return playerData.sort((a, b) => getDate(b.createdAt) - getDate(a.createdAt));
      case 'oldest':
        return playerData.sort((a, b) => getDate(a.createdAt) - getDate(b.createdAt));
      case 'age':
        return playerData.sort((a, b) => a.age - b.age);
      case 'position':
        return playerData.sort((a, b) => a.position.localeCompare(b.position));
      case 'location':
        return playerData.sort((a, b) => a.location.localeCompare(b.location));
      default:
        return playerData;
    }
  }, [currentData, sortBy, tabValue]);

  const recentSearchSignature = useMemo(() => {
    return JSON.stringify({
      tabValue,
      filters: {
        ...filters,
        search: debouncedSearch,
      }
    });
  }, [tabValue, filters, debouncedSearch]);

  useEffect(() => {
    const hasFilters = Object.values({
      ...filters,
      search: debouncedSearch,
    }).some((value) => Array.isArray(value) ? value.length > 0 : !!value);

    if (!hasFilters) return;
    if (recentSearchSignature === recentSearchKeyRef.current) return;

    const timeout = setTimeout(() => {
      addRecentSearch({ ...filters, search: debouncedSearch }, tabValue);
      recentSearchKeyRef.current = recentSearchSignature;
    }, 700);

    return () => clearTimeout(timeout);
  }, [recentSearchSignature, filters, debouncedSearch, tabValue, addRecentSearch]);

  const getSavedAdKey = (ad: SavedAd) => `${ad.type}-${ad.id}`;

  const recordView = (key: string) => {
    setActivityByAd((prev) => {
      const current = prev[key] || { views: 0, contacts: 0 };
      return {
        ...prev,
        [key]: {
          ...current,
          views: current.views + 1,
          lastViewedAt: new Date().toISOString(),
        },
      };
    });
  };

  const recordContact = (key: string) => {
    setActivityByAd((prev) => {
      const current = prev[key] || { views: 0, contacts: 0 };
      return {
        ...prev,
        [key]: {
          ...current,
          contacts: current.contacts + 1,
          lastContactedAt: new Date().toISOString(),
        },
      };
    });
  };

  const toggleExpand = (key: string) => {
    setExpandedCards((prev) => {
      const nextValue = !prev[key];
      if (nextValue) {
        recordView(key);
      }
      return {
        ...prev,
        [key]: nextValue,
      };
    });
  };

  const activeCriteriaCount = useMemo(() => {
    if (tabValue === 0) {
      const values = [
        filters.search,
        filters.league,
        filters.ageGroup,
        filters.position,
        filters.location,
        filters.teamGender,
      ];
      return values.filter(Boolean).length;
    }
    const values = [filters.search, filters.position, filters.location];
    return values.filter(Boolean).length;
  }, [filters, tabValue]);

  const closeMatches = useMemo(() => {
    if (activeCriteriaCount < 3) return [] as Array<{ item: TeamVacancy | PlayerAvailability; matchCount: number }>;

    const isMatch = (text: string, query: string) => text.toLowerCase().includes(query.toLowerCase());
    const getCountVacancy = (vacancy: TeamVacancy) => {
      let count = 0;
      if (filters.search && (isMatch(vacancy.title, filters.search) || isMatch(vacancy.description, filters.search) || isMatch(vacancy.location, filters.search))) count += 1;
      if (filters.league && vacancy.league === filters.league) count += 1;
      if (filters.ageGroup && vacancy.ageGroup === filters.ageGroup) count += 1;
      if (filters.position && vacancy.position === filters.position) count += 1;
      if (filters.location && isMatch(vacancy.location, filters.location)) count += 1;
      if (filters.teamGender && vacancy.teamGender === filters.teamGender) count += 1;
      return count;
    };

    const getCountPlayer = (player: PlayerAvailability) => {
      let count = 0;
      if (filters.search && (isMatch(player.playerName, filters.search) || isMatch(player.description, filters.search) || isMatch(player.location, filters.search))) count += 1;
      if (filters.position && (player.position === filters.position || player.positions?.includes(filters.position))) count += 1;
      if (filters.location && isMatch(player.location, filters.location)) count += 1;
      return count;
    };

    const items = tabValue === 0 ? (Array.isArray(vacancies) ? vacancies : []) : (Array.isArray(playerAvailability) ? playerAvailability : []);
    const filteredIds = new Set((currentData || []).map((item) => item.id));

    return items
      .filter((item) => !filteredIds.has(item.id))
      .map((item) => ({
        item,
        matchCount: tabValue === 0 ? getCountVacancy(item as TeamVacancy) : getCountPlayer(item as PlayerAvailability)
      }))
      .filter((entry) => entry.matchCount >= 3)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 4);
  }, [activeCriteriaCount, tabValue, vacancies, playerAvailability, currentData, filters]);

  const recentPopular = useMemo(() => {
    const items = tabValue === 0 ? (Array.isArray(vacancies) ? vacancies : []) : (Array.isArray(playerAvailability) ? playerAvailability : []);
    const getDate = (value?: string) => value ? new Date(value).getTime() : 0;
    return [...items].sort((a, b) => getDate((b as any).createdAt) - getDate((a as any).createdAt)).slice(0, 3);
  }, [tabValue, vacancies, playerAvailability]);

  const emptyStateTitle = useMemo(() => {
    const agePart = filters.ageGroup ? `${filters.ageGroup} ` : '';
    const positionPart = filters.position ? `${filters.position} ` : '';
    const locationPart = filters.location ? `in ${filters.location}` : '';
    const noun = tabValue === 0 ? 'teams' : 'players';
    const label = `${agePart}${positionPart}${noun}`.trim();
    if (label && locationPart) return `No ${label} found ${locationPart}`;
    if (label) return `No ${label} found`;
    if (locationPart) return `No ${noun} found ${locationPart}`;
    return 'No results found';
  }, [filters.ageGroup, filters.position, filters.location, tabValue]);

  const emptyStateSuggestions = useMemo(() => {
    const suggestions: { label: string; action: () => void }[] = [];
    if (filters.location) {
      suggestions.push({
        label: 'Clear location filter',
        action: () => setFilters({ ...filters, location: '' })
      });
    }
    if (filters.position) {
      suggestions.push({
        label: 'Clear position filter',
        action: () => setFilters({ ...filters, position: '' })
      });
    }
    suggestions.push({
      label: 'Expand travel radius to 50km',
      action: () => {
        setShowAdvancedFilters(true);
        handleSliderChange('travelDistance', 50);
      }
    });
    suggestions.push({
      label: 'Clear all filters',
      action: clearFilters
    });
    return suggestions.slice(0, 4);
  }, [filters, clearFilters]);

  const handleCreateCollection = () => {
    if (!collectionName.trim()) return;
    const newCollection: SavedCollection = {
      id: Date.now().toString(),
      name: collectionName.trim(),
      createdAt: new Date().toISOString(),
    };
    setCollections((prev) => [newCollection, ...prev]);
    setCollectionName('');
  };

  const handleAssignToCollection = (collectionId: string) => {
    if (!selectedSavedAds.length) return;
    setSavedAdCollections((prev) => {
      const next = { ...prev };
      selectedSavedAds.forEach((key) => {
        const existing = next[key] || [];
        next[key] = Array.from(new Set([...existing, collectionId]));
      });
      return next;
    });
  };

  const handleToggleSavedSelection = (key: string) => {
    setSelectedSavedAds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleBulkMessageSend = async () => {
    const selectedAds = savedAds.filter((ad) => selectedSavedAds.includes(getSavedAdKey(ad)));
    const targetAds = selectedAds.filter((ad) => ad.type === 'vacancy' && ad.contactUserId);
    if (targetAds.length === 0 || !bulkMessage.trim()) return;

    try {
      setBulkSending(true);
      await Promise.all(
        targetAds.map((ad) =>
          api.post('/messages', {
            recipientId: ad.contactUserId,
            subject: `Interest in ${ad.title}`,
            message: bulkMessage.trim(),
            relatedVacancyId: ad.id,
            messageType: 'vacancy_interest'
          })
        )
      );

      targetAds.forEach((ad) => recordContact(getSavedAdKey(ad)));
      alert('Your message has been sent to all selected teams.');
      setBulkMessage('');
      setBulkMessageOpen(false);
    } catch (err) {
      console.error('Error sending bulk messages:', err);
      alert('There was an error sending your messages. Please try again.');
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Search Adverts"
        subtitle="Find teams and players that match your goals"
        icon={<Search sx={{ fontSize: 32 }} />}
        actions={(
          <>
            <Button
              variant="outlined"
              startIcon={<BookmarkIcon />}
              onClick={() => setSavedSearchesOpen(true)}
              sx={{
                borderColor: 'rgba(255,255,255,0.6)',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.12)' },
              }}
            >
              Saved Searches
            </Button>
            <Button
              variant="outlined"
              startIcon={<BookmarkIcon />}
              onClick={() => setSavedAdsOpen(true)}
              sx={{
                borderColor: 'rgba(255,255,255,0.6)',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.12)' },
              }}
            >
              Saved Ads
            </Button>
            <Button
              variant="outlined"
              startIcon={<MapIcon />}
              onClick={() => navigate('/maps')}
              sx={{
                borderColor: 'rgba(255,255,255,0.6)',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.12)' },
              }}
            >
              Map Search
            </Button>
          </>
        )}
      />
      <Container maxWidth="lg">

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
              label="Search adverts"
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
              options={Array.isArray(leagues) ? [...leagues, { id: -1, name: '+ Request New League', region: '', url: '', hits: 0 }] : []}
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
                  if (option.id === -1) return true; // Always show the "Request New League" option
                  if (!inputValue) return true;
                  return option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                    (option.region && option.region.toLowerCase().includes(inputValue.toLowerCase()));
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
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                name="sortBy"
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                {sortOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
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
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              sx={{ height: '56px' }}
            >
              {showMoreFilters ? 'Hide' : 'Show'} More Filters
            </Button>
          </Grid>
        </Grid>
        <Collapse in={showMoreFilters}>
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Region</InputLabel>
                  <Select
                    name="region"
                    value={filters.region}
                    label="Region"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="">All Regions</MenuItem>
                    {UK_REGIONS.map((region) => (
                      <MenuItem key={region} value={region}>
                        {region}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {tabValue === 0 && (
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
            </Grid>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Common Searches
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="Nearest Teams"
                icon={<LocationOn />}
                onClick={() => {
                  setShowAdvancedFilters(true);
                  handleSliderChange('travelDistance', 10);
                }}
                variant="outlined"
              />
              <Chip
                label="My Age Group"
                icon={<Group />}
                onClick={() => {
                  const fallbackAgeGroup = user?.role === 'Player' ? 'Under 16' : 'Adult (18+)';
                  setFilters({
                    ...filters,
                    ageGroup: filters.ageGroup || fallbackAgeGroup,
                  });
                }}
                variant="outlined"
              />
              <Chip
                label="Favorite Positions"
                icon={<Sports />}
                onClick={() => {
                  setFilters({
                    ...filters,
                    position: filters.position || 'Striker',
                  });
                }}
                variant="outlined"
              />
            </Box>
          </Box>

          {recentSearches.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">Recent Searches</Typography>
                <Button size="small" onClick={clearRecentSearches}>
                  Clear
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {recentSearches.slice(0, 6).map((search) => (
                  <Chip
                    key={search.id}
                    label={search.filters.search || search.filters.position || search.filters.league || 'Recent search'}
                    onClick={() => {
                      setFilters({
                        ...filters,
                        ...search.filters,
                        hasMatchRecording: search.filters.hasMatchRecording || false,
                        hasPathwayToSenior: search.filters.hasPathwayToSenior || false,
                      });
                      setTabValue(search.tabIndex);
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Collapse>

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
            <MapIcon color="primary" />
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
            startIcon={<MapIcon />}
            onClick={() => navigate('/maps')}
            sx={{ minWidth: 120 }}
          >
            Open Maps
          </Button>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationsActive color="primary" />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Get alerts for new matches
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Receive notifications when adverts match your saved searches.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={alertsEnabled}
                  onChange={async () => {
                    if (!alertsEnabled) {
                      const granted = await requestNotificationPermission();
                      if (!granted) return;
                    }
                    setAlertsEnabled(!alertsEnabled);
                  }}
                />
              }
              label={alertsEnabled ? 'Enabled' : 'Disabled'}
            />
            <Button variant="outlined" onClick={() => navigate('/alert-preferences')}>
              Manage Alerts
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Results */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {typeof error === 'string' ? error : JSON.stringify(error)}
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
          {sortedData.length === 0 ? (
            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                {emptyStateTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Try adjusting your filters or explore recent postings below.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button variant="contained" onClick={() => navigate('/post-advert')}>
                  Post Advert
                </Button>
              </Box>

              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Suggested next steps
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {emptyStateSuggestions.map((suggestion) => (
                    <Button
                      key={suggestion.label}
                      size="small"
                      variant="outlined"
                      onClick={suggestion.action}
                    >
                      {suggestion.label}
                    </Button>
                  ))}
                </Box>
              </Box>

              {savedAds.length > 0 && (
                <Box sx={{ mt: 4, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    From your saved adverts
                  </Typography>
                  <Grid container spacing={2}>
                    {savedAds.slice(0, 3).map((ad) => (
                      <Grid item xs={12} md={4} key={getSavedAdKey(ad)}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            {ad.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {ad.subtitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            {ad.location}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {recentPopular.length > 0 && (
                <Box sx={{ mt: 4, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Popular recent postings
                  </Typography>
                  <Grid container spacing={2}>
                    {recentPopular.map((item) => (
                      <Grid item xs={12} md={4} key={`popular-${item.id}`}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            {tabValue === 0 ? (item as TeamVacancy).title : (item as PlayerAvailability).playerName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tabValue === 0
                              ? (item as TeamVacancy).position
                              : (item as PlayerAvailability).position}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            {(item as any).location}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Paper>
          ) : (
            <>
              <Grid container spacing={cardSpacing}>
                {sortedData.map((item) => (
                  <Grid item xs={12} md={6} key={item.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1, p: isMobile ? 2 : 3 }}>
                        {tabValue === 0 ? (
                          // Team Vacancy Card
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                              <Typography variant={isMobile ? 'subtitle1' : 'h6'} component="h3" sx={{ flex: 1 }}>
                                {(item as TeamVacancy).title}
                              </Typography>
                              {getExpirationBadge((item as TeamVacancy).createdAt)?.text && (
                                <Chip 
                                  label={getExpirationBadge((item as TeamVacancy).createdAt)?.text}
                                  size="small"
                                  color={getExpirationBadge((item as TeamVacancy).createdAt)?.color || 'default'}
                                  icon={getExpirationBadge((item as TeamVacancy).createdAt)?.color === 'error' ? <span>⚠️</span> : undefined}
                                />
                              )}
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 2,
                                display: '-webkit-box',
                                WebkitLineClamp: isMobile ? 2 : 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {(item as TeamVacancy).description}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              <Chip label={(item as TeamVacancy).league} size="small" color="primary" />
                              {!isMobile && <Chip label={(item as TeamVacancy).ageGroup} size="small" color="secondary" />}
                              <Chip label={(item as TeamVacancy).position} size="small" />
                              {isMobile && (item as TeamVacancy).ageGroup && (
                                <Chip label={(item as TeamVacancy).ageGroup} size="small" variant="outlined" />
                              )}
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
                              Posted by {(item as TeamVacancy).firstName} {(item as TeamVacancy).lastName} • {formatRelativeDate((item as TeamVacancy).createdAt)}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Activity: {(activityByAd[`vacancy-${item.id}`]?.views || 0)} views • {(activityByAd[`vacancy-${item.id}`]?.contacts || 0)} contacts
                                {activityByAd[`vacancy-${item.id}`]?.lastContactedAt && (
                                  <> • Last contacted {formatRelativeDate(activityByAd[`vacancy-${item.id}`]?.lastContactedAt)}</>
                                )}
                              </Typography>
                            </Box>
                            <Collapse in={expandedCards[`vacancy-${item.id}`]} timeout="auto" unmountOnExit>
                              <Divider sx={{ my: 2 }} />
                              <Typography variant="subtitle2" gutterBottom>
                                Full Description
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {(item as TeamVacancy).description}
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {(item as TeamVacancy).hasMatchRecording && (
                                  <Chip label="Match Recording Available" size="small" color="info" variant="outlined" />
                                )}
                                {(item as TeamVacancy).hasPathwayToSenior && (
                                  <Chip label="Pathway to Senior" size="small" color="success" variant="outlined" />
                                )}
                              </Box>
                            </Collapse>
                          </>
                        ) : (
                          // Player Availability Card
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                              <Typography variant={isMobile ? 'subtitle1' : 'h6'} component="h3">
                                {(item as PlayerAvailability).playerName} - {(item as PlayerAvailability).position}
                              </Typography>
                              {getExpirationBadge((item as PlayerAvailability).createdAt)?.text && (
                                <Chip 
                                  label={getExpirationBadge((item as PlayerAvailability).createdAt)?.text}
                                  size="small"
                                  color={getExpirationBadge((item as PlayerAvailability).createdAt)?.color || 'default'}
                                  icon={getExpirationBadge((item as PlayerAvailability).createdAt)?.color === 'error' ? <span>⚠️</span> : undefined}
                                />
                              )}
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 2,
                                display: '-webkit-box',
                                WebkitLineClamp: isMobile ? 2 : 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {(item as PlayerAvailability).description}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              <Chip label={`Age ${(item as PlayerAvailability).age}`} size="small" color="primary" />
                              {(item as PlayerAvailability).positions?.slice(0, isMobile ? 2 : 4).map((position) => (
                                <Chip key={position} label={position} size="small" color="secondary" />
                              ))}
                              {isMobile && (item as PlayerAvailability).positions?.length > 2 && (
                                <Chip
                                  label={`+${(item as PlayerAvailability).positions.length - 2}`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              <Chip label={`${(item as PlayerAvailability).experience} experience`} size="small" />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {(item as PlayerAvailability).location}
                              </Typography>
                            </Box>
                            {(item as PlayerAvailability).createdAt && (
                              <Typography variant="body2" color="text.secondary">
                                Posted {formatRelativeDate((item as PlayerAvailability).createdAt as string)}
                              </Typography>
                            )}
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Activity: {(activityByAd[`player-${item.id}`]?.views || 0)} views • {(activityByAd[`player-${item.id}`]?.contacts || 0)} contacts
                                {activityByAd[`player-${item.id}`]?.lastContactedAt && (
                                  <> • Last contacted {formatRelativeDate(activityByAd[`player-${item.id}`]?.lastContactedAt)}</>
                                )}
                              </Typography>
                            </Box>
                            <Collapse in={expandedCards[`player-${item.id}`]} timeout="auto" unmountOnExit>
                              <Divider sx={{ my: 2 }} />
                              <Typography variant="subtitle2" gutterBottom>
                                Full Description
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {(item as PlayerAvailability).description}
                              </Typography>
                            </Collapse>
                          </>
                        )}
                      </CardContent>
                      <CardActions sx={{ px: isMobile ? 2 : 2, pb: isMobile ? 2 : 2, flexWrap: 'wrap', gap: 1 }}>
                        {tabValue === 0 ? (
                          <Button 
                            size="small" 
                            variant="contained"
                            onClick={() => handleContact(item as TeamVacancy)}
                          >
                            Express Interest
                          </Button>
                        ) : (
                          <Tooltip title={user?.role === 'Coach' ? '' : 'Only coaches can send training invitations'}>
                            <span>
                              <Button
                                size="small"
                                variant="contained"
                                disabled={user?.role !== 'Coach'}
                                onClick={() => handleSendTrainingInvite(item as PlayerAvailability)}
                              >
                                Send Training Invite
                              </Button>
                            </span>
                          </Tooltip>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => toggleExpand(`${tabValue === 0 ? 'vacancy' : 'player'}-${item.id}`)}
                        >
                          {expandedCards[`${tabValue === 0 ? 'vacancy' : 'player'}-${item.id}`] ? 'Hide Details' : 'View Full Details'}
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
                        <IconButton
                          size="small"
                          onClick={() => handleToggleSave(item as any, tabValue === 0 ? 'vacancy' : 'player')}
                          aria-label={savedAds.some((ad) => ad.id === item.id && ad.type === (tabValue === 0 ? 'vacancy' : 'player')) ? 'Unsave advert' : 'Save advert'}
                        >
                          <BookmarkIcon color={savedAds.some((ad) => ad.id === item.id && ad.type === (tabValue === 0 ? 'vacancy' : 'player')) ? 'primary' : 'inherit'} />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {closeMatches.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Close Matches
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    These results match at least 3 of your filters.
                  </Typography>
                  <Grid container spacing={cardSpacing}>
                    {closeMatches.map(({ item, matchCount }) => (
                      <Grid item xs={12} md={6} key={`close-${item.id}`}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <CardContent sx={{ flexGrow: 1, p: isMobile ? 2 : 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                              <Typography variant={isMobile ? 'subtitle1' : 'h6'} component="h3" gutterBottom>
                                {tabValue === 0
                                  ? (item as TeamVacancy).title
                                  : `${(item as PlayerAvailability).playerName} - ${(item as PlayerAvailability).position}`}
                              </Typography>
                              <Chip label={`Close Match • ${matchCount}`} size="small" color="warning" variant="outlined" />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {tabValue === 0
                                ? (item as TeamVacancy).description
                                : (item as PlayerAvailability).description}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {(item as any).location}
                            </Typography>
                          </CardContent>
                          <CardActions sx={{ px: isMobile ? 2 : 2, pb: isMobile ? 2 : 2 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                if (tabValue === 0) {
                                  handleContact(item as TeamVacancy);
                                } else {
                                  handleSendTrainingInvite(item as PlayerAvailability);
                                }
                              }}
                            >
                              {tabValue === 0 ? 'Express Interest' : 'Send Training Invite'}
                            </Button>
                            <Button
                              size="small"
                              onClick={() => toggleExpand(`${tabValue === 0 ? 'vacancy' : 'player'}-${item.id}`)}
                            >
                              View Full Details
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

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

      {/* Saved Ads Dialog */}
      <Dialog
        open={savedAdsOpen}
        onClose={() => setSavedAdsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Saved Ads</DialogTitle>
        <DialogContent>
          {savedAds.length === 0 ? (
            <Alert severity="info">No saved ads yet.</Alert>
          ) : (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Collection</InputLabel>
                    <Select
                      value={collectionFilter}
                      label="Collection"
                      onChange={(e) => setCollectionFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Collections</MenuItem>
                      {collections.map((collection) => (
                        <MenuItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="New collection name"
                    InputProps={{
                      startAdornment: <Folder sx={{ mr: 1 }} />
                    }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleCreateCollection}
                    disabled={!collectionName.trim()}
                  >
                    Create
                  </Button>
                  {collections.length > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAssignToCollection(collectionFilter === 'all' ? collections[0].id : collectionFilter)}
                      disabled={!selectedSavedAds.length || collections.length === 0}
                    >
                      Add Selected to Collection
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Send />}
                    onClick={() => setBulkMessageOpen(true)}
                    disabled={!selectedSavedAds.length}
                  >
                    Message Selected Teams
                  </Button>
                </Box>
              </Box>

              {savedAds.map((ad) => (
                (collectionFilter === 'all' || (savedAdCollections[getSavedAdKey(ad)] || []).includes(collectionFilter)) && (
                <Paper key={`${ad.type}-${ad.id}`} sx={{ p: 2, mb: 2 }} variant="outlined">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Checkbox
                      checked={selectedSavedAds.includes(getSavedAdKey(ad))}
                      onChange={() => handleToggleSavedSelection(getSavedAdKey(ad))}
                    />
                    <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {ad.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {ad.subtitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {ad.location}
                  </Typography>
                  {ad.createdAt && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Posted {formatRelativeDate(ad.createdAt)}
                    </Typography>
                  )}
                  {(savedAdCollections[getSavedAdKey(ad)] || []).length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      {(savedAdCollections[getSavedAdKey(ad)] || []).map((collectionId) => {
                        const collection = collections.find((item) => item.id === collectionId);
                        return collection ? (
                          <Chip key={collectionId} label={collection.name} size="small" variant="outlined" />
                        ) : null;
                      })}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setSavedAdsOpen(false);
                        navigate(`/search?tab=${ad.type === 'vacancy' ? 'vacancies' : 'availability'}&id=${ad.id}`);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleRemoveSaved(ad)}
                    >
                      Remove
                    </Button>
                  </Box>
                    </Box>
                  </Box>
                </Paper>
                )
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {savedAds.length > 0 && (
            <Button
              onClick={() => setSavedAds([])}
              color="error"
            >
              Clear All
            </Button>
          )}
          <Button onClick={() => setSavedAdsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkMessageOpen} onClose={() => setBulkMessageOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Message Selected Teams</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your message will be sent to all selected team vacancies. Player adverts are excluded from bulk messaging.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Introduce yourself and share why you're interested..."
            value={bulkMessage}
            onChange={(e) => setBulkMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkMessageOpen(false)} disabled={bulkSending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleBulkMessageSend}
            disabled={bulkSending || !bulkMessage.trim()}
          >
            {bulkSending ? 'Sending...' : 'Send to Teams'}
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
    </Box>
  );
};

export default SearchPage;
