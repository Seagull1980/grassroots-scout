import React from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import {
  Search,
  PostAdd,
  Group,
  Message,
  Map,
  Dashboard,
  FamilyRestroom,
  Email,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';

interface QuickAction {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  cta: string;
}

const StartHerePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  const commonActions: QuickAction[] = [
    {
      title: 'Search Opportunities',
      description: 'Find teams and players with the simplest filters first.',
      path: '/search',
      icon: <Search color="primary" />,
      cta: 'Open Search',
    },
    {
      title: 'Open Messages',
      description: 'Continue conversations and respond quickly.',
      path: '/messages',
      icon: <Message color="primary" />,
      cta: 'View Messages',
    },
  ];

  const roleActions: Record<string, QuickAction[]> = {
    Coach: [
      {
        title: 'Post Team Vacancy',
        description: 'Create a vacancy advert and start receiving interest.',
        path: '/post-vacancy',
        icon: <PostAdd color="primary" />,
        cta: 'Post Vacancy',
      },
      {
        title: 'Manage Team',
        description: 'Update team setup, roster and invitations.',
        path: '/team-management',
        icon: <Group color="primary" />,
        cta: 'Manage Team',
      },
      {
        title: 'Map Search',
        description: 'Browse players geographically on the map.',
        path: '/maps',
        icon: <Map color="primary" />,
        cta: 'Open Map',
      },
    ],
    Player: [
      {
        title: 'Post Availability',
        description: 'Create your player advert so coaches can find you.',
        path: '/post-availability',
        icon: <PostAdd color="primary" />,
        cta: 'Post Availability',
      },
      {
        title: 'Map Search',
        description: 'Find nearby teams and compare opportunities.',
        path: '/maps',
        icon: <Map color="primary" />,
        cta: 'Open Map',
      },
      {
        title: 'My Dashboard',
        description: 'Track your profile completion and updates.',
        path: '/dashboard',
        icon: <Dashboard color="primary" />,
        cta: 'Open Dashboard',
      },
    ],
    'Parent/Guardian': [
      {
        title: 'Manage Children',
        description: 'Add and manage child player profiles in one place.',
        path: '/children',
        icon: <FamilyRestroom color="primary" />,
        cta: 'Manage Children',
      },
      {
        title: 'Post Availability',
        description: 'Create an availability advert for your child.',
        path: '/post-availability',
        icon: <PostAdd color="primary" />,
        cta: 'Post Availability',
      },
      {
        title: 'Map Search',
        description: 'Find nearby teams and opportunities quickly.',
        path: '/maps',
        icon: <Map color="primary" />,
        cta: 'Open Map',
      },
    ],
    Admin: [
      {
        title: 'Admin Dashboard',
        description: 'Review moderation and operational activity.',
        path: '/admin',
        icon: <Dashboard color="primary" />,
        cta: 'Open Admin',
      },
      {
        title: 'Post Team Vacancy',
        description: 'Create an admin vacancy post quickly.',
        path: '/post-vacancy',
        icon: <PostAdd color="primary" />,
        cta: 'Post Vacancy',
      },
      {
        title: 'Email Delivery Logs',
        description: 'Review sent and failed notification emails.',
        path: '/admin/email-logs',
        icon: <Email color="primary" />,
        cta: 'Open Logs',
      },
    ],
  };

  const actions = [...(roleActions[user.role] || []), ...commonActions];

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Start Here"
        subtitle="Pick one next step and keep things simple"
        icon={<Dashboard sx={{ fontSize: 32 }} />}
      />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Chip label={`Role: ${user.role}`} color="primary" variant="outlined" />
        </Box>

        <Grid container spacing={3}>
          {actions.map((action) => (
            <Grid item xs={12} md={6} lg={4} key={`${action.path}-${action.title}`}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 1 }}>{action.icon}</Box>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button variant="contained" onClick={() => navigate(action.path)} fullWidth>
                    {action.cta}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default StartHerePage;
