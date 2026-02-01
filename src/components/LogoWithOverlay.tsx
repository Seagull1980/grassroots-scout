import React from 'react';
import { Box, Typography } from '@mui/material';

interface LogoWithOverlayProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  onClick?: () => void;
  sx?: any;
}

const LogoWithOverlay: React.FC<LogoWithOverlayProps> = ({ 
  size = 'medium', 
  showTagline = false, 
  onClick,
  sx = {} 
}) => {
  const getSizes = () => {
    switch (size) {
      case 'small':
        return {
          logoSize: 50,
          overlayFontSize: '0.6rem',
          taglineSize: '0.65rem'
        };
      case 'large':
        return {
          logoSize: 120,
          overlayFontSize: '1.2rem',
          taglineSize: '1rem'
        };
      default: // medium
        return {
          logoSize: 80,
          overlayFontSize: '0.8rem',
          taglineSize: '0.8rem'
        };
    }
  };

  const sizes = getSizes();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        ...sx 
      }}
      onClick={onClick}
    >
      {/* Logo with Overlay */}
      <Box
        sx={{
          position: 'relative',
          display: 'inline-block',
          mb: showTagline ? 1 : 0
        }}
      >
        <Box
          component="img"
          src="/logo.jpg"
          alt="The Grassroots Scout Logo"
          sx={{
            height: sizes.logoSize,
            width: sizes.logoSize,
            borderRadius: '16px',
            objectFit: 'cover',
            border: '3px solid rgba(30, 58, 138, 0.2)',
            boxShadow: '0 8px 32px rgba(30, 58, 138, 0.15)',
          }}
        />
        
        {/* Overlay to cover "Hub" and show "Scout" */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '8px', // Adjust this based on where "Hub" appears in your logo
            right: '8px',  // Adjust this based on where "Hub" appears in your logo
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(30, 58, 138, 0.3)'
          }}
        >
          <Typography
            sx={{
              fontSize: sizes.overlayFontSize,
              fontWeight: 700,
              color: '#1e3a8a',
              lineHeight: 1
            }}
          >
            Scout
          </Typography>
        </Box>
      </Box>

      {/* Tagline */}
      {showTagline && (
        <Typography
          variant="caption"
          component="div"
          sx={{ 
            fontSize: sizes.taglineSize,
            opacity: 0.8,
            fontStyle: 'italic',
            color: '#1e3a8a',
            textAlign: 'center',
            fontWeight: 500
          }}
        >
          Discover. Connect. Develop
        </Typography>
      )}
    </Box>
  );
};

export default LogoWithOverlay;
