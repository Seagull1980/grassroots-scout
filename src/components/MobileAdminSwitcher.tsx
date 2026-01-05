import React, { useState } from 'react';
import {
  Fab,
  Drawer,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Alert,
  IconButton,
  useMediaQuery,
  Chip,
  Divider,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  FamilyRestroom as FamilyIcon,
  StopCircle as StopIcon,
  Close as CloseIcon,
  SwapHoriz as SwapIcon,
  Settings as SettingsIcon,
  TouchApp as TouchIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';

interface MobileAdminSwitcherProps {
  /** Position of the FAB button */
  position?: {
    bottom?: number;
    top?: number;
    left?: number;
    right?: number;
  };
  /** Show only on mobile devices */
  mobileOnly?: boolean;
  /** Use SpeedDial for quick access */
  useSpeedDial?: boolean;
  /** Show on login page */
  showOnLoginPage?: boolean;
}

const MobileAdminSwitcher: React.FC<MobileAdminSwitcherProps> = ({
  position = { bottom: 80, right: 16 },
  mobileOnly = true,
  useSpeedDial = true,
  showOnLoginPage = false,
}) => {
  // Declare all hooks first
  const theme = useTheme();
  const { user, impersonateUser, stopImpersonation, isImpersonating } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Hide on desktop if mobileOnly is true
  if (mobileOnly && !isMobile) {
    return null;
  }

  // Hide if not admin (unless on login page and showOnLoginPage is true)
  if (!user || (user.role !== 'Admin' && !isImpersonating)) {
    if (!showOnLoginPage) {
      return null;
    }
  }

  const userTypes = [
    {
      type: 'Coach' as const,
      label: 'Coach',
      icon: <SchoolIcon />,
      description: 'Test team management and player recruitment features',
      color: 'primary' as const,
    },
    {
      type: 'Player' as const,
      label: 'Player',
      icon: <PersonIcon />,
      description: 'Test player profile and team search features',
      color: 'secondary' as const,
    },
    {
      type: 'Parent/Guardian' as const,
      label: 'Parent',
      icon: <FamilyIcon />,
      description: 'Test parent features for managing children',
      color: 'success' as const,
    },
  ];

  const handleUserTypeSwitch = (userType: 'Coach' | 'Player' | 'Parent/Guardian') => {
    impersonateUser(userType);
    setDrawerOpen(false);
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    setDrawerOpen(false);
  };

  const getCurrentUserTypeInfo = () => {
    if (!isImpersonating) return { label: 'Admin', color: 'warning' };
    
    const userTypeInfo = userTypes.find(ut => ut.type === user?.role);
    return userTypeInfo ? { label: userTypeInfo.label, color: userTypeInfo.color } : { label: user?.role || 'Unknown', color: 'default' };
  };

  const currentUserType = getCurrentUserTypeInfo();

  // SpeedDial actions for quick user switching
  const speedDialActions = [
    {
      icon: <SchoolIcon />,
      name: 'Test as Coach',
      onClick: () => handleUserTypeSwitch('Coach'),
      disabled: isImpersonating && user?.role === 'Coach',
    },
    {
      icon: <PersonIcon />,
      name: 'Test as Player',
      onClick: () => handleUserTypeSwitch('Player'),
      disabled: isImpersonating && user?.role === 'Player',
    },
    {
      icon: <FamilyIcon />,
      name: 'Test as Parent',
      onClick: () => handleUserTypeSwitch('Parent/Guardian'),
      disabled: isImpersonating && user?.role === 'Parent/Guardian',
    },
    ...(isImpersonating ? [{
      icon: <StopIcon />,
      name: 'Return to Admin',
      onClick: handleStopImpersonation,
      disabled: false,
    }] : []),
  ];

  // Render SpeedDial version for enhanced mobile experience
  if (useSpeedDial && isMobile) {
    return (
      <>
        <SpeedDial
          ariaLabel="Admin User Switcher"
          sx={{
            position: 'fixed',
            ...position,
            zIndex: 1000,
          }}
          icon={
            <Badge
              color="secondary"
              variant="dot"
              invisible={!isImpersonating}
            >
              <SpeedDialIcon
                icon={isImpersonating ? <SwapIcon /> : <AdminIcon />}
                openIcon={<SettingsIcon />}
              />
            </Badge>
          }
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
          open={speedDialOpen}
          direction="up"
          FabProps={{
            color: isImpersonating ? 'secondary' : 'primary',
            size: 'medium',
          }}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.onClick}
              FabProps={{
                disabled: action.disabled,
                size: 'small',
                color: action.disabled ? 'default' : 'primary',
              }}
            />
          ))}
          
          {/* Additional action to open full drawer */}
          <SpeedDialAction
            icon={<TouchIcon />}
            tooltipTitle="More Options"
            onClick={() => {
              setSpeedDialOpen(false);
              setDrawerOpen(true);
            }}
            FabProps={{
              size: 'small',
            }}
          />
        </SpeedDial>

        {/* Keep the drawer for additional features */}
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '85vh',
            },
          }}
        >
          <Box sx={{ p: 3, minHeight: 200 }}>
            {/* Enhanced Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AdminIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                    Admin Testing Panel
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Switch user types instantly
                  </Typography>
                </Box>
              </Box>
              <IconButton 
                onClick={() => setDrawerOpen(false)} 
                size="small"
                sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Current Status with enhanced styling */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                Current Testing Mode:
              </Typography>
              <Chip
                label={`${currentUserType.label} View`}
                color={currentUserType.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                icon={isImpersonating ? <SwapIcon /> : <AdminIcon />}
                sx={{ mb: 2, fontWeight: 500 }}
                size="medium"
              />
              {isImpersonating && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    You're testing as a <strong>{user?.role}</strong>. All features behave as if you're that user type.
                  </Typography>
                </Alert>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Enhanced User Type Options */}
            <Typography variant="subtitle1" color="text.primary" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Switch User Type:
            </Typography>
            
            <List dense sx={{ mb: 2 }}>
              {userTypes.map((userType) => (
                <ListItem key={userType.type} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleUserTypeSwitch(userType.type)}
                    disabled={isImpersonating && user?.role === userType.type}
                    sx={{
                      borderRadius: 2,
                      p: 2,
                      bgcolor: (isImpersonating && user?.role === userType.type) 
                        ? 'primary.50' 
                        : 'transparent',
                      border: '1px solid',
                      borderColor: (isImpersonating && user?.role === userType.type)
                        ? 'primary.200'
                        : 'grey.200',
                      '&:hover': {
                        bgcolor: 'grey.50',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 48 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: `${userType.color}.100`,
                          color: `${userType.color}.600`,
                        }}
                      >
                        {userType.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {userType.label}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {userType.description}
                        </Typography>
                      }
                    />
                    {isImpersonating && user?.role === userType.type && (
                      <Chip 
                        size="small" 
                        label="Active" 
                        color={userType.color}
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            {/* Enhanced Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: 'column' }}>
              {isImpersonating && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleStopImpersonation}
                  startIcon={<StopIcon />}
                  fullWidth
                  sx={{ py: 1.5, fontWeight: 600 }}
                >
                  Return to Admin Mode
                </Button>
              )}
              
              <Button
                variant="outlined"
                onClick={() => setDrawerOpen(false)}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Close Panel
              </Button>
            </Box>

            {/* Enhanced Help Text */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
              <Typography variant="caption" color="info.600" sx={{ display: 'block', textAlign: 'center', fontWeight: 500 }}>
                💡 Tip: Use the floating menu for quick user switching, or this panel for detailed testing options
              </Typography>
            </Box>
          </Box>
        </Drawer>
      </>
    );
  }

  // Fallback to enhanced FAB version
  return (
    <>
      {/* Enhanced Floating Action Button */}
      <Tooltip 
        title={isImpersonating ? `Testing as ${user?.role}` : "Admin Testing Panel"}
        placement="left"
      >
        <Badge
          color="secondary"
          variant="dot"
          invisible={!isImpersonating}
        >
          <Fab
            color={isImpersonating ? "secondary" : "primary"}
            aria-label="admin switcher"
            onClick={() => setDrawerOpen(true)}
            sx={{
              position: 'fixed',
              ...position,
              zIndex: 1000,
              bgcolor: isImpersonating ? 'secondary.main' : 'primary.main',
              '&:hover': {
                bgcolor: isImpersonating ? 'secondary.dark' : 'primary.dark',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease-in-out',
              boxShadow: 3,
            }}
            size="medium"
          >
            {isImpersonating ? <SwapIcon /> : <AdminIcon />}
          </Fab>
        </Badge>
      </Tooltip>

      {/* Enhanced Admin Switcher Drawer - Same as above */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '85vh',
          },
        }}
      >
        <Box sx={{ p: 3, minHeight: 200 }}>
          {/* Same enhanced content as SpeedDial version */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AdminIcon color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  Admin Testing Panel
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Switch user types instantly
                </Typography>
              </Box>
            </Box>
            <IconButton 
              onClick={() => setDrawerOpen(false)} 
              size="small"
              sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Current Status */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
              Current Testing Mode:
            </Typography>
            <Chip
              label={`${currentUserType.label} View`}
              color={currentUserType.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
              icon={isImpersonating ? <SwapIcon /> : <AdminIcon />}
              sx={{ mb: 2, fontWeight: 500 }}
              size="medium"
            />
            {isImpersonating && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  You're testing as a <strong>{user?.role}</strong>. All features behave as if you're that user type.
                </Typography>
              </Alert>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* User Type Options */}
          <Typography variant="subtitle1" color="text.primary" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Switch User Type:
          </Typography>
          
          <List dense sx={{ mb: 2 }}>
            {userTypes.map((userType) => (
              <ListItem key={userType.type} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => handleUserTypeSwitch(userType.type)}
                  disabled={isImpersonating && user?.role === userType.type}
                  sx={{
                    borderRadius: 2,
                    p: 2,
                    bgcolor: (isImpersonating && user?.role === userType.type) 
                      ? 'primary.50' 
                      : 'transparent',
                    border: '1px solid',
                    borderColor: (isImpersonating && user?.role === userType.type)
                      ? 'primary.200'
                      : 'grey.200',
                    '&:hover': {
                      bgcolor: 'grey.50',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: `${userType.color}.100`,
                        color: `${userType.color}.600`,
                      }}
                    >
                      {userType.icon}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {userType.label}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {userType.description}
                      </Typography>
                    }
                  />
                  {isImpersonating && user?.role === userType.type && (
                    <Chip 
                      size="small" 
                      label="Active" 
                      color={userType.color}
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, flexDirection: 'column' }}>
            {isImpersonating && (
              <Button
                variant="contained"
                color="error"
                onClick={handleStopImpersonation}
                startIcon={<StopIcon />}
                fullWidth
                sx={{ py: 1.5, fontWeight: 600 }}
              >
                Return to Admin Mode
              </Button>
            )}
            
            <Button
              variant="outlined"
              onClick={() => setDrawerOpen(false)}
              fullWidth
              sx={{ py: 1.5 }}
            >
              Close Panel
            </Button>
          </Box>

          {/* Help Text */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
            <Typography variant="caption" color="info.600" sx={{ display: 'block', textAlign: 'center', fontWeight: 500 }}>
              💡 Tip: Switch between user types to test different app experiences without logging out
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default MobileAdminSwitcher;
