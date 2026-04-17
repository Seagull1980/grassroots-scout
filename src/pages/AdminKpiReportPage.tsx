import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  WarningAmber as WarningAmberIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface WeeklySummary {
  landingClicks: number;
  authClicks: number;
  landingRegisterIntent: number;
  navbarSignupIntent: number;
  totalRegisterIntent: number;
  landingIntentRatePercent: number;
  sectionCounts: Record<string, number>;
  roleIntentCounts: Record<string, number>;
  ctaTargetCounts: Record<string, number>;
  authPlacementCounts: Record<string, number>;
  authPlacementCtaCounts: Record<string, number>;
  heroSharePercent: number;
  qaSampleSize: number;
  qaMissing: number;
  qaMissingPercent: number;
}

interface KpiReport {
  generatedAt: string;
  period: {
    previous: { start: string; endExclusive: string };
    current: { start: string; endExclusive: string };
  };
  currentWeek: WeeklySummary;
  previousWeek: WeeklySummary;
  flags: string[];
}

const sortEntriesDescending = (record: Record<string, number>) =>
  Object.entries(record || {}).sort((left, right) => right[1] - left[1]);

const AdminKpiReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<KpiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cached' | 'generated' | 'regenerated' | null>(null);

  const fetchLatest = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/reports/admin-kpi/latest', { headers: {} });
      if (!response.ok) {
        throw new Error('Failed to load admin KPI report');
      }
      const data = await response.json();
      setReport(data.report);
      setSource(data.source || 'cached');
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to load admin KPI report');
    } finally {
      setLoading(false);
    }
  };

  const regenerateReport = async () => {
    try {
      setRegenerating(true);
      setError(null);
      const response = await fetch('/api/admin/reports/admin-kpi/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate admin KPI report');
      }

      const data = await response.json();
      setReport(data.report);
      setSource('regenerated');
    } catch (regenerateError: any) {
      setError(regenerateError.message || 'Failed to regenerate admin KPI report');
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchLatest();
    }
  }, [user?.role]);

  if (!user || user.role !== 'Admin') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Admin access required.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !report) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Report unavailable'}</Alert>
        <Button variant="contained" onClick={fetchLatest}>Retry</Button>
      </Container>
    );
  }

  const topTargets = sortEntriesDescending(report.currentWeek.ctaTargetCounts).slice(0, 10);
  const sectionCounts = sortEntriesDescending(report.currentWeek.sectionCounts);
  const roleIntentCounts = sortEntriesDescending(report.currentWeek.roleIntentCounts);
  const authPlacementCounts = sortEntriesDescending(report.currentWeek.authPlacementCtaCounts);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Admin KPI Report
          </Typography>
          <Typography color="text.secondary">
            Current period: {report.period.current.start} to {report.period.current.endExclusive} UTC
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated: {new Date(report.generatedAt).toLocaleString()} • Source: {source}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={() => navigate('/admin')}>Back to Admin</Button>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={regenerateReport} disabled={regenerating}>
            {regenerating ? 'Regenerating...' : 'Regenerate Report'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'Total Register Intent',
            value: report.currentWeek.totalRegisterIntent,
            helper: `${report.currentWeek.landingRegisterIntent} landing / ${report.currentWeek.navbarSignupIntent} navbar`,
            icon: <AssessmentIcon />
          },
          {
            label: 'Landing Intent Rate',
            value: `${report.currentWeek.landingIntentRatePercent}%`,
            helper: `${report.currentWeek.landingClicks} landing clicks`,
            icon: <CheckCircleIcon />
          },
          {
            label: 'Hero CTA Share',
            value: `${report.currentWeek.heroSharePercent}%`,
            helper: 'share of landing CTA clicks',
            icon: <AssessmentIcon />
          },
          {
            label: 'QA Missing Rate',
            value: `${report.currentWeek.qaMissingPercent}%`,
            helper: `${report.currentWeek.qaMissing}/${report.currentWeek.qaSampleSize} sampled rows`,
            icon: <WarningAmberIcon />
          }
        ].map((item) => (
          <Grid item xs={12} sm={6} lg={3} key={item.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, my: 1 }}>{item.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.helper}</Typography>
                  </Box>
                  {item.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Flags</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {report.flags.map((flag) => (
            <Alert key={flag} severity={flag.startsWith('Escalation') ? 'error' : flag.startsWith('Watch') ? 'warning' : 'success'}>
              {flag}
            </Alert>
          ))}
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Landing CTA Clicks by Section</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Section</TableCell>
                    <TableCell align="right">Clicks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sectionCounts.map(([section, count]) => (
                    <TableRow key={section}>
                      <TableCell>{section}</TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Landing CTA Clicks by Role Intent</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {roleIntentCounts.map(([roleIntent, count]) => (
                <Chip key={roleIntent} label={`${roleIntent}: ${count}`} color="primary" variant="outlined" />
              ))}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Use this split to confirm demand mix for Coach, Player, and Parent/Guardian onboarding intent.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Top CTA Targets</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>CTA Target</TableCell>
                    <TableCell align="right">Clicks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topTargets.map(([target, count]) => (
                    <TableRow key={target}>
                      <TableCell>{target}</TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Auth CTA Clicks by Placement</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {authPlacementCounts.map(([placement, count]) => (
                <Chip key={placement} label={`${placement}: ${count}`} variant="outlined" />
              ))}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Watch the balance between `mobile_topbar:login` and `mobile_topbar:signup` for mobile friction.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminKpiReportPage;
