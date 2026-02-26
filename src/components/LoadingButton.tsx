import React from 'react';
import {
  Button,
  ButtonProps,
  CircularProgress,
  Box,
} from '@mui/material';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  originalText?: string;
}

/**
 * Enhanced Button component with built-in loading state
 * Shows a spinner and disables the button while loading
 * 
 * Usage:
 * <LoadingButton
 *   loading={isLoading}
 *   originalText="Submit"
 *   loadingText="Submitting..."
 *   onClick={handleSubmit}
 *   variant="contained"
 * >
 *   Submit
 * </LoadingButton>
 */
const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  originalText,
  disabled = false,
  children,
  onClick,
  ...props
}) => {
  const isDisabled = loading || disabled;

  return (
    <Button
      {...props}
      disabled={isDisabled}
      onClick={onClick}
      sx={{
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDisabled ? 0.9 : 1,
        ...props.sx,
      }}
    >
      {loading && (
        <CircularProgress
          size={20}
          sx={{
            position: 'absolute',
            left: '50%',
            marginLeft: '-10px',
          }}
        />
      )}
      <Box
        sx={{
          visibility: loading ? 'hidden' : 'visible',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </Box>
      {loading && loadingText && (
        <Box
          sx={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {loadingText}
        </Box>
      )}
    </Button>
  );
};

export default LoadingButton;
