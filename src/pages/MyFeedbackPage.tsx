import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Fab,
} from '@mui/material';
import {
  BugReport,
  Lightbulb,
  Refresh,
  Close,
  Comment,
  Add,
} from '@mui/icons-material';
import axios from 'axios';
import { ROSTER_API_URL, ngrokHeaders } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FeedbackDialog from '../components/FeedbackDialog';

interface Feedback {
  id: number;
  userId: number;
  feedbackType: 'bug' | 'improvement';
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'reviewing' | 'in-progress' | 'completed' | 'wont-fix' | 'duplicate';
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  commentCount: number;
}

interface FeedbackComment {
  id: number;
  feedbackId: number;
  userId: number;
  comment: string;
  isAdminComment: boolean;
  createdAt: string;
  firstName: string;
  lastName: string;
  userRole: string;
}

const MyFeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchMyFeedback();
    }
  }, [user?.id]); // Only reload when user ID changes (login/logout), not on every user object update

  const fetchMyFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${ROSTER_API_URL}/api/feedback/my-submissions`, {
        headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders },
      });

      setFeedback(response.data?.feedback || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackDetails = async (feedbackId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${ROSTER_API_URL}/api/feedback/${feedbackId}`, {
        headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders },
      });

      setComments(response.data?.comments || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch feedback details');
    }
  };

  const handleOpenDetails = (item: Feedback) => {
    setSelectedFeedback(item);
    setNewComment('');
    fetchFeedbackDetails(item.id);
  };

  const handleCloseDetails = () => {
    setSelectedFeedback(null);
    setComments([]);
  };

  const handleAddComment = async () => {
    if (!selectedFeedback || !newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${ROSTER_API_URL}/api/feedback/${selectedFeedback.id}/comments`,
        { comment: newComment.trim() },
        { headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders } }
      );

      setNewComment('');
      await fetchFeedbackDetails(selectedFeedback.id);
      await fetchMyFeedback();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add comment');
    }
  };



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'primary';
      case 'reviewing': return 'info';
      case 'in-progress': return 'warning';
      case 'completed': return 'success';
      case 'wont-fix': return 'default';
      case 'duplicate': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          My Feedback
        </Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchMyFeedback}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        Help us improve! Report bugs or suggest new features. Our team reviews all feedback.
      </Alert>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : feedback.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No feedback submissions yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Have a bug to report or an idea to share? Let us know!
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowFeedbackDialog(true)}
          >
            Submit Feedback
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {feedback.map((item) => (
            <Grid item xs={12} key={item.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        {item.feedbackType === 'bug' ? (
                          <BugReport color="error" />
                        ) : (
                          <Lightbulb color="primary" />
                        )}
                        <Typography variant="h6">{item.title}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {item.description.length > 150
                          ? `${item.description.substring(0, 150)}...`
                          : item.description}
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                        <Chip
                          label={getStatusLabel(item.status)}
                          color={getStatusColor(item.status)}
                          size="small"
                        />
                        <Chip
                          label={item.priority}
                          color={getPriorityColor(item.priority)}
                          size="small"
                        />
                        <Chip label={item.category} size="small" variant="outlined" />
                        {item.commentCount > 0 && (
                          <Chip
                            icon={<Comment />}
                            label={`${item.commentCount} comment${item.commentCount > 1 ? 's' : ''}`}
                            size="small"
                            variant="outlined"
                            color={item.commentCount > 0 ? 'primary' : 'default'}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Submitted: {new Date(item.createdAt).toLocaleString()}
                        {item.status === 'completed' && item.resolvedAt && (
                          <> • Resolved: {new Date(item.resolvedAt).toLocaleString()}</>
                        )}
                      </Typography>
                    </Box>
                    <Button variant="outlined" size="small" onClick={() => handleOpenDetails(item)}>
                      View Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add feedback"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setShowFeedbackDialog(true)}
      >
        <Add />
      </Fab>

      {/* Feedback Details Dialog */}
      <Dialog open={!!selectedFeedback} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        {selectedFeedback && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={1}>
                  {selectedFeedback.feedbackType === 'bug' ? (
                    <BugReport color="error" />
                  ) : (
                    <Lightbulb color="primary" />
                  )}
                  {selectedFeedback.title}
                </Box>
                <IconButton onClick={handleCloseDetails}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                    {selectedFeedback.description}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={getStatusLabel(selectedFeedback.status)}
                    color={getStatusColor(selectedFeedback.status)}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Priority
                  </Typography>
                  <Chip
                    label={selectedFeedback.priority}
                    color={getPriorityColor(selectedFeedback.priority)}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body2">{selectedFeedback.category}</Typography>
                </Grid>

                {selectedFeedback.adminNotes && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <Typography variant="subtitle2" gutterBottom>
                        Admin Notes
                      </Typography>
                      <Typography variant="body2">{selectedFeedback.adminNotes}</Typography>
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Comments ({comments.length})
                  </Typography>
                  {comments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No comments yet
                    </Typography>
                  ) : (
                    <List>
                      {comments.map((comment) => (
                        <ListItem
                          key={comment.id}
                          sx={{
                            bgcolor: comment.isAdminComment ? 'primary.50' : 'grey.50',
                            mb: 1,
                            borderRadius: 1,
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle2">
                                  {comment.firstName} {comment.lastName}
                                </Typography>
                                {comment.isAdminComment && (
                                  <Chip label="Admin" size="small" color="primary" />
                                )}
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </Typography>
                              </Box>
                            }
                            secondary={comment.comment}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                  <Box display="flex" gap={1} mt={2}>
                    <TextField
                      fullWidth
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      size="small"
                      multiline
                      maxRows={3}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      Send
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Feedback Submission Dialog */}
      <FeedbackDialog
        open={showFeedbackDialog}
        onClose={() => {
          setShowFeedbackDialog(false);
          fetchMyFeedback();
        }}
      />
    </Container>
  );
};

export default MyFeedbackPage;
