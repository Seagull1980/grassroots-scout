import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition component provides smooth fade-in animations when navigating between pages
 * Wraps page content and triggers animation on route changes
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'fadeIn' | 'visible'>('fadeIn');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeIn');
      setDisplayLocation(location);
    }
  }, [location, displayLocation]);

  useEffect(() => {
    if (transitionStage === 'fadeIn') {
      const timer = setTimeout(() => {
        setTransitionStage('visible');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [transitionStage]);

  return (
    <Box
      sx={{
        animation: transitionStage === 'fadeIn' ? 'fadeIn 0.3s ease-out' : 'none',
        '@keyframes fadeIn': {
          from: {
            opacity: 0,
            transform: 'translateY(10px)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
    >
      {children}
    </Box>
  );
};

export default PageTransition;
