import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
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
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  FormHelperText,
} from '@mui/material';
import {
  Visibility, VisibilityOff, CheckCircle, Cancel, Info,
  Person, Badge, MailOutline, Lock, CalendarToday, Group,
  ArrowForward, ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PASSWORD_MIN_LENGTH, passwordRegex, getPasswordStrength, calculateAge } from '../utils/validation';

const STEPS = ['Your Details', 'Your Role', 'Password & Terms'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
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

  const getRoleGuidance = (role: string) => {
    switch (role) {
      case 'Coach':
        return 'As a coach, you can post team vacancies, manage teams, and invite players to trials.';
      case 'Player':
        return 'As a player, you can browse teams, post your availability, and apply for team positions.';
      case 'Parent/Guardian':
        return "As a parent/guardian, you can manage profiles for players under 16, communicate with coaches, and monitor your child's activity.";
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setAgeWarning('');
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'password') setPasswordTouched(true);
    if (name === 'dateOfBirth' && formData.role === 'Player' && value) {
      if (calculateAge(value) < 16) {
        setAgeWarning(`Under 16? A parent or guardian needs to register on your behalf — tap "Switch role" below to continue as Parent/Guardian.`);
      }
    }
  };

  const handleEmailBlur = () => {
    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    }
  };

  const handleRoleChange = (e: SelectChangeEvent) => {
    const newRole = e.target.value as 'Coach' | 'Player' | 'Parent/Guardian';
    setFormData(prev => ({ ...prev, role: newRole }));
    setAgeWarning('');
    setFieldErrors(prev => ({ ...prev, role: '' }));
    if (newRole === 'Player' && formData.dateOfBirth && calculateAge(formData.dateOfBirth) < 16) {
      setAgeWarning(`Players under 16 must be registered by a parent or guardian.`);
    }
  };

  const switchToParentGuardian = () => {
    setFormData(prev => ({ ...prev, role: 'Parent/Guardian' }));
    setAgeWarning('');
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    if (step === 0) {
      if (!formData.firstName) errors.firstName = 'First name is required';
      if (!formData.lastName) errors.lastName = 'Last name is required';
      if (!formData.email) errors.email = 'Email is required';
      else if (!EMAIL_REGEX.test(formData.email)) errors.email = 'Please enter a valid email address';
    }
    if (step === 1) {
      if (!formData.role) errors.role = 'Please select a role';
      if (formData.role === 'Player' && !formData.dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required for player registration';
      }
      if (formData.role === 'Player' && formData.dateOfBirth && calculateAge(formData.dateOfBirth) < 16) {
        errors.dateOfBirth = 'Players under 16 must be registered by a parent or guardian';
      }
    }
    if (step === 2) {
      if (!agreedToTerms) {
        setError('You must agree to the Terms of Service and Privacy Policy');
        return false;
      }
      if (!formData.password) errors.password = 'Password is required';
      if (formData.password.length < PASSWORD_MIN_LENGTH) {
        errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
      } else if (!passwordRegex.test(formData.password)) {
        errors.password = 'Password must contain uppercase, lowercase, number and special character';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      const first = Object.keys(errors)[0];
      document.getElementById(first)?.focus();
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep(currentStep)) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(s => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    if (!validateStep(2)) return;

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
    if (formData.role === 'Player' && formData.dateOfBirth) {
      registrationData.dateOfBirth = formData.dateOfBirth;
    }



    try {
      await register(registrationData);
      navigate('/start');
    } catch (error: any) {
      let general = 'Registration failed. Please try again.';
      const newFieldErrors: Record<string, string> = {};

      if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        error.response.data.errors.forEach((err: any) => {
          if (err.param) newFieldErrors[err.param] = err.msg || err.message || String(err);
          else general = err.msg || err.message || String(err) || general;
        });
      } else if (error?.response?.data?.error) {
        const errData = error.response.data.error;
        if (typeof errData === 'object' && errData !== null) {
          if (errData.message) general = errData.message;
          if (errData.field) newFieldErrors[errData.field] = errData.message || String(errData);
        } else if (typeof errData === 'string') {
          general = errData;
        }
      } else if (error?.response?.data?.message) {
        general = error.response.data.message;
      } else if (error?.message) {
        general = error.message;
      }

      if (Object.keys(newFieldErrors).length) {
        setFieldErrors(newFieldErrors);
        // Navigate back to the step containing the field error
        const isStep0Field = ['email', 'firstName', 'lastName'].some(f => newFieldErrors[f]);
        const isStep1Field = ['role', 'dateOfBirth'].some(f => newFieldErrors[f]);
        if (isStep0Field) setCurrentStep(0);
        else if (isStep1Field) setCurrentStep(1);
        document.getElementById(Object.keys(newFieldErrors)[0])?.focus();
      }
      setError(general);
    }
  };

  const { strength: pwStrength, checks: pwChecks } = getPasswordStrength(formData.password);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;
  const isPasswordComplete = pwStrength === 100;

  const submitDisabled = isLoading || !agreedToTerms || !isPasswordComplete;
  const submitTooltip = !agreedToTerms
    ? 'Please agree to the Terms of Service'
    : !isPasswordComplete
    ? 'Please meet all password requirements'
    : '';

  return (
    <Container component="main" maxWidth="sm">
      <Helmet>
        <title>Create Account | The Grassroots Scout</title>
        <meta name="description" content="Join The Grassroots Scout for free. Register as a coach, player, or parent to connect with grassroots football opportunities across the UK." />
        <link rel="canonical" href="https://www.thegrassrootshub.co.uk/register" />
      </Helmet>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
        <Paper elevation={3} sx={{ p: 3, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Create Account
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Join The Grassroots Scout community
          </Typography>

          <Stepper activeStep={currentStep} sx={{ mb: 3 }}>
            {STEPS.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>

            {/* ── Step 0: Name + Email ── */}
            {currentStep === 0 && (
              <>
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
                      ),
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
                      ),
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
                  onBlur={handleEmailBlur}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutline sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  error={!!fieldErrors.email}
                  helperText={fieldErrors.email}
                />
              </>
            )}

            {/* ── Step 1: Role + DOB ── */}
            {currentStep === 1 && (
              <>
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
                    <MenuItem
                      value="Player"
                      disabled={!!formData.dateOfBirth && calculateAge(formData.dateOfBirth) < 16}
                    >
                      Player
                    </MenuItem>
                    <MenuItem value="Parent/Guardian">Parent/Guardian</MenuItem>
                  </Select>
                  {fieldErrors.role && <FormHelperText>{fieldErrors.role}</FormHelperText>}
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
                      autoComplete="bday"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                      inputProps={{ max: new Date().toISOString().split('T')[0] }}
                      error={!!fieldErrors.dateOfBirth}
                      helperText={fieldErrors.dateOfBirth}
                    />
                    {ageWarning && (
                      <Alert
                        severity="warning"
                        sx={{ mt: 1 }}
                        action={
                          <Button color="inherit" size="small" onClick={switchToParentGuardian}>
                            Switch role
                          </Button>
                        }
                      >
                        {ageWarning}
                      </Alert>
                    )}
                  </>
                )}


              </>
            )}

            {/* ── Step 2: Password + Terms ── */}
            {currentStep === 2 && (
              <>
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

                {passwordTouched && formData.password && (
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Password strength:</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={pwStrength}
                        sx={{
                          flex: 1, height: 6, borderRadius: 3,
                          backgroundColor: 'grey.300',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: pwStrength < 40 ? 'error.main' : pwStrength < 80 ? 'warning.main' : 'success.main',
                          },
                        }}
                      />
                      <Typography variant="caption" fontWeight={600}
                        color={pwStrength < 40 ? 'error' : pwStrength < 80 ? 'warning.main' : 'success.main'}>
                        {pwStrength < 40 ? 'Weak' : pwStrength < 80 ? 'Good' : 'Strong'}
                      </Typography>
                    </Box>
                    <List dense disablePadding>
                      {[
                        { key: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: pwChecks.length },
                        { key: 'uppercase', label: 'One uppercase letter', met: pwChecks.uppercase },
                        { key: 'lowercase', label: 'One lowercase letter', met: pwChecks.lowercase },
                        { key: 'number', label: 'One number', met: pwChecks.number },
                        { key: 'special', label: 'One special character (@$!%*?&)', met: pwChecks.special },
                      ].map(({ key, label, met }) => (
                        <ListItem key={key} disableGutters sx={{ py: 0 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            {met
                              ? <CheckCircle fontSize="small" color="success" />
                              : <Cancel fontSize="small" color="error" />}
                          </ListItemIcon>
                          <ListItemText primary={label} primaryTypographyProps={{ variant: 'caption' }} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

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
                        <>
                          {formData.confirmPassword && (
                            passwordsMatch
                              ? <CheckCircle color="success" fontSize="small" sx={{ mr: 0.5 }} />
                              : <Cancel color="error" fontSize="small" sx={{ mr: 0.5 }} />
                          )}
                          <IconButton
                            aria-label="toggle confirm password visibility"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </>
                      </InputAdornment>
                    ),
                  }}
                  error={!!fieldErrors.confirmPassword || passwordsMismatch}
                  helperText={
                    fieldErrors.confirmPassword ||
                    (passwordsMismatch ? 'Passwords do not match' : passwordsMatch ? '✓ Passwords match' : '')
                  }
                  FormHelperTextProps={{
                    sx: { color: passwordsMatch && !fieldErrors.confirmPassword ? 'success.main' : undefined },
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
                      <Link href="/terms" target="_blank" underline="hover">Terms of Service</Link>
                      {' '}and{' '}
                      <Link href="/privacy" target="_blank" underline="hover">Privacy Policy</Link>
                    </Typography>
                  }
                  sx={{ mt: 2 }}
                />
              </>
            )}

            {/* ── Navigation ── */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3, mb: 2 }}>
              {currentStep > 0 && (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleBack}
                  disabled={isLoading}
                  startIcon={<ArrowBack />}
                >
                  Back
                </Button>
              )}
              {currentStep < STEPS.length - 1 ? (
                <Button fullWidth variant="contained" onClick={handleNext} endIcon={<ArrowForward />}>
                  Next
                </Button>
              ) : (
                <Tooltip title={submitTooltip} arrow disableHoverListener={!submitDisabled}>
                  <Box component="span" sx={{ display: 'block', width: '100%' }}>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      sx={{ py: 1.5 }}
                      disabled={submitDisabled}
                    >
                      {isLoading ? <CircularProgress size={24} /> : 'Create Account'}
                    </Button>
                  </Box>
                </Tooltip>
              )}
            </Box>

            <Box textAlign="center">
              <Link component="button" variant="body2" onClick={() => navigate('/login')} type="button">
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
