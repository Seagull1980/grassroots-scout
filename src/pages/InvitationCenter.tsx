import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import api, { API_URL } from '../services/api';

interface Invitation {
  id: number;
  teamId: number;
  teamName: string;
  role: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  expiresAt: string;
  invitationToken?: string;
}

const InvitationCenter: React.FC = () => {
  const apiPrefix = API_URL ? '' : '/api';
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [responseDialog, setResponseDialog] = useState(false);
  const [response, setResponse] = useState<'accept' | 'reject' | null>(null);
  const [tokenFromEmail, setTokenFromEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check if we arrived here from an email link with a token
    const savedToken = localStorage.getItem('invitationToken');
    if (savedToken) {
      setTokenFromEmail(savedToken);
      // Clear it so it only uses it once per page load
      localStorage.removeItem('invitationToken');
    }
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const result = await api.get(`${apiPrefix}/invitations`);
      setInvitations(result.data.invitations || []);
      setError('');
    } catch (err: any) {
      console.error('Error loading invitations:', err);
      setError('Failed to load invitations');
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  // If user arrived via email link with a token, auto-accept that invitation
  useEffect(() => {
    if (tokenFromEmail && invitations.length > 0) {
      const matchingInvitation = invitations.find(
        i => i.invitationToken === tokenFromEmail && i.status === 'pending'
      );
      
      if (matchingInvitation) {
        setSelectedInvitation(matchingInvitation);
        setResponse('accept');
        setResponseDialog(true);
      } else {
        setError('Could not find matching invitation. Please select one below.');
      }
    }
  }, [tokenFromEmail, invitations]);

  const handleRespondClick = (invitation: Invitation, action: 'accept' | 'reject') => {
    setSelectedInvitation(invitation);
    setResponse(action);
    setResponseDialog(true);
  };

  const handleConfirmResponse = async () => {
    if (!selectedInvitation || !response) return;

    try {
      setResponding(true);
      const endpoint = response === 'accept' 
        ? `${apiPrefix}/invitations/${selectedInvitation.id}/accept`
        : `${apiPrefix}/invitations/${selectedInvitation.id}/reject`;

      await api.post(endpoint);
      
      setResponseDialog(false);
      setSelectedInvitation(null);
      setResponse(null);
      
      // Reload invitations
      await loadInvitations();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${response} invitation`);
    } finally {
      setResponding(false);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getDaysUntilExpiration = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Team Invitations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage invitations to join teams as a coach
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {pendingInvitations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ScheduleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Pending Invitations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              When coaches invite you to join their teams, invitations will appear here.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {pendingInvitations.map((invitation) => (
            <Card key={invitation.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {invitation.teamName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Invited by <strong>{invitation.invitedBy}</strong>
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={invitation.role}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }}
                      />
                      {isExpired(invitation.expiresAt) ? (
                        <Chip
                          label="Expired"
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label={`Expires in ${getDaysUntilExpiration(invitation.expiresAt)} days`}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckIcon />}
                    onClick={() => handleRespondClick(invitation, 'accept')}
                    disabled={isExpired(invitation.expiresAt) || responding}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CloseIcon />}
                    onClick={() => handleRespondClick(invitation, 'reject')}
                    disabled={responding}
                  >
                    Decline
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {invitations.length > pendingInvitations.length && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Past Invitations
          </Typography>
          <Stack spacing={2}>
            {invitations
              .filter(i => i.status !== 'pending')
              .map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {invitation.teamName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Invited by <strong>{invitation.invitedBy}</strong>
                        </Typography>
                      </Box>
                      <Chip
                        label={invitation.status === 'accepted' ? 'Accepted ✓' : 'Declined'}
                        color={invitation.status === 'accepted' ? 'success' : 'error'}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
          </Stack>
        </Box>
      )}

      {/* Response Confirmation Dialog */}
      <Dialog open={responseDialog} onClose={() => setResponseDialog(false)}>
        <DialogTitle>
          {response === 'accept' ? 'Accept Invitation?' : 'Decline Invitation?'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {response === 'accept'
              ? `Are you sure you want to accept the invitation to join ${selectedInvitation?.teamName}?`
              : `Are you sure you want to decline the invitation to join ${selectedInvitation?.teamName}?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialog(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmResponse}
            variant="contained"
            color={response === 'accept' ? 'success' : 'error'}
            disabled={responding}
          >
            {responding ? <CircularProgress size={24} /> : response === 'accept' ? 'Accept' : 'Decline'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvitationCenter;
