import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  OpenInNew,
  Add,
  Visibility
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import LeagueRequestDialog from '../components/LeagueRequestDialog';

interface UserLeagueRequest {
  id: number;
  name: string;
  region: string;
  ageGroup: string;
  url: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  reviewerName?: string;
}

const MyLeagueRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<UserLeagueRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New request dialog
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  
  // Details dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UserLeagueRequest | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyRequests();
    }
  }, [user]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/league-requests/my-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setRequests(data.requests || []);
      } else {
        setError(data.error || 'Failed to fetch your league requests');
      }

    } catch (error) {
      console.error('Error fetching league requests:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Pending />;
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      default: return undefined;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending': return 'Your request is being reviewed by administrators';
      case 'approved': return 'Your league has been approved and added to the system';
      case 'rejected': return 'Your request was not approved. See details for more information';
      default: return '';
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">
          Please log in to view your league requests.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My League Requests
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track the status of your submitted league requests and submit new ones.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setNewRequestOpen(true)}
        >
          Request New League
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{typeof error === 'string' ? error : JSON.stringify(error)}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No League Requests Yet
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            You haven't submitted any league requests. If you can't find your league in our system, 
            you can request it to be added.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setNewRequestOpen(true)}
          >
            Submit Your First Request
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {requests.map((request) => (
            <Grid item xs={12} md={6} key={request.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
                      {request.name}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(request.status)}
                      label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      color={getStatusColor(request.status) as any}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {getStatusMessage(request.status)}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    {request.region && (
                      <Typography variant="body2">
                        <strong>Region:</strong> {request.region}
                      </Typography>
                    )}
                    {request.ageGroup && (
                      <Typography variant="body2">
                        <strong>Age Group:</strong> {request.ageGroup}
                      </Typography>
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                    {request.reviewedAt && (
                      <> • Reviewed: {new Date(request.reviewedAt).toLocaleDateString()}</>
                    )}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelectedRequest(request);
                        setDetailsOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    {request.url && (
                      <Button
                        size="small"
                        variant="text"
                        endIcon={<OpenInNew />}
                        component={Link}
                        href={request.url}
                        target="_blank"
                        rel="noopener"
                      >
                        Website
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* New League Request Dialog */}
      <LeagueRequestDialog
        open={newRequestOpen}
        onClose={() => setNewRequestOpen(false)}
        onSuccess={() => {
          fetchMyRequests(); // Refresh the list
        }}
      />

      {/* Request Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          League Request Details
        </DialogTitle>

        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              {/* Basic Information */}
              <Typography variant="h6" gutterBottom>
                League Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <Typography><strong>Name:</strong> {selectedRequest.name}</Typography>
                </Grid>
                {selectedRequest.region && (
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Region:</strong> {selectedRequest.region}</Typography>
                  </Grid>
                )}
                {selectedRequest.ageGroup && (
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Age Group:</strong> {selectedRequest.ageGroup}</Typography>
                  </Grid>
                )}
                {selectedRequest.url && (
                  <Grid item xs={12}>
                    <Typography><strong>Website:</strong></Typography>
                    <Link href={selectedRequest.url} target="_blank" rel="noopener">
                      {selectedRequest.url} <OpenInNew fontSize="small" />
                    </Link>
                  </Grid>
                )}
                {selectedRequest.description && (
                  <Grid item xs={12}>
                    <Typography><strong>Description:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedRequest.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {/* Status Information */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                Request Status
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Chip
                    icon={getStatusIcon(selectedRequest.status)}
                    label={selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                    color={getStatusColor(selectedRequest.status) as any}
                    sx={{ mr: 2 }}
                  />
                  <Typography variant="body2">
                    {getStatusMessage(selectedRequest.status)}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  <strong>Submitted:</strong> {new Date(selectedRequest.submittedAt).toLocaleString()}
                </Typography>
                
                {selectedRequest.reviewedAt && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Reviewed:</strong> {new Date(selectedRequest.reviewedAt).toLocaleString()}
                    {selectedRequest.reviewerName && ` by ${selectedRequest.reviewerName}`}
                  </Typography>
                )}
              </Box>

              {/* Review Notes */}
              {selectedRequest.reviewNotes && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Admin Review Notes
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="body2">
                      {selectedRequest.reviewNotes}
                    </Typography>
                  </Paper>
                </>
              )}

              {/* Help Text */}
              {selectedRequest.status === 'pending' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Your request is currently being reviewed by our administrators. 
                  You'll receive an email notification once a decision has been made.
                </Alert>
              )}

              {selectedRequest.status === 'rejected' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  If you believe this decision was made in error or you have additional information, 
                  please contact our support team or submit a new request with more details.
                </Alert>
              )}

              {selectedRequest.status === 'approved' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Great news! Your league has been added to our system and is now available 
                  for users to select when posting vacancies or availability.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyLeagueRequests;
