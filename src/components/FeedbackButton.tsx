import React, { useState } from 'react';
import { Fab, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Feedback, BugReport, Lightbulb } from '@mui/icons-material';
import FeedbackDialog from './FeedbackDialog';
import { useAuth } from '../contexts/AuthContext';

const FeedbackButton: React.FC = () => {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'improvement'>('bug');

  if (!user) return null; // Don't show for logged out users

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenDialog = (type: 'bug' | 'improvement') => {
    setFeedbackType(type);
    setDialogOpen(true);
    handleClose();
  };

  return (
    <>
      <Tooltip title="Send Feedback" placement="left">
        <Fab
          color="secondary"
          aria-label="feedback"
          onClick={handleClick}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            zIndex: 1000,
          }}
        >
          <Feedback />
        </Fab>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => handleOpenDialog('bug')}>
          <ListItemIcon>
            <BugReport color="error" />
          </ListItemIcon>
          <ListItemText primary="Report a Bug" />
        </MenuItem>
        <MenuItem onClick={() => handleOpenDialog('improvement')}>
          <ListItemIcon>
            <Lightbulb color="primary" />
          </ListItemIcon>
          <ListItemText primary="Suggest Improvement" />
        </MenuItem>
      </Menu>

      <FeedbackDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        defaultType={feedbackType}
      />
    </>
  );
};

export default FeedbackButton;
