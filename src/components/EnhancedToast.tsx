import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  IconButton,
  Box,
  Typography,
  Slide,
  SlideProps,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface EnhancedToastProps {
  message: ToastMessage | null;
  onClose: () => void;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

/**
 * Enhanced Toast Notification Component
 * 
 * Features:
 * - Beautiful animations and smooth transitions
 * - Icon-based visual feedback for different types
 * - Auto-dismiss with configurable duration
 * - Manual dismiss with close button
 * - Stacks multiple toasts vertically
 * 
 * Usage:
 * const [toast, setToast] = useState<ToastMessage | null>(null);
 * 
 * const showToast = (type: ToastType, message: string, title?: string) => {
 *   setToast({
 *     id: Date.now().toString(),
 *     type,
 *     title,
 *     message,
 *     duration: 5000,
 *   });
 * };
 * 
 * <EnhancedToast message={toast} onClose={() => setToast(null)} />
 */
const EnhancedToast: React.FC<EnhancedToastProps> = ({ message, onClose }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (message) {
      setOpen(true);
    }
  }, [message]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  if (!message) return null;

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <SuccessIcon sx={{ fontSize: 24 }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 24 }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 24 }} />;
      case 'info':
        return <InfoIcon sx={{ fontSize: 24 }} />;
      default:
        return <InfoIcon sx={{ fontSize: 24 }} />;
    }
  };

  const getColor = () => {
    switch (message.type) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.12)', border: '#10B981', text: '#059669' };
      case 'error':
        return { bg: 'rgba(239, 68, 68, 0.12)', border: '#EF4444', text: '#DC2626' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.12)', border: '#F59E0B', text: '#D97706' };
      case 'info':
        return { bg: 'rgba(0, 102, 255, 0.12)', border: '#0066FF', text: '#0052CC' };
      default:
        return { bg: 'rgba(0, 102, 255, 0.12)', border: '#0066FF', text: '#0052CC' };
    }
  };

  const colors = getColor();

  return (
    <Snackbar
      open={open}
      autoHideDuration={message.duration || 5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      TransitionComponent={SlideTransition}
      sx={{
        top: { xs: 70, sm: 80 },
        '& .MuiSnackbarContent-root': {
          padding: 0,
        },
      }}
    >
      <Alert
        severity={message.type}
        icon={false}
        sx={{
          width: '100%',
          minWidth: { xs: '90vw', sm: 400 },
          maxWidth: 500,
          bgcolor: '#FFFFFF',
          border: `2px solid ${colors.border}`,
          borderRadius: 3,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          padding: 2,
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideInScale 0.3s ease-out',
          '@keyframes slideInScale': {
            from: {
              opacity: 0,
              transform: 'translateY(-20px) scale(0.95)',
            },
            to: {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
            },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            bgcolor: colors.border,
            borderRadius: '3px 0 0 3px',
          },
        }}
        action={
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, pl: 1 }}>
          <Box sx={{ color: colors.border, mt: 0.25, flexShrink: 0 }}>
            {getIcon()}
          </Box>
          <Box sx={{ flex: 1 }}>
            {message.title && (
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: colors.text,
                  mb: message.message ? 0.5 : 0,
                }}
              >
                {message.title}
              </Typography>
            )}
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.6,
              }}
            >
              {message.message}
            </Typography>
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default EnhancedToast;

// Export hook for easy usage
export const useToast = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (
    type: ToastType,
    message: string,
    title?: string,
    duration?: number
  ) => {
    setToast({
      id: Date.now().toString(),
      type,
      title,
      message,
      duration: duration || 5000,
    });
  };

  const showSuccess = (message: string, title?: string) => {
    showToast('success', message, title || 'Success');
  };

  const showError = (message: string, title?: string) => {
    showToast('error', message, title || 'Error');
  };

  const showWarning = (message: string, title?: string) => {
    showToast('warning', message, title || 'Warning');
  };

  const showInfo = (message: string, title?: string) => {
    showToast('info', message, title);
  };

  const closeToast = () => {
    setToast(null);
  };

  return {
    toast,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeToast,
  };
};
