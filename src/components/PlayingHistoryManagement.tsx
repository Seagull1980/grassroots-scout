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
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sports as SportsIcon,
  Timeline as TimelineIcon,
  EmojiEvents as TrophyIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { playingHistoryAPI } from '../services/api';
import { PlayingHistory } from '../types';

interface PlayingHistoryStats {
  totalTeams: number;
  currentTeams: number;
  totalMatches: number;
  totalGoals: number;
  leaguesPlayed: number;
  positionsPlayed: number;
  firstTeamDate: string | null;
  lastActiveDate: string | null;
}

interface PositionCount {
  position: string;
  count: number;
}

interface LeagueCount {
  league: string;
  count: number;
}

const PlayingHistoryManagement: React.FC = () => {
  const [history, setHistory] = useState<PlayingHistory[]>([]);
  const [stats, setStats] = useState<PlayingHistoryStats | null>(null);
  const [positions, setPositions] = useState<PositionCount[]>([]);
  const [leagues, setLeagues] = useState<LeagueCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingHistory, setEditingHistory] = useState<PlayingHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    teamName: '',
    league: '',
    ageGroup: '',
    position: '',
    season: '',
    startDate: '',
    endDate: '',
    isCurrentTeam: false,
    achievements: '',
    matchesPlayed: '',
    goalsScored: '',
    notes: ''
  });

  // Football positions
  const footballPositions = [
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

  const commonLeagues = [
    'Premier League Youth', 'Championship Youth', 'League One Youth',
    'County League', 'Regional League', 'Local League', 'Sunday League',
    'Community Football League', 'Youth Development League', 'School Football League'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyResponse, statsResponse] = await Promise.all([
        playingHistoryAPI.getHistory(),
        fetch(`${ROSTER_API_URL}/playing-history/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            ...ngrokHeaders
          }
        }).then(res => res.json())
      ]);

      setHistory(historyResponse.history);
      if (statsResponse.success) {
        setStats(statsResponse.stats);
        setPositions(statsResponse.positions);
        setLeagues(statsResponse.leagues);
      }
    } catch (err) {
      console.error('Error loading playing history:', err);
      setError('Failed to load playing history');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      teamName: '',
      league: '',
      ageGroup: '',
      position: '',
      season: '',
      startDate: '',
      endDate: '',
      isCurrentTeam: false,
      achievements: '',
      matchesPlayed: '',
      goalsScored: '',
      notes: ''
    });
    setEditingHistory(null);
  };

  const openDialog = (historyItem?: PlayingHistory) => {
    if (historyItem) {
      setEditingHistory(historyItem);
      setFormData({
        teamName: historyItem.teamName,
        league: historyItem.league,
        ageGroup: historyItem.ageGroup,
        position: historyItem.position,
        season: historyItem.season,
        startDate: historyItem.startDate.split('T')[0], // Convert to YYYY-MM-DD format
        endDate: historyItem.endDate ? historyItem.endDate.split('T')[0] : '',
        isCurrentTeam: historyItem.isCurrentTeam,
        achievements: historyItem.achievements || '',
        matchesPlayed: historyItem.matchesPlayed?.toString() || '',
        goalsScored: historyItem.goalsScored?.toString() || '',
        notes: historyItem.notes || ''
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    resetForm();
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        matchesPlayed: formData.matchesPlayed ? parseInt(formData.matchesPlayed) : undefined,
        goalsScored: formData.goalsScored ? parseInt(formData.goalsScored) : undefined,
        endDate: formData.endDate || undefined
      };

      if (editingHistory) {
        await playingHistoryAPI.update(editingHistory.id, data);
        setSuccess('Playing history updated successfully!');
      } else {
        await playingHistoryAPI.create(data);
        setSuccess('Playing history added successfully!');
      }

      closeDialog();
      loadData();
    } catch (err) {
      console.error('Error saving playing history:', err);
      setError('Failed to save playing history');
    }
  };

  const handleDelete = async (historyId: string) => {
    if (!window.confirm('Are you sure you want to delete this playing history entry?')) {
      return;
    }

    try {
      await playingHistoryAPI.delete(historyId);
      setSuccess('Playing history deleted successfully!');
      loadData();
    } catch (err) {
      console.error('Error deleting playing history:', err);
      setError('Failed to delete playing history');
    }
  };

  const handleCurrentTeamToggle = async (historyId: string, isCurrentTeam: boolean) => {
    try {
      await playingHistoryAPI.updateCurrentStatus(historyId, isCurrentTeam);
      setSuccess('Current team status updated!');
      loadData();
    } catch (err) {
      console.error('Error updating current team status:', err);
      setError('Failed to update current team status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Football season typically runs from August to May
    if (month >= 7) { // August onwards
      return `${year}/${year + 1}`;
    } else { // January to July
      return `${year - 1}/${year}`;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <div>Loading playing history...</div>
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

      {/* Statistics Section */}
      {stats && (
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <TimelineIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Playing Statistics</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="primary">
                      {stats.totalTeams}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Teams
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="secondary">
                      {stats.currentTeams}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current Teams
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="success.main">
                      {stats.totalMatches}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Matches
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="warning.main">
                      {stats.totalGoals}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Goals
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Most Played Positions and Leagues */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  <SportsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Most Played Positions
                </Typography>
                <Stack spacing={1}>
                  {positions.slice(0, 3).map((pos) => (
                    <Box key={pos.position} display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2">{pos.position}</Typography>
                      <Badge badgeContent={pos.count} color="primary">
                        <SportsIcon color="action" />
                      </Badge>
                    </Box>
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  <TrophyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Leagues Played
                </Typography>
                <Stack spacing={1}>
                  {leagues.slice(0, 3).map((league) => (
                    <Box key={league.league} display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2">{league.league}</Typography>
                      <Badge badgeContent={league.count} color="secondary">
                        <TrophyIcon color="action" />
                      </Badge>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Playing History Section */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">
            <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Playing History
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openDialog()}
          >
            Add Team History
          </Button>
        </Box>

        {history.length === 0 ? (
          <Box textAlign="center" py={6}>
            <SportsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No playing history yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your football teams and track your playing career
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openDialog()}
            >
              Add Your First Team
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team & League</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Season & Duration</TableCell>
                  <TableCell>Performance</TableCell>
                  <TableCell align="center">Current</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {item.teamName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.league} • {item.ageGroup}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.position} 
                        size="small" 
                        color="primary"
                        icon={<SportsIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {item.season}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(item.startDate)}
                          {item.endDate && ` - ${formatDate(item.endDate)}`}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {item.matchesPlayed && (
                          <Typography variant="caption" display="block">
                            🏃 {item.matchesPlayed} matches
                          </Typography>
                        )}
                        {item.goalsScored && (
                          <Typography variant="caption" display="block">
                            ⚽ {item.goalsScored} goals
                          </Typography>
                        )}
                        {item.achievements && (
                          <Tooltip title={item.achievements}>
                            <Chip 
                              label="🏆 Achievements" 
                              size="small" 
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={item.isCurrentTeam}
                            onChange={(e) => handleCurrentTeamToggle(item.id, e.target.checked)}
                            size="small"
                          />
                        }
                        label=""
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openDialog(item)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(item.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingHistory ? 'Edit Playing History' : 'Add Playing History'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Team Name"
                value={formData.teamName}
                onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                placeholder="e.g., Manchester United Youth FC"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                options={commonLeagues}
                value={formData.league || null}
                onChange={(_, newValue) => setFormData({ ...formData, league: newValue || '' })}
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Age Group</InputLabel>
                <Select
                  value={formData.ageGroup}
                  label="Age Group"
                  onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                >
                  {ageGroups.map((group) => (
                    <MenuItem key={group} value={group}>
                      {group}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Position</InputLabel>
                <Select
                  value={formData.position}
                  label="Position"
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                >
                  {footballPositions.map((position) => (
                    <MenuItem key={position} value={position}>
                      {position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Season"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                placeholder={getCurrentSeason()}
                helperText="e.g., 2024/25"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="End Date (Optional)"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty if still playing"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isCurrentTeam}
                    onChange={(e) => setFormData({ ...formData, isCurrentTeam: e.target.checked })}
                  />
                }
                label="This is my current team"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Matches Played (Optional)"
                value={formData.matchesPlayed}
                onChange={(e) => setFormData({ ...formData, matchesPlayed: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Goals Scored (Optional)"
                value={formData.goalsScored}
                onChange={(e) => setFormData({ ...formData, goalsScored: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Achievements (Optional)"
                value={formData.achievements}
                onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                placeholder="e.g., League Winners, Cup Finalists, Top Scorer"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about your time at this team..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.teamName || !formData.league || !formData.position || !formData.season || !formData.startDate}
          >
            {editingHistory ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlayingHistoryManagement;
