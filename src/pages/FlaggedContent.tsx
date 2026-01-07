import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Flag as FlagIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ContentFlag {
  id: number;
  content_type: 'post' | 'reply';
  content_id: number;
  flagged_by_user_id: number;
  flagged_by_name: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewed_by_user_id?: number;
  reviewed_at?: string;
  created_at: string;
  content_preview: string;
  content_author: string;
  content_author_id: number;
}

const FlaggedContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState<'pending' | 'all'>('pending');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    flag: ContentFlag | null;
    action: 'delete' | 'dismiss' | null;
  }>({ open: false, flag: null, action: null });

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'Admin') {
      fetchFlags();
    }
  }, [user, selectedTab]);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      setError('');
      const statusParam = selectedTab === 'pending' ? '?status=pending' : '';
      const response = await fetch(
        `${API_URL}/forum/flags?user_role=${user?.role}${statusParam}`
      );
      
      if (!response.ok) {
        // If forum server is not running, show friendly message
        if (response.status === 404 || response.status === 0) {
          throw new Error('Forum server is not available. Please contact support.');
        }
        throw new Error('Failed to fetch flags');
      }
      
      const data = await response.json();
      setFlags(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching flags:', err);
      // Handle network errors (server down or table doesn't exist)
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Unable to load flagged content. The forum may still be initializing.');
      } else {
        setError(err.message || 'Failed to load flagged content');
      }
      setFlags([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleFlagAction = async (flagId: number, status: string, action?: string) => {
    try {
      const response = await fetch(`${API_URL}/forum/flags/${flagId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_role: user?.role,
          user_id: user?.id,
          status,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update flag');
      }

      // Refresh flags
      fetchFlags();
      setConfirmDialog({ open: false, flag: null, action: null });
    } catch (err: any) {
      console.error('Error updating flag:', err);
      setError(err.message || 'Failed to update flag');
    }
  };

  const handleViewContent = (flag: ContentFlag) => {
    if (flag.content_type === 'post') {
      window.open(`/forum/${flag.content_id}`, '_blank');
    } else {
      // For replies, we'd need to get the post_id - for now just show an alert
      alert('Please navigate to the forum to view this reply in context');
    }
  };

  const openConfirmDialog = (flag: ContentFlag, action: 'delete' | 'dismiss') => {
    setConfirmDialog({ open: true, flag, action });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'reviewed':
        return 'success';
      case 'dismissed':
        return 'default';
      default:
        return 'default';
    }
  };

  if (!user || user.role !== 'Admin') {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <FlagIcon sx={{ fontSize: 32, mr: 2, color: 'warning.main' }} />
          <Typography variant="h4">Flagged Content</Typography>
        </Box>

        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Pending Review" value="pending" />
          <Tab label="All Flags" value="all" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : flags.length === 0 ? (
          <Alert severity="info">
            {selectedTab === 'pending'
              ? 'No pending flags. Great job keeping the community safe!'
              : 'No flagged content found.'}
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {flags.map((flag) => (
              <Card key={flag.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={flag.content_type.toUpperCase()}
                        size="small"
                        color={flag.content_type === 'post' ? 'primary' : 'secondary'}
                      />
                      <Chip
                        label={flag.status.toUpperCase()}
                        size="small"
                        color={getStatusColor(flag.status)}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Flagged on {new Date(flag.created_at).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Content by: {flag.content_author}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1, fontStyle: 'italic' }}>
                      "{flag.content_preview}
                      {flag.content_type === 'reply' && flag.content_preview.length >= 100
                        ? '...'
                        : ''}
                      "
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Flagged by: {flag.flagged_by_name}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>Reason:</strong> {flag.reason}
                    </Typography>
                  </Box>

                  {flag.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Tooltip title="View content">
                        <IconButton
                          size="small"
                          onClick={() => handleViewContent(flag)}
                          color="info"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => openConfirmDialog(flag, 'delete')}
                      >
                        Delete Content
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={() => openConfirmDialog(flag, 'dismiss')}
                      >
                        Dismiss Flag
                      </Button>
                    </Box>
                  )}

                  {flag.status !== 'pending' && flag.reviewed_at && (
                    <Typography variant="caption" color="text.secondary">
                      Reviewed on {new Date(flag.reviewed_at).toLocaleString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, flag: null, action: null })}
      >
        <DialogTitle>
          {confirmDialog.action === 'delete' ? 'Delete Content?' : 'Dismiss Flag?'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'delete'
              ? 'Are you sure you want to delete this content? This action cannot be undone.'
              : 'Are you sure you want to dismiss this flag? The content will remain visible.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ open: false, flag: null, action: null })}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (confirmDialog.flag) {
                handleFlagAction(
                  confirmDialog.flag.id,
                  confirmDialog.action === 'delete' ? 'reviewed' : 'dismissed',
                  confirmDialog.action === 'delete' ? 'delete' : undefined
                );
              }
            }}
            color={confirmDialog.action === 'delete' ? 'error' : 'primary'}
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FlaggedContent;
