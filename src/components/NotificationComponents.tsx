import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  Avatar,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Circle as CircleIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
// Simple date formatting utility
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const NotificationBell: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    isConnected, 
    connectionStatus,
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useNotifications();
  
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.action?.type === 'NAVIGATE' && notification.action.url) {
      navigate(notification.action.url);
    }
    handleClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_TEAM_VACANCY':
        return '⚽';
      case 'PLAYER_INTEREST':
        return '👋';
      case 'MATCH_COMPLETION':
        return '🏆';
      case 'TRIAL_INVITATION':
        return '🎯';
      case 'WELCOME':
        return '👋';
      default:
        return '📢';
    }
  };

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return { color: 'success', tooltip: 'Connected to notifications' };
      case 'connecting':
        return { color: 'warning', tooltip: 'Connecting to notifications...' };
      case 'disconnected':
        return { color: 'error', tooltip: 'Disconnected from notifications' };
      case 'error':
        return { color: 'error', tooltip: 'Notification connection error' };
      default:
        return { color: 'default', tooltip: 'Unknown connection status' };
    }
  };

  const status = getConnectionStatus();

  return (
    <>
      <Tooltip title={status.tooltip}>
        <IconButton
          onClick={handleClick}
          size="large"
          aria-label={`${unreadCount} unread notifications`}
          color="inherit"
        >
          <Badge badgeContent={unreadCount} color="error">
            {isConnected ? <NotificationsIcon /> : <NotificationsOffIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 500,
            overflow: 'hidden'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Notifications
            </Typography>
            <Box display="flex" gap={1}>
              <Chip
                size="small"
                icon={<CircleIcon />}
                label={connectionStatus}
                color={status.color as any}
                variant="outlined"
              />
              {notifications.length > 0 && (
                <Tooltip title="Clear all notifications">
                  <IconButton size="small" onClick={clearNotifications}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={markAllAsRead}
              sx={{ mt: 1 }}
            >
              Mark all as read
            </Button>
          )}
        </Box>

        {/* Connection Status Alert */}
        {!isConnected && (
          <Box sx={{ p: 1 }}>
            <Alert 
              severity="warning" 
              action={
                <IconButton size="small" color="inherit">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              }
            >
              Notifications {connectionStatus}
            </Alert>
          </Box>
        )}

        {/* Notifications List */}
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <MenuItem
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    alignItems: 'flex-start',
                    py: 2,
                    backgroundColor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected'
                    }
                  }}
                >
                  <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: '1rem',
                        bgcolor: notification.read ? 'grey.300' : 'primary.main'
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box component="span" display="flex" justifyContent="space-between" alignItems="center">
                        <Typography component="span" variant="subtitle2" noWrap>
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <CircleIcon sx={{ fontSize: 8, color: 'primary.main', ml: 1 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span">
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          {notification.message}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(notification.timestamp))}
                        </Typography>
                      </Box>
                    }
                  />
                </MenuItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1 }}>
              <Button
                fullWidth
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => {
                  navigate('/alert-preferences');
                  handleClose();
                }}
              >
                Notification Settings
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

// In-app notification toast
export const NotificationToast: React.FC<{
  notification: any;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  return (
    <Alert
      severity="info"
      onClose={onClose}
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 2000,
        minWidth: 300,
        maxWidth: 400
      }}
    >
      <Typography variant="subtitle2">
        {notification.title}
      </Typography>
      <Typography variant="body2">
        {notification.message}
      </Typography>
    </Alert>
  );
};