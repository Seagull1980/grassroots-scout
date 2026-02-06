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
import { API_URL } from '../../services/api';

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
      console.log('[BetaAccess] Fetching users from:', `${API_URL}/admin/users/beta-access`);
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/users/beta-access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[BetaAccess] Received users data:', response.data);
      console.log('[BetaAccess] First user full data:', response.data[0]);
      console.log('[BetaAccess] First 3 users betaAccess values:', 
        response.data.slice(0, 3).map((u: User) => ({ id: u.id, email: u.email, betaAccess: u.betaAccess, createdAt: u.createdAt, type: typeof u.betaAccess }))
      );
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      console.error('[BetaAccess] Error fetching users:', err);
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
      console.log('[BetaAccess] Making API call to PATCH /api/admin/users/' + userId + '/beta-access');
      console.log('[BetaAccess] Request body:', { betaAccess: !currentStatus });
      
      const response = await axios.patch(
        `${API_URL}/admin/users/${userId}/beta-access`,
        { betaAccess: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[BetaAccess] API response:', response.data);
      console.log('[BetaAccess] Response betaAccess value:', response.data.betaAccess, 'Type:', typeof response.data.betaAccess);
      
      // Refetch all users to get the actual database state
      console.log('[BetaAccess] Refetching users to verify update...');
      await fetchUsers();
      console.log('[BetaAccess] Users refetched successfully');
      
      // Verify the user was actually updated
      const updatedUser = users.find(u => u.id === userId);
      console.log('[BetaAccess] Updated user in state:', updatedUser);
    } catch (err: any) {
      console.error('[BetaAccess] Error:', err);
      console.error('[BetaAccess] Error details:', err.message, err.response?.status, err.response?.data);
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
    withAccess: users.filter(u => u.betaAccess || u.role === 'Admin').length,
    pending: users.filter(u => !u.betaAccess && u.role !== 'Admin').length,
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
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
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
