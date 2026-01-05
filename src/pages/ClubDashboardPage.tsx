import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Avatar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Collapse,
  Badge,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  PushPin as PinIcon,
  Group as GroupIcon,
  Campaign as CampaignIcon,
  EmojiEvents as TrophyIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  Home as HomeIcon,
  Groups as GroupsIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ROSTER_API_URL, ngrokHeaders } from '../services/api';

interface ClubUpdate {
  id: number;
  clubName: string;
  coachId: number;
  title: string;
  content: string;
  updateType: 'general' | 'announcement' | 'event' | 'achievement' | 'urgent';
  isPinned: boolean;
  firstName: string;
  lastName: string;
  email: string;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: number;
  updateId: number;
  coachId: number;
  comment: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

interface ClubInfo {
  clubName: string;
  totalTeams: number;
  totalCoaches: number;
  coaches: Array<{
    coachId: string;
    coachName: string;
    email: string;
    teams: Array<{
      id: string;
      teamName: string;
      ageGroup: string;
      league: string;
      playerCount: number;
    }>;
  }>;
}

const ClubDashboardPage: React.FC = () => {
  const { clubName } = useParams<{ clubName: string }>();
  const { user } = useAuth();

  const [updates, setUpdates] = useState<ClubUpdate[]>([]);
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<ClubUpdate | null>(null);
  const [updateForm, setUpdateForm] = useState({
    title: '',
    content: '',
    updateType: 'general' as ClubUpdate['updateType'],
    isPinned: false
  });

  const [expandedUpdate, setExpandedUpdate] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (clubName) {
      loadClubData();
    }
  }, [clubName]);

  const loadClubData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [updatesRes, infoRes] = await Promise.all([
        axios.get(`${ROSTER_API_URL}/club-updates/${encodeURIComponent(clubName!)}`, {
          headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders }
        }),
        axios.get(`${ROSTER_API_URL}/club-info/${encodeURIComponent(clubName!)}`, {
          headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders }
        })
      ]);

      setUpdates(updatesRes.data.updates);
      setClubInfo(infoRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load club dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (updateId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${ROSTER_API_URL}/club-updates/${updateId}/comments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(prev => ({ ...prev, [updateId]: response.data.comments }));
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const handleExpandUpdate = (updateId: number) => {
    if (expandedUpdate === updateId) {
      setExpandedUpdate(null);
    } else {
      setExpandedUpdate(updateId);
      if (!comments[updateId]) {
        loadComments(updateId);
      }
    }
  };

  const handleCreateUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${ROSTER_API_URL}/club-updates`,
        { clubName, ...updateForm },
        { headers: { Authorization: `Bearer ${token}`, ...ngrokHeaders } }
      );
      setSuccess('Update posted successfully!');
      setShowUpdateDialog(false);
      setUpdateForm({ title: '', content: '', updateType: 'general', isPinned: false });
      loadClubData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create update');
    }
  };

  const handleEditUpdate = async () => {
    if (!editingUpdate) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${ROSTER_API_URL}/club-updates/${editingUpdate.id}`,
        updateForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Update edited successfully!');
      setShowUpdateDialog(false);
      setEditingUpdate(null);
      setUpdateForm({ title: '', content: '', updateType: 'general', isPinned: false });
      loadClubData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to edit update');
    }
  };

  const handleDeleteUpdate = async (updateId: number) => {
    if (!window.confirm('Are you sure you want to delete this update?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${ROSTER_API_URL}/club-updates/${updateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Update deleted successfully!');
      loadClubData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete update');
    }
  };

  const handleAddComment = async (updateId: number) => {
    const comment = newComment[updateId];
    if (!comment || comment.trim() === '') return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${ROSTER_API_URL}/club-updates/${updateId}/comments`,
        { comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment(prev => ({ ...prev, [updateId]: '' }));
      loadComments(updateId);
      loadClubData(); // Refresh to update comment count
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add comment');
    }
  };

  const handleDeleteComment = async (updateId: number, commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${ROSTER_API_URL}/club-updates/${updateId}/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadComments(updateId);
      loadClubData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete comment');
    }
  };

  const openUpdateDialog = (update?: ClubUpdate) => {
    if (update) {
      setEditingUpdate(update);
      setUpdateForm({
        title: update.title,
        content: update.content,
        updateType: update.updateType,
        isPinned: update.isPinned
      });
    } else {
      setEditingUpdate(null);
      setUpdateForm({ title: '', content: '', updateType: 'general', isPinned: false });
    }
    setShowUpdateDialog(true);
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <CampaignIcon />;
      case 'event': return <EventIcon />;
      case 'achievement': return <TrophyIcon />;
      case 'urgent': return <WarningIcon />;
      default: return <GroupIcon />;
    }
  };

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'primary';
      case 'event': return 'info';
      case 'achievement': return 'success';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

  const getClubShareUrl = () => {
    return `${window.location.origin}/club-dashboard/${encodeURIComponent(clubName!)}`;
  };

  const handleCopyLink = async () => {
    const url = getClubShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  if (user?.role !== 'Coach') {
    return (
      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <Alert severity="info">
          Club dashboard is only available to coaches.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={RouterLink} to="/dashboard" color="inherit" underline="hover" sx={{ display: 'flex', alignItems: 'center' }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </MuiLink>
        <MuiLink component={RouterLink} to="/team-roster" color="inherit" underline="hover" sx={{ display: 'flex', alignItems: 'center' }}>
          <GroupsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Team Roster
        </MuiLink>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <GroupIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {clubName}
        </Typography>
      </Breadcrumbs>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Club Info Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
                <GroupIcon sx={{ mr: 1 }} />
                {clubName}
              </Typography>
              <IconButton
                onClick={() => setShowShareDialog(true)}
                color="primary"
                size="small"
                title="Share Club Link"
              >
                <ShareIcon />
              </IconButton>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Teams</Typography>
              <Typography variant="h6">{clubInfo?.totalTeams || 0}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Coaches</Typography>
              <Typography variant="h6">{clubInfo?.totalCoaches || 0}</Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Coaches & Teams</Typography>
            <List dense>
              {clubInfo?.coaches.map((coach, idx) => (
                <Box key={idx}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>{coach.coachName.split(' ').map(n => n[0]).join('')}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={coach.coachName}
                      secondary={`${coach.teams.length} team${coach.teams.length !== 1 ? 's' : ''}`}
                    />
                  </ListItem>
                  {coach.teams.map((team, tidx) => (
                    <ListItem key={tidx} sx={{ pl: 8 }}>
                      <ListItemText
                        primary={team.teamName}
                        secondary={`${team.ageGroup} • ${team.playerCount} players`}
                      />
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Updates Feed */}
        <Grid item xs={12} md={8}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">Club Updates</Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => openUpdateDialog()}
            >
              New Update
            </Button>
          </Box>

          {updates.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No updates yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Be the first to post an update for your club!
              </Typography>
            </Paper>
          ) : (
            <Box>
              {updates.map((update) => (
                <Card key={update.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar>
                          {update.firstName[0]}{update.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1">
                            {update.firstName} {update.lastName}
                            {update.isPinned && (
                              <PinIcon fontSize="small" sx={{ ml: 1, color: 'primary.main' }} />
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(update.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        icon={getUpdateTypeIcon(update.updateType)}
                        label={update.updateType}
                        size="small"
                        color={getUpdateTypeColor(update.updateType) as any}
                      />
                    </Box>
                    
                    <Typography variant="h6" gutterBottom>
                      {update.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {update.content}
                    </Typography>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleExpandUpdate(update.id)}
                      >
                        <Badge badgeContent={update.commentCount} color="primary">
                          <CommentIcon />
                        </Badge>
                      </IconButton>
                    </Box>
                    {update.coachId === Number(user?.id) && (
                      <Box>
                        <IconButton size="small" onClick={() => openUpdateDialog(update)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteUpdate(update.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </CardActions>

                  <Collapse in={expandedUpdate === update.id}>
                    <Divider />
                    <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Comments
                      </Typography>
                      
                      {comments[update.id]?.map((comment) => (
                        <Card key={comment.id} variant="outlined" sx={{ mb: 1, p: 1 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="caption" fontWeight="bold">
                                {comment.firstName} {comment.lastName}
                              </Typography>
                              <Typography variant="body2">
                                {comment.comment}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(comment.createdAt).toLocaleString()}
                              </Typography>
                            </Box>
                            {comment.coachId === Number(user?.id) && (
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteComment(update.id, comment.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Card>
                      ))}

                      <Box display="flex" gap={1} mt={2}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Add a comment..."
                          value={newComment[update.id] || ''}
                          onChange={(e) => setNewComment(prev => ({ ...prev, [update.id]: e.target.value }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(update.id);
                            }
                          }}
                        />
                        <Button onClick={() => handleAddComment(update.id)} variant="contained" size="small">
                          Post
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>
                </Card>
              ))}
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Create/Edit Update Dialog */}
      <Dialog open={showUpdateDialog} onClose={() => setShowUpdateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUpdate ? 'Edit Update' : 'Create New Update'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={updateForm.title}
                onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={8}>
              <FormControl fullWidth>
                <InputLabel>Update Type</InputLabel>
                <Select
                  value={updateForm.updateType}
                  label="Update Type"
                  onChange={(e) => setUpdateForm({ ...updateForm, updateType: e.target.value as any })}
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="announcement">Announcement</MenuItem>
                  <MenuItem value="event">Event</MenuItem>
                  <MenuItem value="achievement">Achievement</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Pin</InputLabel>
                <Select
                  value={updateForm.isPinned ? 'yes' : 'no'}
                  label="Pin"
                  onChange={(e) => setUpdateForm({ ...updateForm, isPinned: e.target.value === 'yes' })}
                >
                  <MenuItem value="no">No</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Content"
                value={updateForm.content}
                onChange={(e) => setUpdateForm({ ...updateForm, content: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUpdateDialog(false)}>Cancel</Button>
          <Button
            onClick={editingUpdate ? handleEditUpdate : handleCreateUpdate}
            variant="contained"
            disabled={!updateForm.title || !updateForm.content}
          >
            {editingUpdate ? 'Save Changes' : 'Post Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Club Dialog */}
      <Dialog open={showShareDialog} onClose={() => setShowShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <ShareIcon sx={{ mr: 1 }} />
            Share {clubName} Club Link
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Share this link with other coaches to invite them to join your club dashboard. 
            They'll need to create a team with the same club name to access it.
          </Typography>
          
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.9rem'
              }}
            >
              {getClubShareUrl()}
            </Typography>
          </Paper>

          <Button
            fullWidth
            variant="contained"
            startIcon={copySuccess ? <CheckCircleIcon /> : <CopyIcon />}
            onClick={handleCopyLink}
            color={copySuccess ? 'success' : 'primary'}
          >
            {copySuccess ? 'Link Copied!' : 'Copy Link to Clipboard'}
          </Button>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Coaches must have at least one team with the club name "{clubName}" 
              to view and post in this club dashboard.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowShareDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ClubDashboardPage;


