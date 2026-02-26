import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Grid,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  VerifiedUser as VerifiedIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { familyRelationshipsAPI, coachChildrenAPI, FamilyRelationship, CoachChild } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const FamilyRelationshipsPage: React.FC = () => {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [coachChildren, setCoachChildren] = useState<CoachChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [coachChildDialogOpen, setCoachChildDialogOpen] = useState(false);

  // Form state for family relationship
  const [formData, setFormData] = useState({
    childId: '',
    relatedUserId: '',
    relationship: 'parent' as 'parent' | 'child' | 'sibling' | 'guardian',
    notes: '',
  });

  // Form state for coach-child link
  const [coachChildForm, setCoachChildForm] = useState({
    childId: '',
    relationshipType: 'parent' as 'parent' | 'guardian' | 'step_parent',
    teamId: '',
    notes: '',
  });

  const isCoach = user?.role === 'Coach';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load family relationships
      const relationshipsData = await familyRelationshipsAPI.getAll();
      setRelationships(relationshipsData.relationships);

      // Load coach-children relationships if user is a coach
      if (isCoach) {
        try {
          const coachChildrenData = await coachChildrenAPI.getAll();
          setCoachChildren(coachChildrenData.children);
        } catch (err) {
          // This might fail if user is not a coach, which is fine
          console.log('Could not load coach children:', err);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load family relationships');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRelationship = async () => {
    try {
      setError('');
      setSuccess('');

      const data: any = {
        relationship: formData.relationship,
        notes: formData.notes || undefined,
      };

      // Only send one of childId or relatedUserId
      if (formData.childId) {
        data.childId = parseInt(formData.childId);
      } else if (formData.relatedUserId) {
        data.relatedUserId = parseInt(formData.relatedUserId);
      } else {
        setError('Please provide either a Child ID or Related User ID');
        return;
      }

      await familyRelationshipsAPI.create(data);
      setSuccess('Family relationship created successfully');
      setDialogOpen(false);
      setFormData({
        childId: '',
        relatedUserId: '',
        relationship: 'parent',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create relationship');
    }
  };

  const handleCreateCoachChild = async () => {
    try {
      setError('');
      setSuccess('');

      if (!coachChildForm.childId) {
        setError('Please provide a Child ID');
        return;
      }

      const data: any = {
        childId: parseInt(coachChildForm.childId),
        relationshipType: coachChildForm.relationshipType,
        notes: coachChildForm.notes || undefined,
      };

      if (coachChildForm.teamId) {
        data.teamId = parseInt(coachChildForm.teamId);
      }

      await coachChildrenAPI.create(data);
      setSuccess('Child linked to coach account successfully');
      setCoachChildDialogOpen(false);
      setCoachChildForm({
        childId: '',
        relationshipType: 'parent',
        teamId: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to link child');
    }
  };

  const handleDeleteRelationship = async (relationshipId: number) => {
    if (!window.confirm('Are you sure you want to remove this family relationship?')) {
      return;
    }

    try {
      setError('');
      await familyRelationshipsAPI.delete(relationshipId);
      setSuccess('Relationship removed successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove relationship');
    }
  };

  const handleDeleteCoachChild = async (relationshipId: number) => {
    if (!window.confirm('Are you sure you want to unlink this child from your coach account?')) {
      return;
    }

    try {
      setError('');
      await coachChildrenAPI.delete(relationshipId);
      setSuccess('Child unlinked successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unlink child');
    }
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'parent':
        return 'primary';
      case 'child':
        return 'secondary';
      case 'guardian':
        return 'success';
      case 'sibling':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom display="flex" alignItems="center">
          <PeopleIcon sx={{ mr: 2, fontSize: 40 }} />
          Family Relationships
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage family connections and track relationships with children in the system
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {isCoach && (
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.50' }}>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <VerifiedIcon sx={{ mr: 1 }} /> Coach Account - Children
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            As a coach, you can link your children to your account to track them across teams,
            including whether they play in your team or other teams.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCoachChildDialogOpen(true)}
          >
            Link Child to Coach Account
          </Button>

          {coachChildren.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Your Children ({coachChildren.length})
              </Typography>
              <Grid container spacing={2}>
                {coachChildren.map((child) => (
                  <Grid item xs={12} md={6} key={child.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6">
                              {child.firstName} {child.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Relationship: {child.relationshipType}
                            </Typography>
                            {child.dateOfBirth && (
                              <Typography variant="body2" color="text.secondary">
                                DOB: {new Date(child.dateOfBirth).toLocaleDateString()}
                              </Typography>
                            )}
                            {child.preferredPosition && (
                              <Typography variant="body2" color="text.secondary">
                                Position: {child.preferredPosition}
                              </Typography>
                            )}
                            <Box sx={{ mt: 1 }}>
                              {child.inSameTeam ? (
                                <Chip
                                  label="In Your Team"
                                  color="success"
                                  size="small"
                                  icon={<VerifiedIcon />}
                                />
                              ) : (
                                <Chip
                                  label="Different Team"
                                  color="default"
                                  size="small"
                                />
                              )}
                              {child.relationshipVerified && (
                                <Chip
                                  label="Verified"
                                  color="primary"
                                  size="small"
                                  icon={<VerifiedIcon />}
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                            {child.currentTeamName && (
                              <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                                Current Team: {child.currentTeamName} ({child.currentTeamAgeGroup})
                              </Typography>
                            )}
                          </Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteCoachChild(child.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        {child.notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Notes: {child.notes}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">All Family Relationships</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Relationship
        </Button>
      </Box>

      {relationships.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No family relationships found. Click "Add Relationship" to create one.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {relationships.map((rel) => (
            <Grid item xs={12} md={6} key={rel.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Chip
                          label={rel.relationship}
                          color={getRelationshipColor(rel.relationship) as any}
                          size="small"
                        />
                        {rel.verifiedBy && (
                          <Chip
                            label="Verified"
                            icon={<VerifiedIcon />}
                            color="success"
                            size="small"
                          />
                        )}
                      </Box>
                      <Typography variant="h6">
                        {rel.relatedName || 'Unknown'}
                      </Typography>
                      {rel.relatedDateOfBirth && (
                        <Typography variant="body2" color="text.secondary">
                          DOB: {new Date(rel.relatedDateOfBirth).toLocaleDateString()}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Created: {new Date(rel.createdAt).toLocaleDateString()}
                      </Typography>
                      {rel.notes && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {rel.notes}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRelationship(rel.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Family Relationship Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Family Relationship</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Provide either a Child ID (from Children Management) OR a Related User ID, not both.
            </Alert>

            <TextField
              fullWidth
              label="Child ID"
              type="number"
              value={formData.childId}
              onChange={(e) => setFormData({ ...formData, childId: e.target.value, relatedUserId: '' })}
              sx={{ mb: 2 }}
              helperText="ID from your Children Management page"
            />

            <Typography variant="body2" align="center" sx={{ mb: 2 }}>
              - OR -
            </Typography>

            <TextField
              fullWidth
              label="Related User ID"
              type="number"
              value={formData.relatedUserId}
              onChange={(e) => setFormData({ ...formData, relatedUserId: e.target.value, childId: '' })}
              sx={{ mb: 2 }}
              helperText="ID of another registered user"
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Relationship Type</InputLabel>
              <Select
                value={formData.relationship}
                label="Relationship Type"
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value as any })}
              >
                <MenuItem value="parent">Parent</MenuItem>
                <MenuItem value="child">Child</MenuItem>
                <MenuItem value="guardian">Guardian</MenuItem>
                <MenuItem value="sibling">Sibling</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRelationship} variant="contained">
            Create Relationship
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link Coach-Child Dialog */}
      <Dialog open={coachChildDialogOpen} onClose={() => setCoachChildDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Link Child to Coach Account</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Link your child to track them across teams. The child must already exist in the Children Management system.
            </Alert>

            <TextField
              fullWidth
              label="Child ID"
              type="number"
              value={coachChildForm.childId}
              onChange={(e) => setCoachChildForm({ ...coachChildForm, childId: e.target.value })}
              sx={{ mb: 2 }}
              required
              helperText="ID from Children Management page"
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Relationship Type</InputLabel>
              <Select
                value={coachChildForm.relationshipType}
                label="Relationship Type"
                onChange={(e) => setCoachChildForm({ ...coachChildForm, relationshipType: e.target.value as any })}
              >
                <MenuItem value="parent">Parent</MenuItem>
                <MenuItem value="guardian">Guardian</MenuItem>
                <MenuItem value="step_parent">Step Parent</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Team ID (Optional)"
              type="number"
              value={coachChildForm.teamId}
              onChange={(e) => setCoachChildForm({ ...coachChildForm, teamId: e.target.value })}
              sx={{ mb: 2 }}
              helperText="If child is in one of your teams, provide the team ID"
            />

            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={coachChildForm.notes}
              onChange={(e) => setCoachChildForm({ ...coachChildForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCoachChildDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateCoachChild} variant="contained">
            Link Child
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FamilyRelationshipsPage;
