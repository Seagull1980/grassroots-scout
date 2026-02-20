import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
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
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Alert,
  Autocomplete,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import api, { API_URL, leaguesAPI, League } from '../services/api';
import { AGE_GROUP_OPTIONS, TEAM_GENDER_OPTIONS } from '../constants/options';

interface Team {
  id: number;
  teamName: string;
  clubName?: string;
  ageGroup: string;
  league: string;
  teamGender: string;
  userRole: string;
  permissions: {
    canPostVacancies: boolean;
    canManageRoster: boolean;
    canEditTeam: boolean;
    canDeleteTeam: boolean;
    canInviteMembers: boolean;
  };
}

interface TeamMember {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface Coach {
  id: number;
  name: string;
  email: string;
}

const TeamManagement: React.FC = () => {
  const apiPrefix = API_URL ? '' : '/api';
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [searchingCoaches, setSearchingCoaches] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [clubs, setClubs] = useState<string[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    teamName: '',
    clubName: '',
    ageGroup: '',
    league: '',
    teamGender: 'Mixed'
  });

  const [inviteForm, setInviteForm] = useState({
    coachId: null as number | null,
    coachName: '',
    role: 'Assistant Coach'
  });

  const [requestLeagueDialogOpen, setRequestLeagueDialogOpen] = useState(false);
  const [leagueRequest, setLeagueRequest] = useState({
    name: '',
    region: '',
    url: '',
    description: ''
  });

  useEffect(() => {
    loadTeams();
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      setLoadingLeagues(true);
      const leaguesData = await leaguesAPI.getForSearch(true);
      setLeagues(Array.isArray(leaguesData) ? leaguesData : []);
    } catch (error: any) {
      console.error('Error loading leagues:', error);
      setLeagues([]);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${apiPrefix}/teams`);
      const teamsData = response.data.teams || response.data || [];
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (error: any) {
      setError('Failed to load teams');
      console.error('Error loading teams:', error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    try {
      await api.post(`${apiPrefix}/teams`, createForm);
      setCreateDialogOpen(false);
      setCreateForm({
        teamName: '',
        clubName: '',
        ageGroup: '',
        league: '',
        teamGender: 'Mixed'
      });
      loadTeams();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create team');
    }
  };

  const searchCoaches = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setCoaches([]);
      return;
    }

    try {
      setSearchingCoaches(true);
      const response = await api.get(`${apiPrefix}/coaches/search`, { params: { q: searchTerm } });
      setCoaches(response.data.coaches || []);
    } catch (error: any) {
      console.error('Error searching coaches:', error);
      setCoaches([]);
    } finally {
      setSearchingCoaches(false);
    }
  };

  const searchClubs = async (searchTerm: string) => {
    try {
      setLoadingClubs(true);
      const response = await api.get(`${apiPrefix}/clubs/search`, { params: { q: searchTerm } });
      setClubs(response.data.clubs || []);
    } catch (error: any) {
      console.error('Error searching clubs:', error);
      setClubs([]);
    } finally {
      setLoadingClubs(false);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedTeam || !inviteForm.coachId) return;

    try {
      await api.post(`${apiPrefix}/teams/${selectedTeam.id}/invite-coach`, {
        coachId: inviteForm.coachId,
        role: inviteForm.role
      });
      
      setInviteDialogOpen(false);
      setInviteForm({ coachId: null, coachName: '', role: 'Assistant Coach' });
      setCoaches([]);
      
      // Show success message
      setError('');
      alert('Invitation sent successfully! The coach will receive an email notification.');
      loadTeamMembers(selectedTeam.id);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to send invitation');
    }
  };

  const loadTeamMembers = async (teamId: number) => {
    try {
      const response = await api.get(`${apiPrefix}/teams/${teamId}`);
      const members = response.data?.team?.members || response.data?.members || [];
      setTeamMembers(Array.isArray(members) ? members : []);
    } catch (error: any) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedTeam) return;

    if (!window.confirm('Are you sure you want to remove this coach from the team?')) {
      return;
    }

    try {
      await api.delete(`${apiPrefix}/teams/${selectedTeam.id}/members/${memberId}`);
      await loadTeamMembers(selectedTeam.id);
      setError('');
      alert('Coach removed successfully');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to remove coach');
    }
  };

  const handleViewTeam = (team: Team) => {
    setSelectedTeam(team);
    loadTeamMembers(team.id);
  };

  const handleRequestLeague = async () => {
    try {
      await api.post(`${apiPrefix}/api/league-requests`, leagueRequest);
      setRequestLeagueDialogOpen(false);
      setLeagueRequest({ name: '', region: '', url: '', description: '' });
      alert('League request submitted successfully! Admins will review your request.');
      // Add the requested league to the createForm
      setCreateForm({ ...createForm, league: leagueRequest.name });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to submit league request');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Head Coach': return 'primary';
      case 'Assistant Coach': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Team Management</Typography>
        <Typography>Loading teams...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Team Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Team
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </Alert>
      )}

      <Grid container spacing={3}>
        {teams && teams.length > 0 ? (
          teams.map((team) => (
          <Grid item xs={12} md={6} lg={4} key={team.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {team.teamName}
                </Typography>
                {team.clubName && (
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {team.clubName}
                  </Typography>
                )}
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={team.userRole}
                    color={getRoleColor(team.userRole)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`${team.ageGroup} - ${team.league}`}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GroupIcon />}
                  onClick={() => handleViewTeam(team)}
                  sx={{ mb: 1 }}
                >
                  View Team
                </Button>
                {team.permissions.canInviteMembers && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    onClick={() => {
                      setSelectedTeam(team);
                      setInviteDialogOpen(true);
                    }}
                  >
                    Invite Coach
                  </Button>
                )}
              </Box>
            </Card>
          </Grid>
        ))
        ) : null}
      </Grid>

      {teams.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No teams yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first team to start collaborating with other coaches
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Team
          </Button>
        </Box>
      )}

      {/* Create Team Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle>Create New Team</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Team Name"
            value={createForm.teamName}
            onChange={(e) => setCreateForm({ ...createForm, teamName: e.target.value })}
            sx={{ mt: 2 }}
            required
          />
          <Autocomplete
            fullWidth
            freeSolo
            options={clubs}
            value={createForm.clubName || null}
            getOptionLabel={(option) => {
              if (!option) return '';
              return typeof option === 'string' ? option : '';
            }}
            onChange={(_, newValue) => setCreateForm({ ...createForm, clubName: newValue || '' })}
            onInputChange={(_, newValue) => {
              setCreateForm({ ...createForm, clubName: newValue });
              if (newValue.length >= 1) {
                searchClubs(newValue);
              } else {
                setClubs([]);
              }
            }}
            loading={loadingClubs}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Club Name (Optional)"
                helperText="Start typing to search existing clubs or create a new one"
                sx={{ mt: 2 }}
              />
            )}
            noOptionsText="No clubs found - you can create a new one"
            disableClearable={false}
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'flip',
                    enabled: false,
                  }
                ],
                sx: { zIndex: 1301 }
              }
            }}
          />
          <Autocomplete
            fullWidth
            options={AGE_GROUP_OPTIONS}
            value={createForm.ageGroup || null}
            getOptionLabel={(option) => option || ''}
            onChange={(_, newValue) => setCreateForm({ ...createForm, ageGroup: newValue || '' })}
            renderInput={(params) => (
              <TextField {...params} label="Age Group" required />
            )}
            sx={{ mt: 2 }}
            disableClearable={false}
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'flip',
                    enabled: false,
                  }
                ],
                sx: { zIndex: 1301 }
              }
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Autocomplete
                fullWidth
                options={leagues.map(l => l.name)}
                value={createForm.league || null}
                getOptionLabel={(option) => option || ''}
                onChange={(_, newValue) => setCreateForm({ ...createForm, league: newValue || '' })}
                inputValue={createForm.league}
                onInputChange={(_, newValue) => setCreateForm({ ...createForm, league: newValue })}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="League" 
                    required
                    helperText={loadingLeagues ? 'Loading leagues...' : "Can't find your league? Request it below"}
                  />
                )}
                loading={loadingLeagues}
                disableClearable={false}
                filterOptions={(options, state) => {
                  const filtered = options.filter(option =>
                    option.toLowerCase().includes(state.inputValue.toLowerCase())
                  );
                  return filtered;
                }}
                slotProps={{
                  popper: {
                    modifiers: [
                      {
                        name: 'flip',
                        enabled: false,
                      }
                    ],
                    sx: { zIndex: 1301 }
                  }
                }}
              />
            </Box>
            <Button 
              variant="outlined" 
              onClick={() => setRequestLeagueDialogOpen(true)}
              sx={{ mt: 1 }}
            >
              Request League
            </Button>
          </Box>
          <FormControl fullWidth sx={{ mt: 2 }} variant="outlined">
            <InputLabel>Team Gender</InputLabel>
            <Select
              label="Team Gender"
              value={createForm.teamGender}
              onChange={(e) => setCreateForm({ ...createForm, teamGender: e.target.value })}
              MenuProps={{
                sx: { zIndex: 1301 }
              }}
            >
              {TEAM_GENDER_OPTIONS.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTeam} variant="contained">
            Create Team
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Coach Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Coach to {selectedTeam?.teamName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
            Search for a coach to invite to your team
          </Typography>
          <Autocomplete
            fullWidth
            options={coaches}
            getOptionLabel={(option) => {
              if (!option || typeof option === 'string') return '';
              return `${option.name} (${option.email})`;
            }}
            inputValue={inviteForm.coachName}
            onInputChange={(_, value) => {
              setInviteForm({ ...inviteForm, coachName: value });
              searchCoaches(value);
            }}
            onChange={(_, value) => {
              if (value) {
                setInviteForm({ ...inviteForm, coachId: value.id, coachName: value.name });
              }
            }}
            loading={searchingCoaches}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Search by Name or Email" 
                placeholder="Type at least 2 characters..."
                required
                helperText={searchingCoaches ? 'Searching...' : 'Search coaches by name or email'}
              />
            )}
            sx={{ mt: 2 }}
            noOptionsText="No coaches found"
            loadingText="Searching..."
          />
          <FormControl fullWidth sx={{ mt: 2 }} variant="outlined">
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              MenuProps={{
                sx: { zIndex: 1301 }
              }}
            >
              <MenuItem value="Assistant Coach">Assistant Coach</MenuItem>
              <MenuItem value="Youth Coach">Youth Coach</MenuItem>
              <MenuItem value="Goalkeeper Coach">Goalkeeper Coach</MenuItem>
              <MenuItem value="Fitness Coach">Fitness Coach</MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            An invitation email will be sent to the coach. They'll need to accept it to join the team.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setInviteDialogOpen(false);
            setInviteForm({ coachId: null, coachName: '', role: 'Assistant Coach' });
            setCoaches([]);
          }}>Cancel</Button>
          <Button 
            onClick={handleInviteMember} 
            variant="contained"
            disabled={!inviteForm.coachId}
          >
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Details Dialog */}
      <Dialog open={!!selectedTeam && !inviteDialogOpen} onClose={() => setSelectedTeam(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTeam?.teamName} - Team Members
        </DialogTitle>
        <DialogContent>
          <List>
            {teamMembers && teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <ListItem 
                  key={member.id}
                  secondaryAction={
                    selectedTeam?.userRole === 'Head Coach' && member.role !== 'Head Coach' ? (
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        color="error"
                        onClick={() => handleRemoveMember(member.userId)}
                        title="Remove from team"
                      >
                        <DeleteIcon />
                      </IconButton>
                    ) : null
                  }
                >
                  <ListItemAvatar>
                    <Avatar>
                      {member.firstName[0]}{member.lastName[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${member.firstName} ${member.lastName}`}
                    secondary={
                      <Box>
                        <Chip label={member.role} size="small" sx={{ mr: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No team members yet
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTeam(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Request League Dialog */}
      <Dialog 
        open={requestLeagueDialogOpen} 
        onClose={() => setRequestLeagueDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle>Request New League</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="League Name"
            value={leagueRequest.name}
            onChange={(e) => setLeagueRequest({ ...leagueRequest, name: e.target.value })}
            sx={{ mt: 2 }}
            required
            placeholder="e.g., Wessex League"
          />
          <TextField
            fullWidth
            label="Region"
            value={leagueRequest.region}
            onChange={(e) => setLeagueRequest({ ...leagueRequest, region: e.target.value })}
            sx={{ mt: 2 }}
            placeholder="e.g., South West"
          />
          <TextField
            fullWidth
            label="League Website (Optional)"
            value={leagueRequest.url}
            onChange={(e) => setLeagueRequest({ ...leagueRequest, url: e.target.value })}
            sx={{ mt: 2 }}
            placeholder="https://example.com"
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            value={leagueRequest.description}
            onChange={(e) => setLeagueRequest({ ...leagueRequest, description: e.target.value })}
            sx={{ mt: 2 }}
            multiline
            rows={3}
            placeholder="Tell us about this league..."
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Your league request will be reviewed by administrators and added to the system once approved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestLeagueDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRequestLeague} 
            variant="contained"
            disabled={!leagueRequest.name}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManagement;
