import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';
import { SuccessStorySubmission } from '../types';
import PageHeader from '../components/PageHeader';

const AdminSuccessStoriesPage: React.FC = () => {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [submissions, setSubmissions] = useState<SuccessStorySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved');
  const [selectedSubmission, setSelectedSubmission] = useState<SuccessStorySubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const loadSubmissions = async (targetStatus = status) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/success-story-submissions?status=${targetStatus}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        setError('Failed to load submissions');
        setSubmissions([]);
        return;
      }
      const data = await response.json();
      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions(status);
  }, [status]);

  const openActionDialog = (submission: SuccessStorySubmission, nextStatus: 'approved' | 'rejected') => {
    setSelectedSubmission(submission);
    setActionType(nextStatus);
    setAdminNotes('');
    setActionOpen(true);
  };

  const handleActionConfirm = async () => {
    if (!selectedSubmission) return;

    try {
      const response = await fetch(`/api/admin/success-story-submissions/${selectedSubmission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: actionType,
          adminNotes: adminNotes.trim() || undefined
        })
      });

      if (!response.ok) {
        setError('Failed to update submission');
        return;
      }

      setActionOpen(false);
      setSelectedSubmission(null);
      await loadSubmissions(status);
    } catch (err) {
      setError('Network error occurred');
    }
  };

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Success Story Approvals"
        subtitle="Review and approve community submissions"
        icon={<TrophyIcon sx={{ fontSize: 32 }} />}
      />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Tabs
          value={status}
          onChange={(_, value) => setStatus(value)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label="Pending" value="pending" />
          <Tab label="Approved" value="approved" />
          <Tab label="Rejected" value="rejected" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : submissions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No submissions found.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {submissions.map((submission) => (
              <Grid item xs={12} md={6} key={submission.id}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">
                      {submission.isAnonymous ? 'Anonymous' : submission.displayName}
                    </Typography>
                    <Chip label={submission.status} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {submission.role || 'Community Member'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    "{submission.story}"
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {submission.teamName && <Chip label={submission.teamName} size="small" variant="outlined" />}
                    {submission.position && <Chip label={submission.position} size="small" variant="outlined" />}
                    {submission.ageGroup && <Chip label={submission.ageGroup} size="small" variant="outlined" />}
                    {submission.league && <Chip label={submission.league} size="small" variant="outlined" />}
                  </Box>

                  {status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => openActionDialog(submission, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => openActionDialog(submission, 'rejected')}
                      >
                        Reject
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      <Dialog open={actionOpen} onClose={() => setActionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType === 'approved' ? 'Approve Story' : 'Reject Story'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Admin notes (optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleActionConfirm}>
            {actionType === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminSuccessStoriesPage;
