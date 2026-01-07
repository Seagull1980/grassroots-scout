import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  TextField,
  Alert,
  Chip,
  IconButton,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Lock as LockIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ForumPost, ForumReply } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ForumPostDetail: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<ForumReply | null>(null);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReply, setSelectedReply] = useState<ForumReply | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchReplies();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`${API_URL}/forum/posts/${postId}`);
      if (response.status === 404) {
        setPost(null);
        setLoading(false);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch post');
      const data = await response.json();
      setPost(data);
    } catch (error) {
      console.error('Error fetching post:', error);
      showSnackbar('Failed to load post', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const response = await fetch(`${API_URL}/forum/posts/${postId}/replies`);
      if (!response.ok) throw new Error('Failed to fetch replies');
      const data = await response.json();
      setReplies(data);
    } catch (error) {
      console.error('Error fetching replies:', error);
      showSnackbar('Failed to load replies', 'error');
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      setError('Please enter a reply');
      return;
    }

    if (!user) {
      setError('You must be logged in to reply');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/forum/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(user.id),
          user_role: user.role,
          author_name: `${user.firstName} ${user.lastName}`,
          content: replyContent,
          parent_reply_id: replyingTo?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.profanityDetected) {
          setError(data.error || 'Your reply contains inappropriate language');
        } else {
          throw new Error(data.error || 'Failed to post reply');
        }
        return;
      }

      showSnackbar('Reply posted successfully', 'success');
      setReplyContent('');
      setReplyingTo(null);
      setError('');
      fetchReplies();
    } catch (error: any) {
      console.error('Error posting reply:', error);
      setError(error.message || 'Failed to post reply');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/forum/replies/${replyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: parseInt(user.id),
          user_role: user.role 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete reply');
      }

      showSnackbar('Reply deleted successfully', 'success');
      fetchReplies();
    } catch (error: any) {
      console.error('Error deleting reply:', error);
      showSnackbar(error.message || 'Failed to delete reply', 'error');
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, reply: ForumReply) => {
    setAnchorEl(event.currentTarget);
    setSelectedReply(reply);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReply(null);
  };

  const handleFlagContent = async (contentType: 'post' | 'reply', contentId: number) => {
    if (!user) {
      showSnackbar('You must be logged in to flag content', 'error');
      return;
    }

    const reason = window.prompt(
      'Please provide a reason for flagging this content (optional):'
    );

    // User clicked cancel
    if (reason === null) return;

    try {
      const response = await fetch(`${API_URL}/forum/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          user_id: parseInt(user.id),
          user_name: `${user.firstName} ${user.lastName}`,
          reason: reason.trim() || 'No reason provided',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to flag content');
      }

      showSnackbar('Content flagged successfully. An admin will review it.', 'success');
      handleMenuClose();
    } catch (error: any) {
      console.error('Error flagging content:', error);
      showSnackbar(error.message || 'Failed to flag content', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Coach':
        return 'primary';
      case 'Player':
        return 'success';
      case 'Parent/Guardian':
        return 'secondary';
      case 'Admin':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Post not found</Alert>
        <Button onClick={() => navigate('/forum')} sx={{ mt: 2 }}>
          Back to Forum
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/forum')}
        sx={{ mb: 3 }}
      >
        Back to Forum
      </Button>

      {/* Original Post */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <PersonIcon color="action" />
              <Typography variant="subtitle2" color="text.secondary">
                {post.author_name}
              </Typography>
              <Chip
                label={post.user_role}
                size="small"
                color={getRoleBadgeColor(post.user_role)}
              />
              {post.is_locked && (
                <Chip
                  icon={<LockIcon />}
                  label="Locked"
                  size="small"
                  color="warning"
                />
              )}
              <Typography variant="caption" color="text.secondary">
                • {formatDate(post.created_at)}
              </Typography>
            </Box>
            {user && (
              <IconButton
                size="small"
                onClick={() => handleFlagContent('post', parseInt(post.id))}
                title="Flag inappropriate content"
                color="warning"
              >
                <FlagIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          <Typography variant="h5" gutterBottom fontWeight="bold">
            {post.title}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {post.content}
          </Typography>
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }}>
        <Chip label={`${replies.length} ${replies.length === 1 ? 'Reply' : 'Replies'}`} />
      </Divider>

      {/* Replies */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        {replies.map((reply) => (
          <Card 
            key={reply.id} 
            variant="outlined"
            sx={{
              ml: reply.parent_reply_id ? 4 : 0,
              borderLeft: reply.parent_reply_id ? '3px solid' : 'none',
              borderLeftColor: reply.parent_reply_id ? 'primary.main' : 'transparent',
            }}
          >
            <CardContent>
              {reply.parent_author_name && (
                <Box 
                  sx={{ 
                    mb: 1, 
                    p: 1, 
                    bgcolor: 'action.hover', 
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <ReplyIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Replying to <strong>{reply.parent_author_name}</strong>
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PersonIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    {reply.author_name}
                  </Typography>
                  <Chip
                    label={reply.user_role}
                    size="small"
                    color={getRoleBadgeColor(reply.user_role)}
                  />
                  <Typography variant="caption" color="text.secondary">
                    • {formatDate(reply.created_at)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {user && !post?.is_locked && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setReplyingTo(reply);
                        document.getElementById('reply-form')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      title="Reply to this comment"
                    >
                      <ReplyIcon fontSize="small" />
                    </IconButton>
                  )}
                  {user && (user.id !== reply.user_id.toString() || user.role === 'Admin') && (
                    <IconButton
                      size="small"
                      onClick={() => handleFlagContent('reply', parseInt(reply.id))}
                      title="Flag inappropriate content"
                      color="warning"
                    >
                      <FlagIcon fontSize="small" />
                    </IconButton>
                  )}
                  {user && (user.id === reply.user_id.toString() || user.role === 'Admin') && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, reply)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {reply.content}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Reply Form */}
      {user && !post?.is_locked ? (
        <Paper sx={{ p: 3 }} id="reply-form">
          <Typography variant="h6" gutterBottom>
            {replyingTo ? `Reply to ${replyingTo.author_name}` : 'Add a Reply'}
          </Typography>
          {replyingTo && (
            <Box 
              sx={{ 
                mb: 2, 
                p: 2, 
                bgcolor: 'action.hover', 
                borderRadius: 1,
                borderLeft: '3px solid',
                borderLeftColor: 'primary.main',
                position: 'relative',
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Replying to:
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                "{replyingTo.content.length > 100 ? replyingTo.content.substring(0, 100) + '...' : replyingTo.content}"
              </Typography>
              <Button 
                size="small" 
                onClick={() => setReplyingTo(null)}
                sx={{ mt: 1 }}
              >
                Cancel Reply
              </Button>
            </Box>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Share your thoughts..."
            sx={{ mb: 2 }}
          />
          <Alert severity="info" icon={false} sx={{ mb: 2 }}>
            <Typography variant="body2">
              Please keep replies respectful and constructive.
            </Typography>
          </Alert>
          <Button
            variant="contained"
            onClick={handleSubmitReply}
            disabled={!replyContent.trim()}
          >
            Post Reply
          </Button>
        </Paper>
      ) : post?.is_locked ? (
        <Alert severity="warning" icon={<LockIcon />}>
          This thread has been locked by an administrator. No new replies can be added.
        </Alert>
      ) : (
        <Alert severity="info">
          Please log in to reply to this post.
        </Alert>
      )}

      {/* Reply Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedReply) {
              handleDeleteReply(selectedReply.id);
            }
            handleMenuClose();
          }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ForumPostDetail;
