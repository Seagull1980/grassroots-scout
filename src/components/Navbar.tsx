import React, { useState, useRef, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Fab,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search,
  CalendarToday,
  Map,
  Person,
  Dashboard,
  AdminPanelSettings,
  PostAdd,
  Groups,
  FamilyRestroom,
  ChildCare,
  CheckCircle,
  EmojiEvents,
  Schedule,
  Assessment,
  Info,
  Message,
  SwapHoriz,
  Business,
  FitnessCenter,
  Analytics,
  MoreHoriz,
  ManageAccounts,
  Feedback as FeedbackIcon,
  Forum as ForumIcon,
  LockOpen,
  Add,
  Home,
  Support,
  AcUnit,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationComponents';
import { useResponsive } from '../hooks/useResponsive';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isImpersonating, stopImpersonation } = useAuth();
  const { isMobile } = useResponsive();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Custom navigate function that forces page reload when leaving Maps
  const safeNavigate = (path: string) => {
    if (location.pathname === '/maps') {
      // Force full page reload when navigating away from Maps
      window.location.href = path;
    } else {
      navigate(path);
    }
  };

  // Ref for the mobile menu button to manage focus
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMoreMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMoreMenuAnchorEl(event.currentTarget);
  };

  const handleMoreMenuClose = () => {
    setMoreMenuAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Handle focus management when drawer closes
  useEffect(() => {
    if (!mobileOpen && menuButtonRef.current) {
      // Small delay to ensure drawer has closed
      const timer = setTimeout(() => {
        menuButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    safeNavigate('/');
    handleClose();
  };

  const isActive = (path: string) => location.pathname === path;

  // Core navigation items for mobile bottom nav
  const coreNavItems = user ? [
    { path: '/dashboard', label: 'Home', icon: <Home />, show: true },
    { path: '/search', label: 'Search Adverts', icon: <Search />, show: true },
    { path: '/messages', label: 'Messages', icon: <Message />, show: true },
    { path: '/profile', label: 'Profile', icon: <Person />, show: true },
  ] : [
    { path: '/', label: 'Home', icon: <Home />, show: true },
    { path: '/forum', label: 'Forum', icon: <ForumIcon />, show: true },
  ];

  // Primary navigation items for desktop
  const primaryNavItems = user ? [
    { path: '/dashboard', label: 'Dashboard', icon: <Dashboard /> },
    { path: '/search', label: 'Search Adverts', icon: <Search /> },
    { path: '/post-advert', label: 'Post Advert', icon: <PostAdd /> },
    ...(user?.role !== 'Admin' ? [
      { path: '/my-adverts', label: 'My Adverts', icon: <Assessment /> }
    ] : []),
    { path: '/maps', label: 'Maps', icon: <Map /> },
    { path: '/messages', label: 'Messages', icon: <Message /> },
    ...(user?.role === 'Admin' ? [{ path: '/admin', label: 'Admin', icon: <AdminPanelSettings /> }] : []),
  ] : [
    { path: '/', label: 'Home', icon: <Home /> },
  ];

  // Secondary navigation items that go in the "More" dropdown
  const secondaryNavItems = user ? [
    { path: '/forum', label: 'Forum', icon: <ForumIcon /> },
    { path: '/calendar', label: 'Calendar', icon: <CalendarToday /> },
    ...(user?.role === 'Coach' ? [
      { path: '/team-roster', label: 'Team Roster', icon: <Groups /> },
      { path: '/team-management', label: 'Team Management', icon: <ManageAccounts /> },
      { path: '/training-sessions', label: 'Training Sessions', icon: <FitnessCenter /> },
      { path: '/team-profile', label: 'Team Profile', icon: <Business /> }
    ] : []),
    ...(user?.role === 'Parent/Guardian' ? [
      { path: '/children', label: 'Manage Children', icon: <FamilyRestroom /> },
      { path: '/child-player-availability', label: 'Parent View', icon: <ChildCare /> }
    ] : []),
    ...(user && (user.role === 'Coach' || user.role === 'Player') ? [{ path: '/training-invitations', label: 'Training Invites', icon: <Schedule /> }] : []),
    { path: '/performance-analytics', label: 'Performance Analytics', icon: <Analytics /> },
    ...(user?.role === 'Admin' ? [
      { path: '/analytics/real-time', label: 'Real-time Analytics', icon: <Analytics /> },
      { path: '/analytics/insights', label: 'Analytics Insights', icon: <Assessment /> },
      { path: '/admin/success-stories', label: 'Success Story Approvals', icon: <EmojiEvents /> },
      { path: '/admin/feedback', label: 'Feedback Dashboard', icon: <FeedbackIcon /> },
      { path: '/admin/frozen-adverts', label: 'Frozen Adverts', icon: <AcUnit /> },
      { path: '/admin/support', label: 'Support Messages', icon: <Support /> },
      { path: '/admin/beta-access', label: 'Beta Access', icon: <LockOpen /> }
    ] : []),
    { path: '/match-completions', label: 'Match Completions', icon: <CheckCircle /> },
    { path: '/success-stories', label: 'Success Stories', icon: <EmojiEvents /> },
    { path: '/my-feedback', label: 'My Feedback', icon: <FeedbackIcon /> },
    { path: '/about', label: 'About Us', icon: <Info /> },
  ] : [
    { path: '/forum', label: 'Forum', icon: <ForumIcon /> },
    { path: '/about', label: 'About Us', icon: <Info /> },
  ];

  const isSecondaryActive = secondaryNavItems.some((item) => isActive(item.path));

  // All navigation items for mobile drawer
  const navigationItems = [...primaryNavItems, ...secondaryNavItems];

  // Get current bottom nav value
  const getBottomNavValue = () => {
    const activeItem = coreNavItems.find(item => isActive(item.path));
    return activeItem ? coreNavItems.indexOf(activeItem) : false;
  };

  const handleBottomNavChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (newValue >= 0 && newValue < coreNavItems.length) {
      safeNavigate(coreNavItems[newValue].path);
    }
  };

  // Quick action for coaches to post adverts
  const showQuickPost = user?.role === 'Coach' && !isMobile;

  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Navigation
        </Typography>
      </Box>

      <List sx={{ pt: 1 }}>
        {navigationItems.map((item) => (
          <ListItem
            key={item.path}
            onClick={() => {
              safeNavigate(item.path);
              setMobileOpen(false);
            }}
            sx={{
              cursor: 'pointer',
              bgcolor: isActive(item.path) ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'text.secondary' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: isActive(item.path) ? 600 : 400,
                color: isActive(item.path) ? 'primary.main' : 'text.primary'
              }}
            />
          </ListItem>
        ))}
      </List>

      {user && (
        <>
          <Divider sx={{ my: 1 }} />
          <List>
            <ListItem onClick={handleLogout} sx={{ cursor: 'pointer' }}>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </>
      )}
    </Box>
  );

  return (
    <>
      {/* Desktop/Tablet Navbar */}
      {!isMobile && (
        <AppBar position="sticky" elevation={1} sx={{ bgcolor: '#FFFFFF', color: '#0f172a', zIndex: 99999, pointerEvents: 'auto', position: 'sticky !important' }}>
          <Toolbar>
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 0,
                mr: 4,
                cursor: 'pointer',
                fontWeight: 700,
                color: 'primary.main'
              }}
              onClick={() => safeNavigate(user ? '/dashboard' : '/')}
            >
              The Grassroots Scout
            </Typography>

            {/* Primary Navigation */}
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
              {primaryNavItems.map((item) => (
                <Button
                  key={item.path}
                  startIcon={item.icon}
                  onClick={() => safeNavigate(item.path)}
                  sx={{
                    color: isActive(item.path) ? '#1e3a8a' : '#0f172a',
                    fontWeight: isActive(item.path) ? 600 : 400,
                    bgcolor: isActive(item.path) ? 'rgba(30, 58, 138, 0.12)' : 'transparent',
                    borderRadius: 999,
                    px: 1.75,
                    minHeight: 40,
                    '&:hover': {
                      bgcolor: isActive(item.path) ? 'rgba(30, 58, 138, 0.18)' : 'rgba(15, 23, 42, 0.06)',
                      color: '#0f172a'
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}

              {/* More Menu */}
              {secondaryNavItems.length > 0 && (
                <>
                  <Button
                    startIcon={<MoreHoriz />}
                    onClick={handleMoreMenu}
                    sx={{ 
                      color: isSecondaryActive ? '#1e3a8a' : '#0f172a',
                      fontWeight: isSecondaryActive ? 600 : 400,
                      bgcolor: isSecondaryActive ? 'rgba(30, 58, 138, 0.12)' : 'transparent',
                      borderRadius: 999,
                      px: 1.75,
                      minHeight: 40,
                      '&:hover': { 
                        bgcolor: isSecondaryActive ? 'rgba(30, 58, 138, 0.18)' : 'rgba(15, 23, 42, 0.06)',
                        color: '#0f172a'
                      },
                    }}
                  >
                    More
                  </Button>
                  <Menu
                    anchorEl={moreMenuAnchorEl}
                    open={Boolean(moreMenuAnchorEl)}
                    onClose={handleMoreMenuClose}
                    PaperProps={{
                      sx: {
                        '& .MuiMenuItem-root': {
                          color: '#0f172a',
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                          }
                        }
                      }
                    }}
                  >
                    {secondaryNavItems.map((item) => (
                      <MenuItem
                        key={item.path}
                        onClick={() => {
                          safeNavigate(item.path);
                          handleMoreMenuClose();
                        }}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText>{item.label}</ListItemText>
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Box>

            {/* Right side actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {showQuickPost && (
                <Fab
                  color="primary"
                  size="small"
                  onClick={() => safeNavigate('/post-advert')}
                  sx={{ mr: 1 }}
                >
                  <Add />
                </Fab>
              )}

              {user && <NotificationBell />}

              {user ? (
                <>
                  <Chip
                    label={user.role}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ 
                      mr: 1,
                      '& .MuiChip-label': {
                        color: 'text.primary',
                        fontWeight: 500,
                      }
                    }}
                  />
                  <IconButton onClick={handleMenu}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </Avatar>
                  </IconButton>
                  <Menu 
                    anchorEl={anchorEl} 
                    open={Boolean(anchorEl)} 
                    onClose={handleClose}
                    PaperProps={{
                      sx: {
                        '& .MuiMenuItem-root': {
                          color: '#0f172a',
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                          }
                        }
                      }
                    }}
                  >
                    <MenuItem onClick={() => safeNavigate('/profile')}>
                      <ListItemIcon><Person /></ListItemIcon>
                      Profile
                    </MenuItem>
                    <MenuItem onClick={() => safeNavigate('/alert-preferences')}>
                      <ListItemIcon><NotificationBell /></ListItemIcon>
                      Alert Preferences
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout}>
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button color="inherit" onClick={() => safeNavigate('/login')}>
                    Login
                  </Button>
                  <Button variant="contained" onClick={() => safeNavigate('/register')}>
                    Sign Up
                  </Button>
                </Box>
              )}
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && user && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            pointerEvents: 'auto',
            borderTop: 1,
            borderColor: 'divider'
          }}
          elevation={3}
        >
          <BottomNavigation
            value={getBottomNavValue()}
            onChange={handleBottomNavChange}
            showLabels
          >
            {coreNavItems.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
                sx={{
                  minWidth: 0,
                  '& .MuiBottomNavigationAction-label': {
                    fontSize: '0.75rem',
                    mt: 0.5
                  }
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}

      {/* Mobile Top App Bar */}
      {isMobile && (
        <AppBar position="sticky" elevation={1} sx={{ bgcolor: '#FFFFFF', color: '#0f172a', zIndex: 99999, pointerEvents: 'auto', position: 'sticky !important' }}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              ref={menuButtonRef}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                cursor: 'pointer',
                fontWeight: 700,
                color: 'primary.main'
              }}
              onClick={() => safeNavigate(user ? '/dashboard' : '/')}
            >
              Grassroots Scout
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {user && <NotificationBell />}

              {user && showQuickPost && (
                <Fab
                  color="primary"
                  size="small"
                  onClick={() => safeNavigate('/post-advert')}
                  sx={{ mr: 1 }}
                >
                  <Add />
                </Fab>
              )}

              {user ? (
                <IconButton onClick={handleMenu}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </Avatar>
                </IconButton>
              ) : (
                <Button color="inherit" onClick={() => safeNavigate('/login')} size="small">
                  Login
                </Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
        }}
      >
        {drawer}
      </Drawer>

      {/* User Menu */}
      {user && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
          <MenuItem onClick={() => safeNavigate('/profile')}>
            <ListItemIcon><Person /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => safeNavigate('/alert-preferences')}>
            <ListItemIcon><NotificationBell /></ListItemIcon>
            Alert Preferences
          </MenuItem>
          {isImpersonating && (
            <MenuItem onClick={stopImpersonation}>
              <ListItemIcon><SwapHoriz /></ListItemIcon>
              Stop Impersonation
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={handleLogout}>
            Logout
          </MenuItem>
        </Menu>
      )}
    </>
  );
};

export default Navbar;
