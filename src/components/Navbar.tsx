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
  Chip
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
  StopCircle,
  Business,
  FitnessCenter,
  Analytics,
  MoreHoriz,
  ManageAccounts,
  Feedback as FeedbackIcon,
  Forum as ForumIcon,
  LockOpen
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationComponents';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isImpersonating, stopImpersonation } = useAuth();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<null | HTMLElement>(null);
  
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
    navigate('/');
    handleClose();
  };

  const isActive = (path: string) => location.pathname === path;

  // Primary navigation items that should always be visible on desktop
  const primaryNavItems = user ? [
    { path: '/dashboard', label: 'Dashboard', icon: <Dashboard /> },
    { path: '/search', label: 'Search', icon: <Search /> },
    { path: '/maps', label: 'Maps', icon: <Map /> },
    { path: '/messages', label: 'Messages', icon: <Message /> },
    ...(user?.role === 'Admin' ? [{ path: '/admin', label: 'Admin', icon: <AdminPanelSettings /> }] : []),
    { path: '/forum', label: 'Forum', icon: <ForumIcon /> },
  ] : [
    { path: '/forum', label: 'Forum', icon: <ForumIcon /> },
  ];

  // Secondary navigation items that go in the "More" dropdown
  const secondaryNavItems = user ? [
    { path: '/calendar', label: 'Calendar', icon: <CalendarToday /> },
    ...(user?.role !== 'Admin' ? [{ path: '/post-advert', label: 'Post Advert', icon: <PostAdd /> }] : []),
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
    // ...(user?.role === 'Coach' ? [{ path: '/trial-management', label: 'Trial Management', icon: <Assessment /> }] : []),
    { path: '/performance-analytics', label: 'Performance Analytics', icon: <Analytics /> },
    ...(user?.role === 'Admin' ? [
      { path: '/analytics/real-time', label: 'Real-time Analytics', icon: <Analytics /> },
      { path: '/analytics/insights', label: 'Analytics Insights', icon: <Assessment /> },
      { path: '/admin/feedback', label: 'Feedback Dashboard', icon: <FeedbackIcon /> },
      { path: '/admin/beta-access', label: 'Beta Access', icon: <LockOpen /> }
    ] : []),
    { path: '/match-completions', label: 'Match Completions', icon: <CheckCircle /> },
    { path: '/success-stories', label: 'Success Stories', icon: <EmojiEvents /> },
    { path: '/my-feedback', label: 'My Feedback', icon: <FeedbackIcon /> },
    { path: '/about', label: 'About Us', icon: <Info /> },
  ] : [
    { path: '/about', label: 'About Us', icon: <Info /> },
  ];

  // All navigation items for mobile (where we have more space)
  const navigationItems = [...primaryNavItems, ...secondaryNavItems];

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
        {/* Logo removed temporarily */}
        <Typography variant="h6" sx={{ fontWeight: 800 }}>The Grassroots Scout</Typography>
        <Typography variant="caption" sx={{ color: 'text.primary', opacity: 0.7 }}>Discover. Connect. Develop</Typography>
      </Box>
      <List>
        {navigationItems.map((item) => (
          <ListItem 
            key={item.path} 
            button 
            onClick={() => { 
              console.log('🔍 Mobile navigation click:', item.path);
              navigate(item.path); 
              setMobileOpen(false); 
            }}
            sx={{
              backgroundColor: isActive(item.path) ? 'rgba(0,0,0,0.04)' : 'transparent',
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
        
        {user ? (
          <>
            <Divider sx={{ my: 1 }} />
            
            {/* Admin Impersonation Status */}
            {(user.role === 'Admin' || isImpersonating) && (
              <>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Admin Status
                  </Typography>
                  {isImpersonating ? (
                    <>
                      <Chip
                        label={`Testing as ${user.role}`}
                        icon={<SwapHoriz />}
                        color="warning"
                        size="small"
                        sx={{ mb: 1, display: 'block' }}
                      />
                      <ListItem 
                        button 
                        onClick={() => { 
                          stopImpersonation(); 
                          setMobileOpen(false); 
                        }}
                        sx={{ px: 0, py: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <StopCircle color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Return to Admin" 
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    </>
                  ) : (
                    <Chip
                      label="Admin Mode"
                      icon={<AdminPanelSettings />}
                      color="primary"
                      size="small"
                      sx={{ mb: 1, display: 'block' }}
                    />
                  )}
                </Box>
                <Divider sx={{ my: 1 }} />
              </>
            )}
            
            <ListItem button onClick={() => { navigate('/profile'); setMobileOpen(false); }}>
              <ListItemIcon><Person /></ListItemIcon>
              <ListItemText primary="Profile" />
            </ListItem>
            <ListItem button onClick={() => { handleLogout(); setMobileOpen(false); }}>
              <ListItemIcon>👋</ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </>
        ) : (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem button onClick={() => { navigate('/login'); setMobileOpen(false); }}>
              <ListItemIcon><Person /></ListItemIcon>
              <ListItemText primary="Login" />
            </ListItem>
            <ListItem button onClick={() => { navigate('/register'); setMobileOpen(false); }}>
              <ListItemIcon><Person /></ListItemIcon>
              <ListItemText primary="Register" />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          mb: 4, 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Toolbar 
          sx={{ 
            py: { xs: 1, sm: 1.5 },
            minHeight: { xs: 64, sm: 70 },
            px: { xs: 2, sm: 3, md: 4 }
          }}
        >
          {/* Logo and Brand */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mr: { xs: 2, sm: 3 }
            }}
            onClick={() => navigate('/')}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                ⚽
              </Box>
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700,
                    letterSpacing: -0.5,
                    lineHeight: 1.2,
                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                  }}
                >
                  The Grassroots Scout
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    opacity: 0.9, 
                    fontStyle: 'italic',
                    fontSize: '0.7rem',
                    lineHeight: 1,
                    display: { xs: 'none', sm: 'block' }
                  }}
                >
                  Discover. Connect. Develop
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Impersonation Indicator - More Compact */}
          {isImpersonating && (
            <Chip
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SwapHoriz sx={{ fontSize: '1rem' }} />
                  <Box
                    component="span"
                    sx={{
                      display: { xs: 'none', sm: 'inline' }
                    }}
                  >
                    {user?.role}
                  </Box>
                </Box>
              }
              onClick={stopImpersonation}
              onDelete={stopImpersonation}
              size="small"
              sx={{ 
                mr: { xs: 1, sm: 2 },
                height: 28,
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                color: 'white',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                '& .MuiChip-deleteIcon': {
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': {
                    color: 'white'
                  }
                },
                '&:hover': {
                  backgroundColor: 'rgba(251, 191, 36, 0.3)',
                },
              }}
            />
          )}

          {/* Navigation Items */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: { xs: 0.5, sm: 1 },
              flexShrink: 0,
            }}
          >
            {user ? (
              <>
                {/* Desktop Navigation - Cleaner Button Style */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, mr: 1 }}>
                  {primaryNavItems.map((item) => (
                    <Button
                      key={item.path}
                      color="inherit"
                      onClick={() => navigate(item.path)}
                      sx={{ 
                        fontWeight: isActive(item.path) ? 600 : 500,
                        borderRadius: 1.5,
                        px: 2,
                        py: 0.75,
                        minWidth: 'auto',
                        fontSize: '0.875rem',
                        backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.15)' : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                  
                  {/* More Menu - Cleaner Icon */}
                  {secondaryNavItems.length > 0 && (
                    <IconButton
                      color="inherit"
                      onClick={handleMoreMenu}
                      size="small"
                      sx={{ 
                        borderRadius: 1.5,
                        px: 1,
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.15)',
                        },
                      }}
                    >
                      <MoreHoriz />
                    </IconButton>
                  )}
                </Box>

                {/* Notifications - Improved Spacing */}
                <Box sx={{ mx: 0.5 }}>
                  <NotificationBell />
                </Box>

                {/* Profile Avatar - Enhanced Design */}
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <IconButton
                    size="medium"
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={handleMenu}
                    color="inherit"
                    sx={{
                      p: 0.5,
                      '&:hover': {
                        backgroundColor: 'transparent',
                      }
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 36, 
                        height: 36, 
                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        border: '2px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.08)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          border: '2px solid rgba(255,255,255,0.4)',
                        }
                      }}
                    >
                      {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
                    </Avatar>
                  </IconButton>
                  <Menu
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                    sx={{
                      mt: 1.5,
                      '& .MuiPaper-root': {
                        borderRadius: 2,
                        minWidth: 180,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      }
                    }}
                  >
                    <MenuItem 
                      onClick={() => { navigate('/profile'); handleClose(); }}
                      sx={{ py: 1.5, gap: 1.5 }}
                    >
                      <Person fontSize="small" />
                      Profile
                    </MenuItem>
                    <Divider />
                    <MenuItem 
                      onClick={handleLogout}
                      sx={{ py: 1.5, gap: 1.5, color: 'error.main' }}
                    >
                      👋 Logout
                    </MenuItem>
                  </Menu>
                </Box>

                {/* More Menu Dropdown */}
                <Menu
                  id="more-menu"
                  anchorEl={moreMenuAnchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(moreMenuAnchorEl)}
                  onClose={handleMoreMenuClose}
                  sx={{
                    mt: 1.5,
                    '& .MuiPaper-root': {
                      borderRadius: 2,
                      minWidth: 220,
                      maxWidth: 280,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }
                  }}
                >
                  {secondaryNavItems.map((item) => (
                    <MenuItem 
                      key={item.path}
                      onClick={() => { 
                        navigate(item.path); 
                        handleMoreMenuClose(); 
                      }}
                      sx={{
                        py: 1.5,
                        gap: 2,
                        fontWeight: isActive(item.path) ? 600 : 400,
                        backgroundColor: isActive(item.path) ? 'action.selected' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.7 }}>
                        {item.icon}
                      </Box>
                      {item.label}
                    </MenuItem>
                  ))}
                </Menu>

                {/* Mobile Menu Button */}
                <IconButton
                  ref={menuButtonRef}
                  color="inherit"
                  aria-label="open drawer"
                  edge="end"
                  onClick={handleDrawerToggle}
                  sx={{ 
                    display: { xs: 'block', md: 'none' },
                    ml: 0.5,
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </>
            ) : (
              <>
                {/* Desktop Navigation for non-authenticated users - Cleaner */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
                  <Button
                    color="inherit"
                    onClick={() => navigate('/about')}
                    sx={{ 
                      fontWeight: isActive('/about') ? 600 : 500,
                      borderRadius: 1.5,
                      px: 2.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    About Us
                  </Button>
                  
                  <Box sx={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)', mx: 1 }} />
                  
                  <Button
                    color="inherit"
                    onClick={() => navigate('/login')}
                    sx={{ 
                      fontWeight: isActive('/login') ? 600 : 500,
                      borderRadius: 1.5,
                      px: 2.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/register')}
                    sx={{ 
                      fontWeight: 600,
                      borderRadius: 1.5,
                      px: 3,
                      py: 1,
                      background: 'rgba(255,255,255,0.95)',
                      color: 'primary.main',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        background: 'white',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      },
                    }}
                  >
                    Get Started
                  </Button>
                </Box>

                {/* Mobile Menu Button for non-authenticated users */}
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="end"
                  onClick={handleDrawerToggle}
                  sx={{ display: { xs: 'block', md: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
          disableAutoFocus: true,
          disableEnforceFocus: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            background: 'linear-gradient(to bottom, #1e3a8a 0%, #2563eb 100%)',
            color: 'white',
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navbar;
