import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0066FF', // Modern vibrant blue
      light: '#3399FF',
      dark: '#0052CC',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF6B35', // Energetic orange for CTAs
      light: '#FF8C5A',
      dark: '#E55A24',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#10B981', // Modern teal-green
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B', // Warm amber
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444', // Clean red
      light: '#F87171',
      dark: '#DC2626',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '3.5rem',
      letterSpacing: '-0.03em',
      lineHeight: 1.15,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
      lineHeight: 1.25,
    },
    h3: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.015em',
      lineHeight: 1.35,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.8,
      letterSpacing: '0.01em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.7,
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 16,
          padding: '14px 28px',
          fontSize: '0.95rem',
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        },
        containedPrimary: {
          backgroundColor: '#0066FF',
          '&:hover': {
            backgroundColor: '#0052CC',
            boxShadow: '0 8px 24px rgba(0, 102, 255, 0.3)',
          },
          '&:active': {
            boxShadow: '0 4px 12px rgba(0, 102, 255, 0.2)',
            transform: 'translateY(0)',
          },
        },
        containedSecondary: {
          backgroundColor: '#FF6B35',
          '&:hover': {
            backgroundColor: '#E55A24',
            boxShadow: '0 8px 24px rgba(255, 107, 53, 0.3)',
          },
          '&:active': {
            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.2)',
            transform: 'translateY(0)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: 'rgba(0, 102, 255, 0.04)',
          },
        },
        sizeLarge: {
          padding: '16px 32px',
          fontSize: '1rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 102, 255, 0.08)',
          padding: '24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            border: '1px solid rgba(0, 102, 255, 0.15)',
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '0 !important',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 102, 255, 0.06)',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
        elevation3: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 14,
            backgroundColor: '#F3F4F6',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: '#E5E7EB',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0066FF',
              },
            },
            '&.Mui-focused': {
              backgroundColor: '#FFFFFF',
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
                borderColor: '#0066FF',
              },
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '4px 8px',
          height: 'auto',
        },
        colorPrimary: {
          backgroundColor: 'rgba(0, 102, 255, 0.1)',
          color: '#0066FF',
        },
        colorSecondary: {
          backgroundColor: 'rgba(255, 107, 53, 0.1)',
          color: '#FF6B35',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#FFFFFF',
          color: '#111827',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          padding: '8px',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        },
      },
    },
  },
});

export default theme;
