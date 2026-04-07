import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, Refresh } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../services/api';

type DeliveryStatus = 'sent' | 'failed';

interface EmailDeliveryLog {
  id: number;
  recipientEmail: string;
  templateName?: string | null;
  subject?: string | null;
  status: DeliveryStatus;
  messageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  provider?: string | null;
  createdAt: string;
}

interface EmailDeliveryResponse {
  logs: EmailDeliveryLog[];
  summary: {
    sent: number;
    failed: number;
  };
  filters: {
    status: DeliveryStatus;
    recipient: string;
    limit: number;
    days: number;
  };
}

const AdminEmailLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<EmailDeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus>('failed');
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [recipientFilter, setRecipientFilter] = useState('');
  const [summary, setSummary] = useState({ sent: 0, failed: 0 });

  const failedRate = useMemo(() => {
    const total = summary.sent + summary.failed;
    if (!total) return 0;
    return Math.round((summary.failed / total) * 100);
  }, [summary]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<EmailDeliveryResponse>(`${API_URL}/admin/email-delivery-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          status: statusFilter,
          days: daysFilter,
          recipient: recipientFilter || undefined,
          limit: 200,
        },
      });

      setLogs(response.data.logs || []);
      setSummary(response.data.summary || { sent: 0, failed: 0 });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load email delivery logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, daysFilter]);

  const getStatusColor = (status: DeliveryStatus) => {
    return status === 'sent' ? 'success' : 'error';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Email Delivery Logs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor outbound email success and failures for all user flows.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin')}>
              Back to Admin
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchLogs}>
              Refresh
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Chip label={`Sent: ${summary.sent}`} color="success" variant="outlined" />
          <Chip label={`Failed: ${summary.failed}`} color="error" variant="outlined" />
          <Chip label={`Failure Rate: ${failedRate}%`} color={failedRate > 10 ? 'warning' : 'default'} variant="outlined" />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus)}
            >
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="sent">Sent</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Window</InputLabel>
            <Select
              value={daysFilter}
              label="Window"
              onChange={(e) => setDaysFilter(Number(e.target.value))}
            >
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Recipient filter"
            value={recipientFilter}
            onChange={(e) => setRecipientFilter(e.target.value)}
            placeholder="email contains..."
          />

          <Button variant="contained" onClick={fetchLogs}>
            Apply Filter
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : logs.length === 0 ? (
          <Alert severity="info">No delivery logs found for the selected filters.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Error</TableCell>
                  <TableCell>Message ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{log.recipientEmail}</TableCell>
                    <TableCell>{log.templateName || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.subject || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={getStatusColor(log.status)}
                        label={log.status.toUpperCase()}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.errorCode || log.errorMessage || '-'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.messageId || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default AdminEmailLogsPage;
