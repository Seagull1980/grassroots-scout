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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { Visibility, Check, Message } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface SupportMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  userId: number | null;
  firstname: string | null;
  lastname: string | null;
  userAgent: string | null;
  pageUrl: string | null;
  status: string;
  priority: string;
  adminNotes: string | null;
  createdAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
}

const AdminSupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updateStatus, setUpdateStatus] = useState('');
  const [updatePriority, setUpdatePriority] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [statusFilter]);

  const fetchMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      
      const response = await axios.get(`${API_URL}/api/admin/support`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setMessages(response.data.messages || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch support messages');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (message: SupportMessage) => {
    setSelectedMessage(message);
    setUpdateStatus(message.status);
    setUpdatePriority(message.priority);
    setAdminNotes(message.adminNotes || '');
    setDetailsOpen(true);
  };

  const handleUpdateMessage = async () => {
    if (!selectedMessage) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/api/admin/support/${selectedMessage.id}`,
        {
          status: updateStatus,
          priority: updatePriority,
          adminNotes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDetailsOpen(false);
      fetchMessages();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update message');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'error';
      case 'in_progress':
        return 'warning';
      case 'responded':
        return 'info';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredMessages = messages;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Support Messages
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Tabs value={statusFilter} onChange={(_, newValue) => setStatusFilter(newValue)} sx={{ mb: 3 }}>
          <Tab label="All" value="all" />
          <Tab label="New" value="new" />
          <Tab label="In Progress" value="in_progress" />
          <Tab label="Responded" value="responded" />
          <Tab label="Resolved" value="resolved" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredMessages.length === 0 ? (
          <Alert severity="info">No support messages found.</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMessages.map((message) => (
                  <TableRow key={message.id} hover>
                    <TableCell>
                      {new Date(message.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{message.name}</TableCell>
                    <TableCell>{message.email}</TableCell>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {message.subject}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={message.status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(message.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={message.priority.toUpperCase()}
                        color={getPriorityColor(message.priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {message.userId ? (
                        `${message.firstname} ${message.lastname}`
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Guest
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewDetails(message)}
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Support Message Details</DialogTitle>
        <DialogContent>
          {selectedMessage && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                From:
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedMessage.name} ({selectedMessage.email})
              </Typography>

              {selectedMessage.userId && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Registered User:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="body1">
                      {selectedMessage.firstname} {selectedMessage.lastname} (ID: {selectedMessage.userId})
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Message />}
                      onClick={() => {
                        setDetailsOpen(false);
                        navigate(`/messages?userId=${selectedMessage.userId}`);
                      }}
                    >
                      Contact User
                    </Button>
                  </Box>
                </>
              )}

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Subject:
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedMessage.subject}
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Message:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedMessage.message}
                </Typography>
              </Paper>

              {selectedMessage.pageUrl && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Page URL:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {selectedMessage.pageUrl}
                  </Typography>
                </>
              )}

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Received:
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {new Date(selectedMessage.createdAt).toLocaleString()}
              </Typography>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <TextField
                  select
                  label="Status"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="responded">Responded</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Priority"
                  value={updatePriority}
                  onChange={(e) => setUpdatePriority(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </TextField>
              </Box>

              <TextField
                fullWidth
                label="Admin Notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                multiline
                rows={4}
                margin="normal"
                helperText="Internal notes (not visible to user)"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateMessage}
            variant="contained"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={20} /> : <Check />}
          >
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminSupportPage;
