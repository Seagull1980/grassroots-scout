import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Paper,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Cake as CakeIcon,
  School as SchoolIcon,
  Info as InfoIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import ActionEmptyState from '../components/ActionEmptyState';

interface Child {
  id: number;
  parentId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  preferredPosition?: string;
  preferredTeamGender?: string;
  medicalInfo?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  schoolName?: string;
  bio?: string;
  profilePicture?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChildFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  preferredPosition: string;
  preferredTeamGender: string;
  bio: string;
  // emergency and school fields intentionally omitted for parent-created child profiles
}

const pickFirst = <T,>(source: Record<string, unknown>, keys: string[], fallback: T): T => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }
  return fallback;
};

const normalizeDateInputValue = (value: unknown): string => {
  if (!value) return '';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
};

const normalizeTimestampValue = (value: unknown): string => {
  if (!value) return '';

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString();
};

const normalizeChild = (rawChild: Record<string, unknown>): Child => {
  const createdAt = normalizeTimestampValue(pickFirst(rawChild, ['createdAt', 'createdat', 'created_at'], ''));
  const updatedAt = normalizeTimestampValue(pickFirst(rawChild, ['updatedAt', 'updatedat', 'updated_at'], ''));

  return {
    id: Number(pickFirst(rawChild, ['id'], 0)),
    parentId: Number(pickFirst(rawChild, ['parentId', 'parentid', 'parent_id'], 0)),
    firstName: String(pickFirst(rawChild, ['firstName', 'firstname', 'first_name'], '')),
    lastName: String(pickFirst(rawChild, ['lastName', 'lastname', 'last_name'], '')),
    dateOfBirth: normalizeDateInputValue(pickFirst(rawChild, ['dateOfBirth', 'dateofbirth', 'date_of_birth'], '')),
    gender: pickFirst(rawChild, ['gender'], undefined),
    preferredPosition: pickFirst(rawChild, ['preferredPosition', 'preferredposition', 'preferred_position'], undefined),
    preferredTeamGender: pickFirst(rawChild, ['preferredTeamGender', 'preferredteamgender', 'preferred_team_gender'], undefined),
    medicalInfo: pickFirst(rawChild, ['medicalInfo', 'medicalinfo', 'medical_info'], undefined),
    emergencyContact: pickFirst(rawChild, ['emergencyContact', 'emergencycontact', 'emergency_contact'], undefined),
    emergencyPhone: pickFirst(rawChild, ['emergencyPhone', 'emergencyphone', 'emergency_phone'], undefined),
    schoolName: pickFirst(rawChild, ['schoolName', 'schoolname', 'school_name'], undefined),
    bio: pickFirst(rawChild, ['bio'], undefined),
    profilePicture: pickFirst(rawChild, ['profilePicture', 'profilepicture', 'profile_picture'], undefined),
    isActive: Boolean(pickFirst(rawChild, ['isActive', 'isactive', 'is_active'], true)),
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || createdAt || new Date().toISOString()
  };
};

const ChildrenManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [formData, setFormData] = useState<ChildFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    preferredPosition: '',
    preferredTeamGender: 'Mixed',
    bio: '',
    // emergency and school fields intentionally omitted
  });

  const positions = [
    'Goalkeeper', 'Defender', 'Midfielder', 'Forward',
    'Centre-Back', 'Full-Back', 'Wing-Back', 'Defensive Midfielder',
    'Central Midfielder', 'Attacking Midfielder', 'Winger', 'Striker'
  ];

  useEffect(() => {
    if (user?.role === 'Parent/Guardian') {
      loadChildren();
    }
  }, [user?.id]); // Only reload when user ID changes (login/logout), not on every user object update

  const loadChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get('/children');
      const normalizedChildren = Array.isArray(response.data.children)
        ? response.data.children.map((child: Record<string, unknown>) => normalizeChild(child))
        : [];
      setChildren(normalizedChildren);
    } catch (err: any) {
      console.error('Error loading children:', err);
      setError('Failed to load children information');
      setChildren([]); // Ensure children is always an array
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) {
      return null;
    }

    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleInputChange = (field: keyof ChildFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddChild = async () => {
    try {
      setError('');
      
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
        setError('Please fill in all required fields');
        return;
      }

      // Check age restriction
      const age = calculateAge(formData.dateOfBirth);
      if (age !== null && age >= 16) {
        setError(`Children must be under 16 years old. This child is ${age} years old and should register their own account.`);
        return;
      }

      await api.post('/children', formData);
      
      setSuccess('Child added successfully!');
      setShowAddDialog(false);
      resetForm();
      loadChildren();
    } catch (err: any) {
      console.error('Error adding child:', err);
      setError(err.response?.data?.error || 'Failed to add child');
    }
  };

  const handleEditChild = async () => {
    if (!editingChild) return;

    try {
      setError('');
      
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
        setError('Please fill in all required fields');
        return;
      }

      // Check age restriction
      const age = calculateAge(formData.dateOfBirth);
      if (age !== null && age >= 16) {
        setError(`Children must be under 16 years old. This child is ${age} years old and should register their own account.`);
        return;
      }

      await api.put(`/children/${editingChild.id}`, formData);
      
      setSuccess('Child information updated successfully!');
      setEditingChild(null);
      resetForm();
      loadChildren();
    } catch (err: any) {
      console.error('Error updating child:', err);
      setError(err.response?.data?.error || 'Failed to update child information');
    }
  };

  const handleDeleteChild = async (childId: number, childName: string) => {
    if (!confirm(`Are you sure you want to remove ${childName}? This will also deactivate any player availability postings for this child.`)) {
      return;
    }

    try {
      await api.delete(`/children/${childId}`);
      setSuccess('Child removed successfully!');
      loadChildren();
    } catch (err: any) {
      console.error('Error deleting child:', err);
      setError(err.response?.data?.error || 'Failed to remove child');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      preferredPosition: '',
      preferredTeamGender: 'Mixed',
      bio: '',
      // emergency and school fields intentionally omitted
    });
  };

  const openEditDialog = (child: Child) => {
    // Ensure dialog opens in add/edit modal state and pre-fill the form with the child's data
    setEditingChild(child);
    setShowAddDialog(true);
    setFormData({
      firstName: child.firstName,
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth,
      gender: child.gender || '',
      preferredPosition: child.preferredPosition || '',
      preferredTeamGender: child.preferredTeamGender || 'Mixed',
      bio: child.bio || ''
    });
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingChild(null);
    resetForm();
    setError('');
  };

  if (user?.role !== 'Parent/Guardian') {
    return (
      <Box p={3}>
        <Alert severity="error">
          Access denied. This page is only available to Parent/Guardian accounts.
        </Alert>
      </Box>
    );
  }

  const profilesWithBio = children.filter((child) => Boolean(child.bio?.trim())).length;
  const profilesWithEmergencyContact = children.filter((child) => Boolean(child.emergencyContact?.trim()) && Boolean(child.emergencyPhone?.trim())).length;
  const profilesNeedingAttention = children.filter((child) => !child.bio?.trim() || !child.emergencyContact?.trim() || !child.emergencyPhone?.trim()).length;

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Manage Children"
        subtitle="Keep each child profile complete so coaches have the right context before they reach out."
        icon={<PersonIcon sx={{ fontSize: 32 }} />}
        actions={(
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            Add Child
          </Button>
        )}
      />
      <Box p={3}>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Typography>Loading children...</Typography>
      ) : children.length === 0 ? (
        <ActionEmptyState
          icon={<PersonIcon sx={{ fontSize: 36 }} />}
          title="No children added yet"
          description="Add the first child profile here so family football activity stays organised around the right child record."
          suggestions={[
            'Start with the child who is actively looking for a team first.',
            'Add an emergency contact and a short bio during setup so you do not need to chase them later.',
            'Use child availability once the profile is complete.',
          ]}
          primaryAction={{ label: 'Add Your First Child', onClick: () => setShowAddDialog(true) }}
          secondaryAction={{ label: 'Open Family Relationships', onClick: () => navigate('/family-relationships') }}
        />
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Children', value: children.length, helper: 'Active child profiles' },
              { label: 'Bio added', value: profilesWithBio, helper: 'Profiles with short bio' },
              { label: 'Emergency contacts ready', value: profilesWithEmergencyContact, helper: 'Profiles with contact and phone' },
              { label: 'Needs attention', value: profilesNeedingAttention, helper: 'Profiles missing critical details' },
            ].map((stat) => (
              <Grid item xs={12} sm={6} md={3} key={stat.label}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.helper}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ p: 2.5, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Family overview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Use this page as the control centre for each child. The aim is to make it obvious which profiles are ready for coaches and which still need information.
            </Typography>
            {profilesNeedingAttention > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {profilesNeedingAttention} child profile{profilesNeedingAttention !== 1 ? 's are' : ' is'} missing a bio or emergency details. Tighten those before sending coaches to them.
              </Alert>
            )}
          </Paper>

          <Grid container spacing={3}>
          {children.map((child) => {
            const childAge = calculateAge(child.dateOfBirth);
            const updatedDate = new Date(child.updatedAt);
            const hasValidUpdatedDate = !Number.isNaN(updatedDate.getTime());

            return (
            <Grid item xs={12} md={6} lg={4} key={child.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" component="h2">
                        {child.firstName} {child.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Updated {hasValidUpdatedDate ? updatedDate.toLocaleDateString() : 'recently'}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(child)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteChild(child.id, `${child.firstName} ${child.lastName}`)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                    <Chip label={childAge !== null ? `Age ${childAge}` : 'Age unknown'} size="small" />
                    <Chip label={child.preferredPosition || 'Position missing'} size="small" variant="outlined" color={child.preferredPosition ? 'default' : 'warning'} />
                    <Chip label={child.bio ? 'Bio added' : 'Bio needed'} size="small" color={child.bio ? 'success' : 'warning'} variant="outlined" />
                  </Stack>

                  <Stack spacing={1}>
                    <Box display="flex" alignItems="center">
                      <CakeIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Age: {childAge !== null ? `${childAge} years old` : 'Not available'}
                      </Typography>
                    </Box>

                    {child.gender && (
                      <Typography variant="body2" color="text.secondary">
                        Gender: {child.gender}
                      </Typography>
                    )}

                    {child.preferredPosition && (
                      <Box>
                        <Chip 
                          label={child.preferredPosition} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    )}

                    {child.schoolName && (
                      <Box display="flex" alignItems="center">
                        <SchoolIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {child.schoolName}
                        </Typography>
                      </Box>
                    )}

                    {child.emergencyContact && (
                      <Box display="flex" alignItems="center">
                        <PhoneIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Emergency: {child.emergencyContact}{child.emergencyPhone ? ` • ${child.emergencyPhone}` : ''}
                        </Typography>
                      </Box>
                    )}

                    {child.bio && (
                      <Box display="flex" alignItems="flex-start">
                        <InfoIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary', mt: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">
                          Bio: {(child.bio?.length || 0) > 100 
                            ? `${child.bio.substring(0, 100)}...` 
                            : child.bio}
                        </Typography>
                      </Box>
                    )}

                    {!child.emergencyContact || !child.emergencyPhone ? (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Add a complete emergency contact before sharing this profile with more coaches.
                      </Alert>
                    ) : null}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 0, mt: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="contained" onClick={() => openEditDialog(child)}>
                    Edit Profile
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => navigate('/child-player-availability')}>
                    Child Availability
                  </Button>
                  <Button size="small" variant="text" onClick={() => navigate('/family-relationships')}>
                    Family Access
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            );
          })}
          </Grid>
        </>
      )}

      {/* Add/Edit Child Dialog */}
      <Dialog 
        open={showAddDialog || editingChild !== null} 
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingChild ? 'Edit Child Information' : 'Add New Child'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Alert severity="info" sx={{ mb: 2 }}>
            Your child's name is private by default and will not be shown in adverts. You can choose to show it later when creating a child availability advert by enabling the "Share child's name in adverts and messages" option.
          </Alert>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                fullWidth
                required
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                fullWidth
                required
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Date of Birth"
                type="date"
                fullWidth
                required
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                InputLabelProps={{
                  shrink: true }}
                helperText="Child must be under 16 years old"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={formData.gender}
                  label="Gender"
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Preferred Position</InputLabel>
                <Select
                  value={formData.preferredPosition}
                  label="Preferred Position"
                  onChange={(e) => handleInputChange('preferredPosition', e.target.value)}
                >
                  {positions.map((position) => (
                    <MenuItem key={position} value={position}>
                      {position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Preferred Team Type</InputLabel>
                <Select
                  value={formData.preferredTeamGender}
                  label="Preferred Team Type"
                  onChange={(e) => handleInputChange('preferredTeamGender', e.target.value)}
                >
                  <MenuItem value="Boys">Boys Team</MenuItem>
                  <MenuItem value="Girls">Girls Team</MenuItem>
                  <MenuItem value="Mixed">Mixed Team</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* School and emergency contact fields intentionally omitted for parent-created child profiles */}

            <Grid item xs={12}>
              <TextField
                label="Player Bio"
                fullWidth
                multiline
                rows={3}
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Brief bio: football experience, development centre, academy, or key strengths..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>
            Cancel
          </Button>
          <Button 
            onClick={editingChild ? handleEditChild : handleAddChild}
            variant="contained"
          >
            {editingChild ? 'Update' : 'Add'} Child
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
};

export default ChildrenManagementPage;
