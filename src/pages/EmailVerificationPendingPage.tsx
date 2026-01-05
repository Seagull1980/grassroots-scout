import React, { useState } from 'react';
import { Container, Paper, Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const EmailVerificationPendingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResendVerification = async () => {
    setIsResending(true);
    setMessage('');
    setError('');

    const email = localStorage.getItem('pendingVerificationEmail');
    if (!email) {
      setError('Email address not found. Please try registering again.');
      setIsResending(false);
      return;
    }

    try {
      await authAPI.resendVerification({ email });
      setMessage('Verification email sent successfully! Please check your email.');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    localStorage.removeItem('pendingVerificationEmail');
    navigate('/login');
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
            <Typography component="h1" variant="h4" sx={{ mb: 2, color: 'primary.main' }}>
              Verify Your Email
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
              We've sent a verification email to your email address. Please check your email and click the verification link to activate your account.
            </Typography>

            <Alert severity="info" sx={{ mb: 3, width: '100%' }}>
              <Typography variant="body2">
                <strong>Important:</strong> You must verify your email before you can log in to your account.
                If you don't see the email, please check your spam/junk folder.
              </Typography>
            </Alert>

            {message && (
              <Alert severity="success" sx={{ mb: 2, width: '100%' }}>
                {message}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
              <Button
                variant="outlined"
                onClick={handleResendVerification}
                disabled={isResending}
                sx={{ py: 1.5 }}
              >
                {isResending ? <CircularProgress size={24} /> : 'Resend Verification Email'}
              </Button>

              <Button
                variant="contained"
                onClick={handleBackToLogin}
                sx={{ py: 1.5 }}
              >
                Back to Login
              </Button>
            </Box>

            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
              Already verified? <Button onClick={() => navigate('/login')} variant="text">Login here</Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default EmailVerificationPendingPage;
