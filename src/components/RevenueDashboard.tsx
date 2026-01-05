import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { TrendingUp, AttachMoney, Receipt, Person } from '@mui/icons-material';
import api from '../services/api';

interface RevenueData {
  overview: {
    totalRevenue: number;
    totalTransactions: number;
  };
  revenueByType: Array<{
    paymentType: string;
    revenue: number;
    count: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
  topUsers: Array<{
    firstName: string;
    lastName: string;
    email: string;
    totalSpent: number;
    transactions: number;
  }>;
}

const RevenueDashboard: React.FC = () => {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/analytics/revenue');
      setRevenueData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch revenue data:', err);
      setError(err.response?.data?.error || 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatFeatureType = (featureType: string) => {
    return featureType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFeatureColor = (featureType: string) => {
    switch (featureType) {
      case 'featured_listing':
        return 'primary';
      case 'urgent_tag':
        return 'warning';
      case 'priority_support':
        return 'info';
      case 'verification_badge':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!revenueData) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No revenue data available.
      </Alert>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        💰 Revenue Dashboard
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AttachMoney color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="primary">
                    {formatCurrency(revenueData.overview.totalRevenue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Receipt color="secondary" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="secondary">
                    {revenueData.overview.totalTransactions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Transactions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue by Feature Type */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Revenue by Feature Type (Last 30 Days)
              </Typography>
              
              {revenueData.revenueByType.length > 0 ? (
                <Box>
                  {revenueData.revenueByType.map((item, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={formatFeatureType(item.paymentType)}
                          color={getFeatureColor(item.paymentType) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          ({item.count} sales)
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(item.revenue)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No revenue data for the last 30 days
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                👑 Top Customers
              </Typography>
              
              {revenueData.topUsers.length > 0 ? (
                <Box>
                  {revenueData.topUsers.slice(0, 5).map((user, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Person fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.transactions} transactions
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(user.totalSpent)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No customer data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Daily Revenue Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📈 Daily Revenue (Last 30 Days)
          </Typography>
          
          {revenueData.dailyRevenue.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Transactions</TableCell>
                    <TableCell align="right">Avg per Transaction</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {revenueData.dailyRevenue.slice(0, 10).map((day, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(day.date).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="primary" fontWeight="bold">
                          {formatCurrency(day.revenue)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{day.transactions}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(day.transactions > 0 ? day.revenue / day.transactions : 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No daily revenue data available
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Revenue Insights */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💡 Revenue Insights & Opportunities
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box p={2} bgcolor="primary.50" borderRadius={1}>
                <TrendingUp color="primary" />
                <Typography variant="h6" color="primary" gutterBottom>
                  Growth Opportunities
                </Typography>
                <Typography variant="body2">
                  • Add "Express Review" for £1.99<br/>
                  • Introduce weekly featured spots<br/>
                  • Create team verification packages
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box p={2} bgcolor="success.50" borderRadius={1}>
                <AttachMoney color="success" />
                <Typography variant="h6" color="success.main" gutterBottom>
                  Pricing Optimization
                </Typography>
                <Typography variant="body2">
                  • Test £6.99 for featured listings<br/>
                  • Bundle deals: 3 features for £12<br/>
                  • Seasonal promotions during peak times
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box p={2} bgcolor="warning.50" borderRadius={1}>
                <Person color="warning" />
                <Typography variant="h6" color="warning.main" gutterBottom>
                  Customer Retention
                </Typography>
                <Typography variant="body2">
                  • Loyalty program for repeat customers<br/>
                  • Free featured listing after 5 purchases<br/>
                  • Email reminders for listing renewal
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RevenueDashboard;
