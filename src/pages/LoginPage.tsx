import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  CircularProgress,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Debug: Log error state changes
  useEffect(() => {
    console.log('[LoginPage] Error state changed to:', error);
    console.log('[LoginPage] Error is truthy:', !!error);
    console.log('[LoginPage] Error length:', error.length);
  }, [error]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'invalid') {
      setError('Invalid email or password. Please check your credentials and try again.');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginPage] handleSubmit called');
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    console.log('[LoginPage] About to call login method');
    try {
      console.log('[LoginPage] Attempting login for:', formData.email);
      const success = await login(formData.email, formData.password);
      console.log('[LoginPage] Login method returned, success =', success);
      
      if (success) {
        console.log('[LoginPage] Login successful, navigating to dashboard');
        // Small delay to ensure state is updated before navigation
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } else {
        console.log('[LoginPage] Login failed: setting error message');
        console.log('[LoginPage] About to call setError with:', 'Invalid email or password. Please check your credentials and try again.');
        setError('Invalid email or password. Please check your credentials and try again.');
        console.log('[LoginPage] Error state set to:', 'Invalid email or password. Please check your credentials and try again.');
      }
    } catch (error: any) {
      console.log('[LoginPage] Login error caught (this should not happen):', error);
      console.log('[LoginPage] Error status:', error?.response?.status);
      console.log('[LoginPage] Error message:', error?.response?.data?.error);
      setError('Invalid email or password. Please check your credentials and try again.');
      console.log('[LoginPage] Error state set in catch block');
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 8,
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Sign In
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Welcome back to The Grassroots Scout
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              <br />
              <small style={{ opacity: 0.7 }}>Debug: Error state is set</small>
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            <Box textAlign="center" sx={{ mb: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/forgot-password')}
                type="button"
              >
                Forgot your password?
              </Link>
            </Box>
            
            <Box textAlign="center">
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/register')}
                type="button"
              >
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
