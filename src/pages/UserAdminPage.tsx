import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  Tooltip,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Block as BlockIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL, ngrokHeaders } from '../services/api';
import { storage } from '../utils/storage';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
  createdAt: string;
  isEmailVerified: boolean;
  isBlocked?: boolean;
  lastLogin?: string;
}

const UserAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  
  // Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = storage.getItem('token');
      const url = `${API_URL}/admin/users`;
      console.log('[UserAdminPage] Fetching users from URL:', url);
      console.log('[UserAdminPage] API_URL is:', API_URL);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders },
      });
      
      console.log('[UserAdminPage] Response received:', response.data);
      setUsers(response.data.users || []);
      console.log('[UserAdminPage] Users set to:', response.data.users?.length || 0, 'users');
    } catch (err: any) {
      console.error('[UserAdminPage] Error fetching users:', err);
      console.error('[UserAdminPage] Error response:', err.response);
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuUser(null);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleBlockClick = (user: User) => {
    setSelectedUser(user);
    setBlockDialogOpen(true);
    handleMenuClose();
  };

  const handleMessageClick = (user: User) => {
    setSelectedUser(user);
    setMessageDialogOpen(true);
    handleMenuClose();
  };

  const handlePromoteClick = (user: User) => {
    setSelectedUser(user);
    setPromoteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const token = storage.getItem('token');
      await axios.delete(`${API_URL}/admin/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders },
      });
      
      setSuccess(`User ${selectedUser.email} deleted successfully`);
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    
    try {
      const token = storage.getItem('token');
      await axios.post(
        `${API_URL}/admin/users/${selectedUser.id}/block`,
        { blocked: !selectedUser.isBlocked },
        { headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders } }
      );
      
      setSuccess(
        `User ${selectedUser.email} ${selectedUser.isBlocked ? 'unblocked' : 'blocked'} successfully`
      );
      setBlockDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to block/unblock user');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageSubject || !messageBody) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      const token = storage.getItem('token');
      await axios.post(
        `${API_URL}/admin/users/${selectedUser.id}/message`,
        {
          subject: messageSubject,
          message: messageBody
        },
        { headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders } }
      );
      
      setSuccess(`Message sent to ${selectedUser.email} successfully`);
      setMessageDialogOpen(false);
      setMessageSubject('');
      setMessageBody('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!selectedUser) return;
    
    try {
      const token = storage.getItem('token');
      await axios.post(
        `${API_URL}/admin/users/${selectedUser.id}/promote`,
        { role: 'Admin' },
        { headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders } }
      );
      
      setSuccess(`User ${selectedUser.email} promoted to Admin successfully`);
      setPromoteDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to promote user');
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'error';
      case 'Coach': return 'primary';
      case 'Player': return 'success';
      case 'Parent/Guardian': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading users...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/analytics')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          User Administration
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchUsers}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={roleFilter}
              label="Role"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Coach">Coach</MenuItem>
              <MenuItem value="Player">Player</MenuItem>
              <MenuItem value="Parent/Guardian">Parent/Guardian</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Chip label={user.id} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {user.isEmailVerified ? (
                        <Tooltip title="Email Verified">
                          <CheckCircleIcon color="success" fontSize="small" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Email Not Verified">
                          <CancelIcon color="warning" fontSize="small" />
                        </Tooltip>
                      )}
                      {user.isBlocked && (
                        <Chip label="Blocked" color="error" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, user)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuUser && handleMessageClick(menuUser)}>
          <EmailIcon sx={{ mr: 1 }} /> Send Message
        </MenuItem>
        {menuUser?.role !== 'Admin' && (
          <MenuItem onClick={() => menuUser && handlePromoteClick(menuUser)}>
            <CheckCircleIcon sx={{ mr: 1 }} /> Promote to Admin
          </MenuItem>
        )}
        <MenuItem onClick={() => menuUser && handleBlockClick(menuUser)}>
          <BlockIcon sx={{ mr: 1 }} />
          {menuUser?.isBlocked ? 'Unblock User' : 'Block User'}
        </MenuItem>
        <MenuItem
          onClick={() => menuUser && handleDeleteClick(menuUser)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Delete User
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{selectedUser?.email}</strong>?
            This action cannot be undone and will permanently remove all associated data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Block/Unblock Confirmation Dialog */}
      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)}>
        <DialogTitle>
          {selectedUser?.isBlocked ? 'Unblock' : 'Block'} User
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {selectedUser?.isBlocked ? 'unblock' : 'block'}{' '}
            <strong>{selectedUser?.email}</strong>?
            {!selectedUser?.isBlocked &&
              ' This will prevent them from logging in and accessing the platform.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBlockUser} color="warning" variant="contained">
            {selectedUser?.isBlocked ? 'Unblock' : 'Block'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog
        open={messageDialogOpen}
        onClose={() => setMessageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Message to {selectedUser?.email}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Subject"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={6}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Enter your message here..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSendMessage}
            variant="contained"
            startIcon={<EmailIcon />}
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Promote to Admin Confirmation Dialog */}
      <Dialog open={promoteDialogOpen} onClose={() => setPromoteDialogOpen(false)}>
        <DialogTitle>Promote User to Admin</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>
            Are you sure you want to promote <strong>{selectedUser?.email}</strong> to Admin?
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            ⚠️ This will grant them full administrative access to the system, including the ability to manage all users and system settings.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromoteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePromoteToAdmin} color="primary" variant="contained">
            Promote to Admin
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserAdminPage;
