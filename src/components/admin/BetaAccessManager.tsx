import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Search, CheckCircle, Cancel } from '@mui/icons-material';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  betaAccess: boolean;
  createdAt: string;
}

const BetaAccessManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/users/beta-access', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleBetaAccess = async (userId: number, currentStatus: boolean) => {
    console.log('[BetaAccess] Toggle clicked for user:', userId, 'Current status:', currentStatus, 'Will set to:', !currentStatus);
    try {
      console.log('[BetaAccess] Setting updating state...');
      setUpdating(userId);
      console.log('[BetaAccess] Getting token...');
      const token = localStorage.getItem('token');
      console.log('[BetaAccess] Token exists:', !!token);
      console.log('[BetaAccess] Making API call...');
      const response = await axios.patch(
        `/api/admin/users/${userId}/beta-access`,
        { betaAccess: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[BetaAccess] API response:', response.data);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, betaAccess: !currentStatus }
          : user
      ));
      console.log('[BetaAccess] State updated successfully');
    } catch (err: any) {
      console.error('[BetaAccess] Error:', err);
      console.error('[BetaAccess] Error details:', err.message, err.response?.status);
      setError(err.response?.data?.error || 'Failed to update beta access');
    } finally {
      console.log('[BetaAccess] Clearing updating state...');
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    withAccess: users.filter(u => u.betaAccess).length,
    pending: users.filter(u => !u.betaAccess).length,
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Beta Access Management
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h4">{stats.total}</Typography>
          <Typography variant="body2" color="text.secondary">Total Users</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h4" color="success.main">{stats.withAccess}</Typography>
          <Typography variant="body2" color="text.secondary">Beta Access</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
          <Typography variant="body2" color="text.secondary">Pending</Typography>
        </Paper>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Registered</TableCell>
              <TableCell align="center">Beta Access</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.role} 
                    size="small"
                    color={user.role === 'Admin' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="center">
                  {user.role === 'Admin' ? (
                    <Chip 
                      icon={<CheckCircle />}
                      label="Always Enabled" 
                      size="small" 
                      color="primary"
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      {user.betaAccess ? (
                        <CheckCircle color="success" />
                      ) : (
                        <Cancel color="error" />
                      )}
                      <Switch
                        checked={user.betaAccess}
                        onChange={() => toggleBetaAccess(user.id, user.betaAccess)}
                        disabled={updating === user.id}
                      />
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredUsers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            No users found matching "{searchTerm}"
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BetaAccessManager;
