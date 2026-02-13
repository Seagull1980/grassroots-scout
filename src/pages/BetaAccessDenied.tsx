import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
} from '@mui/material';
import { Lock, Email } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BetaAccessDenied: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      logout();
      navigate('/login', { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Lock sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom>
            Beta Access Required
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Thank you for registering! The Grassroots Scout is currently in private beta testing.
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2" gutterBottom>
              <strong>What happens next?</strong>
            </Typography>
            <Typography variant="body2" paragraph>
              Our admin team reviews all new registrations and will contact you to advise when 
              your beta access has been granted.
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
              You will be logged out automatically in a moment.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Logged in as: <strong>{user?.email}</strong>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<Email />}
              href="mailto:support@grassrootshub.com?subject=Beta Access Request"
            >
              Contact Support
            </Button>
            
            <Button
              variant="contained"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>

          <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Want to help us improve? Share your feedback at{' '}
              <a href="mailto:feedback@grassrootshub.com">feedback@grassrootshub.com</a>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default BetaAccessDenied;
