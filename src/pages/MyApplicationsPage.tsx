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
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Message as MessageIcon,
  PostAdd as PostAddIcon,
  Search as SearchIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ActionEmptyState from '../components/ActionEmptyState';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Conversation, MatchProgress } from '../types';

const MyApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [matchProgress, setMatchProgress] = useState<MatchProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [conversationsResponse, progressResponse] = await Promise.all([
          api.get('/conversations'),
          api.get('/match-progress'),
        ]);

        setConversations(conversationsResponse.data?.conversations || []);
        setMatchProgress(progressResponse.data?.matches || []);
        setError('');
      } catch (err) {
        console.error('Failed to load applications tracker:', err);
        setError('Failed to load your tracker data.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'Player' || user?.role === 'Parent/Guardian') {
      loadData();
    }
  }, [user?.role]);

  const roleLabel = user?.role === 'Parent/Guardian' ? 'family applications tracker' : 'applications tracker';

  const relevantConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const otherParticipant = conversation.participants.find((participant) => participant.userId !== String(user?.id));
      return (
        otherParticipant?.role === 'Coach' ||
        conversation.latestMessage.messageType === 'training_invitation' ||
        conversation.latestMessage.messageType === 'vacancy_interest'
      );
    });
  }, [conversations, user?.id]);

  const unreadCount = relevantConversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);
  const trialCount = matchProgress.filter((match) => ['trial_invited', 'trial_scheduled'].includes(match.stage)).length;
  const responseNeededCount = matchProgress.filter((match) => match.assignedTo === 'player' || match.assignedTo === 'parent').length;

  if (user?.role !== 'Player' && user?.role !== 'Parent/Guardian') {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">This page is only available to player and parent accounts.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title={user?.role === 'Parent/Guardian' ? 'Child Applications Tracker' : 'My Applications'}
        subtitle="See where each opportunity stands, which coaches replied, and what action comes next."
        icon={<TimelineIcon sx={{ fontSize: 32 }} />}
      />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Live conversations', value: relevantConversations.length, helper: 'Coach replies and outreach', icon: <MessageIcon /> },
            { label: 'Unread replies', value: unreadCount, helper: 'Messages you should answer', icon: <CheckCircleIcon /> },
            { label: 'Trial steps', value: trialCount, helper: 'Invited or scheduled', icon: <TimelineIcon /> },
            { label: 'Waiting on you', value: responseNeededCount, helper: 'Items assigned to your side', icon: <CheckCircleIcon /> },
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {loading ? '—' : stat.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stat.helper}
                      </Typography>
                    </Box>
                    <Box sx={{ color: 'primary.main' }}>{stat.icon}</Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {loading ? (
          <Paper sx={{ p: 4 }}>
            <Typography color="text.secondary">Loading your {roleLabel}...</Typography>
          </Paper>
        ) : relevantConversations.length === 0 && matchProgress.length === 0 ? (
          <ActionEmptyState
            icon={<TimelineIcon sx={{ fontSize: 36 }} />}
            title={user?.role === 'Parent/Guardian' ? 'No child applications yet' : 'No applications yet'}
            description={user?.role === 'Parent/Guardian'
              ? 'Once you message coaches or they contact you about a child profile, everything will appear here as one clear tracker.'
              : 'Once coaches reply or you start conversations about vacancies, this tracker will show progress and next steps.'}
            suggestions={user?.role === 'Parent/Guardian'
              ? [
                  'Add or update a child profile first so the details are coach-ready.',
                  'Post child availability when you are happy with medical and emergency information.',
                  'Use search to start targeted coach conversations rather than waiting passively.',
                ]
              : [
                  'Post your availability so coaches can discover you faster.',
                  'Search for teams and message the best-fit opportunities directly.',
                  'Use this tracker to keep follow-ups organised once replies start arriving.',
                ]}
            primaryAction={{
              label: user?.role === 'Parent/Guardian' ? 'Open Child Availability' : 'Post Availability',
              onClick: () => navigate(user?.role === 'Parent/Guardian' ? '/child-player-availability' : '/post-availability'),
            }}
            secondaryAction={{ label: 'Search Opportunities', onClick: () => navigate('/search') }}
          />
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">Conversations with coaches</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Use this list to keep every opportunity moving forward.
                      </Typography>
                    </Box>
                    <Button onClick={() => navigate('/messages')} endIcon={<MessageIcon />}>
                      Open inbox
                    </Button>
                  </Box>
                  <Stack spacing={2}>
                    {relevantConversations.map((conversation) => {
                      const otherParticipant = conversation.participants[0];
                      return (
                        <Paper key={conversation.id} variant="outlined" sx={{ p: 2.5 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Coach conversation'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {conversation.latestMessage.message}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip size="small" label={conversation.matchProgressStage.replace(/_/g, ' ')} color="primary" variant="outlined" />
                                {conversation.unreadCount > 0 && <Chip size="small" label={`${conversation.unreadCount} unread`} color="error" />}
                                <Chip size="small" label={otherParticipant?.role || 'Coach'} variant="outlined" />
                              </Stack>
                            </Box>
                            <Button
                              variant="contained"
                              onClick={() => navigate('/messages', { state: { conversationId: conversation.id, openTrackerTab: 0 } })}
                            >
                              View Conversation
                            </Button>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Next actions
                  </Typography>
                  {matchProgress.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Trial invitations, decisions, and confirmations will appear here once conversations progress.
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {matchProgress.slice(0, 5).map((match) => (
                        <Paper key={match.id} variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {match.teamName || 'Opportunity'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {match.position || 'Role'} {match.ageGroup ? `• ${match.ageGroup}` : ''}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                            <Chip size="small" label={match.stage.replace(/_/g, ' ')} color={match.assignedTo ? 'warning' : 'default'} />
                            {match.nextAction && <Chip size="small" label={match.nextAction} variant="outlined" />}
                          </Stack>
                          <Button size="small" onClick={() => navigate('/match-completions')}>
                            Open Match Progress
                          </Button>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Keep momentum
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    The best tracker is only useful if it leads to action. Keep these three steps tight.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">1. Reply quickly to coach questions.</Typography>
                  <Typography variant="body2" color="text.secondary">2. Confirm trial availability clearly rather than leaving it ambiguous.</Typography>
                  <Typography variant="body2" color="text.secondary">3. Keep your advert current so coaches do not chase stale availability.</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                    <Button startIcon={<PostAddIcon />} variant="outlined" onClick={() => navigate(user?.role === 'Parent/Guardian' ? '/child-player-availability' : '/post-availability')}>
                      Update Availability
                    </Button>
                    <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => navigate('/search')}>
                      Search Again
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default MyApplicationsPage;