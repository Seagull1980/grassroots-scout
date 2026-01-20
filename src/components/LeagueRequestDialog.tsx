import React, { useState } from 'react';
import { AGE_GROUP_OPTIONS } from '../constants/options';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Checkbox,
  ListItemText
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface LeagueRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface LeagueRequestData {
  name: string;
  region: string;
  ageGroups: string[];
  url: string;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  justification: string;
}

const regions = [
  'Midlands',
  'Yorkshire', 
  'North West',
  'North East',
  'South East',
  'South West',
  'Eastern',
  'London',
  'Wales',
  'Scotland',
  'Northern Ireland',
  'National'
];

const ageGroups = AGE_GROUP_OPTIONS;

const LeagueRequestDialog: React.FC<LeagueRequestDialogProps> = ({ 
  open, 
  onClose, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<LeagueRequestData>({
    name: '',
    region: '',
    ageGroups: [],
    url: '',
    description: '',
    contactName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    contactEmail: user?.email || '',
    contactPhone: '',
    justification: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (field: keyof LeagueRequestData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (!formData.name.trim()) {
        setError('League name is required');
        return;
      }

      if (!formData.justification.trim()) {
        setError('Please provide a justification for why this league should be added');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/league-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`League request submitted successfully! You can now use "${formData.name}" in your adverts while it's being reviewed. The league will show as "Under Review" until approved by an administrator.`);
        
        // Reset form
        const resetForm = {
          name: '',
          region: '',
          ageGroups: [],
          url: '',
          description: '',
          contactName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
          contactEmail: user?.email || '',
          contactPhone: '',
          justification: ''
        };
        
        // Call success callback immediately so user can continue
        onSuccess?.();
        
        // Reset form and close after showing success message
        setTimeout(() => {
          setFormData(resetForm);
          onClose();
        }, 3000);

      } else {
        setError(data.error || 'Failed to submit league request');
      }

    } catch (error) {
      console.error('Error submitting league request:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      setSuccess('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div">
          Request New League
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Can't find your league? Submit a request and we'll review it for inclusion.
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Grid container spacing={3}>
            {/* League Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                League Information
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="League Name *"
                fullWidth
                value={formData.name}
                onChange={handleInputChange('name')}
                disabled={loading}
                placeholder="e.g., Tamworth Junior Football League"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Region</InputLabel>
                <Select
                  value={formData.region}
                  onChange={handleInputChange('region')}
                  disabled={loading}
                  label="Region"
                >
                  <MenuItem value="">
                    <em>Select Region</em>
                  </MenuItem>
                  {regions.map((region) => (
                    <MenuItem key={region} value={region}>
                      {region}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Age Groups</InputLabel>
                <Select
                  multiple
                  value={formData.ageGroups}
                  onChange={handleInputChange('ageGroups')}
                  disabled={loading}
                  label="Age Groups"
                  renderValue={(selected) => (selected as string[]).join(', ')}
                >
                  {ageGroups.map((ageGroup) => (
                    <MenuItem key={ageGroup} value={ageGroup}>
                      <Checkbox checked={formData.ageGroups.indexOf(ageGroup) > -1} />
                      <ListItemText primary={ageGroup} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="League Website (Optional)"
                fullWidth
                value={formData.url}
                onChange={handleInputChange('url')}
                disabled={loading}
                placeholder="https://example.com/league"
                type="url"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="League Description (Optional)"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange('description')}
                disabled={loading}
                placeholder="Brief description of the league, its history, and what makes it unique..."
              />
            </Grid>

            {/* Contact Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Contact Information
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                This information helps us verify the league and may be used for follow-up questions.
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Your Name"
                fullWidth
                value={formData.contactName}
                onChange={handleInputChange('contactName')}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Your Email"
                fullWidth
                value={formData.contactEmail}
                onChange={handleInputChange('contactEmail')}
                disabled={loading}
                type="email"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number (Optional)"
                fullWidth
                value={formData.contactPhone}
                onChange={handleInputChange('contactPhone')}
                disabled={loading}
                placeholder="+44 7700 900000"
              />
            </Grid>

            {/* Justification */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Why should this league be added? *
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Justification *"
                fullWidth
                multiline
                rows={4}
                value={formData.justification}
                onChange={handleInputChange('justification')}
                disabled={loading}
                placeholder="Please explain why this league should be added to our system. Include information about the league's size, reputation, geographical area served, and how it would benefit our users..."
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.name.trim() || !formData.justification.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeagueRequestDialog;