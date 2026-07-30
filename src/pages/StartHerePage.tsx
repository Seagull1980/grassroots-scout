import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography } from '@mui/material';
import {
  Search,
  PostAdd,
  Group,
  Message,
  Map,
  Dashboard,
  FamilyRestroom,
  Email,
  EmojiEvents } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import PageHeader from '../components/PageHeader';
import RoleOnboardingChecklist from '../components/RoleOnboardingChecklist';
import api, { profileAPI, UserProfile } from '../services/api';
import { calculateProfileCompletion, getProfileCompletionChecklist } from '../utils/profileActivation';

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
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [showAllActions, setShowAllActions] = useState<boolean>(false);
  const [newUserWelcome, setNewUserWelcome] = useState<boolean>(false);
  const [profileChecklist, setProfileChecklist] = useState(() => getProfileCompletionChecklist('Player'));

  if (!user) return null;

  useEffect(() => {
    const loadSignals = async () => {
      const newUserFlag = localStorage.getItem(`new_user_${user.id}`) === 'true';
      setNewUserWelcome(newUserFlag);

      const childrenRequest = user.role === 'Parent/Guardian'
        ? api.get('/children')
        : Promise.resolve({ data: { children: [] } });

      const [profileResult, conversationsResult, childrenResult] = await Promise.allSettled([
        profileAPI.get(),
        api.get('/conversations'),
        childrenRequest,
      ]);

      if (profileResult.status === 'fulfilled') {
        const profile: UserProfile = profileResult.value.profile;
        const resolvedChildrenCount = childrenResult.status === 'fulfilled'
          ? (Array.isArray(childrenResult.value.data?.children) ? childrenResult.value.data.children.length : 0)
          : 0;
        const checklist = getProfileCompletionChecklist(user.role, profile, { hasChildren: resolvedChildrenCount > 0 });
        const completion = calculateProfileCompletion(user.role, profile, { hasChildren: resolvedChildrenCount > 0 });
        setProfileChecklist(checklist);
        setProfileCompletion(completion);
        localStorage.setItem('profile_completion', String(completion));
      } else {
        const fallbackCompletion = Number(localStorage.getItem('profile_completion') || 0);
        setProfileCompletion(Number.isFinite(fallbackCompletion) ? fallbackCompletion : 0);
      }

      if (conversationsResult.status === 'fulfilled') {
        const conversations = conversationsResult.value.data?.conversations || [];
        const unread = conversations.reduce((sum: number, conversation: any) => sum + (conversation.unreadCount || 0), 0);
        setUnreadMessages(unread);
      } else {
        setUnreadMessages(0);
      }

      if (childrenResult.status === 'fulfilled') {
        const children = childrenResult.value.data?.children || [];
        setChildrenCount(Array.isArray(children) ? children.length : 0);
      } else {
        setChildrenCount(0);
      }
    };

    loadSignals();
  }, [user.id, user.role]);

  const parentNeedsChildProfile = user.role === 'Parent/Guardian' && childrenCount === 0;

  const commonActions: QuickAction[] = [
    {
      title: 'Search Opportunities',
      description: 'Find teams and players with the simplest filters first.',
      path: '/search',
      icon: <Search color="primary" />,
      cta: 'Open Search' },
    {
      title: 'Open Messages',
      description: 'Continue conversations and respond quickly.',
      path: '/messages',
      icon: <Message color="primary" />,
      cta: 'View Messages' },
  ];

  const roleActions: Record<string, QuickAction[]> = {
    Coach: [
      {
        title: 'Post Team Vacancy',
        description: 'Create a vacancy advert and start receiving interest.',
        path: '/post-vacancy',
        icon: <PostAdd color="primary" />,
        cta: 'Post Vacancy' },
      {
        title: 'Manage Team',
        description: 'Update team setup, roster and invitations.',
        path: '/team-management',
        icon: <Group color="primary" />,
        cta: 'Manage Team' },
      {
        title: 'Applications Hub',
        description: 'Review player interest, unread replies, and next decisions in one place.',
        path: '/coach-applications',
        icon: <Message color="primary" />,
        cta: 'Open Applications' },
      {
        title: 'Map Search',
        description: 'Browse players geographically on the map.',
        path: '/maps',
        icon: <Map color="primary" />,
        cta: 'Open Map' },
    ],
    Player: [
      {
        title: 'Post Availability',
        description: 'Create your player advert so coaches can find you.',
        path: '/post-availability',
        icon: <PostAdd color="primary" />,
        cta: 'Post Availability' },
      {
        title: 'Application Tracker',
        description: 'See replies, coach conversations, and trial progress without chasing messages.',
        path: '/my-applications',
        icon: <Message color="primary" />,
        cta: 'Open Tracker' },
      {
        title: 'Map Search',
        description: 'Find nearby teams and compare opportunities.',
        path: '/maps',
        icon: <Map color="primary" />,
        cta: 'Open Map' },
      {
        title: 'Profile & Readiness',
        description: 'Review profile quality and keep your details match-ready.',
        path: '/profile',
        icon: <Dashboard color="primary" />,
        cta: 'Open Profile' },
    ],
    'Parent/Guardian': [
      {
        title: 'Manage Children',
        description: 'Add and manage child player profiles in one place.',
        path: '/children',
        icon: <FamilyRestroom color="primary" />,
        cta: 'Manage Children' },
      {
        title: 'Child Applications Tracker',
        description: 'Keep coach replies and trial progress organised for your children.',
        path: '/my-applications',
        icon: <Message color="primary" />,
        cta: 'Open Tracker' },
      {
        title: 'Post Availability',
        description: parentNeedsChildProfile
          ? 'Add a child profile first, then post availability for that child.'
          : 'Create an availability advert for your child.',
        path: parentNeedsChildProfile ? '/children' : '/child-player-availability',
        icon: <PostAdd color="primary" />,
        cta: parentNeedsChildProfile ? 'Add Child First' : 'Open Availability' },
      {
        title: 'Map Search',
        description: 'Find nearby teams and opportunities quickly.',
        path: '/maps',
        icon: <Map color="primary" />,
        cta: 'Open Map' },
    ],
    Admin: [
      {
        title: 'Admin Dashboard',
        description: 'Review moderation and operational activity.',
        path: '/admin',
        icon: <Dashboard color="primary" />,
        cta: 'Open Admin' },
      {
        title: 'Post Team Vacancy',
        description: 'Create an admin vacancy post quickly.',
        path: '/post-vacancy',
        icon: <PostAdd color="primary" />,
        cta: 'Post Vacancy' },
      {
        title: 'Email Delivery Logs',
        description: 'Review sent and failed notification emails.',
        path: '/admin/email-logs',
        icon: <Email color="primary" />,
        cta: 'Open Logs' },
    ] };

  const actions = [...(roleActions[user.role] || []), ...commonActions];

  const topPriority = useMemo(() => {
    if (newUserWelcome) {
      return {
        title: 'Welcome aboard — set up your first advert',
        description: 'You’ve just joined. Start with one clear action so your profile is discoverable and your next steps feel obvious.',
        actionLabel: user.role === 'Coach' ? 'Post Vacancy' : user.role === 'Parent/Guardian' ? 'Add Child Profile' : 'Post Availability',
        path: user.role === 'Coach' ? '/post-vacancy' : user.role === 'Parent/Guardian' ? '/children' : '/post-availability' };
    }

    if (profileCompletion > 0 && profileCompletion < 70) {
      return {
        title: 'Complete your profile first',
        description: `Your profile is ${profileCompletion}% complete. Filling key fields now improves matching quality and response rates.`,
        actionLabel: 'Open Profile',
        path: '/profile' };
    }

    if (unreadMessages > 0) {
      return {
        title: 'Reply to unread conversations',
        description: `You have ${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}. Fast replies keep opportunities warm.`,
        actionLabel: 'Open Messages',
        path: '/messages' };
    }

    if (user.role === 'Coach') {
      return {
        title: 'Post or refresh a vacancy',
        description: 'Fresh vacancies increase discovery and unlock more player interest in the applications hub.',
        actionLabel: 'Post Vacancy',
        path: '/post-vacancy' };
    }

    if (user.role === 'Parent/Guardian') {
      if (parentNeedsChildProfile) {
        return {
          title: 'Add your first child profile',
          description: 'Before posting availability or applying, add a child profile so age, position, and safety details are complete.',
          actionLabel: 'Manage Children',
          path: '/children' };
      }

      return {
        title: 'Post child availability',
        description: 'Now that your child profile is ready, publish an availability advert so local coaches can reach out.',
        actionLabel: 'Open Availability',
        path: '/child-player-availability' };
    }

    if (user.role === 'Player') {
      return {
        title: 'Refresh your availability advert',
        description: 'Keeping your advert current makes replies faster and more relevant.',
        actionLabel: 'Post Availability',
        path: '/post-availability' };
    }

    return {
      title: 'Open admin operations',
      description: 'Review moderation and platform health first before doing lower-priority admin tasks.',
      actionLabel: 'Open Admin',
      path: '/admin' };
  }, [newUserWelcome, parentNeedsChildProfile, profileCompletion, unreadMessages, user.role]);

  const secondaryActions = useMemo(() => {
    return actions.filter((action) => action.path !== topPriority.path).slice(0, 1);
  }, [actions, topPriority.path]);

  const { trackUserAction } = useAnalytics();

  useEffect(() => {
    trackUserAction('start_here_top_priority_shown', topPriority.title, {
      role: user.role,
      page: 'start_here'
    });
  }, [topPriority.title, user.role, trackUserAction]);

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

        {parentNeedsChildProfile && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/children')}>
                Add Child
              </Button>
            }
          >
            Parent/Guardian accounts need at least one child profile before creating availability adverts.
          </Alert>
        )}

        {newUserWelcome && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Welcome! We’ve highlighted the fastest way to get visible and start receiving interest.
          </Alert>
        )}

        <Paper
          sx={{
            p: 2.5,
            mb: 3,
            border: '1px solid',
            borderColor: 'primary.light',
            background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%)' }}
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

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Profile progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profileCompletion < 70
                    ? `You’re ${profileCompletion}% complete. Finish these next steps to become easier to discover.`
                    : 'Your profile is looking strong. Keep the momentum going with one more action.'}
                </Typography>
              </Box>
              <Chip color={profileCompletion < 70 ? 'warning' : 'success'} label={`${profileCompletion}% complete`} />
            </Stack>

            <Stack spacing={1.5}>
              {profileChecklist.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ p: 2, borderColor: item.completed ? 'success.main' : 'divider' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {item.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    </Box>
                    <Button
                      variant={item.completed ? 'outlined' : 'contained'}
                      size="small"
                      onClick={() => navigate(item.actionPath)}
                    >
                      {item.completed ? 'Review' : item.actionLabel}
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700 }}>
              Your next best action
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Keep momentum by taking one primary step, then use up to two secondary actions.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                trackUserAction('start_here_top_priority_clicked', topPriority.title, {
                  role: user.role,
                  page: 'start_here'
                });
                navigate(topPriority.path);
              }}
              sx={{ mb: 2, minWidth: { xs: '100%', sm: 260 } }}
            >
              {topPriority.actionLabel}
            </Button>

            <Grid container spacing={2}>
              {secondaryActions.map((action) => (
                <Grid item xs={12} md={6} key={`${action.path}-${action.title}`}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      {action.icon}
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {action.title}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {action.description}
                    </Typography>
                    <Button variant="outlined" onClick={() => navigate(action.path)} fullWidth>
                      {action.cta}
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {showAllActions && (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              All actions
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
              {actions.map((action) => (
                <Button key={`all-${action.path}-${action.title}`} variant="text" onClick={() => navigate(action.path)}>
                  {action.title}
                </Button>
              ))}
            </Stack>
          </Paper>
        )}
        
        {!showAllActions && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="text" onClick={() => setShowAllActions(true)}>
              Show all actions
            </Button>
          </Box>
        )}

        <Paper variant="outlined" sx={{ p: 2.5, mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <EmojiEvents color="warning" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>See real success stories</Typography>
              <Typography variant="body2" color="text.secondary">Read how other players and coaches found their match on The Grassroots Hub.</Typography>
            </Box>
          </Stack>
          <Button variant="outlined" size="small" onClick={() => navigate('/success-stories')}>
            Read Stories
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default StartHerePage;
