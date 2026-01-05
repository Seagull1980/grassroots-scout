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
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardActions,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  FamilyRestroom as FamilyIcon,
  StopCircle as StopIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { leaguesAPI, League, adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const { impersonateUser, stopImpersonation, isImpersonating, user } = useAuth();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [adminFormData, setAdminFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: ''
  });
  const [openAdminDialog, setOpenAdminDialog] = useState(false);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Check user permissions
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
          <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
            Go to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const fetchedLeagues = await leaguesAPI.getAll();
      setLeagues(fetchedLeagues.leagues || fetchedLeagues);
    } catch (err: any) {
      setError('Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, []);

  const handleCreateLeague = async () => {
    try {
      await leaguesAPI.create(formData);
      setSuccess('League created successfully');
      setOpenDialog(false);
      setFormData({ name: '', description: '' });
      fetchLeagues();
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
      setFormData({ name: '', description: '' });
      fetchLeagues();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update league');
    }
  };

  const handleDeleteLeague = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this league?')) return;
    
    try {
      await leaguesAPI.delete(id);
      setSuccess('League deleted successfully');
      fetchLeagues();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete league');
    }
  };

  const openEditDialog = (league: League) => {
    setEditingLeague(league);
    setFormData({
      name: league.name,
      description: league.description || ''
    });
    setOpenDialog(true);
  };

  const openCreateDialog = () => {
    setEditingLeague(null);
    setFormData({ name: '', description: '' });
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

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AdminIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h3" component="h1">
            Admin Dashboard
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary">
          Manage leagues and system settings
        </Typography>
      </Box>

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

      {/* Quick Actions */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
          Platform Analytics
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6">Analytics Dashboard</Typography>
                  <Typography variant="body2" color="text.secondary">
                    View detailed platform usage statistics, user metrics, and activity insights
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  fullWidth 
                  variant="contained" 
                  href="/analytics"
                >
                  View Analytics
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* User Impersonation Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
          User Testing (Impersonation)
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Test the platform from different user perspectives without creating separate accounts.
        </Typography>

        {isImpersonating && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You are currently impersonating a {user.role}. You can return to admin view anytime.
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <PersonIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                  <Typography variant="h6">Player</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Test player features like availability posting and team searching
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  onClick={() => impersonateUser('Player')}
                  disabled={isImpersonating}
                >
                  Impersonate Player
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <SchoolIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h6">Coach</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Test coach features like team management and player recruitment
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  onClick={() => impersonateUser('Coach')}
                  disabled={isImpersonating}
                >
                  Impersonate Coach
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <FamilyIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6">Parent</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Test parent features for managing children's football activities
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  onClick={() => impersonateUser('Parent/Guardian')}
                  disabled={isImpersonating}
                >
                  Impersonate Parent
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <StopIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                  <Typography variant="h6">Stop Impersonation</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Return to admin dashboard
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  fullWidth 
                  variant="contained" 
                  color="error"
                  onClick={stopImpersonation}
                  disabled={!isImpersonating}
                >
                  Stop Impersonation
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Create Admin User Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Admin User Management
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Create additional admin users for platform management.
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenAdminDialog(true)}
        >
          Create Admin User
        </Button>
      </Paper>

      {/* Leagues Management */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Leagues Management
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
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leagues.map((league) => (
                  <TableRow key={league.id}>
                    <TableCell>{league.name}</TableCell>
                    <TableCell>{league.description || 'No description'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={league.isActive ? 'Active' : 'Inactive'} 
                        color={league.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(league)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteLeague(typeof league.id === 'string' ? parseInt(league.id) : league.id)}
                        color="error"
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
    </Container>
  );
};

export default AdminPage;
