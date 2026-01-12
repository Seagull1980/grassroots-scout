import React, { useState, useEffect } from 'react';
import { API_URL } from '../services/api';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../utils/storage';
import QuickUserSwitcher from '../components/QuickUserSwitcher';

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
  const [devLoginLoading, setDevLoginLoading] = useState(false);

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
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        // Small delay to ensure state is updated before navigation
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } else {
        setError('Invalid email or password. Please check your credentials and try again.');
      }
    } catch (error: any) {
      setError('Invalid email or password. Please check your credentials and try again.');
    }
  };

  const handleDevAdminLogin = async () => {
    setDevLoginLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/dev/admin-login`);
      if (!response.ok) {
        throw new Error('Dev login failed');
      }
      
      const data = await response.json();
      
      // Store token and user
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Dev admin login error:', error);
      setError('Dev admin login failed');
    } finally {
      setDevLoginLoading(false);
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

            {/* DEV ONLY: Quick Admin Login - Always visible in development */}
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px dashed #ccc' }}>
              <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mb: 1 }}>
                Development Only
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={handleDevAdminLogin}
                disabled={devLoginLoading}
                size="small"
              >
                {devLoginLoading ? <CircularProgress size={20} /> : '🔧 Login as Admin (Dev)'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Admin Quick Testing Panel */}
        <QuickUserSwitcher 
          compact={true}
          showTitle={true}
          title="Admin Testing Panel"
          showForTesting={true}
        />
      </Box>
    </Container>
  );
};

export default LoginPage;
