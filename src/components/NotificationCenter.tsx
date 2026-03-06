import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
  Avatar,
  Tab,
  Tabs
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Notification {
  id: number;
  type: 'message' | 'match' | 'response' | 'event' | 'system' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationCenterProps {
  showButton?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ showButton = true }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const unreadCount = notifications.filter(n => !n.read).length;
  const open = Boolean(anchorEl);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 2 minutes
    const interval = setInterval(loadNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // For now, create mock notifications based on user activity
      // In production, this would fetch from backend
      const mockNotifications = await generateMockNotifications();
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockNotifications = async (): Promise<Notification[]> => {
    const mocks: Notification[] = [];
    
    try {
      // Check for unread messages
      const messagesResponse = await api.get('/messages');
      const unreadMessages = messagesResponse.data?.conversations?.filter((c: any) => c.unreadCount > 0) || [];
      
      if (unreadMessages.length > 0) {
        mocks.push({
          id: Date.now(),
          type: 'message',
          title: 'New Messages',
          message: `You have ${unreadMessages.length} unread message${unreadMessages.length > 1 ? 's' : ''}`,
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: '/messages'
        });
      }
    } catch (error) {
      console.warn('Could not fetch messages for notifications');
    }

    // Add system notification for profile completion
    const profileCompletion = localStorage.getItem('profile_completion');
    if (!profileCompletion || parseInt(profileCompletion) < 80) {
      mocks.push({
        id: Date.now() + 1,
        type: 'system',
        title: 'Complete Your Profile',
        message: 'Add more details to get better matches',
        read: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/profile'
      });
    }

    return mocks;
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    handleClose();
  };

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return <MessageIcon color="primary" />;
      case 'match':
        return <PersonIcon color="success" />;
      case 'response':
        return <CheckCircleIcon color="info" />;
      case 'event':
        return <EventIcon color="warning" />;
      case 'system':
        return <InfoIcon color="action" />;
      case 'reminder':
        return <NotificationsIcon color="secondary" />;
      default:
        return <NotificationsIcon />;
    }
  };

  const filterNotifications = () => {
    if (selectedTab === 0) return notifications;
    const typeMap = ['', 'message', 'match', 'event', 'system'];
    return notifications.filter(n => n.type === typeMap[selectedTab]);
  };

  const filteredNotifications = filterNotifications();

  if (!showButton) {
    return null;
  }

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ ml: 1 }}
        aria-label="notifications"
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 600 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Notifications</Typography>
          <Box>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
            <IconButton size="small" onClick={() => { handleClose(); navigate('/alert-preferences'); }}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="All" />
          <Tab label="Messages" />
          <Tab label="Matches" />
          <Tab label="Events" />
          <Tab label="System" />
        </Tabs>

        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">Loading notifications...</Typography>
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">No notifications</Typography>
              <Typography variant="body2" color="text.secondary">
                We'll notify you when something important happens
              </Typography>
            </Box>
          ) : (
            filteredNotifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected'
                    }
                  }}
                >
                  <ListItemIcon>
                    <Avatar
                      sx={{
                        bgcolor: notification.read ? 'action.selected' : 'primary.light',
                        width: 40,
                        height: 40
                      }}
                    >
                      {getIcon(notification.type)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={notification.read ? 'normal' : 'bold'}
                        >
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Chip label="New" size="small" color="primary" sx={{ height: 20 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {new Date(notification.createdAt).toLocaleDateString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          )}
        </List>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            variant="text"
            onClick={() => {
              handleClose();
              navigate('/alert-preferences');
            }}
          >
            Notification Settings
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationCenter;
