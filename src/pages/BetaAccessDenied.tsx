import React, { useEffect, useState } from 'react';
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
import ContactFormModal from '../components/ContactFormModal';

const BetaAccessDenied: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showContactModal, setShowContactModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    // Start countdown timer
    const countdownInterval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          logout();
          navigate('/login', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
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
              You will be contacted by an admin as soon as access has been granted.
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
              You will be logged out in <strong>{secondsRemaining} seconds</strong>. Please log back in once access is confirmed.
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
              onClick={() => setShowContactModal(true)}
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
              Want to help us improve? Use the Contact Support button above to share your feedback.
            </Typography>
          </Box>
        </Paper>

        <ContactFormModal
          open={showContactModal}
          onClose={() => setShowContactModal(false)}
          defaultSubject="Beta Access Request"
          defaultMessage="I would like to request access to The Grassroots Scout beta. Please let me know when my account is approved."
          pageUrl="/beta-access-denied"
        />
      </Box>
    </Container>
  );
};

export default BetaAccessDenied;
