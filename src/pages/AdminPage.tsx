import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Grid,
  Avatar,
  Menu,
  Divider,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Fab,
  Checkbox,
  ListItemText,
  Chip,
  FormHelperText } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  FamilyRestroom as FamilyIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
  ExitToApp as ExitIcon,
  Group as GroupIcon,
  Analytics as AnalyticsIcon,
  SupervisorAccount as SupervisorIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Science as ScienceIcon,
  Flag as FlagIcon,
  Email as EmailIcon } from '@mui/icons-material';
import { leaguesAPI, League, adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '../utils/errorHandling';
import SiteActivityDashboard from '../components/SiteActivityDashboard';
import { UK_COUNTRIES, UK_REGIONS } from '../constants/locations';


const AdminPage: React.FC = () => {
  console.log('🔍 AdminPage render start');

  const ALL_REGIONS_OPTION = 'All Regions';
  const REGION_DONE_OPTION = '__done__';
  const getRegionSelection = (value: string) =>
    value
      .split(',')
      .map((region) => region.trim())
      .filter(Boolean);
  const getRegionBadges = (value?: string) => {
    const regions = getRegionSelection(value || '');
    if (!regions.length) {
      return [] as string[];
    }
    if (regions.includes(ALL_REGIONS_OPTION)) {
      return [ALL_REGIONS_OPTION];
    }
    if (regions.length > 1) {
      return ['Multi-region'];
    }
    return [] as string[];
  };

  // Get user information first - this hook must always be called
  console.log('🔗 Hook 1: useAuth');
  const { impersonateUser, stopImpersonation, isImpersonating, user } = useAuth();

  console.log('🔗 Hook 2: useNavigate');
  const navigate = useNavigate();

  console.log('🔗 Hook 3: useTheme');
  const theme = useTheme();

  console.log('🔗 Hook 4: useMediaQuery');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for live analytics
  const [analytics, setAnalytics] = useState<{ totalUsers: number; totalMatches: number }>({ totalUsers: 0, totalMatches: 0 });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // State for clubs and teams count
  const [clubsCount, setClubsCount] = useState(0);
  const [teamsCount, setTeamsCount] = useState(0);
  const [clubsTeamsLoading, setClubsTeamsLoading] = useState(false);

  // All state hooks must be declared BEFORE any conditional returns
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<League | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    country: '',
    url: '',
    description: ''
  });
  const isEnglandSelected = !formData.country || formData.country === 'England';
  const availableRegions = isEnglandSelected ? UK_REGIONS : [];
  const [adminFormData, setAdminFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: ''
  });
  const [openAdminDialog, setOpenAdminDialog] = useState(false);
  const [impersonationLoading, setImpersonationLoading] = useState(false);
  
  // Test player management state
  const [testPlayerLoading, setTestPlayerLoading] = useState(false);
  const [testPlayerMessage, setTestPlayerMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [testPlayerCount, setTestPlayerCount] = useState(0);
  
  // Test team vacancy management state
  const [testTeamLoading, setTestTeamLoading] = useState(false);
  const [testTeamMessage, setTestTeamMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [testTeamCount, setTestTeamCount] = useState(0);
  
  console.log('🔍 All hooks declared, user check:', user ? 'exists' : 'null');

  // ALL HOOKS INCLUDING useEffect MUST BE DECLARED BEFORE CONDITIONAL RETURNS
  useEffect(() => {
    const fetchLeagues = async () => {
      // Only fetch if user is authenticated and is admin
      if (!user || user.role !== 'Admin') {
        return;
      }
      try {
        setLoading(true);
        const response = await leaguesAPI.getAll();
        setLeagues(response.leagues || []);
      } catch (err: unknown) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchLeagues();
  }, [user?.id, user?.role]);

  // Fetch analytics overview for live stats - only once on mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user || user.role !== 'Admin') return;
      setAnalyticsLoading(true);
      try {
        const response = await fetch('/api/analytics/overview', { headers: {} });
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        setAnalytics({
          totalUsers: data.overview?.totalUsers ?? 0,
          totalMatches: data.overview?.totalMatches ?? 0 });
      } catch (err) {
        setAnalytics({ totalUsers: 0, totalMatches: 0 });
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, []); // Empty dependency - fetch only once on mount, not when user object changes

  // Fetch clubs and teams counts
  useEffect(() => {
    const fetchClubsAndTeams = async () => {
      if (!user || user.role !== 'Admin') return;
      setClubsTeamsLoading(true);
      try {
        // Fetch all teams to count unique clubs and total teams
        const teamsResponse = await fetch('/api/teams', { 
          headers: {} 
        });
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          const teams = teamsData.teams || [];
          const uniqueClubs = new Set(teams.map((t: any) => t.clubName).filter(Boolean));
          setTeamsCount(teams.length);
          setClubsCount(uniqueClubs.size);
        }
      } catch (err) {
        console.error('Error fetching clubs and teams:', err);
      } finally {
        setClubsTeamsLoading(false);
      }
    };
    fetchClubsAndTeams();
  }, []); // Empty dependency - fetch only once on mount

  // Fetch test player count
  useEffect(() => {
    if (user && user.role === 'Admin') {
      fetchTestPlayerCount();
      fetchTestTeamCount();
    }
  }, [user]);

  // Check user permissions AFTER all hooks are declared
  if (!user) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div>
            <Typography variant="h4" color="error" gutterBottom>
              Access Denied
            </Typography>
            <Typography variant="body1">
              Please log in to access the admin panel.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
              Go to Login
            </Button>
          </div>
        </Box>
      </Container>
    );
  }

  if (user.role !== 'Admin') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h4" color="error" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1">
            You do not have permission to access this page.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/start')} sx={{ mt: 2 }}>
            Go to Start Here
          </Button>
        </Box>
      </Container>
    );
  }

  // Function definitions
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCreateLeague = async () => {
    try {
      await leaguesAPI.create(formData);
      setSuccess('League created successfully');
      setOpenDialog(false);
      setFormData({ name: '', region: '', country: '', url: '', description: '' });
      // Call the refetch function from useEffect
      const response = await leaguesAPI.getAll();
      setLeagues(response.leagues || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create league');
    }
  };

  const handleUpdateLeague = async () => {
    if (!editingLeague) return;
    
    try {
      await leaguesAPI.update(typeof editingLeague.id === 'string' ? parseInt(editingLeague.id) : editingLeague.id, formData);
      setSuccess('League updated successfully');
      setOpenDialog(false);
      setEditingLeague(null);
      setFormData({ name: '', region: '', country: '', url: '', description: '' });
      // Refetch leagues after update
      const response = await leaguesAPI.getAll();
      setLeagues(response.leagues || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update league');
    }
  };

  const openDeleteDialog = (league: League) => {
    setDeleteTarget(league);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleteLoading) return;
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteLeague = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      const leagueId = typeof deleteTarget.id === 'string' ? parseInt(deleteTarget.id) : deleteTarget.id;
      await leaguesAPI.delete(leagueId);
      setSuccess('League deleted successfully');
      setLeagues((prev) => prev.filter((league) => league.id !== deleteTarget.id));
      const response = await leaguesAPI.getAll();
      setLeagues(response.leagues || []);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete league');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFreezeLeague = async (id: number, currentStatus: boolean) => {
    const action = currentStatus ? 'freeze' : 'unfreeze';
    if (!window.confirm(`Are you sure you want to ${action} this league? ${currentStatus ? 'Users will not be able to select it.' : 'Users will be able to select it again.'}`)) return;
    
    try {
      await adminAPI.freezeLeague(id, !currentStatus);
      setSuccess(`League ${action}d successfully`);
      // Refetch leagues after freeze/unfreeze
      const response = await leaguesAPI.getAll();
      setLeagues(response.leagues || []);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${action} league`);
    }
  };



  const openEditDialog = (league: League) => {
    setEditingLeague(league);
    setFormData({
      name: league.name,
      region: league.region || '',
      country: league.country || '',
      url: league.url || '',
      description: league.description || ''
    });
    setOpenDialog(true);
  };

  const openCreateDialog = () => {
    setEditingLeague(null);
    setFormData({ name: '', region: '', country: '', url: '', description: '' });
    setOpenDialog(true);
  };

  const handleCreateAdmin = async () => {
    try {
      await adminAPI.createAdmin(adminFormData);
      setSuccess('Admin user created successfully');
      setOpenAdminDialog(false);
      setAdminFormData({ email: '', firstName: '', lastName: '', password: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create admin user');
    }
  };

  // Test Player Management Functions
  const testPlayerData = [
    // U9 Players (6 total)
    {
      location: { city: 'Dosthill, Tamworth', lat: 52.6250, lng: -1.6880, postcode: 'B77 1LB' },
      ageGroup: 'U9',
      positions: ['Goalkeeper'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Atherstone', lat: 52.5778, lng: -1.5464, postcode: 'CV9 1EJ' },
      ageGroup: 'U9',
      positions: ['Centre-back', 'Left-back'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    },
    {
      location: { city: 'Two Gates, Tamworth', lat: 52.6420, lng: -1.6790, postcode: 'B77 1DB' },
      ageGroup: 'U9',
      positions: ['Striker'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Mancetter, Atherstone', lat: 52.5820, lng: -1.5380, postcode: 'CV9 1NE' },
      ageGroup: 'U9',
      positions: ['Right Winger'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    },
    {
      location: { city: 'Wilnecote, Tamworth', lat: 52.6180, lng: -1.6550, postcode: 'B77 5ES' },
      ageGroup: 'U9',
      positions: ['Central Midfielder'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Baddesley Ensor', lat: 52.5650, lng: -1.5280, postcode: 'CV9 2BY' },
      ageGroup: 'U9',
      positions: ['Defender'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    },
    
    // U14 Players (6 total)
    {
      location: { city: 'Glascote, Tamworth', lat: 52.6280, lng: -1.6820, postcode: 'B77 2AF' },
      ageGroup: 'U14',
      positions: ['Central Midfielder', 'Attacking Midfielder'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Atherstone', lat: 52.5800, lng: -1.5420, postcode: 'CV9 2LB' },
      ageGroup: 'U14',
      positions: ['Left Winger', 'Right Winger'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    },
    {
      location: { city: 'Tamworth', lat: 52.6300, lng: -1.6950, postcode: 'B79 7JU' },
      ageGroup: 'U14',
      positions: ['Right-back', 'Centre-back'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Grendon, Atherstone', lat: 52.5580, lng: -1.5190, postcode: 'CV9 2QU' },
      ageGroup: 'U14',
      positions: ['Goalkeeper'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    },
    {
      location: { city: 'Belgrave, Tamworth', lat: 52.6380, lng: -1.6920, postcode: 'B77 2NQ' },
      ageGroup: 'U14',
      positions: ['Striker'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Baxterley, Atherstone', lat: 52.5480, lng: -1.5620, postcode: 'CV9 2LE' },
      ageGroup: 'U14',
      positions: ['Defensive Midfielder'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    },
    
    // Other Age Groups (8 more players)
    {
      location: { city: 'Dosthill, Tamworth', lat: 52.6260, lng: -1.6900, postcode: 'B77 1LH' },
      ageGroup: 'U7',
      positions: ['Midfielder'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Atherstone', lat: 52.5760, lng: -1.5480, postcode: 'CV9 1BS' },
      ageGroup: 'U8',
      positions: ['Striker', 'Winger'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    },
    {
      location: { city: 'Wilnecote, Tamworth', lat: 52.6200, lng: -1.6580, postcode: 'B77 5PB' },
      ageGroup: 'U10',
      positions: ['Centre-back'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Mancetter, Atherstone', lat: 52.5840, lng: -1.5400, postcode: 'CV9 1NP' },
      ageGroup: 'U11',
      positions: ['Left-back', 'Right-back'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    },
    {
      location: { city: 'Two Gates, Tamworth', lat: 52.6440, lng: -1.6810, postcode: 'B77 1DH' },
      ageGroup: 'U12',
      positions: ['Attacking Midfielder'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Baddesley Ensor', lat: 52.5670, lng: -1.5300, postcode: 'CV9 2BZ' },
      ageGroup: 'U13',
      positions: ['Goalkeeper'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    },
    {
      location: { city: 'Glascote, Tamworth', lat: 52.6290, lng: -1.6840, postcode: 'B77 2AP' },
      ageGroup: 'U15',
      positions: ['Striker'],
      leagues: ['Birmingham County FA', 'Staffordshire FA']
    },
    {
      location: { city: 'Grendon, Atherstone', lat: 52.5600, lng: -1.5210, postcode: 'CV9 2QW' },
      ageGroup: 'U16',
      positions: ['Central Midfielder', 'Winger'],
      leagues: ['Birmingham County FA', 'Warwickshire FA']
    }
  ];

  const handleCreateTestPlayers = async () => {
    setTestPlayerLoading(true);
    setTestPlayerMessage(null);
    
    try {
      let successCount = 0;
      let failCount = 0;

      for (const data of testPlayerData) {
        const payload = {
          title: `${data.ageGroup} ${data.positions.join('/')} Available - ${data.location.city}`,
          description: `Test player looking for a team in the ${data.location.city} area. Available for training and matches. This is test data created via Admin panel.`,
          preferredLeagues: data.leagues,
          ageGroup: data.ageGroup,
          positions: data.positions,
          location: data.location.city,
          locationData: {
            address: `${data.location.city}, ${data.location.postcode}`,
            latitude: data.location.lat,
            longitude: data.location.lng
          },
          contactInfo: 'test@grassrootshub.com',
          status: 'active'
        };

        try {
          const response = await fetch('/api/player-availability', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            console.error('Failed to create test player:', await response.json());
          }
        } catch (error) {
          failCount++;
          console.error('Error creating test player:', error);
        }
      }

      if (failCount === 0) {
        setTestPlayerMessage({ 
          type: 'success', 
          text: `Successfully created ${successCount} test players with location data` 
        });
        // Refresh count
        await fetchTestPlayerCount();
      } else {
        setTestPlayerMessage({ 
          type: 'error', 
          text: `Created ${successCount} players, but ${failCount} failed` 
        });
      }
    } catch (error: any) {
      setTestPlayerMessage({ type: 'error', text: error.message || 'Failed to create test players' });
    } finally {
      setTestPlayerLoading(false);
    }
  };

  const handleDeleteTestPlayers = async () => {
    setTestPlayerLoading(true);
    setTestPlayerMessage(null);
    
    try {
      // Fetch all player availability
      const response = await fetch('/api/player-availability', {
        headers: {}
      });

      if (!response.ok) {
        throw new Error('Failed to fetch player availability');
      }

      const data = await response.json();
      const allPlayers = data.availability || [];
      
      // Find test players by description
      const testPlayers = allPlayers.filter((p: any) => 
        p.description && p.description.includes('This is test data created via Admin panel')
      );

      if (testPlayers.length === 0) {
        setTestPlayerMessage({ type: 'success', text: 'No test players found to delete' });
        return;
      }

      let deleteCount = 0;
      let failCount = 0;

      for (const player of testPlayers) {
        try {
          const deleteResponse = await fetch(`/api/player-availability/${player.id}`, {
            method: 'DELETE',
            headers: {}
          });

          if (deleteResponse.ok) {
            deleteCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
          console.error('Error deleting player:', error);
        }
      }

      if (failCount === 0) {
        setTestPlayerMessage({ 
          type: 'success', 
          text: `Successfully deleted ${deleteCount} test players` 
        });
        setTestPlayerCount(0);
      } else {
        setTestPlayerMessage({ 
          type: 'error', 
          text: `Deleted ${deleteCount} players, but ${failCount} failed` 
        });
      }
    } catch (error: any) {
      setTestPlayerMessage({ type: 'error', text: error.message || 'Failed to delete test players' });
    } finally {
      setTestPlayerLoading(false);
    }
  };

  const fetchTestPlayerCount = async () => {
    try {
      const response = await fetch('/api/player-availability', {
        headers: {}
      });

      if (response.ok) {
        const data = await response.json();
        const allPlayers = data.availability || [];
        const testPlayers = allPlayers.filter((p: any) => 
          p.description && p.description.includes('This is test data created via Admin panel')
        );
        setTestPlayerCount(testPlayers.length);
      }
    } catch (error) {
      console.error('Error fetching test player count:', error);
    }
  };

  // Test team vacancy management functions
  const handleCreateTestTeams = async () => {
    setTestTeamLoading(true);
    setTestTeamMessage(null);
    
    try {
      const response = await fetch('/api/admin/test-team-vacancies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create test team vacancies');
      }

      const data = await response.json();
      setTestTeamMessage({ 
        type: 'success', 
        text: `Successfully created ${data.vacancies?.length || 0} test team vacancies` 
      });
      await fetchTestTeamCount();
    } catch (error: any) {
      setTestTeamMessage({ type: 'error', text: error.message || 'Failed to create test team vacancies' });
    } finally {
      setTestTeamLoading(false);
    }
  };

  const handleDeleteTestTeams = async () => {
    setTestTeamLoading(true);
    setTestTeamMessage(null);
    
    try {
      const response = await fetch('/api/admin/test-team-vacancies', {
        method: 'DELETE',
        headers: {}
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete test team vacancies');
      }

      const data = await response.json();
      setTestTeamMessage({ 
        type: 'success', 
        text: data.message || `Successfully deleted ${data.count || 0} test team vacancies` 
      });
      setTestTeamCount(0);
    } catch (error: any) {
      setTestTeamMessage({ type: 'error', text: error.message || 'Failed to delete test team vacancies' });
    } finally {
      setTestTeamLoading(false);
    }
  };

  const fetchTestTeamCount = async () => {
    try {
      const response = await fetch('/api/admin/test-team-vacancies/count', {
        headers: {}
      });

      if (response.ok) {
        const data = await response.json();
        setTestTeamCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching test team count:', error);
    }
  };

  const handleImpersonateUser = (userType: 'Coach' | 'Player' | 'Parent/Guardian') => {
    if (impersonationLoading) {
      console.log('⏳ Impersonation already in progress, ignoring request');
      return;
    }
    
    try {
      setImpersonationLoading(true);
      console.log('🔄 Attempting to impersonate user type:', userType);
      console.log('👤 Current user:', user);
      console.log('🔐 Is impersonating:', isImpersonating);
      
      impersonateUser(userType);
      
      console.log('✅ Impersonation successful, navigating to start page...');
      // Navigate to Start Here to see the impersonated user's view
      setTimeout(() => {
        navigate('/start');
        setImpersonationLoading(false);
      }, 100);
    } catch (error) {
      console.error('❌ Error during user impersonation:', error);
      setError('Failed to switch user. Please try again.');
      setImpersonationLoading(false);
    }
  };

  const handleStopImpersonation = () => {
    if (impersonationLoading) {
      console.log('⏳ Impersonation operation already in progress, ignoring request');
      return;
    }
    
    try {
      setImpersonationLoading(true);
      console.log('🔄 Stopping impersonation...');
      stopImpersonation();
      
      console.log('✅ Impersonation stopped, navigating to admin...');
      // Navigate back to admin panel
      setTimeout(() => {
        navigate('/admin');
        setImpersonationLoading(false);
      }, 100);
    } catch (error) {
      console.error('❌ Error stopping impersonation:', error);
      setError('Failed to stop impersonation. Please try again.');
      setImpersonationLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Modern Admin Header Banner */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        borderRadius: 0,
        mb: 3
      }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 3, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <Avatar 
                sx={{ 
                  mr: 2, 
                  bgcolor: 'rgba(255,255,255,0.2)',
                  width: 56, 
                  height: 56 
                }}
              >
                <AdminIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant={isMobile ? "h5" : "h4"} component="h1" sx={{ 
                  fontWeight: 700,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  Admin Dashboard
                </Typography>
                <Typography variant="body1" sx={{ 
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 500
                }}>
                  {isImpersonating 
                    ? `Currently viewing as ${user.role}` 
                    : 'System Management & Analytics'
                  }
                </Typography>
              </Box>
            </Box>
            
            {/* Quick Actions Menu */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isMobile && (
                <>
                  {isImpersonating && (
                    <Button
                      startIcon={<ExitIcon />}
                      variant="outlined"
                      sx={{ 
                        borderColor: 'rgba(255,255,255,0.5)',
                        color: 'white',
                        '&:hover': { 
                          borderColor: 'white',
                          bgcolor: 'rgba(255,255,255,0.1)'
                        }
                      }}
                      onClick={handleStopImpersonation}
                    >
                      Stop Impersonation
                    </Button>
                  )}
                </>
              )}
              <IconButton
                color="inherit"
                onClick={handleMenuOpen}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                }}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Quick Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem onClick={() => { handleMenuClose(); setOpenAdminDialog(true); }}>
          <PersonAddIcon sx={{ mr: 2 }} />
          Create Admin
        </MenuItem>
        <Divider />
        {isImpersonating ? (
          <MenuItem onClick={() => { handleMenuClose(); handleStopImpersonation(); }}>
            <ExitIcon sx={{ mr: 2 }} />
            Stop Impersonation
          </MenuItem>
        ) : (
          <>
            <MenuItem onClick={() => { handleMenuClose(); handleImpersonateUser('Player'); }}>
              <PersonIcon sx={{ mr: 2 }} />
              Test as Player
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); handleImpersonateUser('Coach'); }}>
              <SchoolIcon sx={{ mr: 2 }} />
              Test as Coach
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); handleImpersonateUser('Parent/Guardian'); }}>
              <FamilyIcon sx={{ mr: 2 }} />
              Test as Parent
            </MenuItem>
          </>
        )}
      </Menu>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearMessages}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={clearMessages}>
            {success}
          </Alert>
        )}

        {/* Impersonation Alert */}
        {isImpersonating && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleStopImpersonation}
                startIcon={<ExitIcon />}
              >
                Stop
              </Button>
            }
          >
            <Typography variant="body2" fontWeight="bold">
              Impersonation Mode Active
            </Typography>
            You are currently viewing the platform as a <strong>{user.role}</strong>. 
            Click "Stop" to return to admin view.
          </Alert>
        )}

        {/* Quick Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              color: 'white'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {leagues.length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Active Leagues
                    </Typography>
                  </Box>
                  <GroupIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                }
              }}
              onClick={() => navigate('/admin/users')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {analyticsLoading ? <CircularProgress size={28} color="inherit" /> : analytics.totalUsers}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Users
                    </Typography>
                  </Box>
                  <SupervisorIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
              color: 'white'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {analyticsLoading ? <CircularProgress size={28} color="inherit" /> : analytics.totalMatches}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Active Matches
                    </Typography>
                  </Box>
                  <DashboardIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                }
              }}
              onClick={() => navigate('/admin/clubs')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {clubsTeamsLoading ? <CircularProgress size={28} color="inherit" /> : clubsCount}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Clubs
                    </Typography>
                  </Box>
                  <GroupIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                }
              }}
              onClick={() => navigate('/admin/clubs')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {clubsTeamsLoading ? <CircularProgress size={28} color="inherit" /> : teamsCount}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Teams
                    </Typography>
                  </Box>
                  <DashboardIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                }
              }}
              onClick={() => navigate('/admin/moderation')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Moderation
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Review Reports & Alerts
                    </Typography>
                  </Box>
                  <FlagIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                }
              }}
              onClick={() => navigate('/admin/email-logs')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Email Logs
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Delivery Success & Failures
                    </Typography>
                  </Box>
                  <EmailIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                }
              }}
              onClick={() => navigate('/admin/kpi-report')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      KPI Report
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Weekly Conversion & QA Summary
                    </Typography>
                  </Box>
                  <AnalyticsIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabbed Content */}
        <Paper elevation={2} sx={{ mb: 4 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange} 
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              label="League Management" 
              icon={<GroupIcon />} 
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
            <Tab 
              label="User Testing" 
              icon={<PersonIcon />} 
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
            <Tab 
              label="System Settings" 
              icon={<SettingsIcon />} 
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Tab Content */}
            {currentTab === 0 && (
              <Box>
                {/* League Management Tab */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" component="h2">
                    League Management
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateDialog}
                  >
                    Add League
                  </Button>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Country</TableCell>
                          <TableCell>Region</TableCell>
                          <TableCell>URL</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="center">Status</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {leagues.map((league) => (
                          <TableRow key={league.id} hover>
                            <TableCell>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {league.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {league.country || 'England'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {league.region || (league.country && league.country !== 'England' ? 'Not applicable' : 'N/A')}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {getRegionBadges(league.region).map((badge) => (
                                    <Chip
                                      key={badge}
                                      label={badge}
                                      size="small"
                                      color={badge === ALL_REGIONS_OPTION ? 'primary' : 'default'}
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {league.url ? (
                                <Typography
                                  variant="body2" 
                                  color="primary"
                                  component="a"
                                  href={league.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                >
                                  View League
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No URL
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {league.description || 'No description'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {league.isActive ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  <ActiveIcon fontSize="small" sx={{ color: 'success.main' }} />
                                  <Typography variant="body2" color="success.main">Active</Typography>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  <InactiveIcon fontSize="small" sx={{ color: 'warning.main' }} />
                                  <Typography variant="body2" color="warning.main">Frozen</Typography>
                                </Box>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                color="primary"
                                onClick={() => openEditDialog(league)}
                                size="small"
                                title="Edit league"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                color={league.isActive ? "warning" : "success"}
                                onClick={() => handleFreezeLeague(typeof league.id === 'string' ? parseInt(league.id) : league.id, league.isActive ?? false)}
                                size="small"
                                title={league.isActive ? "Freeze league" : "Unfreeze league"}
                              >
                                {league.isActive ? <LockIcon /> : <LockOpenIcon />}
                              </IconButton>
                              <IconButton
                                color="error"
                                onClick={() => openDeleteDialog(league)}
                                size="small"
                                title="Delete league"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        {leagues.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No leagues found. Create your first league to get started.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* User Testing Tab */}
            {currentTab === 1 && (
              <Box>
                <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
                  User Testing (Impersonation)
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Test the platform from different user perspectives without creating separate accounts.
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Card sx={{ 
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}>
                      <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                        <PersonIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>Player</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Test player features like availability posting and team searching
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2 }}>
                        <Button 
                          fullWidth 
                          variant="outlined"
                          startIcon={<PersonIcon />}
                          onClick={() => handleImpersonateUser('Player')}
                          disabled={isImpersonating}
                        >
                          Test as Player
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Card sx={{ 
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}>
                      <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                        <SchoolIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>Coach</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Test coach features like team management and player recruitment
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2 }}>
                        <Button 
                          fullWidth 
                          variant="outlined"
                          startIcon={<SchoolIcon />}
                          onClick={() => handleImpersonateUser('Coach')}
                          disabled={isImpersonating}
                        >
                          Test as Coach
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Card sx={{ 
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}>
                      <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                        <FamilyIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>Parent</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Test parent features for managing children's football activities
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2 }}>
                        <Button 
                          fullWidth 
                          variant="outlined"
                          startIcon={<FamilyIcon />}
                          onClick={() => handleImpersonateUser('Parent/Guardian')}
                          disabled={isImpersonating}
                        >
                          Test as Parent
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                </Grid>

                {/* Test Data Management Section */}
                <Divider sx={{ my: 4 }} />
                
                <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
                  Test Data Management
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Create or delete test player availability records for testing the Maps page and search functionality.
                </Typography>

                {testPlayerMessage && (
                  <Alert 
                    severity={testPlayerMessage.type} 
                    sx={{ mb: 3 }}
                    onClose={() => setTestPlayerMessage(null)}
                  >
                    {testPlayerMessage.text}
                  </Alert>
                )}

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <ScienceIcon sx={{ mr: 2, color: 'info.main', fontSize: 32 }} />
                          <Typography variant="h6">Create Test Players</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Creates 20 test player availability records with proper location data across Tamworth, Atherstone and surrounding villages (6 x U9, 6 x U14, 8 x other ages U7-U16).
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                          These test players will appear on the Maps page and can be used to test search, filtering, and mapping features.
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Current test players: {testPlayerCount}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<AddIcon />}
                          onClick={handleCreateTestPlayers}
                          disabled={testPlayerLoading}
                          fullWidth
                        >
                          {testPlayerLoading ? <CircularProgress size={24} /> : 'Create Test Players'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <DeleteIcon sx={{ mr: 2, color: 'error.main', fontSize: 32 }} />
                          <Typography variant="h6">Delete Test Players</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Removes all test player availability records created via the Admin panel.
                        </Typography>
                        <Typography variant="caption" color="warning.main" sx={{ mb: 2, display: 'block' }}>
                          ⚠️ This only deletes test players created through this panel. Other player records will not be affected.
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Test players to delete: {testPlayerCount}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={handleDeleteTestPlayers}
                          disabled={testPlayerLoading || testPlayerCount === 0}
                          fullWidth
                        >
                          {testPlayerLoading ? <CircularProgress size={24} /> : 'Delete Test Players'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Team Vacancies Section */}
                <Divider sx={{ my: 4 }} />
                
                <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
                  Test Team Vacancies
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Create or delete test team vacancy records for testing team recruitment features.
                </Typography>

                {testTeamMessage && (
                  <Alert 
                    severity={testTeamMessage.type} 
                    sx={{ mb: 3 }}
                    onClose={() => setTestTeamMessage(null)}
                  >
                    {testTeamMessage.text}
                  </Alert>
                )}

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <ScienceIcon sx={{ mr: 2, color: 'info.main', fontSize: 32 }} />
                          <Typography variant="h6">Create Test Team Vacancies</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Creates 8 test team vacancy records across the Midlands region (U9, U11, U14, U16 - 2 per age group).
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                          These test vacancies will appear in search results and can be used to test team recruitment and search features. Includes match recording and pathway to senior features.
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Current test team vacancies: {testTeamCount}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<AddIcon />}
                          onClick={handleCreateTestTeams}
                          disabled={testTeamLoading}
                          fullWidth
                        >
                          {testTeamLoading ? <CircularProgress size={24} /> : 'Create Test Team Vacancies'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <DeleteIcon sx={{ mr: 2, color: 'error.main', fontSize: 32 }} />
                          <Typography variant="h6">Delete Test Team Vacancies</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Removes all test team vacancy records created via the Admin panel.
                        </Typography>
                        <Typography variant="caption" color="warning.main" sx={{ mb: 2, display: 'block' }}>
                          ⚠️ This only deletes test team vacancies created through this panel. Other team records will not be affected.
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Test team vacancies to delete: {testTeamCount}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={handleDeleteTestTeams}
                          disabled={testTeamLoading || testTeamCount === 0}
                          fullWidth
                        >
                          {testTeamLoading ? <CircularProgress size={24} /> : 'Delete Test Team Vacancies'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* System Settings Tab */}
            {currentTab === 2 && (
              <Box>
                <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                  System Settings
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <PersonAddIcon sx={{ mr: 2, color: 'primary.main' }} />
                          <Typography variant="h6">Create Admin User</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Create a new administrator account with full system access.
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<PersonAddIcon />}
                          onClick={() => setOpenAdminDialog(true)}
                          fullWidth
                        >
                          Create Admin Account
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <SupervisorIcon sx={{ mr: 2, color: 'info.main' }} />
                          <Typography variant="h6">User Management</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Manage users, grant beta access, view user details, and moderate accounts.
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<SupervisorIcon />}
                          onClick={() => navigate('/admin/users')}
                          fullWidth
                        >
                          Manage Users
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <AnalyticsIcon sx={{ mr: 2, color: 'success.main' }} />
                          <Typography variant="h6">Site Activity & Traffic</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          View platform activity, user growth, and recent site traffic.
                        </Typography>
                        <SiteActivityDashboard />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Floating Action Button for Mobile */}
        {isMobile && (
          <Fab
            color="primary"
            aria-label="add"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1000
            }}
            onClick={currentTab === 0 ? openCreateDialog : () => setOpenAdminDialog(true)}
          >
            <AddIcon />
          </Fab>
        )}
      </Container>

      {/* Dialogs */}
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Delete League</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {`Are you sure you want to delete "${deleteTarget?.name || 'this league'}"? This action cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteLeague}
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : undefined}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* League Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingLeague ? 'Edit League' : 'Create New League'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="League Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel shrink>Country</InputLabel>
            <Select
              value={formData.country}
              label="Country"
              displayEmpty
              notched
              onChange={(e) => {
                const nextCountry = e.target.value as string;
                setFormData({
                  ...formData,
                  country: nextCountry,
                  region: nextCountry && nextCountry !== 'England' ? '' : formData.region
                });
              }}
              renderValue={(selected) => (selected ? selected : 'Select country')}
            >
              {UK_COUNTRIES.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }} disabled={!isEnglandSelected}>
            <InputLabel shrink>Region</InputLabel>
            <Select
              multiple
              value={getRegionSelection(formData.region)}
              label="Region"
              displayEmpty
              notched
              open={regionMenuOpen}
              onOpen={() => setRegionMenuOpen(true)}
              onClose={() => setRegionMenuOpen(false)}
              onChange={(e) => {
                const selected = (e.target.value as string[]).filter(Boolean);
                if (selected.includes(REGION_DONE_OPTION)) {
                  setRegionMenuOpen(false);
                  return;
                }
                const hasAllRegions = selected.includes(ALL_REGIONS_OPTION);
                const nextRegions = hasAllRegions
                  ? [ALL_REGIONS_OPTION]
                  : selected.filter((region) => region !== ALL_REGIONS_OPTION);
                setFormData({ ...formData, region: nextRegions.join(', ') });
              }}
              renderValue={(selected) => {
                if (!isEnglandSelected) {
                  return 'Not applicable';
                }
                const regions = selected as string[];
                if (!regions.length) {
                  return 'Select region';
                }
                if (regions.includes(ALL_REGIONS_OPTION)) {
                  return ALL_REGIONS_OPTION;
                }
                return regions.join(', ');
              }}
            >
              <MenuItem value={ALL_REGIONS_OPTION}>
                <Checkbox checked={getRegionSelection(formData.region).includes(ALL_REGIONS_OPTION)} />
                <ListItemText primary={ALL_REGIONS_OPTION} />
              </MenuItem>
              {availableRegions.map((option) => (
                <MenuItem key={option} value={option}>
                  <Checkbox checked={getRegionSelection(formData.region).includes(option)} />
                  <ListItemText primary={option} />
                </MenuItem>
              ))}
              <MenuItem
                value={REGION_DONE_OPTION}
                sx={{ justifyContent: 'center', fontWeight: 600, mt: 1 }}
              >
                Done
              </MenuItem>
            </Select>
            <FormHelperText>
              {isEnglandSelected
                ? 'Select all that apply, then click Done to confirm.'
                : 'Regions available for England only'}
            </FormHelperText>
          </FormControl>
          <TextField
            margin="dense"
            label="League URL"
            type="url"
            fullWidth
            variant="outlined"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={editingLeague ? handleUpdateLeague : handleCreateLeague}
            variant="contained"
          >
            {editingLeague ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin User Creation Dialog */}
      <Dialog open={openAdminDialog} onClose={() => setOpenAdminDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Admin User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={adminFormData.email}
            onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="First Name"
            type="text"
            fullWidth
            variant="outlined"
            value={adminFormData.firstName}
            onChange={(e) => setAdminFormData({ ...adminFormData, firstName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Last Name"
            type="text"
            fullWidth
            variant="outlined"
            value={adminFormData.lastName}
            onChange={(e) => setAdminFormData({ ...adminFormData, lastName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={adminFormData.password}
            onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdminDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateAdmin} variant="contained">
            Create Admin
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPage;
