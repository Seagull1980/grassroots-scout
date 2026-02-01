import React from 'react';
import { Box, Typography } from '@mui/material';

interface TextLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  onClick?: () => void;
  sx?: any;
}

const TextLogo: React.FC<TextLogoProps> = ({ 
  size = 'medium', 
  showTagline = false, 
  onClick,
  sx = {} 
}) => {
  const getSizes = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '1.1rem',
          taglineSize: '0.65rem',
          spacing: 0.5
        };
      case 'large':
        return {
          fontSize: '2.5rem',
          taglineSize: '1rem',
          spacing: 1
        };
      default: // medium
        return {
          fontSize: '1.5rem',
          taglineSize: '0.8rem',
          spacing: 0.75
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
      {/* Main Logo Text - Single Line Style */}
      <Typography
        variant="h1"
        component="div"
        sx={{ 
          fontWeight: 700,
          fontSize: sizes.fontSize,
          lineHeight: 1.2,
          textAlign: 'center',
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          letterSpacing: '-0.01em',
          color: '#1e3a8a'
        }}
      >
        The Grassroots{' '}
        <Box 
          component="span"
          sx={{ 
            fontWeight: 900,
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Scout
        </Box>
      </Typography>

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
            mt: sizes.spacing,
            fontWeight: 500
          }}
        >
          Discover. Connect. Develop
        </Typography>
      )}
    </Box>
  );
};

export default TextLogo;
