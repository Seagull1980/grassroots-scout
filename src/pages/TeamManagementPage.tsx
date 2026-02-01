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
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import api from '../services/api';

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
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teams');
      setTeams(response.data.teams);
    } catch (error: any) {
      setError('Failed to load teams');
      console.error('Error loading teams:', error);
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
      setTeamMembers(response.data.team.members);
    } catch (error: any) {
      console.error('Error loading team members:', error);
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
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {teams.map((team) => (
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
        ))}
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
          <TextField
            fullWidth
            label="Age Group"
            value={createForm.ageGroup}
            onChange={(e) => setCreateForm({ ...createForm, ageGroup: e.target.value })}
            sx={{ mt: 2 }}
            required
          />
          <TextField
            fullWidth
            label="League"
            value={createForm.league}
            onChange={(e) => setCreateForm({ ...createForm, league: e.target.value })}
            sx={{ mt: 2 }}
            required
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Team Gender</InputLabel>
            <Select
              value={createForm.teamGender}
              onChange={(e) => setCreateForm({ ...createForm, teamGender: e.target.value })}
            >
              <MenuItem value="Boys">Boys</MenuItem>
              <MenuItem value="Girls">Girls</MenuItem>
              <MenuItem value="Mixed">Mixed</MenuItem>
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
            {teamMembers.map((member) => (
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
            ))}
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
