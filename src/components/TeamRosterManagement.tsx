import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Badge,
  Stack,
  Tooltip,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PersonAdd as PersonAddIcon,
  Sports as SportsIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { teamRosterAPI } from '../services/api';
import { TeamRoster, TeamPlayer, PositionGap } from '../types';
import { useNavigate } from 'react-router-dom';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`roster-tabpanel-${index}`}
    aria-labelledby={`roster-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const TeamRosterManagement: React.FC = () => {
  const navigate = useNavigate();
  const [rosters, setRosters] = useState<TeamRoster[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<TeamRoster | null>(null);
  const [positionAnalysis, setPositionAnalysis] = useState<{
    gaps: PositionGap[];
    summary: { totalPlayers: number; activePositions: number; criticalGaps: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Dialog states
  const [showRosterDialog, setShowRosterDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [editingRoster, setEditingRoster] = useState<TeamRoster | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<TeamPlayer | null>(null);
  
  // Form states
  const [rosterForm, setRosterForm] = useState({
    teamName: '',
    clubName: '',
    ageGroup: '',
    league: '',
    maxSquadSize: ''
  });
  
  const [playerForm, setPlayerForm] = useState({
    playerName: '',
    bestPosition: '',
    alternativePositions: [] as string[],
    preferredFoot: 'Right' as 'Left' | 'Right' | 'Both',
    age: '',
    contactInfo: '',
    notes: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Football positions
  const positions = [
    'Goalkeeper',
    'Centre-back',
    'Left-back', 
    'Right-back',
    'Defensive Midfielder',
    'Central Midfielder',
    'Attacking Midfielder',
    'Left Wing',
    'Right Wing',
    'Striker',
    'Centre Forward'
  ];

  const ageGroups = [
    'Under 6', 'Under 7', 'Under 8', 'Under 9', 'Under 10', 'Under 11',
    'Under 12', 'Under 13', 'Under 14', 'Under 15', 'Under 16', 'Under 17',
    'Under 18', 'Under 19', 'Under 20', 'Under 21', 'Senior', 'Veterans'
  ];

  const leagues = [
    'Premier League Youth', 'Championship Youth', 'League One Youth',
    'County League', 'Regional League', 'Local League', 'Sunday League',
    'Community Football League', 'Youth Development League'
  ];

  useEffect(() => {
    loadRosters();
  }, []);

  useEffect(() => {
    if (selectedRoster) {
      loadPositionAnalysis(selectedRoster.id);
    }
  }, [selectedRoster]);

  const loadRosters = async () => {
    try {
      setLoading(true);
      const response = await teamRosterAPI.getAll();
      setRosters(response.rosters);
      if (response.rosters.length > 0 && !selectedRoster) {
        const fullRoster = await teamRosterAPI.getById(response.rosters[0].id);
        setSelectedRoster(fullRoster.roster);
      }
    } catch (err) {
      console.warn('⚠️ Team Rosters API not available:', err);
      // Set empty rosters if the endpoint is not available
      setRosters([]);
      setError('Team Rosters feature is not yet configured');
    } finally {
      setLoading(false);
    }
  };

  const loadPositionAnalysis = async (rosterId: string) => {
    try {
      const analysis = await teamRosterAPI.getPositionAnalysis(rosterId);
      setPositionAnalysis(analysis);
    } catch (err) {
      console.error('Error loading position analysis:', err);
    }
  };

  const handleCreateRoster = async () => {
    try {
      const rosterData = {
        ...rosterForm,
        maxSquadSize: rosterForm.maxSquadSize ? parseInt(rosterForm.maxSquadSize) : null
      };
      await teamRosterAPI.create(rosterData);
      setSuccess('Team roster created successfully!');
      setShowRosterDialog(false);
      setRosterForm({ teamName: '', clubName: '', ageGroup: '', league: '', maxSquadSize: '' });
      loadRosters();
    } catch (err) {
      console.error('Error creating roster:', err);
      setError('Failed to create team roster');
    }
  };

  const handleUpdateRoster = async () => {
    if (!editingRoster) return;
    
    try {
      const rosterData = {
        ...rosterForm,
        maxSquadSize: rosterForm.maxSquadSize ? parseInt(rosterForm.maxSquadSize) : null
      };
      await teamRosterAPI.update(editingRoster.id, rosterData);
      setSuccess('Team roster updated successfully!');
      setShowRosterDialog(false);
      setEditingRoster(null);
      setRosterForm({ teamName: '', clubName: '', ageGroup: '', league: '', maxSquadSize: '' });
      loadRosters();
      if (selectedRoster && selectedRoster.id === editingRoster.id) {
        const updatedRoster = await teamRosterAPI.getById(editingRoster.id);
        setSelectedRoster(updatedRoster.roster);
      }
    } catch (err) {
      console.error('Error updating roster:', err);
      setError('Failed to update team roster');
    }
  };

  const handleDeleteRoster = async (rosterId: string) => {
    if (!window.confirm('Are you sure you want to delete this team roster? This will remove all players.')) {
      return;
    }
    
    try {
      await teamRosterAPI.delete(rosterId);
      setSuccess('Team roster deleted successfully!');
      loadRosters();
      if (selectedRoster && selectedRoster.id === rosterId) {
        setSelectedRoster(null);
        setPositionAnalysis(null);
      }
    } catch (err) {
      console.error('Error deleting roster:', err);
      setError('Failed to delete team roster');
    }
  };

  const handleAddPlayer = async () => {
    if (!selectedRoster) return;
    
    // Check squad capacity
    if (selectedRoster.maxSquadSize && selectedRoster.players.length >= selectedRoster.maxSquadSize) {
      setError(`Cannot add player: Squad has reached maximum capacity of ${selectedRoster.maxSquadSize} players`);
      return;
    }
    
    try {
      const playerData = {
        ...playerForm,
        age: playerForm.age ? parseInt(playerForm.age) : undefined
      };
      
      await teamRosterAPI.addPlayer(selectedRoster.id, playerData);
      setSuccess('Player added successfully!');
      setShowPlayerDialog(false);
      setPlayerForm({
        playerName: '',
        bestPosition: '',
        alternativePositions: [],
        preferredFoot: 'Right',
        age: '',
        contactInfo: '',
        notes: ''
      });
      
      // Reload the selected roster
      const updatedRoster = await teamRosterAPI.getById(selectedRoster.id);
      setSelectedRoster(updatedRoster.roster);
    } catch (err) {
      console.error('Error adding player:', err);
      setError('Failed to add player');
    }
  };

  const handleUpdatePlayer = async () => {
    if (!selectedRoster || !editingPlayer) return;
    
    try {
      const playerData = {
        ...playerForm,
        age: playerForm.age ? parseInt(playerForm.age) : undefined
      };
      
      await teamRosterAPI.updatePlayer(selectedRoster.id, editingPlayer.id, playerData);
      setSuccess('Player updated successfully!');
      setShowPlayerDialog(false);
      setEditingPlayer(null);
      setPlayerForm({
        playerName: '',
        bestPosition: '',
        alternativePositions: [],
        preferredFoot: 'Right',
        age: '',
        contactInfo: '',
        notes: ''
      });
      
      // Reload the selected roster
      const updatedRoster = await teamRosterAPI.getById(selectedRoster.id);
      setSelectedRoster(updatedRoster.roster);
    } catch (err) {
      console.error('Error updating player:', err);
      setError('Failed to update player');
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!selectedRoster) return;
    if (!window.confirm('Are you sure you want to remove this player from the roster?')) {
      return;
    }
    
    try {
      await teamRosterAPI.removePlayer(selectedRoster.id, playerId);
      setSuccess('Player removed successfully!');
      
      // Reload the selected roster
      const updatedRoster = await teamRosterAPI.getById(selectedRoster.id);
      setSelectedRoster(updatedRoster.roster);
    } catch (err) {
      console.error('Error removing player:', err);
      setError('Failed to remove player');
    }
  };

  const openRosterDialog = (roster?: TeamRoster) => {
    if (roster) {
      setEditingRoster(roster);
      setRosterForm({
        teamName: roster.teamName,
        clubName: roster.clubName || '',
        ageGroup: roster.ageGroup,
        league: roster.league,
        maxSquadSize: roster.maxSquadSize ? roster.maxSquadSize.toString() : ''
      });
    } else {
      setEditingRoster(null);
      setRosterForm({
        teamName: '',
        clubName: '',
        ageGroup: '',
        league: '',
        maxSquadSize: ''
      });
    }
    setShowRosterDialog(true);
  };

  const openPlayerDialog = (player?: TeamPlayer) => {
    if (player) {
      setEditingPlayer(player);
      setPlayerForm({
        playerName: player.playerName,
        bestPosition: player.bestPosition,
        alternativePositions: player.alternativePositions,
        preferredFoot: player.preferredFoot,
        age: player.age?.toString() || '',
        contactInfo: player.contactInfo || '',
        notes: player.notes || ''
      });
    } else {
      setEditingPlayer(null);
      setPlayerForm({
        playerName: '',
        bestPosition: '',
        alternativePositions: [],
        preferredFoot: 'Right',
        age: '',
        contactInfo: '',
        notes: ''
      });
    }
    setShowPlayerDialog(true);
  };

  const selectRoster = async (roster: TeamRoster) => {
    try {
      const fullRoster = await teamRosterAPI.getById(roster.id);
      setSelectedRoster(fullRoster.roster);
      setTabValue(0); // Switch to players tab
    } catch (err) {
      console.error('Error loading roster details:', err);
      setError('Failed to load roster details');
    }
  };

  const formatSquadCapacity = (currentPlayers: number, maxSquadSize?: number) => {
    if (maxSquadSize) {
      const isOverCapacity = currentPlayers > maxSquadSize;
      return (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <span>{currentPlayers}/{maxSquadSize} players</span>
          {isOverCapacity && (
            <Chip 
              label="Over Capacity" 
              color="warning" 
              size="small"
              icon={<WarningIcon />}
            />
          )}
        </Box>
      );
    }
    return `${currentPlayers} players (unlimited)`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'primary';
    }
  };

  const handleCopyClubLink = async (clubName: string) => {
    const url = `${window.location.origin}/club-dashboard/${encodeURIComponent(clubName)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setSuccess('Club link copied to clipboard!');
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setSuccess('Club link copied to clipboard!');
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Team Rosters List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Team Rosters
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => openRosterDialog()}
                variant="contained"
                size="small"
              >
                New Team
              </Button>
            </Box>
            
            {rosters.length === 0 ? (
              <Box textAlign="center" py={4}>
                <SportsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No team rosters yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create your first team to get started
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {rosters.map((roster) => (
                  <Card 
                    key={roster.id}
                    variant={selectedRoster?.id === roster.id ? "elevation" : "outlined"}
                    sx={{ 
                      cursor: 'pointer',
                      bgcolor: selectedRoster?.id === roster.id ? 'action.selected' : 'inherit'
                    }}
                    onClick={() => selectRoster(roster)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Typography variant="h6" noWrap>
                            {roster.teamName}
                          </Typography>
                          {roster.clubName && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography variant="caption" color="primary">
                                {roster.clubName}
                              </Typography>
                              <Tooltip title={copySuccess ? "Copied!" : "Copy club link"}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyClubLink(roster.clubName!);
                                  }}
                                  sx={{ p: 0.25 }}
                                >
                                  {copySuccess ? <CheckIcon fontSize="small" color="success" /> : <CopyIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            {roster.ageGroup} • {roster.league}
                          </Typography>
                          <Box display="flex" alignItems="center" mt={1}>
                            <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="caption">
                              {formatSquadCapacity(roster.players?.length || 0, roster.maxSquadSize)}
                            </Typography>
                          </Box>
                        </Box>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRosterDialog(roster);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoster(roster.id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Selected Roster Details */}
        <Grid item xs={12} md={8}>
          {selectedRoster ? (
            <Paper sx={{ p: 0 }}>
              <Box p={2} borderBottom={1} borderColor="divider">
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h5">
                      {selectedRoster.teamName}
                    </Typography>
                    {selectedRoster.clubName && (
                      <Typography variant="subtitle2" color="primary">
                        {selectedRoster.clubName}
                      </Typography>
                    )}
                    <Typography variant="subtitle1" color="text.secondary">
                      {selectedRoster.ageGroup} • {selectedRoster.league}
                    </Typography>
                  </Box>
                  {selectedRoster.clubName && (
                    <Box display="flex" gap={1}>
                      <Tooltip title="Copy club link to share">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyClubLink(selectedRoster.clubName!)}
                          color={copySuccess ? "success" : "primary"}
                        >
                          {copySuccess ? <CheckIcon /> : <ShareIcon />}
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate(`/club-dashboard/${encodeURIComponent(selectedRoster.clubName!)}`)}
                      >
                        Club Dashboard
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
              
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab 
                  label={
                    <Badge 
                      badgeContent={
                        selectedRoster.maxSquadSize 
                          ? `${selectedRoster.players.length}/${selectedRoster.maxSquadSize}`
                          : selectedRoster.players.length
                      } 
                      color={
                        selectedRoster.maxSquadSize && selectedRoster.players.length > selectedRoster.maxSquadSize
                          ? "warning" 
                          : "primary"
                      }
                    >
                      Players
                    </Badge>
                  } 
                  icon={<PersonIcon />} 
                />
                <Tab 
                  label={
                    <Badge 
                      badgeContent={positionAnalysis?.summary.criticalGaps || 0} 
                      color="error"
                    >
                      Squad Analysis
                    </Badge>
                  } 
                  icon={<AnalyticsIcon />} 
                />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Squad ({formatSquadCapacity(selectedRoster.players.length, selectedRoster.maxSquadSize)})
                  </Typography>
                  {(() => {
                    const isAtCapacity = selectedRoster.maxSquadSize && 
                      selectedRoster.players.length >= selectedRoster.maxSquadSize;
                    
                    return (
                      <Tooltip 
                        title={
                          isAtCapacity 
                            ? `Squad has reached maximum capacity of ${selectedRoster.maxSquadSize} players`
                            : "Add a new player to the squad"
                        }
                      >
                        <span>
                          <Button
                            startIcon={<PersonAddIcon />}
                            onClick={() => openPlayerDialog()}
                            variant="contained"
                            disabled={Boolean(isAtCapacity)}
                          >
                            Add Player
                          </Button>
                        </span>
                      </Tooltip>
                    );
                  })()}
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Player Name</TableCell>
                        <TableCell>Best Position</TableCell>
                        <TableCell>Alternative Positions</TableCell>
                        <TableCell>Preferred Foot</TableCell>
                        <TableCell>Age</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedRoster.players.map((player: TeamPlayer) => (
                        <TableRow key={player.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {player.playerName}
                              </Typography>
                              {player.contactInfo && (
                                <Typography variant="caption" color="text.secondary">
                                  {player.contactInfo}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={player.bestPosition} 
                              size="small" 
                              color="primary"
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              {player.alternativePositions.map((pos: string, index: number) => (
                                <Chip 
                                  key={index}
                                  label={pos} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>{player.preferredFoot}</TableCell>
                          <TableCell>{player.age || 'N/A'}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => openPlayerDialog(player)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeletePlayer(player.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {selectedRoster.players.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography variant="body1" color="text.secondary">
                              No players in this roster yet
                            </Typography>
                            <Button
                              startIcon={<PersonAddIcon />}
                              onClick={() => openPlayerDialog()}
                              sx={{ mt: 1 }}
                            >
                              Add First Player
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {positionAnalysis ? (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Squad Analysis
                    </Typography>
                    
                    {/* Summary Cards */}
                    <Grid container spacing={2} mb={3}>
                      <Grid item xs={4}>
                        <Card>
                          <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="primary">
                              {positionAnalysis.summary.totalPlayers}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Players
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={4}>
                        <Card>
                          <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="secondary">
                              {positionAnalysis.summary.activePositions}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Covered Positions
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={4}>
                        <Card>
                          <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="error">
                              {positionAnalysis.summary.criticalGaps}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Critical Gaps
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Position Gaps */}
                    <Typography variant="h6" gutterBottom>
                      Position Requirements
                    </Typography>
                    <List>
                      {positionAnalysis.gaps.map((gap, index) => (
                        <ListItem key={index} divider>
                          <ListItemIcon>
                            {gap.gap > 0 ? (
                              <WarningIcon color={getPriorityColor(gap.priority)} />
                            ) : (
                              <CheckCircleIcon color="success" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body1">
                                  {gap.position}
                                </Typography>
                                <Chip 
                                  label={gap.priority} 
                                  size="small" 
                                  color={getPriorityColor(gap.priority)}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2">
                                Current: {gap.currentCount} | Ideal: {gap.idealCount} | 
                                {gap.gap > 0 ? ` Need: ${gap.gap}` : ' ✓ Covered'}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Box textAlign="center" py={4}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Analyzing squad...
                    </Typography>
                  </Box>
                )}
              </TabPanel>
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <SportsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Select a team roster to view details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create a new team or select an existing one from the list
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Roster Dialog */}
      <Dialog open={showRosterDialog} onClose={() => setShowRosterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRoster ? 'Edit Team Roster' : 'Create New Team Roster'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Team Name"
                value={rosterForm.teamName}
                onChange={(e) => setRosterForm({ ...rosterForm, teamName: e.target.value })}
                placeholder="e.g., Manchester United Youth FC"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Club Name (Optional)"
                value={rosterForm.clubName}
                onChange={(e) => setRosterForm({ ...rosterForm, clubName: e.target.value })}
                placeholder="e.g., Manchester United FC"
                helperText="Link multiple teams under the same club"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Age Group</InputLabel>
                <Select
                  value={rosterForm.ageGroup}
                  label="Age Group"
                  onChange={(e) => setRosterForm({ ...rosterForm, ageGroup: e.target.value })}
                >
                  {ageGroups.map((group) => (
                    <MenuItem key={group} value={group}>
                      {group}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                fullWidth
                options={leagues}
                value={rosterForm.league || null}
                onChange={(_, newValue) => setRosterForm({ ...rosterForm, league: newValue || '' })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="League"
                    placeholder="Type to search leagues..."
                  />
                )}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue) return options;
                  return options.filter(option =>
                    option.toLowerCase().includes(inputValue.toLowerCase())
                  );
                }}
                noOptionsText="No leagues found"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Maximum Squad Size"
                type="number"
                value={rosterForm.maxSquadSize}
                onChange={(e) => setRosterForm({ ...rosterForm, maxSquadSize: e.target.value })}
                placeholder="Leave empty for unlimited"
                helperText="Maximum number of players allowed in the squad (leave empty for no limit)"
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRosterDialog(false)}>Cancel</Button>
          <Button 
            onClick={editingRoster ? handleUpdateRoster : handleCreateRoster}
            variant="contained"
            disabled={!rosterForm.teamName || !rosterForm.ageGroup || !rosterForm.league}
          >
            {editingRoster ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Player Dialog */}
      <Dialog open={showPlayerDialog} onClose={() => setShowPlayerDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPlayer ? 'Edit Player' : 'Add New Player'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Player Name"
                value={playerForm.playerName}
                onChange={(e) => setPlayerForm({ ...playerForm, playerName: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Age"
                type="number"
                value={playerForm.age}
                onChange={(e) => setPlayerForm({ ...playerForm, age: e.target.value })}
                placeholder="e.g., 16"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Best Position</InputLabel>
                <Select
                  value={playerForm.bestPosition}
                  label="Best Position"
                  onChange={(e) => setPlayerForm({ ...playerForm, bestPosition: e.target.value })}
                >
                  {positions.map((position) => (
                    <MenuItem key={position} value={position}>
                      {position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Preferred Foot</InputLabel>
                <Select
                  value={playerForm.preferredFoot}
                  label="Preferred Foot"
                  onChange={(e) => setPlayerForm({ ...playerForm, preferredFoot: e.target.value as 'Left' | 'Right' | 'Both' })}
                >
                  <MenuItem value="Left">Left</MenuItem>
                  <MenuItem value="Right">Right</MenuItem>
                  <MenuItem value="Both">Both</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Alternative Positions</InputLabel>
                <Select
                  multiple
                  value={playerForm.alternativePositions}
                  label="Alternative Positions"
                  onChange={(e) => setPlayerForm({ 
                    ...playerForm, 
                    alternativePositions: e.target.value as string[] 
                  })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {positions
                    .filter(pos => pos !== playerForm.bestPosition)
                    .map((position) => (
                    <MenuItem key={position} value={position}>
                      {position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contact Information"
                value={playerForm.contactInfo}
                onChange={(e) => setPlayerForm({ ...playerForm, contactInfo: e.target.value })}
                placeholder="e.g., parent email, phone number"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={playerForm.notes}
                onChange={(e) => setPlayerForm({ ...playerForm, notes: e.target.value })}
                placeholder="Additional notes about the player..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPlayerDialog(false)}>Cancel</Button>
          <Button 
            onClick={editingPlayer ? handleUpdatePlayer : handleAddPlayer}
            variant="contained"
            disabled={!playerForm.playerName || !playerForm.bestPosition}
          >
            {editingPlayer ? 'Update' : 'Add Player'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamRosterManagement;
