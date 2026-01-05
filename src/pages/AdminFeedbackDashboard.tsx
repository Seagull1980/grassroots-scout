import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  BugReport,
  Lightbulb,
  Refresh,
  Delete,
  Comment,
  Close,
  FilterList,
  TrendingUp,
} from '@mui/icons-material';
import axios from 'axios';
import { ROSTER_API_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
  browserInfo: string | null;
  pageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  firstName: string;
  lastName: string;
  email: string;
  userRole: string;
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

interface FeedbackStats {
  total: number;
  bugs: number;
  improvements: number;
  newItems: number;
  inProgress: number;
  completed: number;
  critical: number;
}

const AdminFeedbackDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'bugs' | 'improvements'>('all');
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchFeedback();
    }
  }, [user, activeTab, statusFilter, priorityFilter, categoryFilter]);

  const fetchFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params: any = {};
      
      if (activeTab !== 'all') {
        params.feedbackType = activeTab === 'bugs' ? 'bug' : 'improvement';
      }
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;

      const response = await axios.get(`${ROSTER_API_URL}/admin/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setFeedback(response.data.feedback);
      setStats(response.data.stats);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackDetails = async (feedbackId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${ROSTER_API_URL}/feedback/${feedbackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setComments(response.data.comments);
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

  const handleUpdateFeedback = async (updates: Partial<Feedback>) => {
    if (!selectedFeedback) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${ROSTER_API_URL}/admin/feedback/${selectedFeedback.id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchFeedback();
      if (selectedFeedback) {
        const updated = feedback.find((f) => f.id === selectedFeedback.id);
        if (updated) {
          setSelectedFeedback({ ...updated, ...updates });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update feedback');
    }
  };

  const handleAddComment = async () => {
    if (!selectedFeedback || !newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${ROSTER_API_URL}/feedback/${selectedFeedback.id}/comments`,
        { comment: newComment.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewComment('');
      await fetchFeedbackDetails(selectedFeedback.id);
      await fetchFeedback();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add comment');
    }
  };

  const handleDeleteFeedback = async (feedbackId: number) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${ROSTER_API_URL}/admin/feedback/${feedbackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchFeedback();
      handleCloseDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete feedback');
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

  if (user?.role !== 'Admin') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Admin access required</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Feedback Dashboard
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchFeedback}>
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4">{stats.total}</Typography>
                <Typography color="text.secondary">Total Submissions</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <BugReport color="error" />
                  <Typography variant="h4">{stats.bugs}</Typography>
                </Box>
                <Typography color="text.secondary">Bug Reports</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Lightbulb color="primary" />
                  <Typography variant="h4">{stats.improvements}</Typography>
                </Box>
                <Typography color="text.secondary">Improvements</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUp color="warning" />
                  <Typography variant="h4">{stats.newItems}</Typography>
                </Box>
                <Typography color="text.secondary">New Items</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {showFilters && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="reviewing">Reviewing</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="wont-fix">Won't Fix</MenuItem>
                  <MenuItem value="duplicate">Duplicate</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="search">Search & Filtering</MenuItem>
                  <MenuItem value="messaging">Messaging</MenuItem>
                  <MenuItem value="team-roster">Team Roster</MenuItem>
                  <MenuItem value="maps">Maps & Location</MenuItem>
                  <MenuItem value="dashboard">Dashboard</MenuItem>
                  <MenuItem value="performance">Performance</MenuItem>
                  <MenuItem value="mobile">Mobile Experience</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="All Feedback" value="all" />
        <Tab
          icon={<BugReport />}
          iconPosition="start"
          label={`Bugs (${stats?.bugs || 0})`}
          value="bugs"
        />
        <Tab
          icon={<Lightbulb />}
          iconPosition="start"
          label={`Improvements (${stats?.improvements || 0})`}
          value="improvements"
        />
      </Tabs>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : feedback.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No feedback found</Typography>
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
                          label={item.status.replace('-', ' ')}
                          color={getStatusColor(item.status)}
                          size="small"
                        />
                        <Chip
                          label={item.priority}
                          color={getPriorityColor(item.priority)}
                          size="small"
                        />
                        <Chip label={item.category} size="small" variant="outlined" />
                        <Chip
                          label={`${item.firstName} ${item.lastName} (${item.userRole})`}
                          size="small"
                          variant="outlined"
                        />
                        {item.commentCount > 0 && (
                          <Chip
                            icon={<Comment />}
                            label={item.commentCount}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Submitted: {new Date(item.createdAt).toLocaleString()}
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
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedFeedback.status}
                      onChange={(e) =>
                        handleUpdateFeedback({ status: e.target.value as any })
                      }
                      label="Status"
                    >
                      <MenuItem value="new">New</MenuItem>
                      <MenuItem value="reviewing">Reviewing</MenuItem>
                      <MenuItem value="in-progress">In Progress</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="wont-fix">Won't Fix</MenuItem>
                      <MenuItem value="duplicate">Duplicate</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={selectedFeedback.priority}
                      onChange={(e) =>
                        handleUpdateFeedback({ priority: e.target.value as any })
                      }
                      label="Priority"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Admin Notes"
                    value={selectedFeedback.adminNotes || ''}
                    onChange={(e) =>
                      setSelectedFeedback({ ...selectedFeedback, adminNotes: e.target.value })
                    }
                    onBlur={(e) => handleUpdateFeedback({ adminNotes: e.target.value })}
                    multiline
                    rows={2}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Submitted By
                  </Typography>
                  <Typography variant="body2">
                    {selectedFeedback.firstName} {selectedFeedback.lastName} ({selectedFeedback.userRole}
                    )
                  </Typography>
                  <Typography variant="body2">{selectedFeedback.email}</Typography>
                </Grid>

                {selectedFeedback.pageUrl && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Page URL
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {selectedFeedback.pageUrl}
                    </Typography>
                  </Grid>
                )}

                {selectedFeedback.browserInfo && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Browser Info
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(JSON.parse(selectedFeedback.browserInfo), null, 2)}
                      </Typography>
                    </Paper>
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
              <Button
                color="error"
                startIcon={<Delete />}
                onClick={() => handleDeleteFeedback(selectedFeedback.id)}
              >
                Delete
              </Button>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AdminFeedbackDashboard;
