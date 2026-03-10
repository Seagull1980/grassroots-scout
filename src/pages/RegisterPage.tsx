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
  OutlinedInput,
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
import { Visibility, VisibilityOff, CheckCircle, Cancel, Info, Person, Badge, MailOutline, Lock, CalendarToday, Group } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PASSWORD_MIN_LENGTH, passwordRegex, getPasswordStrength, calculateAge } from '../utils/validation';

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Using shared validation utilities: `calculateAge`, `getPasswordStrength`, and constants

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
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
    
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
    setFieldErrors({});

    // Validation
    const missingFields: Record<string, string> = {};
    if (!formData.firstName) missingFields.firstName = 'First name is required';
    if (!formData.lastName) missingFields.lastName = 'Last name is required';
    if (!formData.email) missingFields.email = 'Email is required';
    if (!formData.password) missingFields.password = 'Password is required';
    if (!formData.role) missingFields.role = 'Please select a role';
    if (Object.keys(missingFields).length) {
      setFieldErrors(missingFields);
      const first = Object.keys(missingFields)[0];
      const el = document.getElementById(first);
      if (el) (el as HTMLElement).focus();
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    // Check if Player role requires date of birth
    if (formData.role === 'Player' && !formData.dateOfBirth) {
      setFieldErrors({ dateOfBirth: 'Date of birth is required for player registration' });
      const el = document.getElementById('dateOfBirth');
      if (el) (el as HTMLElement).focus();
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      const el = document.getElementById('confirmPassword');
      if (el) (el as HTMLElement).focus();
      return;
    }
    if (formData.password.length < PASSWORD_MIN_LENGTH) {
      setFieldErrors({ password: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` });
      const el = document.getElementById('password');
      if (el) (el as HTMLElement).focus();
      return;
    }

    // Check password complexity using shared regex
    if (!passwordRegex.test(formData.password)) {
      setFieldErrors({ password: 'Password must contain uppercase, lowercase, number and special character' });
      const el = document.getElementById('password');
      if (el) (el as HTMLElement).focus();
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
      // Prefer structured API errors when possible and map to fields
      let general = 'Registration failed. Please try again.';
      const newFieldErrors: Record<string, string> = {};

      if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        error.response.data.errors.forEach((err: any) => {
          if (err.param) {
            newFieldErrors[err.param] = err.msg || err.message || String(err);
          } else {
            general = (err.msg || err.message || String(err) || general);
          }
        });
      } else if (error?.response?.data?.error) {
        const errData = error.response.data.error;
        if (typeof errData === 'object' && errData !== null) {
          if (errData.message) general = errData.message;
          if (errData.field) newFieldErrors[errData.field] = errData.message || String(errData);
        } else if (typeof errData === 'string') {
          general = errData;
        }
      } else if (error?.response?.data) {
        const rd = error.response.data;
        if (rd.message) general = rd.message;
      } else if (error?.message) {
        general = error.message;
      }

      if (Object.keys(newFieldErrors).length) {
        setFieldErrors(newFieldErrors);
        const first = Object.keys(newFieldErrors)[0];
        const el = document.getElementById(first);
        if (el) (el as HTMLElement).focus();
      }
      setError(general);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 2,
        }}
      >
        <Paper elevation={3} sx={{ p: 3, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Create Account
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 2 }}>
            Join The Grassroots Scout community
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {typeof error === 'string' ? error : JSON.stringify(error)}
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }}
                error={!!fieldErrors.firstName}
                helperText={fieldErrors.firstName}
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Badge sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }}
                error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName}
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
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailOutline sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                )
              }}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
            />
            <FormControl fullWidth margin="normal" required error={!!fieldErrors.role}>
              <InputLabel id="role-label">I am a</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                value={formData.role}
                label="I am a"
                onChange={handleRoleChange}
                input={
                  <OutlinedInput
                    label="I am a"
                    startAdornment={
                      <InputAdornment position="start">
                        <Group sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    }
                  />
                }
              >
                <MenuItem value="Coach">Coach</MenuItem>
                {/* Disable Player option if DOB indicates under 16 */}
                <MenuItem value="Player" disabled={!!formData.dateOfBirth && calculateAge(formData.dateOfBirth) < 16}>Player</MenuItem>
                <MenuItem value="Parent/Guardian">Parent/Guardian</MenuItem>
              </Select>
              {fieldErrors.role && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{fieldErrors.role}</Typography>
              )}
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }}
                  inputProps={{
                    max: new Date().toISOString().split('T')[0], // Prevent future dates
                  }}
                  error={!!fieldErrors.dateOfBirth}
                  helperText={fieldErrors.dateOfBirth}
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
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
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
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
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
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
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
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
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
