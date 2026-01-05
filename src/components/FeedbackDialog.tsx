import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import { BugReport, Lightbulb } from '@mui/icons-material';
import axios from 'axios';
import { ROSTER_API_URL } from '../services/api';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  defaultType?: 'bug' | 'improvement';
}

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onClose, defaultType = 'bug' }) => {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'improvement'>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (open) {
      setFeedbackType(defaultType);
      setTitle('');
      setDescription('');
      setCategory('general');
      setError('');
      setSuccess(false);
    }
  }, [open, defaultType]);

  const getBrowserInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const browserInfo = getBrowserInfo();
      const pageUrl = window.location.href;

      await axios.post(
        `${ROSTER_API_URL}/feedback`,
        {
          feedbackType,
          title: title.trim(),
          description: description.trim(),
          category,
          browserInfo: JSON.stringify(browserInfo),
          pageUrl,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'search', label: 'Search & Filtering' },
    { value: 'messaging', label: 'Messaging' },
    { value: 'team-roster', label: 'Team Roster' },
    { value: 'maps', label: 'Maps & Location' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'performance', label: 'Performance' },
    { value: 'mobile', label: 'Mobile Experience' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {feedbackType === 'bug' ? <BugReport color="error" /> : <Lightbulb color="primary" />}
          Submit Feedback
        </Box>
      </DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Thank you for your feedback! We'll review it soon.
          </Alert>
        ) : (
          <>
            <Tabs
              value={feedbackType}
              onChange={(_e, value) => setFeedbackType(value)}
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab
                icon={<BugReport />}
                iconPosition="start"
                label="Report a Bug"
                value="bug"
              />
              <Tab
                icon={<Lightbulb />}
                iconPosition="start"
                label="Suggest Improvement"
                value="improvement"
              />
            </Tabs>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {feedbackType === 'bug'
                ? 'Help us fix issues by describing what went wrong.'
                : 'Share your ideas to help us improve the platform!'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                feedbackType === 'bug'
                  ? 'e.g., Search results not loading'
                  : 'e.g., Add filters for player positions'
              }
              required
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} label="Category">
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                feedbackType === 'bug'
                  ? 'Please describe what happened, what you expected, and steps to reproduce the issue...'
                  : 'Please describe your idea and how it would improve the platform...'
              }
              multiline
              rows={6}
              required
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Your browser and page information will be automatically included to help us diagnose issues.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={feedbackType === 'bug' ? <BugReport /> : <Lightbulb />}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
