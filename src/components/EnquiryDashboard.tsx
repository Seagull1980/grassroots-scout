import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import api from '../services/api';

interface Enquiry {
  id: number;
  vacancyId: number;
  vacancyTitle: string;
  playerName: string;
  playerEmail: string;
  playerPhone?: string;
  message?: string;
  status: 'new' | 'shortlisted' | 'trial_scheduled' | 'rejected' | 'signed';
  createdAt: string;
  respondedAt?: string;
}

interface EnquiryDashboardProps {
  vacancyId?: number;
}

const QUICK_RESPONSES = [
  {
    label: 'Shortlist',
    message: 'Thanks for your interest. We would like to shortlist you for our trials.',
  },
  {
    label: 'Trial Scheduled',
    message: 'Great! We would like to invite you for a trial. Details: [Add date/time/location]',
  },
  {
    label: 'Keep in Touch',
    message: 'Thanks for your interest. We will keep your details on file for future opportunities.',
  },
  {
    label: 'Position Filled',
    message: 'Thank you for your interest. Unfortunately, we have filled this position, but we will keep your details for future openings.',
  },
];

const EnquiryDashboard: React.FC<EnquiryDashboardProps> = ({ vacancyId }) => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadEnquiries();
  }, [vacancyId]);

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      const endpoint = vacancyId 
        ? `/api/vacancies/${vacancyId}/enquiries`
        : '/api/enquiries';
      const response = await api.get(endpoint);
      setEnquiries(response.data.enquiries || []);
      setError('');
    } catch (err: any) {
      console.error('Error loading enquiries:', err);
      setError('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleReplyClick = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setReplyMessage('');
    setReplyDialogOpen(true);
  };

  const handleQuickReply = (template: typeof QUICK_RESPONSES[0]) => {
    setReplyMessage(template.message);
  };

  const handleSendReply = async () => {
    if (!selectedEnquiry || !replyMessage.trim()) return;

    try {
      setSendingReply(true);
      await api.post(`/api/enquiries/${selectedEnquiry.id}/reply`, {
        message: replyMessage,
        status: 'replied',
      });

      // Update local state
      setEnquiries(prev =>
        prev.map(e =>
          e.id === selectedEnquiry.id
            ? { ...e, status: 'replied' as any }
            : e
        )
      );

      setReplyDialogOpen(false);
      setReplyMessage('');
    } catch (err: any) {
      console.error('Error sending reply:', err);
      setError('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (enquiry: Enquiry, newStatus: Enquiry['status']) => {
    try {
      await api.patch(`/api/enquiries/${enquiry.id}`, {
        status: newStatus,
      });

      setEnquiries(prev =>
        prev.map(e =>
          e.id === enquiry.id
            ? { ...e, status: newStatus }
            : e
        )
      );
    } catch (err: any) {
      console.error('Error updating enquiry:', err);
      setError('Failed to update enquiry');
    }
  };

  const getStatusColor = (status: Enquiry['status']) => {
    const colors: Record<Enquiry['status'], 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
      new: 'primary',
      shortlisted: 'info',
      trial_scheduled: 'warning',
      rejected: 'error',
      signed: 'success',
    };
    return colors[status] || 'default';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (enquiries.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            No enquiries yet. Check back when players show interest!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Player Enquiries ({enquiries.length})</Typography>
          <Chip
            label={`${enquiries.filter(e => e.status === 'new').length} New`}
            color="primary"
            variant="outlined"
          />
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <List sx={{ maxHeight: '500px', overflow: 'auto' }}>
          {enquiries.map((enquiry, index) => (
            <React.Fragment key={enquiry.id}>
              <ListItem sx={{ py: 2, px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {getInitials(enquiry.playerName)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="subtitle1">
                        {enquiry.playerName}
                      </Typography>
                      <Chip
                        label={enquiry.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(enquiry.status)}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {enquiry.playerEmail}
                      </Typography>
                      {enquiry.playerPhone && (
                        <Typography variant="body2" color="text.secondary">
                          {enquiry.playerPhone}
                        </Typography>
                      )}
                      {enquiry.message && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          "{enquiry.message}"
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Enquired: {new Date(enquiry.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Send Reply">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<SendIcon />}
                      onClick={() => handleReplyClick(enquiry)}
                    >
                      Reply
                    </Button>
                  </Tooltip>
                  <Tooltip title="Schedule Trial">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ScheduleIcon />}
                      onClick={() => handleStatusChange(enquiry, 'trial_scheduled')}
                    >
                      Trial
                    </Button>
                  </Tooltip>
                </Box>
              </ListItem>
              {index < enquiries.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reply to {selectedEnquiry?.playerName}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Message"
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Type your response..."
          />

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            Quick Templates
          </Typography>
          <Grid container spacing={1}>
            {QUICK_RESPONSES.filter(Boolean).map((template, index) => (
              <Grid item xs={12} sm={6} key={template?.label || index}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => handleQuickReply(template)}
                >
                  {template?.label || 'Template'}
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSendReply}
            variant="contained"
            disabled={!replyMessage.trim() || sendingReply}
            startIcon={sendingReply ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default EnquiryDashboard;
