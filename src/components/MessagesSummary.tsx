import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  Button,
  Chip,
  Box,
  Divider
} from '@mui/material';
import {
  Message as MessageIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Conversation, MatchProgress, MatchProgressStage } from '../types';
import { API_URL } from '../services/api';
// Simple date formatting utility
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

interface MessagesSummaryProps {
  maxItems?: number;
}

const MessagesSummary: React.FC<MessagesSummaryProps> = ({ maxItems = 3 }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/conversations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations?.slice(0, maxItems) || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: MatchProgressStage): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (stage) {
      case 'initial_interest': return 'info';
      case 'dialogue_active': return 'primary';
      case 'trial_invited': return 'warning';
      case 'trial_scheduled': return 'warning';
      case 'trial_completed': return 'secondary';
      case 'decision_pending': return 'warning';
      case 'match_confirmed': return 'success';
      case 'match_declined': return 'error';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getStageLabel = (stage: MatchProgressStage): string => {
    switch (stage) {
      case 'initial_interest': return 'New Interest';
      case 'dialogue_active': return 'In Discussion';
      case 'trial_invited': return 'Trial Invited';
      case 'trial_scheduled': return 'Trial Scheduled';
      case 'trial_completed': return 'Trial Done';
      case 'decision_pending': return 'Decision Pending';
      case 'match_confirmed': return 'Confirmed';
      case 'match_declined': return 'Declined';
      case 'completed': return 'Complete';
      default: return 'Unknown';
    }
  };

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Messages
          </Typography>
          <Typography>Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            <Badge badgeContent={totalUnread} color="error">
              Messages
            </Badge>
          </Typography>
          <Button size="small" onClick={() => navigate('/messages')}>
            View All
          </Button>
        </Box>

        {conversations.length === 0 ? (
          <Box textAlign="center" py={3}>
            <MessageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No recent conversations
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {conversations.map((conversation, index) => {
              const otherParticipant = conversation.participants[0];
              return (
                <React.Fragment key={conversation.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    button
                    onClick={() => navigate('/messages')}
                    sx={{ px: 0 }}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={conversation.unreadCount} color="error">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <PersonIcon />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" noWrap>
                            {otherParticipant.firstName} {otherParticipant.lastName}
                          </Typography>
                          <Chip
                            size="small"
                            label={getStageLabel(conversation.matchProgressStage)}
                            color={getStageColor(conversation.matchProgressStage)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                            {conversation.latestMessage.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(conversation.latestMessage.createdAt))}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

interface MatchProgressSummaryProps {
  maxItems?: number;
}

export const MatchProgressSummary: React.FC<MatchProgressSummaryProps> = ({ maxItems = 3 }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMatchProgress();
    }
  }, [user?.id]); // Only reload when user ID changes (login/logout), not on every user object update

  const loadMatchProgress = async () => {
    try {
      const response = await fetch('/api/match-progress', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches?.slice(0, maxItems) || []);
      }
    } catch (error) {
      console.error('Failed to load match progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageIcon = (stage: MatchProgressStage) => {
    switch (stage) {
      case 'trial_invited':
      case 'trial_scheduled': return <ScheduleIcon fontSize="small" />;
      case 'decision_pending': return <PendingIcon fontSize="small" />;
      case 'match_confirmed':
      case 'completed': return <CheckCircleIcon fontSize="small" />;
      default: return <MessageIcon fontSize="small" />;
    }
  };

  const getStageColor = (stage: MatchProgressStage): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (stage) {
      case 'initial_interest': return 'info';
      case 'dialogue_active': return 'primary';
      case 'trial_invited': return 'warning';
      case 'trial_scheduled': return 'warning';
      case 'decision_pending': return 'warning';
      case 'match_confirmed': return 'success';
      case 'completed': return 'success';
      case 'match_declined': return 'error';
      default: return 'default';
    }
  };

  const getStageLabel = (stage: MatchProgressStage): string => {
    switch (stage) {
      case 'initial_interest': return 'New Interest';
      case 'dialogue_active': return 'In Discussion';
      case 'trial_invited': return 'Trial Invited';
      case 'trial_scheduled': return 'Trial Scheduled';
      case 'decision_pending': return 'Decision Pending';
      case 'match_confirmed': return 'Confirmed';
      case 'completed': return 'Complete';
      case 'match_declined': return 'Declined';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Match Progress
          </Typography>
          <Typography>Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            <Badge badgeContent={matches.filter(m => m.assignedTo === user?.role.toLowerCase()).length} color="warning">
              Match Progress
            </Badge>
          </Typography>
          <Button size="small" onClick={() => navigate('/messages')}>
            View All
          </Button>
        </Box>

        {matches.length === 0 ? (
          <Box textAlign="center" py={3}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No active matches
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {matches.map((match, index) => (
              <React.Fragment key={match.id}>
                {index > 0 && <Divider />}
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" fontWeight="medium">
                          {user?.role === 'Coach' ? match.playerName : match.teamName}
                        </Typography>
                        <Chip
                          icon={getStageIcon(match.stage)}
                          size="small"
                          label={getStageLabel(match.stage)}
                          color={getStageColor(match.stage)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {match.position} • {match.ageGroup}
                        </Typography>
                        {match.nextAction && (
                          <Typography variant="caption" fontWeight="medium">
                            Next: {match.nextAction}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatDistanceToNow(new Date(match.lastActivity))}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default MessagesSummary;
