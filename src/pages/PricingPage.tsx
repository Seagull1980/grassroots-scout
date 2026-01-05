import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Star, 
  TrendingUp, 
  Support, 
  Verified, 
  CheckCircle,
  Visibility,
  Speed,
  Security,
  MonetizationOn
} from '@mui/icons-material';

const PricingPage: React.FC = () => {
  const features = [
    {
      icon: <Star color="primary" />,
      title: 'Featured Listings',
      price: '£4.99',
      duration: '30 days',
      description: 'Get your listing displayed at the top of search results',
      benefits: [
        '2-5x more visibility',
        'Appear above regular listings',
        'Highlighted with premium badge',
        'Mobile-optimized display'
      ]
    },
    {
      icon: <TrendingUp color="warning" />,
      title: 'Urgent Tag',
      price: '£2.99',
      duration: '14 days',
      description: 'Add an urgent tag to attract immediate attention',
      benefits: [
        'Eye-catching urgent indicator',
        'Faster response times',
        'Perfect for last-minute needs',
        'Increased urgency perception'
      ]
    },
    {
      icon: <Support color="info" />,
      title: 'Priority Support',
      price: '£9.99',
      duration: '30 days',
      description: 'Get priority customer support and assistance',
      benefits: [
        '24/7 priority support',
        'Dedicated support agent',
        'Phone and email support',
        'Faster issue resolution'
      ]
    },
    {
      icon: <Verified color="success" />,
      title: 'Verification Badge',
      price: '£19.99',
      duration: '365 days',
      description: 'Get verified status to build trust with potential matches',
      benefits: [
        'Verified profile badge',
        'Increased trust factor',
        'Background check included',
        'Higher response rates'
      ]
    }
  ];

  const stats = [
    { icon: <Visibility color="primary" />, title: '3x More Views', description: 'Featured listings get significantly more visibility' },
    { icon: <Speed color="warning" />, title: '50% Faster Matches', description: 'Premium features lead to quicker connections' },
    { icon: <Security color="success" />, title: '95% Trust Rate', description: 'Verified profiles have higher success rates' },
    { icon: <MonetizationOn color="info" />, title: 'Best Value', description: 'Affordable pricing for maximum impact' }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box textAlign="center" mb={6}>
        <Typography variant="h2" component="h1" gutterBottom color="primary">
          🚀 Boost Your Listing
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Get noticed faster with our premium features
        </Typography>
        <Typography variant="body1" color="text.secondary" maxWidth="600px" mx="auto">
          Stand out from the crowd and connect with the right people. Our premium features 
          are designed to give your listings maximum visibility and credibility.
        </Typography>
      </Box>

      {/* Stats Section */}
      <Grid container spacing={3} mb={6}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ textAlign: 'center', height: '100%' }}>
              <CardContent>
                <Box mb={1}>
                  {stat.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {stat.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Features Grid */}
      <Typography variant="h3" component="h2" textAlign="center" gutterBottom mb={4}>
        Choose Your Feature
      </Typography>

      <Grid container spacing={4} mb={6}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  {feature.icon}
                  <Box>
                    <Typography variant="h5" component="h3">
                      {feature.title}
                    </Typography>
                    <Box display="flex" gap={1} mt={1}>
                      <Chip 
                        label={feature.price} 
                        color="primary" 
                        variant="filled"
                      />
                      <Chip 
                        label={feature.duration} 
                        color="default" 
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Box>
                </Box>

                <Typography variant="body1" color="text.secondary" mb={3}>
                  {feature.description}
                </Typography>

                <List dense sx={{ flexGrow: 1 }}>
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <ListItem key={benefitIndex} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={benefit}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>

                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  size="large"
                >
                  Get Started - {feature.price}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Money Back Guarantee */}
      <Card sx={{ bgcolor: 'primary.50', mb: 4 }}>
        <CardContent>
          <Box textAlign="center">
            <Typography variant="h4" color="primary" gutterBottom>
              💯 100% Satisfaction Guarantee
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth="600px" mx="auto">
              We're confident our premium features will boost your listing performance. 
              If you're not completely satisfied within 7 days, we'll refund your money - no questions asked.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Success Stories */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          ⭐ Success Stories
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  "5 responses in 2 days!"
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  "After featuring my coaching vacancy, I got 5 quality responses within 48 hours. 
                  Best £4.99 I've ever spent!"
                </Typography>
                <Typography variant="caption" color="primary">
                  - Sarah M., Youth Coach
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  "Found my perfect team!"
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  "The urgent tag helped me find a team just before the season started. 
                  Exactly what I needed when time was running out."
                </Typography>
                <Typography variant="caption" color="primary">
                  - James T., Player
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  "Verification builds trust"
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  "Parents feel much more comfortable contacting me since I got verified. 
                  It's made a huge difference in my coaching business."
                </Typography>
                <Typography variant="caption" color="primary">
                  - Michael R., Coach
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* FAQ Section */}
      <Box textAlign="center">
        <Typography variant="h4" gutterBottom>
          ❓ Frequently Asked Questions
        </Typography>
        
        <Grid container spacing={2} maxWidth="800px" mx="auto">
          <Grid item xs={12}>
            <Box textAlign="left" p={2}>
              <Typography variant="h6" gutterBottom>
                How quickly will I see results?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Most users see increased views within 24 hours. Featured listings typically get 2-5x more views than regular listings.
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box textAlign="left" p={2}>
              <Typography variant="h6" gutterBottom>
                Can I cancel anytime?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Features are one-time purchases for the specified duration. We offer a 7-day money-back guarantee if you're not satisfied.
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box textAlign="left" p={2}>
              <Typography variant="h6" gutterBottom>
                Is payment secure?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Yes! All payments are processed securely through Stripe with industry-standard encryption and security measures.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default PricingPage;
