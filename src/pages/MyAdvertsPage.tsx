import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Menu,
  MenuItem,
  Divider,
  Checkbox,
  FormControlLabel,
  Modal,
  Switch,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Bookmark as BookmarkIcon,
  Close as CloseIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Home,
  GetApp as GetAppIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

interface Advert {
  id: number;
  title: string;
  description: string;
  league: string;
  ageGroup: string;
  position?: string;
  positions?: string[];
  location: string;
  status: string;
  createdAt: string;
  postedBy?: number;
  teamId?: number;
  teamName?: string;
  // Metrics (these will default to 0 during implementation)
  views?: number;
  saved_count?: number;
  inquiries_count?: number;
  paused?: boolean;
  closed_reason?: string;
}

const MyAdvertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Main state
  const [vacancies, setVacancies] = useState<Advert[]>([]);
  const [playerAvailabilities, setPlayerAvailabilities] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdvert, setSelectedAdvert] = useState<Advert | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAdvert, setMenuAdvert] = useState<Advert | null>(null);
  
  // Bulk selection
  const [selectedAdverts, setSelectedAdverts] = useState<Set<number>>(new Set());
  
  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAdvert, setPreviewAdvert] = useState<Advert | null>(null);
  
  // Analytics modal
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsAdvert, setAnalyticsAdvert] = useState<Advert | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Closing dialog
  const [closeReasonDialogOpen, setCloseReasonDialogOpen] = useState(false);

  useEffect(() => {
    loadAdverts();
  }, [user?.id]);

  const loadAdverts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/my-adverts');
      setVacancies(response.data.vacancies || []);
      setPlayerAvailabilities(response.data.playerAvailabilities || []);
      setError('');
    } catch (err: any) {
      console.error('Error loading adverts:', err);
      setError(err.response?.data?.error || 'Failed to load your adverts');
      setVacancies([]);
      setPlayerAvailabilities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, advert: Advert) => {
    setAnchorEl(event.currentTarget);
    setMenuAdvert(advert);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuAdvert(null);
  };

  const handleTogglePause = async () => {
    if (!menuAdvert) return;
    try {
      const newPausedState = !menuAdvert.paused;
      await api.put(`/api/adverts/${menuAdvert.id}/status`, {
        paused: newPausedState
      });
      
      setSuccess(newPausedState ? 'Advert paused' : 'Advert resumed');
      loadAdverts();
      handleMenuClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update advert status');
    }
  };

  const handleCloseClick = (advert: Advert) => {
    setSelectedAdvert(advert);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseAdvert = async (reason: string) => {
    if (!selectedAdvert) return;
    try {
      await api.post(`/api/adverts/${selectedAdvert.id}/close`, {
        reason
      });
      setSuccess(`Advert closed: ${reason}`);
      loadAdverts();
      setDeleteDialogOpen(false);
      setSelectedAdvert(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to close advert');
    }
  };

  const handleDelete = async () => {
    if (!selectedAdvert) return;
    try {
      const advertType = 'position' in selectedAdvert ? 'vacancy' : 'player';
      await api.delete(`/api/adverts/${selectedAdvert.id}`, {
        data: { type: advertType }
      });
      setSuccess('Advert deleted');
      loadAdverts();
      setDeleteDialogOpen(false);
      setSelectedAdvert(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete advert');
    }
  };

  // New feature handlers
  const handleSelectAdvert = (advertId: number) => {
    const newSelected = new Set(selectedAdverts);
    if (newSelected.has(advertId)) {
      newSelected.delete(advertId);
    } else {
      newSelected.add(advertId);
    }
    setSelectedAdverts(newSelected);
  };

  const handleSelectAllAdverts = () => {
    if (selectedAdverts.size > 0) {
      setSelectedAdverts(new Set());
    } else {
      const allIds = [
        ...vacancies.map(v => v.id),
        ...playerAvailabilities.map(a => a.id)
      ];
      setSelectedAdverts(new Set(allIds));
    }
  };

  const handleBulkPause = async () => {
    if (selectedAdverts.size === 0) return;
    try {
      await api.post('/api/adverts/bulk/pause', {
        advertIds: Array.from(selectedAdverts),
        paused: true
      });
      setSuccess(`${selectedAdverts.size} adverts paused`);
      setSelectedAdverts(new Set());
      loadAdverts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to pause adverts');
    }
  };

  const handleBulkCloseConfirm = async (reason: string) => {
    if (selectedAdverts.size === 0) return;
    try {
      await api.post('/api/adverts/bulk/close', {
        advertIds: Array.from(selectedAdverts),
        reason: reason
      });
      setSuccess(`${selectedAdverts.size} adverts closed`);
      setSelectedAdverts(new Set());
      setCloseReasonDialogOpen(false);
      loadAdverts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to close adverts');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/api/adverts/export?format=csv', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `adverts_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setSuccess('Adverts exported as CSV');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to export adverts');
    }
  };

  const handleRepost = async (advert: Advert) => {
    try {
      await api.post(`/api/adverts/${advert.id}/repost`);
      setSuccess('Advert reposted successfully! Redirecting...');
      setTimeout(() => {
        navigate('/my-adverts');
        loadAdverts();
      }, 1500);
      handleMenuClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to repost advert');
    }
  };

  const handlePreview = (advert: Advert) => {
    setPreviewAdvert(advert);
    setPreviewOpen(true);
    handleMenuClose();
  };

  const handleViewAnalytics = async (advert: Advert) => {
    try {
      setAnalyticsAdvert(advert);
      setAnalyticsLoading(true);
      setAnalyticsOpen(true);
      
      const response = await api.get(`/api/adverts/${advert.id}/analytics`);
      setAnalytics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
    handleMenuClose();
  };

  const handleAutoExtend = async (advert: Advert, enabled: boolean) => {
    try {
      await api.put(`/api/adverts/${advert.id}/auto-extend`, {
        autoExtend: enabled
      });
      setSuccess(enabled ? 'Auto-extend enabled' : 'Auto-extend disabled');
      loadAdverts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update auto-extend');
    }
  };

  const handleTrackView = async (advertId: number) => {
    try {
      await api.post(`/api/adverts/${advertId}/track-view`);
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  const getStatusColor = (advert: Advert): 'success' | 'warning' | 'error' | 'default' => {
    if (advert.paused) return 'warning';
    if (advert.closed_reason) return 'error';
    if (advert.status === 'expired') return 'error';
    return 'success';
  };

  const getStatusLabel = (advert: Advert): string => {
    if (advert.paused) return 'Paused';
    if (advert.closed_reason) return 'Closed';
    if (advert.status === 'expired') return 'Expired';
    return 'Active';
  };

  const renderAdvertCard = (advert: Advert) => (
    <Grid item xs={12} sm={6} md={4} key={advert.id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Checkbox Overlay */}
        <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
          <Checkbox
            checked={selectedAdverts.has(advert.id)}
            onChange={() => handleSelectAdvert(advert.id)}
          />
        </Box>

        <CardContent sx={{ flexGrow: 1, pt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom noWrap>
                {advert.title}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, advert)}
              aria-label="more options"
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={getStatusLabel(advert)}
              color={getStatusColor(advert)}
              size="small"
              variant={advert.paused ? 'outlined' : 'filled'}
            />
            {advert.ageGroup && (
              <Chip label={advert.ageGroup} size="small" variant="outlined" />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
            {advert.description.substring(0, 100)}...
          </Typography>

          {advert.league && (
            <Typography variant="body2" gutterBottom>
              <strong>League:</strong> {advert.league}
            </Typography>
          )}

          {(advert.position || (advert.positions && advert.positions.length > 0)) && (
            <Typography variant="body2" gutterBottom>
              <strong>Position:</strong> {advert.position || advert.positions?.join(', ')}
            </Typography>
          )}

          {advert.location && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              📍 {advert.location}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Metrics */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, fontSize: '0.875rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ViewIcon fontSize="small" />
                <Typography variant="caption">{advert.views || 0} views</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BookmarkIcon fontSize="small" />
                <Typography variant="caption">{advert.saved_count || 0} saves</Typography>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {new Date(advert.createdAt).toLocaleDateString()}
            </Typography>
          </Box>

          {/* Auto-extend toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={advert.views !== undefined ? false : true}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAutoExtend(advert, e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="caption">Auto-extend</Typography>}
            labelPlacement="start"
            sx={{ ml: 0 }}
          />
        </CardContent>

        <CardActions sx={{ pt: 0, flexDirection: 'column', gap: 1 }}>
          <Box sx={{ width: '100%', display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/edit-advert/${advert.id}`)}
              sx={{ flex: 1 }}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<ViewIcon />}
              onClick={() => {
                handleTrackView(advert.id);
                handlePreview(advert);
              }}
            >
              Preview
            </Button>
          </Box>
          <Button
            size="small"
            fullWidth
            variant="text"
            startIcon={<TrendingUpIcon />}
            onClick={() => handleViewAnalytics(advert)}
          >
            Analytics
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">Please log in to view your adverts.</Alert>
      </Container>
    );
  }

  const hasVacancies = user.role === 'Coach';
  const hasPlayerAdverts = user.role === 'Player' || user.role === 'Parent/Guardian';

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="My Adverts"
        subtitle="Manage your posted vacancies and availability listings"
        icon={<AssessmentIcon sx={{ fontSize: 32 }} />}
        actions={(
          <Button
            startIcon={<Home />}
            onClick={() => navigate('/dashboard')}
            sx={{
              borderColor: 'rgba(255,255,255,0.6)',
              color: 'white',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.12)' },
            }}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
        )}
      />
      <Container maxWidth="lg" sx={{ py: 3 }}>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Bulk Actions Toolbar */}
          {selectedAdverts.size > 0 && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>
                  {selectedAdverts.size} advert{selectedAdverts.size !== 1 ? 's' : ''} selected
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleBulkPause}
                  startIcon={<PauseIcon />}
                >
                  Pause All
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setCloseReasonDialogOpen(true)}
                  startIcon={<CloseIcon />}
                >
                  Close All
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSelectedAdverts(new Set());
                  }}
                >
                  Clear Selection
                </Button>
              </Box>
            </Paper>
          )}

          {/* Export Button */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<GetAppIcon />}
              onClick={handleExport}
            >
              Export Adverts
            </Button>
          </Box>

          {/* Select All Checkbox */}
          {((hasVacancies && vacancies.length > 0) || (hasPlayerAdverts && playerAvailabilities.length > 0)) && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedAdverts.size > 0 && selectedAdverts.size === (vacancies.length + playerAvailabilities.length)}
                    indeterminate={selectedAdverts.size > 0 && selectedAdverts.size < (vacancies.length + playerAvailabilities.length)}
                    onChange={handleSelectAllAdverts}
                  />
                }
                label="Select all"
              />
            </Box>
          )}

          {hasVacancies && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Team Vacancies
              </Typography>
              {vacancies.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    You haven't posted any team vacancies yet.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/post-advert')}
                  >
                    Post Your First Vacancy
                  </Button>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {vacancies.map(renderAdvertCard)}
                </Grid>
              )}
            </Box>
          )}

          {hasPlayerAdverts && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Player Availability
              </Typography>
              {playerAvailabilities.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    You haven't posted any player availability listings yet.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/post-advert')}
                  >
                    Post Your Availability
                  </Button>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {playerAvailabilities.map(renderAdvertCard)}
                </Grid>
              )}
            </Box>
          )}

          {vacancies.length === 0 && playerAvailabilities.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Adverts Yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Start by posting a new advert to connect with the grassroots football community.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/post-advert')}
              >
                Create New Advert
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={handleTogglePause}
          disabled={!menuAdvert}
        >
          {menuAdvert?.paused ? (
            <>
              <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
              Resume
            </>
          ) : (
            <>
              <PauseIcon fontSize="small" sx={{ mr: 1 }} />
              Pause
            </>
          )}
        </MenuItem>
        <MenuItem
          onClick={() => menuAdvert && handleCloseClick(menuAdvert)}
        >
          <CloseIcon fontSize="small" sx={{ mr: 1 }} />
          Close
        </MenuItem>
        <MenuItem
          onClick={() => navigate(`/edit-advert/${menuAdvert?.id}`)}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            menuAdvert && handleRepost(menuAdvert);
            handleMenuClose();
          }}
        >
          <TrendingUpIcon fontSize="small" sx={{ mr: 1 }} />
          Repost
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleMenuClose();
            setSelectedAdvert(menuAdvert);
            setDeleteDialogOpen(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Close/Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedAdvert?.closed_reason ? 'Delete Advert' : 'Close Advert'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {selectedAdvert?.closed_reason
              ? 'Are you sure you want to permanently delete this advert? This cannot be undone.'
              : 'Why are you closing this advert?'}
          </Typography>
          {!selectedAdvert?.closed_reason && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => handleCloseAdvert('filled')}
              >
                Position Filled
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleCloseAdvert('no_longer_available')}
              >
                No Longer Available
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleCloseAdvert('other')}
              >
                Other Reason
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          {selectedAdvert?.closed_reason && (
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Bulk Close Reason Dialog */}
      <Dialog open={closeReasonDialogOpen} onClose={() => setCloseReasonDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Close Selected Adverts</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Why are you closing these adverts?
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => handleBulkCloseConfirm('filled')}
            >
              Position Filled
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleBulkCloseConfirm('no_longer_available')}
            >
              No Longer Available
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleBulkCloseConfirm('other')}
            >
              Other Reason
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseReasonDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advert Preview Modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 500,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          {previewAdvert && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Quick Preview</Typography>
                <IconButton onClick={() => setPreviewOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>{previewAdvert.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Posted {new Date(previewAdvert.createdAt).toLocaleDateString()}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {previewAdvert.description}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  {previewAdvert.league && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">League</Typography>
                      <Typography variant="body1">{previewAdvert.league}</Typography>
                    </Box>
                  )}
                  {previewAdvert.ageGroup && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Age Group</Typography>
                      <Typography variant="body1">{previewAdvert.ageGroup}</Typography>
                    </Box>
                  )}
                  {previewAdvert.location && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Location</Typography>
                      <Typography variant="body1">{previewAdvert.location}</Typography>
                    </Box>
                  )}
                  {(previewAdvert.position || previewAdvert.positions) && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Position</Typography>
                      <Typography variant="body1">
                        {Array.isArray(previewAdvert.positions) 
                          ? previewAdvert.positions.join(', ') 
                          : previewAdvert.position}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label={`${previewAdvert.views || 0} Views`} size="small" />
                  <Chip label={`${previewAdvert.saved_count || 0} Saves`} size="small" />
                  <Chip label={`${previewAdvert.inquiries_count || 0} Inquiries`} size="small" />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" fullWidth onClick={() => {
                  setPreviewOpen(false);
                  navigate(`/edit-advert/${previewAdvert.id}`);
                }}>
                  Edit Advert
                </Button>
                <Button variant="outlined" fullWidth onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* Analytics Modal */}
      <Modal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 600,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          {analyticsAdvert && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Analytics - {analyticsAdvert.title}</Typography>
                <IconButton onClick={() => setAnalyticsOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {analyticsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : analytics ? (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                    Performance Metrics
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {analytics.views}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Views
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {analytics.saves}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Saves
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {analytics.inquiries}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Inquiries
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {analytics.daysActive}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Days Active
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {analytics.recommendations && analytics.recommendations.length > 0 && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Recommendations
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                        {analytics.recommendations.map((rec: any, idx: number) => (
                          <Alert
                            key={idx}
                            severity={rec.priority === 'high' ? 'warning' : rec.priority === 'medium' ? 'info' : 'success'}
                          >
                            <Typography variant="body2">
                              <strong>{rec.title}:</strong> {rec.description}
                            </Typography>
                          </Alert>
                        ))}
                      </Box>
                    </>
                  )}

                  <Button variant="contained" fullWidth onClick={() => setAnalyticsOpen(false)}>
                    Close
                  </Button>
                </>
              ) : (
                <Typography color="text.secondary">
                  No analytics data available
                </Typography>
              )}
            </>
          )}
        </Box>
      </Modal>
      </Container>
    </Box>
  );
};

export default MyAdvertsPage;
