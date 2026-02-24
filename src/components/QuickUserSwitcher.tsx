import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  FamilyRestroom as FamilyIcon,
  AdminPanelSettings as AdminIcon,
  StopCircle as StopIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface QuickUserSwitcherProps {
  /** Show as compact horizontal layout */
  compact?: boolean;
  /** Show title */
  showTitle?: boolean;
  /** Custom title */
  title?: string;
  /** Show on login page (even when not admin) */
  showForTesting?: boolean;
}

const QuickUserSwitcher = ({
  compact = false,
  showTitle = true,
  title = "Quick Test Modes",
  showForTesting = false,
}: QuickUserSwitcherProps) => {
  // Declare all hooks first
  const { user, impersonateUser, stopImpersonation, isImpersonating } = useAuth();

  // Hide if not admin (unless showForTesting is true)
  if (!showForTesting && (!user || (user.role !== 'Admin' && !isImpersonating))) {
    return null;
  }

  const userTypes = [
    {
      type: 'Coach' as const,
      label: 'Coach',
      icon: <SchoolIcon />,
      color: '#6366F1',
      description: 'Team management',
    },
    {
      type: 'Player' as const,
      label: 'Player',
      icon: <PersonIcon />,
      color: '#8B5CF6',
      description: 'Player profile',
    },
    {
      type: 'Parent/Guardian' as const,
      label: 'Parent',
      icon: <FamilyIcon />,
      color: '#64748B',
      description: 'Child management',
    },
  ];

  const handleUserTypeSwitch = (userType: 'Coach' | 'Player' | 'Parent/Guardian') => {
    console.log('🔄 QuickUserSwitcher: handleUserTypeSwitch called with:', userType);
    console.log('👤 Current user in QuickUserSwitcher:', user);
    console.log('🔐 Is impersonating in QuickUserSwitcher:', isImpersonating);
    
    try {
      impersonateUser(userType);
      console.log('✅ QuickUserSwitcher: impersonateUser called successfully');
    } catch (error) {
      console.error('❌ QuickUserSwitcher: Error calling impersonateUser:', error);
    }
  };

  const handleStopImpersonation = () => {
    console.log('🔄 QuickUserSwitcher: handleStopImpersonation called');
    
    try {
      stopImpersonation();
      console.log('✅ QuickUserSwitcher: stopImpersonation called successfully');
    } catch (error) {
      console.error('❌ QuickUserSwitcher: Error calling stopImpersonation:', error);
    }
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: { xs: 2, sm: 3 }, 
        mt: 2, 
        borderRadius: 2,
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
      }}
    >
      {showTitle && (
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <AdminIcon />
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isImpersonating ? `Currently testing as ${user?.role}` : 'Switch user types for testing'}
          </Typography>
        </Box>
      )}

      {/* Current Status */}
      {isImpersonating && (
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Chip
            label={`Testing as ${user?.role}`}
            color="secondary"
            size="small"
            sx={{ fontWeight: 500 }}
          />
        </Box>
      )}

      {/* User Type Buttons */}
      <Grid container spacing={compact ? 1 : 2}>
        {userTypes.filter(Boolean).map((userType, index) => (
          <Grid item xs={compact ? 4 : 12} sm={compact ? 4 : 6} md={compact ? 4 : 4} key={userType?.type || index}>
            <Button
              variant={isImpersonating && user?.role === userType.type ? "contained" : "outlined"}
              fullWidth
              onClick={() => handleUserTypeSwitch(userType.type)}
              disabled={isImpersonating && user?.role === userType.type}
              startIcon={userType.icon}
              sx={{
                py: compact ? 1 : 1.5,
                px: 1,
                borderColor: userType.color,
                color: isImpersonating && user?.role === userType.type ? 'white' : userType.color,
                bgcolor: isImpersonating && user?.role === userType.type ? userType.color : 'transparent',
                '&:hover': {
                  bgcolor: isImpersonating && user?.role === userType.type 
                    ? userType.color 
                    : `${userType.color}10`,
                  borderColor: userType.color,
                },
                '&:disabled': {
                  bgcolor: userType.color,
                  color: 'white',
                },
                flexDirection: compact ? 'column' : 'row',
                gap: compact ? 0.5 : 1,
                minHeight: compact ? 80 : 48,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: compact ? 'column' : 'row', alignItems: 'center', gap: compact ? 0.5 : 1 }}>
                <Typography variant={compact ? "caption" : "button"} sx={{ fontWeight: 600 }}>
                  {userType?.label || 'Unknown'}
                </Typography>
                {!compact && (
                  <Typography variant="caption" color="inherit" sx={{ opacity: 0.8 }}>
                    {userType.description}
                  </Typography>
                )}
              </Box>
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Return to Admin Button */}
      {isImpersonating && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleStopImpersonation}
            startIcon={<StopIcon />}
            size="small"
            sx={{ fontWeight: 600 }}
          >
            Return to Admin
          </Button>
        </Box>
      )}

      {/* Help Text for Login Page */}
      {showForTesting && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            mt: 2, 
            display: 'block', 
            textAlign: 'center',
            fontStyle: 'italic' 
          }}
        >
          💡 Admin feature: Test the app as different user types
        </Typography>
      )}
    </Paper>
  );
};

export default QuickUserSwitcher;
