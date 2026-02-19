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
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import api, { leaguesAPI, League } from '../services/api';
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

const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    teamName: '',
    clubName: '',
    ageGroup: '',
    league: '',
    teamGender: 'Mixed'
  });

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'Assistant Coach'
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
      const response = await api.get('/teams');
      // Ensure teams is always an array, handle various response structures
      const teamsData = response.data.teams || response.data || [];
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (error: any) {
      setError('Failed to load teams');
      console.error('Error loading teams:', error);
      setTeams([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    try {
      await api.post('/teams', createForm);
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

  const handleInviteMember = async () => {
    if (!selectedTeam) return;

    try {
      await api.post(`/teams/${selectedTeam.id}/invite`, inviteForm);
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: 'Assistant Coach' });
      loadTeamMembers(selectedTeam.id);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to invite member');
    }
  };

  const loadTeamMembers = async (teamId: number) => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      // Handle various response structures
      const members = response.data?.team?.members || response.data?.members || [];
      setTeamMembers(Array.isArray(members) ? members : []);
    } catch (error: any) {
      console.error('Error loading team members:', error);
      setTeamMembers([]); // Set empty array on error
    }
  };

  const handleViewTeam = (team: Team) => {
    setSelectedTeam(team);
    loadTeamMembers(team.id);
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
        <Alert severity="error" sx={{ mb: 3 }}>
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
                <Typography variant="body2" color="text.secondary">
                  Gender: {team.teamGender}
                </Typography>
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
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
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
          <TextField
            fullWidth
            label="Club Name (Optional)"
            value={createForm.clubName}
            onChange={(e) => setCreateForm({ ...createForm, clubName: e.target.value })}
            sx={{ mt: 2 }}
          />
          <Autocomplete
            fullWidth
            options={AGE_GROUP_OPTIONS}
            value={createForm.ageGroup || null}
            onChange={(_, newValue) => setCreateForm({ ...createForm, ageGroup: newValue || '' })}
            renderInput={(params) => (
              <TextField {...params} label="Age Group" required />
            )}
            sx={{ mt: 2 }}
            disableClearable={false}
          />
          <Autocomplete
            fullWidth
            options={leagues.map(l => l.name)}
            value={createForm.league || null}
            onChange={(_, newValue) => setCreateForm({ ...createForm, league: newValue || '' })}
            inputValue={createForm.league}
            onInputChange={(_, newValue) => setCreateForm({ ...createForm, league: newValue })}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="League" 
                required
                helperText={loadingLeagues ? 'Loading leagues...' : ''}
              />
            )}
            loading={loadingLeagues}
            sx={{ mt: 2 }}
            disableClearable={false}
            filterOptions={(options, state) => {
              const filtered = options.filter(option =>
                option.toLowerCase().includes(state.inputValue.toLowerCase())
              );
              return filtered;
            }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Team Gender</InputLabel>
            <Select
              value={createForm.teamGender}
              onChange={(e) => setCreateForm({ ...createForm, teamGender: e.target.value })}
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

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Coach to {selectedTeam?.teamName}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            sx={{ mt: 2 }}
            required
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            >
              <MenuItem value="Assistant Coach">Assistant Coach</MenuItem>
              <MenuItem value="Youth Coach">Youth Coach</MenuItem>
              <MenuItem value="Goalkeeper Coach">Goalkeeper Coach</MenuItem>
              <MenuItem value="Fitness Coach">Fitness Coach</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleInviteMember} variant="contained">
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
                <ListItem key={member.id}>
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
    </Box>
  );
};

export default TeamManagement;
