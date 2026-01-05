import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Snackbar,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import {
  Info as InfoIcon,
  Warning as WarningIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { storage } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const StorageNotification: React.FC = () => {
  // Declare all hooks first
  const { storageWarning } = useAuth();
  const [showNotification, setShowNotification] = useState(false);
  const [storageType, setStorageType] = useState<'localStorage' | 'sessionStorage' | 'fallback'>('localStorage');

  useEffect(() => {
    // Check storage type and show notification if using fallback or sessionStorage
    const currentStorageType = storage.getStorageType();
    setStorageType(currentStorageType);
    
    if (currentStorageType === 'fallback' || currentStorageType === 'sessionStorage') {
      setShowNotification(true);
    }
  }, [storageWarning]);

  // Don't show if localStorage is available and working
  if (storageType === 'localStorage' && !storageWarning) {
    return null;
  }

  const handleClose = () => {
    setShowNotification(false);
  };

  const getSeverity = () => {
    switch (storageType) {
      case 'fallback':
        return 'error';
      case 'sessionStorage':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getIcon = () => {
    switch (storageType) {
      case 'fallback':
        return <WarningIcon />;
      case 'sessionStorage':
        return <WarningIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getTitle = () => {
    switch (storageType) {
      case 'fallback':
        return 'Storage Blocked';
      case 'sessionStorage':
        return 'Limited Storage';
      default:
        return 'Storage Info';
    }
  };

  const getMessage = () => {
    return storageWarning || 'Using alternative storage method due to browser restrictions.';
  };

  return (
    <Snackbar
      open={showNotification}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: 8 }}
    >
      <Alert
        severity={getSeverity()}
        icon={getIcon()}
        action={
          <IconButton
            color="inherit"
            size="small"
            onClick={handleClose}
            aria-label="close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        sx={{ minWidth: 320, maxWidth: 600 }}
      >
        <AlertTitle>{getTitle()}</AlertTitle>
        <Typography variant="body2">
          {getMessage()}
        </Typography>
        {storageType === 'fallback' && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" display="block">
              Tip: Try refreshing the page or disable tracking prevention for this site.
            </Typography>
          </Box>
        )}
      </Alert>
    </Snackbar>
  );
};

export default StorageNotification;
