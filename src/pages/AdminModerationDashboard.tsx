import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Pagination,
} from '@mui/material';
import {
  Flag as FlagIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../services/api';
import PageHeader from '../components/PageHeader';

interface MessageReport {
  id: string;
  messageId: string;
  reporterId: string;
  reason: string;
  details?: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  moderatorNotes?: string;
  resolutionAction?: string;
  createdAt: string;
  message: string;
  reporterName: string;
  reporterEmail: string;
  senderName: string;
  senderEmail: string;
}

interface MessageAlert {
  id: string;
  messageId: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'reviewed' | 'dismissed';
  keyword: string;
  message: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

const AdminModerationDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [alerts, setAlerts] = useState<MessageAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingReport, setEditingReport] = useState<MessageReport | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<'open' | 'investigating' | 'resolved' | 'dismissed'>('open');
  const [editNotes, setEditNotes] = useState('');
  const [editAction, setEditAction] = useState('');
  const [reportStatus, setReportStatus] = useState<'open' | 'investigating' | 'resolved' | 'dismissed'>('open');
  const [alertStatus, setAlertStatus] = useState<'open' | 'reviewed' | 'dismissed'>('open');
  const [reportPage, setReportPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [alertTotal, setAlertTotal] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadReports();
      loadAlerts();
    }
  }, [user, reportStatus, reportPage, alertStatus, alertPage]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const offset = (reportPage - 1) * itemsPerPage;
      const response = await fetch(
        `${API_URL}/admin/message-reports?status=${reportStatus}&limit=${itemsPerPage}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
        setReportTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const offset = (alertPage - 1) * itemsPerPage;
      const response = await fetch(
        `${API_URL}/admin/message-alerts?status=${alertStatus}&limit=${itemsPerPage}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
        setAlertTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const handleEditReport = (report: MessageReport) => {
    setEditingReport(report);
    setEditStatus(report.status);
    setEditNotes(report.moderatorNotes || '');
    setEditAction(report.resolutionAction || '');
    setEditDialogOpen(true);
  };

  const handleSaveReport = async () => {
    if (!editingReport) return;

    try {
      const response = await fetch(`${API_URL}/admin/message-reports/${editingReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: editStatus,
          moderatorNotes: editNotes,
          resolutionAction: editAction
        })
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingReport(null);
        loadReports();
      } else {
        const error = await response.json();
        alert(`Failed to update report: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    }
  };

  const getStatusColor = (status: string): 'default' | 'error' | 'warning' | 'info' | 'success' => {
    switch (status) {
      case 'open':
        return 'error';
      case 'investigating':
        return 'warning';
      case 'resolved':
      case 'reviewed':
        return 'success';
      case 'dismissed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity: string): 'default' | 'error' | 'warning' | 'info' => {
    if (severity === 'high') return 'error';
    if (severity === 'medium') return 'warning';
    if (severity === 'low') return 'info';
    return 'default';
  };

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Moderation Dashboard"
        subtitle="Review reports and alerts"
        icon={<FlagIcon sx={{ fontSize: 32 }} />}
        maxWidth="xl"
      />

      <Container maxWidth="xl">
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label={`Reports (${reportTotal})`} />
            <Tab label={`Keyword Alerts (${alertTotal})`} />
          </Tabs>
        </Box>

        {/* Reports Tab */}
        {tabValue === 0 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" gap={2} mb={2} alignItems="center">
                  <Typography variant="h6">Filter by Status</Typography>
                  <Select
                    value={reportStatus}
                    onChange={(e) => {
                      setReportStatus(e.target.value as any);
                      setReportPage(1);
                    }}
                    size="small"
                  >
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="investigating">Investigating</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="dismissed">Dismissed</MenuItem>
                  </Select>
                </Box>

                {loading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : reports.length === 0 ? (
                  <Alert severity="info">No reports to display</Alert>
                ) : (
                  <>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell>Reason</TableCell>
                            <TableCell>Message</TableCell>
                            <TableCell>Reporter</TableCell>
                            <TableCell>Sender</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reports.map((report) => (
                            <TableRow key={report.id} hover>
                              <TableCell>
                                <Chip label={report.reason} size="small" variant="outlined" />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                  {report.message}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{report.reporterName}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {report.reporterEmail}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{report.senderName}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {report.senderEmail}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={report.status}
                                  size="small"
                                  color={getStatusColor(report.status)}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(report.createdAt).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Button
                                  startIcon={<EditIcon />}
                                  size="small"
                                  onClick={() => handleEditReport(report)}
                                >
                                  Review
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box display="flex" justifyContent="center" mt={3}>
                      <Pagination
                        count={Math.ceil(reportTotal / itemsPerPage)}
                        page={reportPage}
                        onChange={(_, page) => setReportPage(page)}
                      />
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Alerts Tab */}
        {tabValue === 1 && (
          <Box>
            <Card>
              <CardContent>
                <Box display="flex" gap={2} mb={2} alignItems="center">
                  <Typography variant="h6">Filter by Status</Typography>
                  <Select
                    value={alertStatus}
                    onChange={(e) => {
                      setAlertStatus(e.target.value as any);
                      setAlertPage(1);
                    }}
                    size="small"
                  >
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="reviewed">Reviewed</MenuItem>
                    <MenuItem value="dismissed">Dismissed</MenuItem>
                  </Select>
                </Box>

                {alerts.length === 0 ? (
                  <Alert severity="info">No alerts to display</Alert>
                ) : (
                  <>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell>Keyword</TableCell>
                            <TableCell>Message</TableCell>
                            <TableCell>Sender</TableCell>
                            <TableCell>Severity</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {alerts.map((alert) => (
                            <TableRow key={alert.id} hover>
                              <TableCell>
                                <Chip label={alert.keyword} size="small" />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                  {alert.message}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {alert.firstName} {alert.lastName}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {alert.email}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={alert.severity}
                                  size="small"
                                  color={getSeverityColor(alert.severity)}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={alert.status}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(alert.createdAt).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box display="flex" justifyContent="center" mt={3}>
                      <Pagination
                        count={Math.ceil(alertTotal / itemsPerPage)}
                        page={alertPage}
                        onChange={(_, page) => setAlertPage(page)}
                      />
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Edit Report Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Review Report</DialogTitle>
          <DialogContent>
            {editingReport && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Reported Message</Typography>
                  <Paper variant="outlined" sx={{ p: 2, my: 1 }}>
                    <Typography variant="body2">{editingReport.message}</Typography>
                  </Paper>
                </Box>

                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Reason</Typography>
                  <Typography variant="body2">{editingReport.reason}</Typography>
                </Box>

                {editingReport.details && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>Details</Typography>
                    <Typography variant="body2">{editingReport.details}</Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Status</Typography>
                  <Select
                    fullWidth
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    size="small"
                  >
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="investigating">Investigating</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="dismissed">Dismissed</MenuItem>
                  </Select>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Moderator Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  size="small"
                />

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Resolution Action"
                  value={editAction}
                  onChange={(e) => setEditAction(e.target.value)}
                  size="small"
                  placeholder="e.g., User warned, Message removed, Account suspended"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveReport} variant="contained">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminModerationDashboard;
