import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ForumPost } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Category = 'General Discussions' | 'Website Discussions' | 'Grassroots Discussions';

const CATEGORIES: Category[] = ['Website Discussions', 'Grassroots Discussions', 'General Discussions'];

const Forum: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'Website Discussions' as Category });
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'All' 
        ? `${API_URL}/forum/posts`
        : `${API_URL}/forum/posts?category=${encodeURIComponent(selectedCategory)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      showSnackbar('Failed to load posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (post?: ForumPost) => {
    if (post) {
      setEditingPost(post);
      setFormData({ title: post.title, content: post.content, category: post.category });
    } else {
      setEditingPost(null);
      setFormData({ title: '', content: '', category: selectedCategory === 'All' ? 'Website Discussions' : selectedCategory });
    }
    setOpenDialog(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPost(null);
    setFormData({ title: '', content: '', category: 'Website Discussions' });
    setError('');
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!user) {
      setError('You must be logged in to post');
      return;
    }

    try {
      const url = editingPost
        ? `${API_URL}/forum/posts/${editingPost.id}`
        : `${API_URL}/forum/posts`;
      
      const method = editingPost ? 'PUT' : 'POST';
      
      const body = editingPost
        ? { ...formData, user_id: parseInt(user.id) }
        : {
            ...formData,
            user_id: parseInt(user.id),
            user_role: user.role,
            author_name: `${user.firstName} ${user.lastName}`,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.profanityDetected) {
          setError(data.error || 'Your post contains inappropriate language');
        } else {
          throw new Error(data.error || 'Failed to save post');
        }
        return;
      }

      showSnackbar(
        editingPost ? 'Post updated successfully' : 'Post created successfully',
        'success'
      );
      handleCloseDialog();
      fetchPosts();
    } catch (error: any) {
      console.error('Error saving post:', error);
      setError(error.message || 'Failed to save post');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/forum/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: parseInt(user.id),
          user_role: user.role 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete post');
      }

      showSnackbar('Post deleted successfully', 'success');
      fetchPosts();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      showSnackbar(error.message || 'Failed to delete post', 'error');
    }
  };

  const handleToggleLock = async (postId: string, currentlyLocked: boolean) => {
    if (!user || user.role !== 'Admin') {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/forum/posts/${postId}/lock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: parseInt(user.id),
          user_role: user.role,
          is_locked: !currentlyLocked
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update thread lock status');
      }

      showSnackbar(
        currentlyLocked ? 'Thread unlocked successfully' : 'Thread locked successfully',
        'success'
      );
      fetchPosts();
    } catch (error: any) {
      console.error('Error toggling lock:', error);
      showSnackbar(error.message || 'Failed to update thread lock status', 'error');
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, post: ForumPost) => {
    setAnchorEl(event.currentTarget);
    setSelectedPost(post);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPost(null);
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Community Forum
        </Typography>
        {user && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Post
          </Button>
        )}
      </Box>

      {!user && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please log in to create posts and join the discussion.
        </Alert>
      )}

      {/* Category Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedCategory}
          onChange={(_, newValue) => setSelectedCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All" value="All" />
          {CATEGORIES.map((category) => (
            <Tab key={category} label={category} value={category} />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {posts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No posts yet. Be the first to start a discussion!
            </Typography>
          </Paper>
        ) : (
          posts.map((post) => (
            <Card 
              key={post.id} 
              elevation={2}
              onClick={() => navigate(`/forum/${post.id}`)}
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                }
              }}
            >
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
                    <Chip
                      label={post.category}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
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
                  {user && (user.id === post.user_id.toString() || user.role === 'Admin') && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuClick(e, post);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>

                <Typography variant="h6" gutterBottom fontWeight="bold">
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
          ))
        )}
      </Box>

      {/* Menu for edit/delete */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedPost && user && user.id === selectedPost.user_id.toString() && (
          <MenuItem
            onClick={() => {
              if (selectedPost) {
                handleOpenDialog(selectedPost);
              }
              handleMenuClose();
            }}
          >
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (selectedPost) {
              handleDelete(selectedPost.id);
            }
            handleMenuClose();
          }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
        {selectedPost && user && user.role === 'Admin' && (
          <MenuItem
            onClick={() => {
              if (selectedPost) {
                handleToggleLock(selectedPost.id, !!selectedPost.is_locked);
              }
              handleMenuClose();
            }}
          >
            {selectedPost.is_locked ? (
              <>
                <LockOpenIcon sx={{ mr: 1 }} fontSize="small" />
                Unlock Thread
              </>
            ) : (
              <>
                <LockIcon sx={{ mr: 1 }} fontSize="small" />
                Lock Thread
              </>
            )}
          </MenuItem>
        )}
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPost ? 'Edit Post' : 'Create New Post'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a descriptive title"
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
              >
                {CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={6}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share your thoughts, questions, or experiences..."
              required
            />
            <Alert severity="warning" icon={false}>
              <Typography variant="body2">
                <strong>Community Guidelines:</strong> Please keep discussions respectful and constructive. 
                Posts containing inappropriate language will be rejected.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingPost ? 'Update' : 'Post'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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

export default Forum;
