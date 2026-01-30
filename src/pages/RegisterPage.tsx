import React, { useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  console.log('RegisterPage component rendered');
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '' as 'Coach' | 'Player' | 'Parent/Guardian' | '',
    dateOfBirth: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ageWarning, setAgeWarning] = useState('');

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
    setAgeWarning('');

    // Check age when date of birth changes and role is Player
    if (name === 'dateOfBirth' && formData.role === 'Player' && value) {
      const age = calculateAge(value);
      if (age < 16) {
        setAgeWarning(`Players under 16 (age ${age}) must be registered by a parent or guardian. Please select "Parent/Guardian" as your role instead.`);
      }
    }
  };

  const handleRoleChange = (e: SelectChangeEvent) => {
    const newRole = e.target.value as 'Coach' | 'Player' | 'Parent/Guardian';
    setFormData({
      ...formData,
      role: newRole,
    });
    setError('');
    setAgeWarning('');

    // Check age when role changes to Player and date of birth is already set
    if (newRole === 'Player' && formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth);
      if (age < 16) {
        setAgeWarning(`Players under 16 (age ${age}) must be registered by a parent or guardian. Please select "Parent/Guardian" as your role instead.`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    // Prevent default behavior for both form submission and button click
    e.preventDefault();
    console.log('handleSubmit called');
    setError('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.role) {
      setError('Please fill in all fields');
      return;
    }

    // Check if Player role requires date of birth
    if (formData.role === 'Player' && !formData.dateOfBirth) {
      setError('Date of birth is required for player registration');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Check password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return;
    }

    // Check age warning before submission
    if (formData.role === 'Player' && formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth);
      if (age < 16) {
        setError(`Players under 16 (age ${age}) must be registered by a parent or guardian. Please select "Parent/Guardian" as your role.`);
        return;
      }
    }

    const registrationData: {
      firstName: string;
      lastName: string;
      email: string;
      role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';
      password: string;
      dateOfBirth?: string;
    } = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      role: formData.role as 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin',
      password: formData.password,
    };

    // Include date of birth for players
    if (formData.role === 'Player' && formData.dateOfBirth) {
      registrationData.dateOfBirth = formData.dateOfBirth;
    }

    try {
      console.log('About to call register');
      await register(registrationData);
      console.log('Register succeeded, navigating to dashboard');
      // Navigate directly to dashboard (email verification disabled)
      navigate('/dashboard');
    } catch (error: any) {
      console.log('Registration error caught:', error);
      console.log('Error response:', error.response);
      console.log('Error data:', error.response?.data);
      if (error.response?.data?.ageRestriction) {
        setError(error.response.data.error);
      } else {
        const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
        console.log('Setting error message:', errorMessage);
        setError(errorMessage);
      }
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
            Create Account
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Join The Grassroots Scout community
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={(e) => handleSubmit(e)} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="firstName"
                label="First Name"
                name="firstName"
                autoComplete="given-name"
                autoFocus
                value={formData.firstName}
                onChange={handleChange}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </Box>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="role-label">I am a</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                value={formData.role}
                label="I am a"
                onChange={handleRoleChange}
              >
                <MenuItem value="Coach">Coach</MenuItem>
                <MenuItem value="Player">Player</MenuItem>
                <MenuItem value="Parent/Guardian">Parent/Guardian</MenuItem>
              </Select>
            </FormControl>
            
            {formData.role === 'Player' && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="dateOfBirth"
                  label="Date of Birth"
                  type="date"
                  id="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    max: new Date().toISOString().split('T')[0], // Prevent future dates
                  }}
                />
                {ageWarning && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {ageWarning}
                  </Alert>
                )}
              </>
            )}
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
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
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="button"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
              onClick={(e) => handleSubmit(e as any)}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>
            <Box textAlign="center">
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/login')}
                type="button"
              >
                Already have an account? Sign In
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;
