import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  EmojiEvents as TrophyIcon,
  School as AcademyIcon,
  Event as EventIcon,
  Stadium as StadiumIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface TeamProfile {
  id?: number;
  teamName: string;
  clubName: string;
  establishedYear: number | null;
  teamDescription: string;
  homeGroundName: string;
  homeGroundAddress: string;
  trainingSchedule: string;
  hasRegularSocialEvents: boolean;
  socialEventsDescription: string;
  welcomesParentInvolvement: boolean;
  parentInvolvementDetails: string;
  attendsSummerTournaments: boolean;
  tournamentDetails: string;
  hasPathwayProgram: boolean;
  pathwayDescription: string;
  linkedAdultTeam: string;
  academyAffiliation: string;
  coachingPhilosophy: string;
  trainingFocus: string;
  developmentAreas: string;
  coachingStaff: string;
  teamAchievements: string;
  specialRequirements: string;
  equipmentProvided: string;
  seasonalFees: string;
  contactPreferences: string;
}

const TeamProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TeamProfile>({
    teamName: '',
    clubName: '',
    establishedYear: null,
    teamDescription: '',
    homeGroundName: '',
    homeGroundAddress: '',
    trainingSchedule: '',
    hasRegularSocialEvents: false,
    socialEventsDescription: '',
    welcomesParentInvolvement: true,
    parentInvolvementDetails: '',
    attendsSummerTournaments: false,
    tournamentDetails: '',
    hasPathwayProgram: false,
    pathwayDescription: '',
    linkedAdultTeam: '',
    academyAffiliation: '',
    coachingPhilosophy: '',
    trainingFocus: '',
    developmentAreas: '',
    coachingStaff: '',
    teamAchievements: '',
    specialRequirements: '',
    equipmentProvided: '',
    seasonalFees: '',
    contactPreferences: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === 'Coach') {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/team-profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.status === 404) {
        // No profile exists yet
        setProfile(null);
      } else if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData(data);
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If response is not JSON, create a generic error
          errorData = { error: 'Server returned an invalid response' };
        }
        setError(errorData.error || 'Failed to fetch team profile');
      }
    } catch (err) {
      setError('Failed to fetch team profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/team-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        setDialogOpen(false);
        await fetchProfile(); // Refresh the profile
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If response is not JSON, create a generic error
          errorData = { error: 'Server returned an invalid response' };
        }
        setError(errorData.error || 'Failed to save team profile');
      }
    } catch (err) {
      setError('Failed to save team profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your team profile?')) {
      return;
    }

    try {
      const response = await fetch('/api/team-profile', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setSuccess('Team profile deleted successfully');
        setProfile(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete team profile');
      }
    } catch (err) {
      setError('Failed to delete team profile');
    }
  };

  const handleInputChange = (field: keyof TeamProfile) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (user?.role !== 'Coach') {
    return (
      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <Alert severity="info">
          Team profiles are only available to coaches.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Team Profile
        </Typography>
        {profile ? (
          <Box>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{ mr: 2 }}
            >
              Edit Profile
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              Delete Profile
            </Button>
          </Box>
        ) : (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Create Team Profile
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {profile ? (
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon sx={{ mr: 1 }} />
                  Team Information
                </Typography>
                <Typography><strong>Team Name:</strong> {profile.teamName}</Typography>
                {profile.clubName && (
                  <Typography><strong>Club:</strong> {profile.clubName}</Typography>
                )}
                {profile.establishedYear && (
                  <Typography><strong>Established:</strong> {profile.establishedYear}</Typography>
                )}
                {profile.teamDescription && (
                  <Typography sx={{ mt: 1 }}><strong>Description:</strong></Typography>
                )}
                {profile.teamDescription && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{profile.teamDescription}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Training & Ground Info */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <StadiumIcon sx={{ mr: 1 }} />
                  Training & Venue
                </Typography>
                {profile.homeGroundName && (
                  <Typography><strong>Home Ground:</strong> {profile.homeGroundName}</Typography>
                )}
                {profile.homeGroundAddress && (
                  <Typography><strong>Address:</strong> {profile.homeGroundAddress}</Typography>
                )}
                {profile.trainingSchedule && (
                  <Typography sx={{ mt: 1 }}><strong>Training Schedule:</strong></Typography>
                )}
                {profile.trainingSchedule && (
                  <Typography variant="body2">{profile.trainingSchedule}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Features & Opportunities */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Team Features & Opportunities
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {profile.hasRegularSocialEvents && (
                    <Chip icon={<EventIcon />} label="Social Events" color="primary" />
                  )}
                  {profile.attendsSummerTournaments && (
                    <Chip icon={<TrophyIcon />} label="Summer Tournaments" color="primary" />
                  )}
                  {profile.hasPathwayProgram && (
                    <Chip icon={<AcademyIcon />} label="Pathway Program" color="primary" />
                  )}
                  {profile.welcomesParentInvolvement && (
                    <Chip icon={<GroupIcon />} label="Parent Involvement Welcome" color="secondary" />
                  )}
                </Box>

                {profile.hasRegularSocialEvents && profile.socialEventsDescription && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Social Events:</Typography>
                    <Typography variant="body2">{profile.socialEventsDescription}</Typography>
                  </Box>
                )}

                {profile.attendsSummerTournaments && profile.tournamentDetails && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Tournament Details:</Typography>
                    <Typography variant="body2">{profile.tournamentDetails}</Typography>
                  </Box>
                )}

                {profile.hasPathwayProgram && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Pathway Program:</Typography>
                    <Typography variant="body2">{profile.pathwayDescription}</Typography>
                    {profile.linkedAdultTeam && (
                      <Typography variant="body2"><strong>Linked Adult Team:</strong> {profile.linkedAdultTeam}</Typography>
                    )}
                    {profile.academyAffiliation && (
                      <Typography variant="body2"><strong>Academy Affiliation:</strong> {profile.academyAffiliation}</Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Coaching Philosophy */}
          {profile.coachingPhilosophy && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Coaching Philosophy
                  </Typography>
                  <Typography variant="body2">{profile.coachingPhilosophy}</Typography>
                  {profile.trainingFocus && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Training Focus:</Typography>
                      <Typography variant="body2">{profile.trainingFocus}</Typography>
                    </Box>
                  )}
                  {profile.developmentAreas && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Development Areas:</Typography>
                      <Typography variant="body2">{profile.developmentAreas}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Additional Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Additional Information
                </Typography>
                {profile.teamAchievements && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Team Achievements:</Typography>
                    <Typography variant="body2">{profile.teamAchievements}</Typography>
                  </Box>
                )}
                {profile.equipmentProvided && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Equipment Provided:</Typography>
                    <Typography variant="body2">{profile.equipmentProvided}</Typography>
                  </Box>
                )}
                {profile.seasonalFees && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Seasonal Fees:</Typography>
                    <Typography variant="body2">{profile.seasonalFees}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Coaching Staff */}
          {profile.coachingStaff && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Coaching Staff
                  </Typography>
                  <Typography variant="body2">{profile.coachingStaff}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Team Profile Found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create a team profile to showcase your team's information, features, and opportunities to potential players and parents.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Create Team Profile
          </Button>
        </Paper>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {profile ? 'Edit Team Profile' : 'Create Team Profile'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Team Name *"
                value={formData.teamName}
                onChange={handleInputChange('teamName')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Club Name"
                value={formData.clubName}
                onChange={handleInputChange('clubName')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Established Year"
                type="number"
                value={formData.establishedYear || ''}
                onChange={handleInputChange('establishedYear')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Team Description"
                multiline
                rows={3}
                value={formData.teamDescription}
                onChange={handleInputChange('teamDescription')}
              />
            </Grid>

            {/* Training & Venue */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                Training & Venue
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Home Ground Name"
                value={formData.homeGroundName}
                onChange={handleInputChange('homeGroundName')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Home Ground Address"
                value={formData.homeGroundAddress}
                onChange={handleInputChange('homeGroundAddress')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Training Schedule"
                multiline
                rows={2}
                placeholder="e.g., Tuesdays & Thursdays 6:00-7:30 PM, Saturdays 10:00 AM - 12:00 PM"
                value={formData.trainingSchedule}
                onChange={handleInputChange('trainingSchedule')}
              />
            </Grid>

            {/* Social & Community Features */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                Social & Community Features
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.hasRegularSocialEvents}
                    onChange={handleInputChange('hasRegularSocialEvents')}
                  />
                }
                label="Regular Social Events (Players & Parents)"
              />
            </Grid>
            
            {formData.hasRegularSocialEvents && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Social Events Description"
                  multiline
                  rows={2}
                  placeholder="Describe the type of social events you organize..."
                  value={formData.socialEventsDescription}
                  onChange={handleInputChange('socialEventsDescription')}
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.welcomesParentInvolvement}
                    onChange={handleInputChange('welcomesParentInvolvement')}
                  />
                }
                label="Welcomes Parent Involvement"
              />
            </Grid>
            
            {formData.welcomesParentInvolvement && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Parent Involvement Details"
                  multiline
                  rows={2}
                  placeholder="How can parents get involved with the team?"
                  value={formData.parentInvolvementDetails}
                  onChange={handleInputChange('parentInvolvementDetails')}
                />
              </Grid>
            )}

            {/* Development & Pathways */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                Development & Pathways
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.attendsSummerTournaments}
                    onChange={handleInputChange('attendsSummerTournaments')}
                  />
                }
                label="Attends Summer Tournaments"
              />
            </Grid>
            
            {formData.attendsSummerTournaments && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tournament Details"
                  multiline
                  rows={2}
                  placeholder="Which tournaments do you attend? What level?"
                  value={formData.tournamentDetails}
                  onChange={handleInputChange('tournamentDetails')}
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.hasPathwayProgram}
                    onChange={handleInputChange('hasPathwayProgram')}
                  />
                }
                label="Pathway Program to Adult Team/Academy"
              />
            </Grid>
            
            {formData.hasPathwayProgram && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Pathway Description"
                    multiline
                    rows={2}
                    placeholder="Describe the pathway opportunities available..."
                    value={formData.pathwayDescription}
                    onChange={handleInputChange('pathwayDescription')}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Linked Adult Team"
                    value={formData.linkedAdultTeam}
                    onChange={handleInputChange('linkedAdultTeam')}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Academy Affiliation"
                    value={formData.academyAffiliation}
                    onChange={handleInputChange('academyAffiliation')}
                  />
                </Grid>
              </>
            )}

            {/* Coaching Philosophy */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                Coaching Philosophy
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Coaching Philosophy"
                multiline
                rows={3}
                placeholder="Describe your coaching approach and philosophy..."
                value={formData.coachingPhilosophy}
                onChange={handleInputChange('coachingPhilosophy')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Training Focus"
                placeholder="e.g., Technical skills, Tactical awareness"
                value={formData.trainingFocus}
                onChange={handleInputChange('trainingFocus')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Development Areas"
                placeholder="e.g., Individual skill development, Team play"
                value={formData.developmentAreas}
                onChange={handleInputChange('developmentAreas')}
              />
            </Grid>

            {/* Additional Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                Additional Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Coaching Staff"
                multiline
                rows={2}
                placeholder="Information about your coaching team..."
                value={formData.coachingStaff}
                onChange={handleInputChange('coachingStaff')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Team Achievements"
                multiline
                rows={2}
                placeholder="Recent achievements, awards, league positions..."
                value={formData.teamAchievements}
                onChange={handleInputChange('teamAchievements')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Equipment Provided"
                placeholder="e.g., Training bibs, balls, match kit"
                value={formData.equipmentProvided}
                onChange={handleInputChange('equipmentProvided')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Seasonal Fees"
                placeholder="e.g., £200 per season, includes kit"
                value={formData.seasonalFees}
                onChange={handleInputChange('seasonalFees')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Special Requirements"
                multiline
                rows={2}
                placeholder="Any special requirements or considerations..."
                value={formData.specialRequirements}
                onChange={handleInputChange('specialRequirements')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={saving || !formData.teamName.trim()}
          >
            {saving ? <CircularProgress size={20} /> : (profile ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeamProfilePage;
