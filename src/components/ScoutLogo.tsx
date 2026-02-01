import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Search, Visibility, TrendingUp } from '@mui/icons-material';

interface ScoutLogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'icon' | 'text' | 'svg';
  showTagline?: boolean;
}

const ScoutLogo: React.FC<ScoutLogoProps> = ({ 
  size = 'medium', 
  variant = 'full',
  showTagline = false 
}) => {
  const theme = useTheme();
  
  const dimensions = {
    small: { logo: 32, icon: 16, text: '1rem' },
    medium: { logo: 50, icon: 24, text: '1.25rem' },
    large: { logo: 80, icon: 32, text: '1.5rem' }
  };
  
  const currentSize = dimensions[size];

  if (variant === 'svg') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          component="img"
          src="/scout-logo.svg"
          alt="The Grassroots Scout Logo"
          sx={{
            width: currentSize.logo,
            height: currentSize.logo,
            cursor: 'pointer',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
        />
        {variant === 'svg' && (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: currentSize.text,
                lineHeight: 1.2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: '"Inter", "Roboto", sans-serif'
              }}
            >
              The Grassroots Scout
            </Typography>
            
            {showTagline && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: size === 'large' ? '0.85rem' : '0.75rem',
                  color: theme.palette.text.secondary,
                  fontWeight: 500,
                  letterSpacing: 0.5,
                  mt: -0.5
                }}
              >
                Discover. Connect. Develop
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  }

  if (variant === 'icon') {
    return (
      <Box
        sx={{
          position: 'relative',
          width: currentSize.logo,
          height: currentSize.logo,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '2px solid rgba(255,255,255,0.2)'
        }}
      >
        <Search 
          sx={{ 
            color: 'white', 
            fontSize: currentSize.icon,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} 
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 12,
            height: 12,
            bgcolor: theme.palette.success.main,
            borderRadius: '50%',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Visibility sx={{ fontSize: 8, color: 'white' }} />
        </Box>
      </Box>
    );
  }

  if (variant === 'text') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: currentSize.text,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: '"Inter", "Roboto", sans-serif'
          }}
        >
          The Grassroots Scout
        </Typography>
      </Box>
    );
  }

  // Full variant with icon + text
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {/* Scout Icon */}
      <Box
        sx={{
          position: 'relative',
          width: currentSize.logo,
          height: currentSize.logo,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '2px solid rgba(255,255,255,0.2)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.05)'
          }
        }}
      >
        <Search 
          sx={{ 
            color: 'white', 
            fontSize: currentSize.icon,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} 
        />
        
        {/* Scout indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            width: 16,
            height: 16,
            bgcolor: theme.palette.success.main,
            borderRadius: '50%',
            border: '3px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }}
        >
          <TrendingUp sx={{ fontSize: 10, color: 'white' }} />
        </Box>
      </Box>

      {/* Text */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: currentSize.text,
            lineHeight: 1.2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: '"Inter", "Roboto", sans-serif'
          }}
        >
          The Grassroots Scout
        </Typography>
        
        {showTagline && (
          <Typography
            variant="caption"
            sx={{
              fontSize: size === 'large' ? '0.85rem' : '0.75rem',
              color: theme.palette.text.secondary,
              fontWeight: 500,
              letterSpacing: 0.5,
              mt: -0.5
            }}
          >
            Discover. Connect. Develop
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ScoutLogo;
