import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  IconButton
} from '@mui/material';
import {
  CalendarToday,
  Schedule,
  LocationOn,
  Person,
  Delete,
  Check,
  Close,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface TrainingInvitation {
  id: number;
  coachId: number;
  playerId: number;
  teamName: string;
  trainingLocation: string;
  trainingDate: string;
  trainingTime: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  responseMessage?: string;
  responseDate?: string;
  expiresAt: string;
  createdAt: string;
  // For received invitations (player view)
  coachFirstName?: string;
  coachLastName?: string;
  coachEmail?: string;
  // For sent invitations (coach view)
  playerFirstName?: string;
  playerLastName?: string;
  playerEmail?: string;
}

const TrainingInvitations: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<TrainingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseDialog, setResponseDialog] = useState<{
    open: boolean;
    invitation: TrainingInvitation | null;
    status: 'accepted' | 'declined' | null;
  }>({
    open: false,
    invitation: null,
    status: null
  });
  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCoach = user?.role === 'Coach';

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const type = isCoach ? 'sent' : 'received';
      const response = await api.get(`/training-invitations?type=${type}`);
      
      if (response.data.success) {
        setInvitations(response.data.invitations);
      }
    } catch (error) {
      console.error('Error fetching training invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseClick = (invitation: TrainingInvitation, status: 'accepted' | 'declined') => {
    setResponseDialog({
      open: true,
      invitation,
      status
    });
    setResponseMessage('');
  };

  const handleResponseSubmit = async () => {
    if (!responseDialog.invitation || !responseDialog.status) return;

    try {
      setSubmitting(true);
      const response = await api.put(`/training-invitations/${responseDialog.invitation.id}`, {
        status: responseDialog.status,
        responseMessage: responseMessage.trim() || undefined
      });

      if (response.data.success) {
        // Update the invitation in the list
        setInvitations(prev => prev.map(inv => 
          inv.id === responseDialog.invitation!.id 
            ? { ...inv, status: responseDialog.status!, responseMessage: responseMessage.trim() }
            : inv
        ));
        
        setResponseDialog({ open: false, invitation: null, status: null });
        setResponseMessage('');
        alert(`Training invitation ${responseDialog.status} successfully!`);
      }
    } catch (error: any) {
      console.error('Error responding to training invitation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to respond to invitation';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    if (!confirm('Are you sure you want to cancel this training invitation?')) {
      return;
    }

    try {
      const response = await api.delete(`/training-invitations/${invitationId}`);
      
      if (response.data.success) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        alert('Training invitation cancelled successfully');
      }
    } catch (error: any) {
      console.error('Error cancelling training invitation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to cancel invitation';
      alert(errorMessage);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM format
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  const renderInvitationCard = (invitation: TrainingInvitation) => {
    const expired = isExpired(invitation.expiresAt);
    const isPending = invitation.status === 'pending' && !expired;

    return (
      <Card key={invitation.id} sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <Typography variant="h6" gutterBottom>
                {invitation.teamName}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {invitation.trainingLocation}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarToday fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {formatDate(invitation.trainingDate)}
                </Typography>
                <Schedule fontSize="small" sx={{ ml: 2, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {formatTime(invitation.trainingTime)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Person fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {isCoach 
                    ? `${invitation.playerFirstName} ${invitation.playerLastName}`
                    : `${invitation.coachFirstName} ${invitation.coachLastName}`
                  }
                </Typography>
              </Box>

              {invitation.message && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  "{invitation.message}"
                </Typography>
              )}

              {invitation.responseMessage && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Response:</strong> {invitation.responseMessage}
                  </Typography>
                </Alert>
              )}
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', height: '100%' }}>
                <Chip
                  label={expired && invitation.status === 'pending' ? 'Expired' : invitation.status}
                  color={getStatusColor(expired && invitation.status === 'pending' ? 'expired' : invitation.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                  sx={{ mb: 2 }}
                />

                {!isCoach && isPending && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<Check />}
                      onClick={() => handleResponseClick(invitation, 'accepted')}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Close />}
                      onClick={() => handleResponseClick(invitation, 'declined')}
                    >
                      Decline
                    </Button>
                  </Box>
                )}

                {isCoach && invitation.status === 'pending' && !expired && (
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleCancelInvitation(invitation.id)}
                    sx={{ mt: 'auto' }}
                  >
                    <Delete />
                  </IconButton>
                )}
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #eee' }}>
            <Typography variant="caption" color="text.secondary">
              Sent: {formatDate(invitation.createdAt)}
              {!expired && invitation.status === 'pending' && (
                <> • Expires: {formatDate(invitation.expiresAt)}</>
              )}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Training Invitations
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchInvitations}
        >
          Refresh
        </Button>
      </Box>

      {invitations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {isCoach 
              ? "You haven't sent any training invitations yet."
              : "You haven't received any training invitations yet."
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isCoach 
              ? "Start connecting with players through the search page and send them training invites!"
              : "Coaches will send you training invitations when they're interested in your profile."
            }
          </Typography>
        </Paper>
      ) : (
        <Box>
          {invitations.map(invitation => renderInvitationCard(invitation))}
        </Box>
      )}

      {/* Response Dialog */}
      <Dialog open={responseDialog.open} onClose={() => !submitting && setResponseDialog({ open: false, invitation: null, status: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {responseDialog.status === 'accepted' ? 'Accept' : 'Decline'} Training Invitation
        </DialogTitle>
        <DialogContent>
          {responseDialog.invitation && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Team:</strong> {responseDialog.invitation.teamName}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Date & Time:</strong> {formatDate(responseDialog.invitation.trainingDate)} at {formatTime(responseDialog.invitation.trainingTime)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Location:</strong> {responseDialog.invitation.trainingLocation}
              </Typography>
              <TextField
                fullWidth
                label={`Response Message (Optional)`}
                multiline
                rows={3}
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                sx={{ mt: 2 }}
                placeholder={
                  responseDialog.status === 'accepted' 
                    ? "Thank you for the invitation! I'm looking forward to training with the team."
                    : "Thank you for considering me, but I won't be able to attend at this time."
                }
                inputProps={{ maxLength: 300 }}
                disabled={submitting}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialog({ open: false, invitation: null, status: null })} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleResponseSubmit}
            variant="contained"
            color={responseDialog.status === 'accepted' ? 'success' : 'error'}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : null}
          >
            {submitting ? 'Submitting...' : (responseDialog.status === 'accepted' ? 'Accept Invitation' : 'Decline Invitation')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TrainingInvitations;
