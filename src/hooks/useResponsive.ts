import { useMediaQuery, useTheme } from '@mui/material';

export const useResponsive = () => {
  const theme = useTheme();
  
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.down('md')); // < 900px
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg')); // >= 1200px
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('lg')); // < 1200px
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    // Screen size helpers
    screenSize: {
      xs: useMediaQuery(theme.breakpoints.only('xs')), // 0-600px
      sm: useMediaQuery(theme.breakpoints.only('sm')), // 600-900px
      md: useMediaQuery(theme.breakpoints.only('md')), // 900-1200px
      lg: useMediaQuery(theme.breakpoints.only('lg')), // 1200-1536px
      xl: useMediaQuery(theme.breakpoints.only('xl')), // 1536px+
    },
    // Responsive values helper
    getResponsiveValue: <T>(values: {
      xs?: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
    }) => {
      if (useMediaQuery(theme.breakpoints.only('xl')) && values.xl !== undefined) return values.xl;
      if (useMediaQuery(theme.breakpoints.only('lg')) && values.lg !== undefined) return values.lg;
      if (useMediaQuery(theme.breakpoints.only('md')) && values.md !== undefined) return values.md;
      if (useMediaQuery(theme.breakpoints.only('sm')) && values.sm !== undefined) return values.sm;
      if (useMediaQuery(theme.breakpoints.only('xs')) && values.xs !== undefined) return values.xs;
      
      // Fallback logic
      return values.lg || values.md || values.sm || values.xs;
    }
  };
};

// Responsive spacing helper
export const useResponsiveSpacing = () => {
  const { isMobile, isTablet } = useResponsive();
  
  return {
    containerSpacing: isMobile ? 1 : isTablet ? 2 : 3,
    sectionSpacing: isMobile ? 2 : isTablet ? 3 : 4,
    cardSpacing: isMobile ? 1 : 2,
    buttonSize: isMobile ? 'large' : 'medium',
    iconSize: isMobile ? 'medium' : 'large',
    formSpacing: isMobile ? 1 : 2,
  };
};

// Common responsive props
export const getResponsiveGridProps = (isMobile: boolean, isTablet: boolean) => ({
  xs: 12,
  sm: isMobile ? 12 : 6,
  md: isTablet ? 6 : 4,
  lg: 3
});

export const getResponsiveCardProps = (isMobile: boolean) => ({
  sx: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    p: isMobile ? 2 : 3,
    mb: isMobile ? 2 : 0
  }
});

export const getResponsiveButtonProps = (isMobile: boolean) => ({
  size: isMobile ? 'large' : 'medium',
  fullWidth: isMobile,
  sx: {
    py: isMobile ? 1.5 : 1,
    fontSize: isMobile ? '1rem' : '0.875rem'
  }
});