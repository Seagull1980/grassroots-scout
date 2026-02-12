import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Link,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  OpenInNew,
  Email,
  Phone,
  Person,
  LocationOn,
  Group
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UK_REGIONS } from '../constants/locations';

interface LeagueRequest {
  id: number;
  name: string;
  region: string;
  ageGroup: string;
  url: string;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: number;
  submitterName: string;
  submitterEmail: string;
  submittedAt: string;
  reviewedBy?: number;
  reviewerName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}




const LeagueRequestsAdmin: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [requests, setRequests] = useState<LeagueRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusCounts, setStatusCounts] = useState<{[key: string]: number}>({});
  
  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeagueRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // League data for approval
  const [leagueData, setLeagueData] = useState({
    name: '',
    region: '',
    ageGroup: '', 
    url: '',
    description: '',
    hits: 0
  });

  const statusOptions = ['all', 'pending', 'approved', 'rejected'];
  const currentStatus = statusOptions[tabValue];

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchRequests();
    }
  }, [user, tabValue]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const status = currentStatus === 'all' ? 'all' : currentStatus;
      
      const response = await fetch(`/api/league-requests/admin/all?status=${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setRequests(data.requests || []);
        setStatusCounts(data.statusCounts || {});
      } else {
        setError(data.error || 'Failed to fetch league requests');
      }

    } catch (error) {
      console.error('Error fetching league requests:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (request: LeagueRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes('');
    
    if (action === 'approve') {
      // Pre-populate league data from request
      setLeagueData({
        name: request.name,
        region: request.region,
        ageGroup: request.ageGroup,
        url: request.url,
        description: request.description,
        hits: 0
      });
    }
    
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;

    try {
      setSubmittingReview(true);
      const token = localStorage.getItem('token');
      
      const endpoint = `/api/league-requests/admin/${selectedRequest.id}/${reviewAction}`;
      const body: any = { reviewNotes };
      
      if (reviewAction === 'approve') {
        body.leagueData = leagueData;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        setReviewDialogOpen(false);
        setSelectedRequest(null);
        fetchRequests(); // Refresh the list
      } else {
        setError(data.error || `Failed to ${reviewAction} league request`);
      }

    } catch (error) {
      console.error(`Error ${reviewAction}ing league request:`, error);
      setError('Network error. Please try again.');
    } finally {
      setSubmittingReview(false);
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

  if (user?.role !== 'Admin') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          Admin access required to view league requests.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        League Requests Management
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Review and manage user-submitted league requests.
      </Typography>

      {/* Status Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Pending
              </Typography>
              <Typography variant="h4">
                {statusCounts.pending || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Approved
              </Typography>
              <Typography variant="h4">
                {statusCounts.approved || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                Rejected
              </Typography>
              <Typography variant="h4">
                {statusCounts.rejected || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Total
              </Typography>
              <Typography variant="h4">
                {Object.values(statusCounts).reduce((a, b) => a + b, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{typeof error === 'string' ? error : JSON.stringify(error)}</Alert>}

      {/* Tabs for filtering by status */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={`All (${Object.values(statusCounts).reduce((a, b) => a + b, 0)})`} />
          <Tab label={`Pending (${statusCounts.pending || 0})`} />
          <Tab label={`Approved (${statusCounts.approved || 0})`} />
          <Tab label={`Rejected (${statusCounts.rejected || 0})`} />
        </Tabs>
      </Paper>

      {/* Requests Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>League Name</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Age Group</TableCell>
                <TableCell>Submitted By</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No league requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {request.name}
                        </Typography>
                        {request.url && (
                          <Link href={request.url} target="_blank" rel="noopener">
                            <OpenInNew fontSize="small" />
                          </Link>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{request.region || 'N/A'}</TableCell>
                    <TableCell>{request.ageGroup || 'N/A'}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {request.submitterName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {request.submitterEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(request.status)}
                        label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        color={getStatusColor(request.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(request.submittedAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleOpenReview(request, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleOpenReview(request, 'reject')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            setSelectedRequest(request);
                            setReviewDialogOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedRequest && (
            reviewAction === 'approve' ? `Approve League: ${selectedRequest.name}` :
            reviewAction === 'reject' ? `Reject League: ${selectedRequest.name}` :
            `League Request Details: ${selectedRequest.name}`
          )}
        </DialogTitle>

        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              {/* League Information */}
              <Typography variant="h6" gutterBottom>
                League Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Group sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography><strong>Name:</strong> {selectedRequest.name}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography><strong>Region:</strong> {selectedRequest.region || 'N/A'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Age Group:</strong> {selectedRequest.ageGroup || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  {selectedRequest.url && (
                    <Link href={selectedRequest.url} target="_blank" rel="noopener">
                      Visit Website <OpenInNew fontSize="small" />
                    </Link>
                  )}
                </Grid>
                {selectedRequest.description && (
                  <Grid item xs={12}>
                    <Typography><strong>Description:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedRequest.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {/* Contact Information */}
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Person sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{selectedRequest.contactName}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Email sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{selectedRequest.contactEmail}</Typography>
                  </Box>
                </Grid>
                {selectedRequest.contactPhone && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography>{selectedRequest.contactPhone}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>

              {/* Justification */}
              <Typography variant="h6" gutterBottom>
                Justification
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="body2">
                  {selectedRequest.justification}
                </Typography>
              </Paper>

              {/* Review Section */}
              {selectedRequest.status === 'pending' && (reviewAction === 'approve' || reviewAction === 'reject') && (
                <>
                  <Divider sx={{ my: 3 }} />
                  
                  {reviewAction === 'approve' && (
                    <>
                      <Typography variant="h6" gutterBottom>
                        League Data (Edit if needed)
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="League Name"
                            fullWidth
                            value={leagueData.name}
                            onChange={(e) => setLeagueData({ ...leagueData, name: e.target.value })}
                            disabled={submittingReview}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth disabled={submittingReview}>
                            <InputLabel>Region</InputLabel>
                            <Select
                              value={leagueData.region}
                              label="Region"
                              displayEmpty
                              onChange={(e) => setLeagueData({ ...leagueData, region: e.target.value as string })}
                              renderValue={(selected) => (selected ? selected : 'Select region')}
                            >
                              {UK_REGIONS.map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Age Group"
                            fullWidth
                            value={leagueData.ageGroup}
                            onChange={(e) => setLeagueData({ ...leagueData, ageGroup: e.target.value })}
                            disabled={submittingReview}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Website URL"
                            fullWidth
                            value={leagueData.url}
                            onChange={(e) => setLeagueData({ ...leagueData, url: e.target.value })}
                            disabled={submittingReview}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={3}
                            value={leagueData.description}
                            onChange={(e) => setLeagueData({ ...leagueData, description: e.target.value })}
                            disabled={submittingReview}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Initial Hits/Popularity"
                            fullWidth
                            type="number"
                            value={leagueData.hits}
                            onChange={(e) => setLeagueData({ ...leagueData, hits: parseInt(e.target.value) || 0 })}
                            disabled={submittingReview}
                          />
                        </Grid>
                      </Grid>
                    </>
                  )}

                  <Typography variant="h6" gutterBottom>
                    Review Notes {reviewAction === 'reject' && '*'}
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    disabled={submittingReview}
                    placeholder={
                      reviewAction === 'approve' 
                        ? "Optional notes about the approval..."
                        : "Required: Please explain why this league request is being rejected..."
                    }
                  />
                </>
              )}

              {/* Show existing review if already processed */}
              {selectedRequest.status !== 'pending' && selectedRequest.reviewNotes && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>
                    Review Notes
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="body2">
                      {selectedRequest.reviewNotes}
                    </Typography>
                  </Paper>
                  <Typography variant="caption" color="text.secondary">
                    Reviewed by {selectedRequest.reviewerName} on {selectedRequest.reviewedAt && new Date(selectedRequest.reviewedAt).toLocaleDateString()}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)} disabled={submittingReview}>
            {selectedRequest?.status === 'pending' ? 'Cancel' : 'Close'}
          </Button>
          {selectedRequest?.status === 'pending' && (reviewAction === 'approve' || reviewAction === 'reject') && (
            <Button
              onClick={handleSubmitReview}
              variant="contained"
              color={reviewAction === 'approve' ? 'success' : 'error'}
              disabled={submittingReview || (reviewAction === 'reject' && !reviewNotes.trim())}
              startIcon={submittingReview ? <CircularProgress size={16} /> : null}
            >
              {submittingReview ? 'Processing...' : 
               reviewAction === 'approve' ? 'Approve & Create League' : 'Reject Request'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LeagueRequestsAdmin;
