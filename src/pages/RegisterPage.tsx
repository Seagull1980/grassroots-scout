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
  FormControlLabel,
  Checkbox,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Visibility, VisibilityOff, CheckCircle, Cancel, Info } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

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

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
    };
    
    if (checks.length) strength += 20;
    if (checks.uppercase) strength += 20;
    if (checks.lowercase) strength += 20;
    if (checks.number) strength += 20;
    if (checks.special) strength += 20;
    
    return { strength, checks };
  };

  const getRoleGuidance = (role: string) => {
    switch (role) {
      case 'Coach':
        return 'As a coach, you can post team vacancies, manage teams, and invite players to trials.';
      case 'Player':
        return 'As a player, you can browse teams, post your availability, and apply for team positions. Players under 16 must be registered by a parent/guardian.';
      case 'Parent/Guardian':
        return 'As a parent/guardian, you can manage profiles for players under 16, communicate with coaches, and monitor your child\'s activity.';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setAgeWarning('');
    
    if (name === 'password') {
      setPasswordTouched(true);
    }

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
    setAgeWarning('');

    // Check age when role changes to Player and date of birth is already set
    if (newRole === 'Player' && formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth);
      if (age < 16) {
        setAgeWarning(`Players under 16 (age ${age}) must be registered by a parent or guardian. Please select "Parent/Guardian" as your role instead.`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.role) {
      setError('Please fill in all fields');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
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
      await register(registrationData);
      navigate('/dashboard');
    } catch (error: any) {
      
      // Force display of error for debugging
      let errorMessage = 'Registration failed. Please try again.';
      
      // Try to extract error message from various possible locations
      if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors
          .map((err: any) => err.msg || err.message || JSON.stringify(err))
          .join('. ');
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data) {
        errorMessage = JSON.stringify(error.response.data);
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
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

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
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
            
            {formData.role && (
              <Alert severity="info" icon={<Info />} sx={{ mt: 1 }}>
                {getRoleGuidance(formData.role)}
              </Alert>
            )}
            
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
            
            {passwordTouched && formData.password && (() => {
              const { strength, checks } = getPasswordStrength(formData.password);
              return (
                <Box sx={{ mt: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Password strength:
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={strength} 
                      sx={{ 
                        flex: 1, 
                        height: 6, 
                        borderRadius: 3,
                        backgroundColor: 'grey.300',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: strength < 40 ? 'error.main' : strength < 80 ? 'warning.main' : 'success.main'
                        }
                      }} 
                    />
                    <Typography variant="caption" fontWeight={600} color={strength < 40 ? 'error' : strength < 80 ? 'warning.main' : 'success.main'}>
                      {strength < 40 ? 'Weak' : strength < 80 ? 'Good' : 'Strong'}
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    <ListItem disableGutters sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        {checks.length ? <CheckCircle fontSize="small" color="success" /> : <Cancel fontSize="small" color="error" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary="At least 8 characters" 
                        primaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem disableGutters sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        {checks.uppercase ? <CheckCircle fontSize="small" color="success" /> : <Cancel fontSize="small" color="error" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary="One uppercase letter" 
                        primaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem disableGutters sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        {checks.lowercase ? <CheckCircle fontSize="small" color="success" /> : <Cancel fontSize="small" color="error" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary="One lowercase letter" 
                        primaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem disableGutters sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        {checks.number ? <CheckCircle fontSize="small" color="success" /> : <Cancel fontSize="small" color="error" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary="One number" 
                        primaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem disableGutters sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        {checks.special ? <CheckCircle fontSize="small" color="success" /> : <Cancel fontSize="small" color="error" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary="One special character (@$!%*?&)" 
                        primaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  </List>
                </Box>
              );
            })()}
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" underline="hover">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" target="_blank" underline="hover">
                    Privacy Policy
                  </Link>
                </Typography>
              }
              sx={{ mt: 2 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading || !agreedToTerms}
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
