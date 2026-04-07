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
  Group as GroupIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon,
  TaskAlt as TaskAltIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ActionEmptyState from '../components/ActionEmptyState';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Conversation, MatchProgress } from '../types';

const CoachApplicationsPage: React.FC = () => {
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
        console.error('Failed to load coach applications hub:', err);
        setError('Failed to load applications hub data.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'Coach') {
      loadData();
    }
  }, [user?.role]);

  const coachConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const otherParticipant = conversation.participants.find((participant) => participant.userId !== String(user?.id));
      return (
        otherParticipant?.role === 'Player' ||
        otherParticipant?.role === 'Parent/Guardian' ||
        ['vacancy_interest', 'player_inquiry', 'availability_interest'].includes(conversation.latestMessage.messageType)
      );
    });
  }, [conversations, user?.id]);

  const unreadCount = coachConversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);
  const trialCount = matchProgress.filter((match) => ['trial_invited', 'trial_scheduled', 'trial_completed'].includes(match.stage)).length;
  const decisionCount = matchProgress.filter((match) => match.stage === 'decision_pending' || match.assignedTo === 'coach').length;

  if (user?.role !== 'Coach') {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">This page is only available to coach accounts.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Applications Hub"
        subtitle="Review player interest, keep conversations moving, and stay on top of trial decisions."
        icon={<TaskAltIcon sx={{ fontSize: 32 }} />}
      />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Active conversations', value: coachConversations.length, helper: 'Player and parent interest', icon: <GroupIcon /> },
            { label: 'Unread replies', value: unreadCount, helper: 'Conversations needing review', icon: <MessageIcon /> },
            { label: 'Trials in motion', value: trialCount, helper: 'Invited, scheduled, or completed', icon: <ScheduleIcon /> },
            { label: 'Coach decisions', value: decisionCount, helper: 'Items waiting on you', icon: <TrendingUpIcon /> },
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
            <Typography color="text.secondary">Loading applications hub...</Typography>
          </Paper>
        ) : coachConversations.length === 0 && matchProgress.length === 0 ? (
          <ActionEmptyState
            icon={<TaskAltIcon sx={{ fontSize: 36 }} />}
            title="No player applications yet"
            description="When players or parents reach out, this hub will show the full pipeline so you can move quickly from interest to trial to decision."
            suggestions={[
              'Post a live vacancy so players can express interest.',
              'Search for players directly if you need to start outreach yourself.',
              'Use messages to keep every enquiry moving rather than losing them in the inbox.',
            ]}
            primaryAction={{ label: 'Post Vacancy', onClick: () => navigate('/post-vacancy') }}
            secondaryAction={{ label: 'Search Players', onClick: () => navigate('/search') }}
          />
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">Interest and conversations</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Open the conversation that needs the next coach action.
                      </Typography>
                    </Box>
                    <Button onClick={() => navigate('/messages')} endIcon={<MessageIcon />}>
                      Full inbox
                    </Button>
                  </Box>
                  <Stack spacing={2}>
                    {coachConversations.map((conversation) => {
                      const otherParticipant = conversation.participants[0];
                      return (
                        <Paper key={conversation.id} variant="outlined" sx={{ p: 2.5 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Player enquiry'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {conversation.latestMessage.message}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip size="small" label={conversation.matchProgressStage.replace(/_/g, ' ')} color="primary" variant="outlined" />
                                {conversation.unreadCount > 0 && <Chip size="small" label={`${conversation.unreadCount} unread`} color="error" />}
                                <Chip size="small" label={otherParticipant?.role || 'Contact'} variant="outlined" />
                              </Stack>
                            </Box>
                            <Button
                              variant="contained"
                              onClick={() => navigate('/messages', { state: { conversationId: conversation.id, openTrackerTab: 0 } })}
                            >
                              Open Conversation
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
                    Decision queue
                  </Typography>
                  {matchProgress.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Match progress items will appear here when trials or decisions are active.
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {matchProgress.slice(0, 5).map((match) => (
                        <Paper key={match.id} variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {match.playerName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {match.position || 'Player'} {match.ageGroup ? `• ${match.ageGroup}` : ''}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                            <Chip size="small" label={match.stage.replace(/_/g, ' ')} color={match.assignedTo === 'coach' ? 'warning' : 'default'} />
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
                    Coach workflow
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Keep every application moving through the same sequence so players get a clearer experience.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">1. Open unread conversations first.</Typography>
                  <Typography variant="body2" color="text.secondary">2. Move trials into a clear next stage instead of leaving them in general chat.</Typography>
                  <Typography variant="body2" color="text.secondary">3. Close the loop with every player once a decision is made.</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default CoachApplicationsPage;