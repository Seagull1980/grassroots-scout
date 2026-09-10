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
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sports as SportsIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { coachingHistoryAPI } from '../services/api';
import { CoachingHistory } from '../types';

interface CoachingHistoryStats {
  totalTeams: number;
  currentTeams: number;
  leaguesPlayed: number;
  firstTeamDate: string | null;
  lastActiveDate: string | null;
}

interface LeagueCount {
  league: string;
  count: number;
}

const CoachingHistoryManagement: React.FC = () => {
  const [history, setHistory] = useState<CoachingHistory[]>([]);
  const [stats, setStats] = useState<CoachingHistoryStats | null>(null);
  const [leagues, setLeagues] = useState<LeagueCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingHistory, setEditingHistory] = useState<CoachingHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    teamName: '',
    clubName: '',
    league: '',
    ageGroup: '',
    role: '',
    season: '',
    startDate: '',
    endDate: '',
    isCurrentTeam: false,
    achievements: '',
    notes: ''
  });

  const coachRoles = [
    'Head Coach', 'Assistant Coach', 'Youth Coach', 'Goalkeeper Coach',
    'Fitness Coach', 'Academy Coach', 'Volunteer Coach'
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
        coachingHistoryAPI.getHistory(),
        coachingHistoryAPI.getStats()
      ]);

      setHistory(historyResponse.history);
      if (statsResponse.success) {
        setStats(statsResponse.stats as unknown as CoachingHistoryStats);
        setLeagues(statsResponse.leagues);
      }
    } catch (err) {
      console.error('Error loading coaching history:', err);
      setError('Failed to load coaching history');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      teamName: '',
      clubName: '',
      league: '',
      ageGroup: '',
      role: '',
      season: '',
      startDate: '',
      endDate: '',
      isCurrentTeam: false,
      achievements: '',
      notes: ''
    });
    setEditingHistory(null);
  };

  const openDialog = (historyItem?: CoachingHistory) => {
    if (historyItem) {
      setEditingHistory(historyItem);
      setFormData({
        teamName: historyItem.teamName,
        clubName: historyItem.clubName || '',
        league: historyItem.league,
        ageGroup: historyItem.ageGroup,
        role: historyItem.role,
        season: historyItem.season,
        startDate: historyItem.startDate.split('T')[0],
        endDate: historyItem.endDate ? historyItem.endDate.split('T')[0] : '',
        isCurrentTeam: historyItem.isCurrentTeam,
        achievements: historyItem.achievements || '',
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
        endDate: formData.endDate || undefined
      };

      if (editingHistory) {
        await coachingHistoryAPI.update(editingHistory.id, data);
        setSuccess('Coaching history updated successfully!');
      } else {
        await coachingHistoryAPI.create(data);
        setSuccess('Coaching history added successfully!');
      }

      closeDialog();
      loadData();
    } catch (err) {
      console.error('Error saving coaching history:', err);
      setError('Failed to save coaching history');
    }
  };

  const handleDelete = async (historyId: string) => {
    if (!window.confirm('Are you sure you want to delete this coaching history entry?')) {
      return;
    }

    try {
      await coachingHistoryAPI.delete(historyId);
      setSuccess('Coaching history deleted successfully!');
      loadData();
    } catch (err) {
      console.error('Error deleting coaching history:', err);
      setError('Failed to delete coaching history');
    }
  };

  const handleCurrentTeamToggle = async (historyId: string, isCurrentTeam: boolean) => {
    try {
      await coachingHistoryAPI.updateCurrentStatus(historyId, isCurrentTeam);
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

    if (month >= 7) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <div>Loading coaching history...</div>
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

      {stats && (
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <TimelineIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Coaching Experience</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="primary">
                      {stats.totalTeams}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Teams Managed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4}>
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
              <Grid item xs={6} sm={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="success.main">
                      {stats.leaguesPlayed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Leagues Coached
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {leagues.length > 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Leagues Coached
                  </Typography>
                  <Stack spacing={1}>
                    {leagues.slice(0, 3).map((league) => (
                      <Box key={league.league} display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2">{league.league}</Typography>
                        <Chip label={league.count} size="small" color="secondary" />
                      </Box>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">
            <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Coaching History
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openDialog()}
          >
            Add Team
          </Button>
        </Box>

        {history.length === 0 ? (
          <Box textAlign="center" py={6}>
            <SportsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No coaching history yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add the teams you have managed to build your coaching CV
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
                  <TableCell>Role</TableCell>
                  <TableCell>Season & Duration</TableCell>
                  <TableCell>Achievements</TableCell>
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
                          {item.clubName ? `${item.clubName} · ` : ''}{item.league} • {item.ageGroup}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.role}
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
                      {item.achievements && (
                        <Tooltip title={item.achievements}>
                          <Chip
                            label="🏆 Achievements"
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
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

      <Dialog open={showDialog} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingHistory ? 'Edit Coaching Entry' : 'Add Coaching Entry'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Team Name"
                value={formData.teamName}
                onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                placeholder="e.g., Tamworth U15s"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Club Name (Optional)"
                value={formData.clubName}
                onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
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
                <InputLabel>Your Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Your Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {coachRoles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Season"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                placeholder={getCurrentSeason()}
                helperText="e.g., 2024/25"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date (Optional)"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty if still coaching this team"
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Achievements (Optional)"
                value={formData.achievements}
                onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                placeholder="e.g., League Winners, Cup Finalists, Player Development Award"
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
            disabled={!formData.teamName || !formData.league || !formData.role || !formData.season || !formData.startDate}
          >
            {editingHistory ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CoachingHistoryManagement;
