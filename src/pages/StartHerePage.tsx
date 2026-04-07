import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
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
import RoleOnboardingChecklist from '../components/RoleOnboardingChecklist';
import api, { profileAPI, UserProfile } from '../services/api';

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
  const [profileCompletion, setProfileCompletion] = useState<number>(0);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  if (!user) return null;

  useEffect(() => {
    const loadSignals = async () => {
      try {
        const [profileResponse, conversationsResponse] = await Promise.all([
          profileAPI.get(),
          api.get('/conversations'),
        ]);

        const profile: UserProfile = profileResponse.profile;
        const baseFields = [profile.firstname, profile.lastname, profile.dateofbirth, profile.location, profile.bio];
        const roleFields =
          user.role === 'Player'
            ? [profile.position, profile.preferredfoot, profile.experiencelevel]
            : user.role === 'Coach'
              ? [profile.coachinglicense?.length ? 'ok' : '', profile.yearsexperience, profile.teamname]
              : [];
        const allFields = [...baseFields, ...roleFields];
        const filledFields = allFields.filter((field) => field !== undefined && field !== null && field !== '').length;
        setProfileCompletion(Math.round((filledFields / allFields.length) * 100));

        const conversations = conversationsResponse.data?.conversations || [];
        const unread = conversations.reduce((sum: number, conversation: any) => sum + (conversation.unreadCount || 0), 0);
        setUnreadMessages(unread);
      } catch {
        const fallbackCompletion = Number(localStorage.getItem('profile_completion') || 30);
        setProfileCompletion(Number.isFinite(fallbackCompletion) ? fallbackCompletion : 30);
        setUnreadMessages(0);
      }
    };

    loadSignals();
  }, [user.role]);

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
        title: 'Applications Hub',
        description: 'Review player interest, unread replies, and next decisions in one place.',
        path: '/coach-applications',
        icon: <Message color="primary" />,
        cta: 'Open Applications',
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
        title: 'Application Tracker',
        description: 'See replies, coach conversations, and trial progress without chasing messages.',
        path: '/my-applications',
        icon: <Message color="primary" />,
        cta: 'Open Tracker',
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
        title: 'Child Applications Tracker',
        description: 'Keep coach replies and trial progress organised for your children.',
        path: '/my-applications',
        icon: <Message color="primary" />,
        cta: 'Open Tracker',
      },
      {
        title: 'Post Availability',
        description: 'Create an availability advert for your child.',
        path: '/child-player-availability',
        icon: <PostAdd color="primary" />,
        cta: 'Open Availability',
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

  const topPriority = useMemo(() => {
    if (profileCompletion > 0 && profileCompletion < 70) {
      return {
        title: 'Complete your profile first',
        description: `Your profile is ${profileCompletion}% complete. Filling key fields now improves matching quality and response rates.`,
        actionLabel: 'Open Profile',
        path: '/profile',
      };
    }

    if (unreadMessages > 0) {
      return {
        title: 'Reply to unread conversations',
        description: `You have ${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}. Fast replies keep opportunities warm.`,
        actionLabel: 'Open Messages',
        path: '/messages',
      };
    }

    if (user.role === 'Coach') {
      return {
        title: 'Post or refresh a vacancy',
        description: 'Fresh vacancies increase discovery and unlock more player interest in the applications hub.',
        actionLabel: 'Post Vacancy',
        path: '/post-vacancy',
      };
    }

    if (user.role === 'Parent/Guardian') {
      return {
        title: 'Check child readiness',
        description: 'Confirm each child profile is complete before sending new applications to coaches.',
        actionLabel: 'Manage Children',
        path: '/children',
      };
    }

    if (user.role === 'Player') {
      return {
        title: 'Refresh your availability advert',
        description: 'Keeping your advert current makes replies faster and more relevant.',
        actionLabel: 'Post Availability',
        path: '/post-availability',
      };
    }

    return {
      title: 'Open admin operations',
      description: 'Review moderation and platform health first before doing lower-priority admin tasks.',
      actionLabel: 'Open Admin',
      path: '/admin',
    };
  }, [profileCompletion, unreadMessages, user.role]);

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

        {unreadMessages > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/messages')}>
                Review
              </Button>
            }
          >
            You have {unreadMessages} unread message{unreadMessages === 1 ? '' : 's'} that may block active opportunities.
          </Alert>
        )}

        <Paper
          sx={{
            p: 2.5,
            mb: 3,
            border: '1px solid',
            borderColor: 'primary.light',
            background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Chip label="Top Priority" color="primary" size="small" sx={{ mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {topPriority.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {topPriority.description}
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate(topPriority.path)}>
              {topPriority.actionLabel}
            </Button>
          </Stack>
        </Paper>

        <RoleOnboardingChecklist role={user.role as 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin'} />

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
