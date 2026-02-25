import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { Star, TrendingUp, Support, Verified, AttachMoney } from '@mui/icons-material';
import api from '../services/api';

interface PricingOption {
  id: number;
  featureType: string;
  price: number;
  duration: number;
  description: string;
  isActive: boolean;
}

interface FeatureUpgradeProps {
  itemId: number;
  itemType: 'vacancy' | 'availability';
  currentlyFeatured?: boolean;
  onUpgradeComplete?: () => void;
}

const FeatureUpgrade: React.FC<FeatureUpgradeProps> = ({
  itemId,
  itemType,
  currentlyFeatured = false,
  onUpgradeComplete
}) => {
  const [open, setOpen] = useState(false);
  const [pricing, setPricing] = useState<PricingOption[]>([]);
  const [selectedFeature, setSelectedFeature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await api.get('/pricing');
      setPricing(response.data.pricing);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      setError('Failed to load pricing options');
    }
  };

  const handleUpgrade = async () => {
    if (!selectedFeature) {
      setError('Please select a feature to purchase');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create payment intent
      const paymentResponse = await api.post('/payments/create-intent', {
        featureType: selectedFeature,
        itemId,
        itemType
      });

      // For demo purposes, we'll auto-complete the payment
      // In a real implementation, you'd integrate with Stripe here
      await api.post(`/api/payments/${paymentResponse.data.paymentId}/complete`);

      setSuccess('Feature purchased successfully! Your listing is now featured.');
      setOpen(false);
      
      if (onUpgradeComplete) {
        onUpgradeComplete();
      }

    } catch (err: any) {
      console.error('Payment failed:', err);
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFeatureIcon = (featureType: string) => {
    switch (featureType) {
      case 'featured_listing':
        return <Star color="primary" />;
      case 'urgent_tag':
        return <TrendingUp color="warning" />;
      case 'priority_support':
        return <Support color="info" />;
      case 'verification_badge':
        return <Verified color="success" />;
      default:
        return <AttachMoney />;
    }
  };

  const formatFeatureType = (featureType: string) => {
    return featureType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(true)}
        disabled={currentlyFeatured}
        startIcon={<Star />}
      >
        {currentlyFeatured ? 'Featured' : 'Boost Listing'}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="div">
            🚀 Boost Your Listing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Get more visibility and connections with our premium features
          </Typography>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Grid container spacing={2}>
            {pricing.map((option) => (
              <Grid item xs={12} md={6} key={option.id}>
                <Card 
                  variant={selectedFeature === option.featureType ? "outlined" : "elevation"}
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedFeature === option.featureType ? 2 : 1,
                    borderColor: selectedFeature === option.featureType ? 'primary.main' : 'divider',
                    '&:hover': { boxShadow: 3 }
                  }}
                  onClick={() => setSelectedFeature(option.featureType)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      {getFeatureIcon(option.featureType)}
                      <Typography variant="h6">
                        {formatFeatureType(option.featureType)}
                      </Typography>
                      <Chip 
                        label={`£${option.price}`} 
                        color="primary" 
                        size="small" 
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {option.description}
                    </Typography>
                    
                    <Typography variant="caption" display="block">
                      Duration: {option.duration} days
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box mt={3} p={2} bgcolor="background.paper" borderRadius={1}>
            <Typography variant="h6" gutterBottom>
              💰 Why upgrade your listing?
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              <Typography component="li" variant="body2" gutterBottom>
                📈 <strong>2-5x more views</strong> - Featured listings appear at the top
              </Typography>
              <Typography component="li" variant="body2" gutterBottom>
                ⚡ <strong>Faster connections</strong> - Get contacted sooner
              </Typography>
              <Typography component="li" variant="body2" gutterBottom>
                🎯 <strong>Better visibility</strong> - Stand out from the crowd
              </Typography>
              <Typography component="li" variant="body2">
                ✅ <strong>Money-back guarantee</strong> - 100% satisfaction guaranteed
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpgrade}
            disabled={!selectedFeature || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <AttachMoney />}
          >
            {loading ? 'Processing...' : 'Purchase Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FeatureUpgrade;
