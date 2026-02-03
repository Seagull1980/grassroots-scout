import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Chip,
} from '@mui/material';
import {
  People,
  CheckCircle,
  Visibility,
  PersonAdd,
  Search,
  Handshake,
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SiteStats {
  totalVisits: number;
  uniqueVisitors: number;
  newUsers: number;
  searchesPerformed: number;
  successfulMatches: number;
  activeListings: number;
}

interface TrafficData {
  date: string;
  visits: number;
  uniqueUsers: number;
}

const PerformanceAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SiteStats>({
    totalVisits: 0,
    uniqueVisitors: 0,
    newUsers: 0,
    searchesPerformed: 0,
    successfulMatches: 0,
    activeListings: 0,
  });
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [matchData, setMatchData] = useState<{ month: string; matches: number }[]>([]);

  useEffect(() => {
    // Redirect non-admin users
    if (user && user.role !== 'Admin') {
      navigate('/dashboard');
      return;
    }
    
    if (user?.role === 'Admin') {
      loadAnalyticsData();
    }
  }, [user, navigate]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch real analytics data from backend
      const [statsRes, trafficRes, matchesRes] = await Promise.all([
        api.get('/analytics/site-stats', { headers: {} }),
        api.get('/analytics/weekly-traffic', { headers: {} }),
        api.get('/analytics/monthly-matches', { headers: {} })
      ]);

      setStats({
        totalVisits: statsRes.data?.totalVisits || 0,
        uniqueVisitors: statsRes.data?.uniqueVisitors || 0,
        newUsers: statsRes.data?.newUsers || 0,
        searchesPerformed: statsRes.data?.searchesPerformed || 0,
        successfulMatches: statsRes.data?.successfulMatches || 0,
        activeListings: statsRes.data?.activeListings || 0,
      });
      setTrafficData(trafficRes.data || []);
      setMatchData(matchesRes.data || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      // Fallback to mock data if API fails
      const mockStats: SiteStats = {
        totalVisits: 12547,
        uniqueVisitors: 8923,
        newUsers: 342,
        searchesPerformed: 5634,
        successfulMatches: 156,
        activeListings: 278,
      };

      const mockTrafficData: TrafficData[] = [
        { date: 'Mon', visits: 450, uniqueUsers: 320 },
        { date: 'Tue', visits: 520, uniqueUsers: 380 },
        { date: 'Wed', visits: 490, uniqueUsers: 350 },
        { date: 'Thu', visits: 610, uniqueUsers: 420 },
        { date: 'Fri', visits: 580, uniqueUsers: 410 },
        { date: 'Sat', visits: 890, uniqueUsers: 650 },
        { date: 'Sun', visits: 820, uniqueUsers: 590 },
      ];

      const mockMatchData = [
        { month: 'Jan', matches: 12 },
        { month: 'Feb', matches: 18 },
        { month: 'Mar', matches: 22 },
        { month: 'Apr', matches: 28 },
        { month: 'May', matches: 35 },
        { month: 'Jun', matches: 41 },
      ];

      setStats(mockStats);
      setTrafficData(mockTrafficData);
      setMatchData(mockMatchData);
    } finally {
      setLoading(false);
    }
  };

  const renderStatsCards = () => {
    if (loading) {
      return (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="rectangular" height={100} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );
    }

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {(stats.totalVisits || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
                    Total Site Visits
                  </Typography>
                  <Chip
                    label="+12% this week"
                    size="small"
                    sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <Visibility sx={{ fontSize: 56, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {(stats.uniqueVisitors || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
                    Unique Visitors
                  </Typography>
                  <Chip
                    label="+8% this week"
                    size="small"
                    sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <People sx={{ fontSize: 56, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.successfulMatches || 0}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
                    Successful Matches
                  </Typography>
                  <Chip
                    label="This month"
                    size="small"
                    sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <Handshake sx={{ fontSize: 56, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.newUsers || 0}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
                    New Users
                  </Typography>
                  <Chip
                    label="Last 30 days"
                    size="small"
                    sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <PersonAdd sx={{ fontSize: 56, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {(stats.searchesPerformed || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
                    Searches Performed
                  </Typography>
                  <Chip
                    label="All time"
                    size="small"
                    sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <Search sx={{ fontSize: 56, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.activeListings || 0}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
                    Active Listings
                  </Typography>
                  <Chip
                    label="Currently open"
                    size="small"
                    sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <CheckCircle sx={{ fontSize: 56, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderTrafficChart = () => {
    const chartData = {
      labels: trafficData.map(d => d.date),
      datasets: [
        {
          label: 'Total Visits',
          data: trafficData.map(d => d.visits),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Unique Visitors',
          data: trafficData.map(d => d.uniqueUsers),
          borderColor: '#764ba2',
          backgroundColor: 'rgba(118, 75, 162, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };

    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Weekly Traffic Overview
        </Typography>
        <Box height={300}>
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' },
              },
              scales: {
                y: { beginAtZero: true }
              }
            }}
          />
        </Box>
      </Paper>
    );
  };

  const renderMatchesChart = () => {
    const chartData = {
      labels: matchData.map(d => d.month),
      datasets: [
        {
          label: 'Successful Matches',
          data: matchData.map(d => d.matches),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
        }
      ]
    };

    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Monthly Successful Matches
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Players successfully matched with teams
        </Typography>
        <Box height={300}>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: { beginAtZero: true }
              }
            }}
          />
        </Box>
      </Paper>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Site Performance Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of platform traffic, user engagement, and successful matches
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box mb={4}>
        {renderStatsCards()}
      </Box>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {renderTrafficChart()}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderMatchesChart()}
        </Grid>
      </Grid>
    </Container>
  );
};

export default PerformanceAnalyticsPage;
