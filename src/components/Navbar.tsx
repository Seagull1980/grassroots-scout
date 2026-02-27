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
  Badge,
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
  People,
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
  // LockOpen (unused after beta merge)
  Home,
  Support,
  AcUnit,
  MailOutline,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationComponents';
import { useResponsive } from '../hooks/useResponsive';
import api, { API_URL } from '../services/api';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isImpersonating, stopImpersonation } = useAuth();
  const { isMobile } = useResponsive();
  const apiPrefix = API_URL ? '' : '/api';

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll position for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  // Fetch pending invitations count for coaches
  useEffect(() => {
    if (user?.role === 'Coach') {
      fetchPendingInvitationsCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchPendingInvitationsCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchPendingInvitationsCount = async () => {
    try {
      const response = await api.get(`${apiPrefix}/invitations`);
      const pendingCount = (response.data.invitations || []).filter((inv: any) => inv.status === 'pending').length;
      setPendingInvitationsCount(pendingCount);
    } catch (error) {
      console.error('Error fetching invitations count:', error);
    }
  };

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
    { path: '/search', label: 'Search', icon: <Search /> },
    { path: '/maps', label: 'Maps', icon: <Map /> },
    { path: '/messages', label: 'Messages', icon: <Message /> },
    ...(user?.role === 'Coach' ? [{ path: '/post-advert', label: 'Post Advert', icon: <PostAdd /> }] : []),
    { path: '/my-adverts', label: 'My Adverts', icon: <Assessment /> },
    ...(user?.role === 'Admin' ? [{ path: '/admin', label: 'Admin', icon: <AdminPanelSettings /> }] : []),
  ] : [
    { path: '/', label: 'Home', icon: <Home /> },
  ];

  // Secondary navigation items that go in the "More" dropdown
  const secondaryNavItems = user ? [
    ...(user?.role !== 'Admin' && user?.role !== 'Coach' ? [
      { path: '/my-adverts', label: 'My Adverts', icon: <Assessment /> }
    ] : []),
    { path: '/forum', label: 'Forum', icon: <ForumIcon /> },
    { path: '/calendar', label: 'Calendar', icon: <CalendarToday /> },
    ...(user?.role === 'Coach' ? [
      { path: '/team-roster', label: 'Team Roster', icon: <Groups /> },
      { path: '/team-management', label: 'Team Management', icon: <ManageAccounts /> },
      { path: '/invitations', label: 'Team Invitations', icon: <MailOutline />, badge: pendingInvitationsCount },
      { path: '/training-sessions', label: 'Training Sessions', icon: <FitnessCenter /> },
      { path: '/team-profile', label: 'Team Profile', icon: <Business /> },
      { path: '/family-relationships', label: 'Family Relationships', icon: <People /> }
    ] : []),
    ...(user?.role === 'Parent/Guardian' ? [
      { path: '/children', label: 'Manage Children', icon: <FamilyRestroom /> },
      { path: '/child-player-availability', label: 'Parent View', icon: <ChildCare /> },
      { path: '/family-relationships', label: 'Family Relationships', icon: <People /> }
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
      // beta access now part of User Management
      // { path: '/admin/beta-access', label: 'Beta Access', icon: <LockOpen /> }
    ] : []),
    { path: '/match-completions', label: 'Match Completions', icon: <CheckCircle /> },
    { path: '/success-stories', label: 'Success Stories', icon: <EmojiEvents /> },
    { path: '/my-feedback', label: 'My Feedback', icon: <FeedbackIcon /> },
    { path: '/about', label: 'About Us', icon: <Info /> },
  ] : [
    { path: '/forum', label: 'Forum', icon: <ForumIcon /> },
    { path: '/about', label: 'About Us', icon: <Info /> },
  ];

  const isSecondaryActive = secondaryNavItems.filter(item => item != null && item.path).some((item) => isActive(item.path));

  // All navigation items for mobile drawer
  const navigationItems = [...primaryNavItems, ...secondaryNavItems].filter(item => item != null);

  // Get current bottom nav value
  const getBottomNavValue = () => {
    const activeItem = coreNavItems.filter(item => item != null && item.path).find(item => isActive(item.path));
    return activeItem ? coreNavItems.indexOf(activeItem) : false;
  };

  const handleBottomNavChange = (_event: React.SyntheticEvent, newValue: number) => {
    const filteredItems = coreNavItems?.filter(item => item != null && item.path) || [];
    if (newValue >= 0 && newValue < filteredItems.length && filteredItems[newValue]?.path) {
      safeNavigate(filteredItems[newValue].path);
    }
  };

  const drawer = (
    <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box 
        sx={{ 
          p: 3, 
          background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            GS
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            Grassroots Scout
          </Typography>
          {user && (
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {user.firstName} {user.lastName}
            </Typography>
          )}
        </Box>
      </Box>

      <List sx={{ pt: 2, flex: 1, overflow: 'auto' }}>
        {navigationItems.filter(item => item != null && item.path && item.label).map((item, index) => (
          <ListItem
            key={item.path}
            onClick={() => {
              safeNavigate(item.path);
              setMobileOpen(false);
            }}
            sx={{
              cursor: 'pointer',
              mx: 1,
              mb: 0.5,
              borderRadius: 2,
              bgcolor: isActive(item.path) ? 'rgba(0, 102, 255, 0.12)' : 'transparent',
              transition: 'all 0.2s ease',
              animation: `slideInFromLeft 0.3s ease-out ${index * 0.05}s both`,
              '@keyframes slideInFromLeft': {
                from: {
                  opacity: 0,
                  transform: 'translateX(-20px)',
                },
                to: {
                  opacity: 1,
                  transform: 'translateX(0)',
                },
              },
              '&:hover': { 
                bgcolor: isActive(item.path) ? 'rgba(0, 102, 255, 0.18)' : 'rgba(0, 102, 255, 0.08)',
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon 
              sx={{ 
                color: isActive(item.path) ? '#0066FF' : 'text.secondary',
                minWidth: 40,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: isActive(item.path) ? 600 : 500,
                color: isActive(item.path) ? '#0066FF' : 'text.primary',
                fontSize: '0.95rem',
              }}
            />
          </ListItem>
        ))}
      </List>

      {user && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
          <ListItem 
            onClick={handleLogout} 
            sx={{ 
              cursor: 'pointer',
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:hover': { 
                bgcolor: 'rgba(239, 68, 68, 0.08)',
                color: 'error.main',
              },
            }}
          >
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{
                fontWeight: 500,
                textAlign: 'center',
              }}
            />
          </ListItem>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Desktop/Tablet Navbar */}
      {!isMobile && (
        <AppBar 
          position="sticky" 
          elevation={scrolled ? 2 : 0}
          sx={{ 
            bgcolor: scrolled ? 'rgba(255, 255, 255, 0.95)' : '#FFFFFF',
            backdropFilter: scrolled ? 'blur(10px) saturate(180%)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(10px) saturate(180%)' : 'none',
            color: '#0f172a', 
            zIndex: 1100, 
            pointerEvents: 'auto', 
            position: 'sticky !important',
            borderBottom: scrolled ? '1px solid rgba(0, 102, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: scrolled ? '0 4px 12px rgba(0, 0, 0, 0.08)' : '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
          }}
        >
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
              {primaryNavItems.filter(item => item != null && item.path && item.label).map((item) => (
                <Button
                  key={item.path}
                  startIcon={item.icon}
                  onClick={() => safeNavigate(item.path)}
                  sx={{
                    color: isActive(item.path) ? '#0066FF' : '#0f172a',
                    fontWeight: isActive(item.path) ? 600 : 500,
                    bgcolor: isActive(item.path) ? 'rgba(0, 102, 255, 0.12)' : 'transparent',
                    borderRadius: 999,
                    px: 1.75,
                    minHeight: 40,
                    position: 'relative',
                    overflow: 'visible',
                    transition: 'all 0.2s ease',
                    '&::after': isActive(item.path) ? {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '60%',
                      height: '2px',
                      bgcolor: '#0066FF',
                      borderRadius: '2px 2px 0 0',
                    } : {},
                    '&:hover': {
                      bgcolor: isActive(item.path) ? 'rgba(0, 102, 255, 0.18)' : 'rgba(0, 102, 255, 0.08)',
                      color: '#0066FF',
                      transform: 'translateY(-1px)',
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
                      color: isSecondaryActive ? '#0066FF' : '#0f172a',
                      fontWeight: isSecondaryActive ? 600 : 500,
                      bgcolor: isSecondaryActive ? 'rgba(0, 102, 255, 0.12)' : 'transparent',
                      borderRadius: 999,
                      px: 1.75,
                      minHeight: 40,
                      transition: 'all 0.2s ease',
                      '&:hover': { 
                        bgcolor: isSecondaryActive ? 'rgba(0, 102, 255, 0.18)' : 'rgba(0, 102, 255, 0.08)',
                        color: '#0066FF',
                        transform: 'translateY(-1px)',
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
                    {secondaryNavItems.filter(item => item != null && item.path && item.label).map((item: any) => (
                      <MenuItem
                        key={item.path}
                        onClick={() => {
                          safeNavigate(item.path);
                          handleMoreMenuClose();
                        }}
                      >
                        <ListItemIcon>
                          {item.badge && item.badge > 0 ? (
                            <Badge badgeContent={item.badge} color="error">
                              {item.icon}
                            </Badge>
                          ) : (
                            item.icon
                          )}
                        </ListItemIcon>
                        <ListItemText>{item.label}</ListItemText>
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Box>

            {/* Right side actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            zIndex: 1100,
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
            {coreNavItems.filter(item => item != null && item.path && item.label).map((item) => (
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
        <AppBar 
          position="sticky" 
          elevation={scrolled ? 2 : 0}
          sx={{ 
            bgcolor: scrolled ? 'rgba(255, 255, 255, 0.95)' : '#FFFFFF',
            backdropFilter: scrolled ? 'blur(10px) saturate(180%)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(10px) saturate(180%)' : 'none',
            color: '#0f172a', 
            zIndex: 1100, 
            pointerEvents: 'auto', 
            position: 'sticky !important',
            borderBottom: scrolled ? '1px solid rgba(0, 102, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: scrolled ? '0 4px 12px rgba(0, 0, 0, 0.08)' : '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
          }}
        >
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
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
          },
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          },
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
