import React, { useState, useEffect } from 'react';
import { Container, Paper, Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Invalid verification link');
        setIsVerifying(false);
        return;
      }

      try {
        const response = await authAPI.verifyEmail(token);
        if (response.verified) {
          setIsVerified(true);
          // Clean up any pending verification email
          localStorage.removeItem('pendingVerificationEmail');
        } else {
          setError('Verification failed');
        }
      } catch (error: any) {
        if (error.response?.data?.expired) {
          setError('Verification link has expired. Please request a new verification email.');
        } else {
          setError(error.response?.data?.error || 'Verification failed');
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [token]);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleResendVerification = () => {
    navigate('/email-verification-pending');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isVerifying ? (
              <>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                  Verifying Your Email...
                </Typography>
                <Typography variant="body1" sx={{ textAlign: 'center' }}>
                  Please wait while we verify your email address.
                </Typography>
              </>
            ) : isVerified ? (
              <>
                <Typography component="h1" variant="h4" sx={{ mb: 2, color: 'success.main' }}>
                  Email Verified!
                </Typography>
                
                <Alert severity="success" sx={{ mb: 3, width: '100%' }}>
                  <Typography variant="body1">
                    Your email has been successfully verified. You can now log in to your account.
                  </Typography>
                </Alert>

                <Button
                  variant="contained"
                  onClick={handleLoginRedirect}
                  sx={{ py: 1.5, width: '100%' }}
                >
                  Continue to Login
                </Button>
              </>
            ) : (
              <>
                <Typography component="h1" variant="h4" sx={{ mb: 2, color: 'error.main' }}>
                  Verification Failed
                </Typography>
                
                <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
                  {error}
                </Alert>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                  {error.includes('expired') && (
                    <Button
                      variant="contained"
                      onClick={handleResendVerification}
                      sx={{ py: 1.5 }}
                    >
                      Request New Verification Email
                    </Button>
                  )}
                  
                  <Button
                    variant="outlined"
                    onClick={handleLoginRedirect}
                    sx={{ py: 1.5 }}
                  >
                    Back to Login
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default EmailVerificationPage;
