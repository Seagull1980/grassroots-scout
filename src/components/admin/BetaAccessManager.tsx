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
  const adminUsersBaseUrl = API_URL ? `${API_URL}/admin/users` : '/api/admin/users';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('[BetaAccess] Fetching users from:', `${adminUsersBaseUrl}/beta-access`);
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${adminUsersBaseUrl}/beta-access`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const usersData = Array.isArray(response.data)
        ? response.data
        : (response.data?.users || []);

      setUsers(usersData as User[]);
      setError('');
    } catch (err: any) {
      console.error('[BetaAccess] Error fetching users:', err);
      console.error('[BetaAccess] Error message:', err.message);
      console.error('[BetaAccess] Error response:', err.response?.data);
      setUsers([]);
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleBetaAccess = async (userId: number, currentStatus: boolean) => {
    console.log('[BetaAccess] Toggle clicked for user:', userId, 'Current status:', currentStatus, 'Will set to:', !currentStatus);
    try {
      setUpdating(userId);
      const token = localStorage.getItem('token');
      
      const newStatus = !currentStatus;
      const response = await axios.patch(
        `${adminUsersBaseUrl}/${userId}/beta-access`,
        { betaAccess: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('[BetaAccess] API response:', response.data);
      
      // Update the user in state immediately
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, betaAccess: response.data.betaAccess ?? newStatus }
            : user
        )
      );
      
      setError('');
    } catch (err: any) {
      console.error('[BetaAccess] Error:', err);
      setError(err.response?.data?.error || 'Failed to update beta access');
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const stats = {
    total: Array.isArray(users) ? users.length : 0,
    withAccess: Array.isArray(users) ? users.filter(u => u.betaAccess || u.role === 'Admin').length : 0,
    pending: Array.isArray(users) ? users.filter(u => !u.betaAccess && u.role !== 'Admin').length : 0,
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
