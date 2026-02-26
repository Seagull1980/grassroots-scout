/* eslint-disable jsx-a11y/accessible-name, jsx-a11y/select-has-associated-label */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Chip,
  Alert,
  Tabs,
  Tab,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Divider,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Star as StarIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { MatchCompletion, MatchCompletionFormData } from '../types';
import { useResponsive, useResponsiveSpacing } from '../hooks/useResponsive';
// import { CardSkeleton } from '../components/LoadingComponents';

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
      id={`match-completions-tabpanel-${index}`}
      aria-labelledby={`match-completions-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MatchCompletionsPage: React.FC = () => {
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const { containerSpacing } = useResponsiveSpacing();
  const [tabValue, setTabValue] = useState(0);
  const [completions, setCompletions] = useState<MatchCompletion[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const [selectedCompletion, setSelectedCompletion] = useState<MatchCompletion | null>(null);

  // Form states
  const [formData, setFormData] = useState<MatchCompletionFormData>({
    matchType: user?.role === 'Parent/Guardian' ? 'child_to_team' : 'player_to_team',
    playerName: '',
    teamName: '',
    position: '',
    ageGroup: '',
    league: '',
    startDate: ''
  });

  const [storyData, setStoryData] = useState({
    successStory: '',
    rating: 0,
    feedback: '',
    publicStory: false
  });

  useEffect(() => {
    fetchCompletions();
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      setLoadingLeagues(true);
      const response = await fetch('/api/leagues');
      if (response.ok) {
        const data = await response.json();
        setLeagues(data.leagues || []);
      } else {
        console.error('Failed to fetch leagues');
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const fetchCompletions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/match-completions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompletions(data.completions);
      } else {
        setError('Failed to fetch match completions');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };
  const handleCreateCompletion = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/match-completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Match completion created successfully!');
        setShowCreateDialog(false);
        setFormData({
          matchType: user?.role === 'Parent/Guardian' ? 'child_to_team' : 'player_to_team',
          playerName: '',
          teamName: '',
          position: '',
          ageGroup: '',
          league: '',
          startDate: ''
        });
        fetchCompletions();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create match completion');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };

  const handleConfirmMatch = async (completionId: string, confirmed: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/match-completions/${completionId}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ confirmed })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.allConfirmed ? 'Match confirmed! Both parties have agreed.' : 'Your confirmation has been recorded.');
        fetchCompletions();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to confirm match');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };

  const handleUpdateStory = async () => {
    if (!selectedCompletion) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/match-completions/${selectedCompletion.id}/story`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storyData)
      });

      if (response.ok) {
        setSuccess('Success story updated!');
        setShowStoryDialog(false);
        fetchCompletions();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update success story');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };

  const openStoryDialog = (completion: MatchCompletion) => {
    setSelectedCompletion(completion);
    setStoryData({
      successStory: completion.successStory || '',
      rating: completion.rating || 0,
      feedback: completion.feedback || '',
      publicStory: completion.publicStory
    });
    setShowStoryDialog(true);
  };

  const getStatusColor = (completion: MatchCompletion) => {
    if (completion.completionStatus === 'confirmed') return 'success';
    if (completion.completionStatus === 'declined') return 'error';
    return 'warning';
  };

  const getStatusIcon = (completion: MatchCompletion) => {
    if (completion.completionStatus === 'confirmed') return <CheckCircleIcon />;
    return <PendingIcon />;
  };

  const pendingCompletions = completions.filter(c => c.completionStatus === 'pending');
  const confirmedCompletions = completions.filter(c => c.completionStatus === 'confirmed');

  const positions = [
    'Goalkeeper', 'Defender', 'Midfielder', 'Forward',
    'Centre-Back', 'Full-Back', 'Wing-Back', 'Defensive Midfielder',
    'Central Midfielder', 'Attacking Midfielder', 'Winger', 'Striker'
  ];

  const ageGroups = [
    'Under 6', 'Under 7', 'Under 8', 'Under 9', 'Under 10',
    'Under 11', 'Under 12', 'Under 13', 'Under 14', 'Under 15', 'Under 16',
    'Under 17', 'Under 18', 'Under 21', 'Adult (18+)', 'Veterans (35+)'
  ];



  return (
    <Container maxWidth="lg" sx={{ px: isMobile ? 1 : 3 }}>
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Match Completions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            Report New Match
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Paper sx={{ width: '100%' }}>
          <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)}>
            <Tab label={`Pending (${pendingCompletions.length})`} />
            <Tab label={`Confirmed (${confirmedCompletions.length})`} />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Pending Confirmations
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              These matches need confirmation from both the coach and player/parent.
            </Typography>

            {pendingCompletions.length === 0 ? (
              <Typography variant="body1" color="text.secondary">
                No pending match confirmations.
              </Typography>
            ) : (
              <Grid container spacing={containerSpacing}>
                {pendingCompletions.map((completion) => (
                  <Grid item xs={12} md={6} key={completion.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Chip
                            icon={getStatusIcon(completion)}
                            label={completion.completionStatus.toUpperCase()}
                            color={getStatusColor(completion)}
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(completion.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>

                        <Typography variant="h6" gutterBottom>
                          {completion.playerName} → {completion.teamName}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Position: {completion.position} | Age Group: {completion.ageGroup}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          League: {completion.league}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <Chip
                            label="Coach"
                            color={completion.coachConfirmed ? "success" : "default"}
                            size="small"
                            icon={completion.coachConfirmed ? <CheckCircleIcon /> : <PendingIcon />}
                          />
                          <Chip
                            label={completion.matchType === 'child_to_team' ? 'Parent' : 'Player'}
                            color={
                              completion.matchType === 'child_to_team'
                                ? (completion.parentConfirmed ? "success" : "default")
                                : (completion.playerConfirmed ? "success" : "default")
                            }
                            size="small"
                            icon={
                              (completion.matchType === 'child_to_team' ? completion.parentConfirmed : completion.playerConfirmed)
                                ? <CheckCircleIcon />
                                : <PendingIcon />
                            }
                          />
                        </Box>

                        {((user?.role === 'Coach' && !completion.coachConfirmed) ||
                          (user?.role === 'Player' && !completion.playerConfirmed) ||
                          (user?.role === 'Parent/Guardian' && !completion.parentConfirmed)) && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() => handleConfirmMatch(completion.id, true)}
                            >
                              Confirm Match
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleConfirmMatch(completion.id, false)}
                            >
                              Decline
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Confirmed Matches
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Successfully completed matches. Add your success story and rating!
            </Typography>

            {confirmedCompletions.length === 0 ? (
              <Typography variant="body1" color="text.secondary">
                No confirmed matches yet.
              </Typography>
            ) : (
              <Grid container spacing={containerSpacing}>
                {confirmedCompletions.map((completion) => (
                  <Grid item xs={12} md={6} key={completion.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="CONFIRMED"
                            color="success"
                            size="small"
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Add/Edit Success Story">
                              <IconButton
                                size="small"
                                onClick={() => openStoryDialog(completion)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            {completion.rating && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <StarIcon color="warning" fontSize="small" />
                                <Typography variant="caption">{completion.rating}</Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>

                        <Typography variant="h6" gutterBottom>
                          {completion.playerName} → {completion.teamName}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Position: {completion.position} | Age Group: {completion.ageGroup}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          League: {completion.league}
                        </Typography>

                        {completion.completedAt && (
                          <Typography variant="caption" color="text.secondary">
                            Completed: {new Date(completion.completedAt).toLocaleDateString()}
                          </Typography>
                        )}

                        {completion.successStory && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2">
                              "{completion.successStory}"
                            </Typography>
                            {completion.publicStory && (
                              <Chip label="Public Story" size="small" color="primary" sx={{ mt: 1 }} />
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>
        </Paper>

        {/* Create Match Completion Dialog */}
        <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Report New Match</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <TextField
                label="Player Name"
                value={formData.playerName}
                onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Team Name"
                value={formData.teamName}
                onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                fullWidth
                required
              />
              <TextField
                select
                label="Position"
                aria-label="Position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                fullWidth
                required
                inputProps={{ title: 'Position' }}
                SelectProps={{ native: true, title: 'Position' }}
              >
                <option value="">Select Position</option>
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </TextField>
              <TextField
                select
                label="Age Group"
                aria-label="Age Group"
                value={formData.ageGroup}
                onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                fullWidth
                required
                inputProps={{ title: 'Age Group' }}
                SelectProps={{ native: true, title: 'Age Group' }}
              >
                <option value="">Select Age Group</option>
                {ageGroups.map((ageGroup) => (
                  <option key={ageGroup} value={ageGroup}>
                    {ageGroup}
                  </option>
                ))}
              </TextField>
              <Autocomplete
                options={leagues}
                getOptionLabel={(option) => option.name || ''}
                value={leagues.find(league => league.name === formData.league) || null}
                onChange={(_, newValue) => {
                  setFormData({ ...formData, league: newValue?.name || '' });
                }}
                loading={loadingLeagues}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="League"
                    required
                    fullWidth
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <Box>
                        <Typography variant="body1">{option.name}</Typography>
                        {option.isPending && (
                          <Typography variant="caption" color="text.secondary">
                            Awaiting Admin Approval
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                }}
                filterOptions={(options, { inputValue }) => {
                  return options.filter(option =>
                    option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                    (option.region && option.region.toLowerCase().includes(inputValue.toLowerCase())) ||
                    (option.ageGroup && option.ageGroup.toLowerCase().includes(inputValue.toLowerCase()))
                  );
                }}
              />
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateCompletion}
              variant="contained"
              disabled={!formData.playerName || !formData.teamName || !formData.position || !formData.ageGroup || !formData.league}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Story Dialog */}
        <Dialog open={showStoryDialog} onClose={() => setShowStoryDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Success Story</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <TextField
                label="Success Story"
                value={storyData.successStory}
                onChange={(e) => setStoryData({ ...storyData, successStory: e.target.value })}
                fullWidth
                multiline
                rows={4}
                placeholder="Tell us about this successful match..."
                inputProps={{ maxLength: 1000 }}
                helperText={`${storyData.successStory.length}/1000 characters`}
              />
              
              <Box>
                <Typography component="legend">Rate this experience</Typography>
                <Rating
                  value={storyData.rating}
                  onChange={(_e, newValue) => setStoryData({ ...storyData, rating: newValue || 0 })}
                />
              </Box>

              <TextField
                label="Additional Feedback"
                value={storyData.feedback}
                onChange={(e) => setStoryData({ ...storyData, feedback: e.target.value })}
                fullWidth
                multiline
                rows={2}
                placeholder="Any additional feedback..."
                inputProps={{ maxLength: 500 }}
                helperText={`${storyData.feedback.length}/500 characters`}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={storyData.publicStory}
                    onChange={(e) => setStoryData({ ...storyData, publicStory: e.target.checked })}
                  />
                }
                label="Share this story publicly to inspire others"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowStoryDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateStory} variant="contained">
              Save Story
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default MatchCompletionsPage;
