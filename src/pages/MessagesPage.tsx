import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Grid,
  Paper,
  Divider,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Message as MessageIcon,
  Send as SendIcon,
  Reply as ReplyIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Message, Conversation, MatchProgress, MatchProgressStage } from '../types';
import { API_URL } from '../services/api';
import PageHeader from '../components/PageHeader';
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`messages-tabpanel-${index}`}
      aria-labelledby={`messages-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [matchProgress, setMatchProgress] = useState<MatchProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageRecipient, setNewMessageRecipient] = useState<{ 
    id: string; 
    name: string; 
    context?: string;
    relatedVacancyId?: string;
    relatedPlayerAvailabilityId?: string;
    messageType?: string;
  } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadMatchProgress();
    }
  }, [user?.id]); // Only reload when user ID changes (login/logout), not on every user object update

  // Handle incoming state from map search
  useEffect(() => {
    if (location.state && (location.state as any).recipientId) {
      const state = location.state as any;
      setNewMessageRecipient({
        id: state.recipientId,
        name: state.recipientName || 'User',
        context: state.context,
        relatedVacancyId: state.relatedVacancyId,
        relatedPlayerAvailabilityId: state.relatedPlayerAvailabilityId,
        messageType: state.messageType
      });
      setNewMessageText(state.context ? `${state.context}\n\n` : '');
      setNewMessageOpen(true);
    }
  }, [location.state]);

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/conversations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMatchProgress = async () => {
    try {
      const response = await fetch(`${API_URL}/match-progress`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMatchProgress(data.matches || []);
      }
    } catch (error) {
      console.error('Failed to load match progress:', error);
    }
  };

  const updateMatchStage = async (conversationId: string, newStage: MatchProgressStage) => {
    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ matchProgressStage: newStage })
      });

      if (response.ok) {
        // Update selected conversation
        if (selectedConversation && selectedConversation.id === conversationId) {
          setSelectedConversation({
            ...selectedConversation,
            matchProgressStage: newStage
          });
        }
        // Refresh conversations and match progress
        await loadConversations();
        await loadMatchProgress();
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to update status: ${error.error || 'Please try again'}`);
      }
    } catch (error) {
      console.error('Failed to update match stage:', error);
      alert('Failed to update status. Please check your connection.');
    }
  };

  // Get possible next stages based on current stage
  const getNextStages = (currentStage: MatchProgressStage): Array<{ stage: MatchProgressStage; label: string }> => {
    const transitions: Record<MatchProgressStage, MatchProgressStage[]> = {
      'initial_interest': ['dialogue_active', 'match_declined'],
      'dialogue_active': ['trial_invited', 'decision_pending', 'match_declined'],
      'trial_invited': ['trial_scheduled', 'match_declined'],
      'trial_scheduled': ['trial_completed', 'match_declined'],
      'trial_completed': ['match_confirmed', 'decision_pending', 'match_declined'],
      'decision_pending': ['match_confirmed', 'match_declined'],
      'match_confirmed': ['completed'],
      'match_declined': [],
      'completed': []
    };

    return (transitions[currentStage] || []).map(stage => ({
      stage,
      label: getStageLabel(stage)
    }));
  };

  const getStageColor = (stage: MatchProgressStage): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (stage) {
      case 'initial_interest': return 'info';
      case 'dialogue_active': return 'primary';
      case 'trial_invited': return 'warning';
      case 'trial_scheduled': return 'warning';
      case 'trial_completed': return 'info';
      case 'decision_pending': return 'warning';
      case 'match_confirmed': return 'success';
      case 'match_declined': return 'error';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadConversationMessages(conversation.id);
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyMessage.trim()) return;

    try {
      setSending(true);
      
      // Extract recipient ID from conversation participants
      const otherParticipant = selectedConversation.participants.find(p => p.userId !== user?.id);
      if (!otherParticipant) {
        alert('Could not find recipient');
        setSending(false);
        return;
      }
      
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipientId: otherParticipant.userId,
          subject: 'Re: Conversation',
          message: replyMessage.trim(),
          messageType: 'general'
        })
      });

      if (response.ok) {
        setReplyMessage('');
        setReplyOpen(false);
        await loadConversationMessages(selectedConversation.id);
        await loadConversations(); // Refresh to update latest message
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to send reply:', errorData);
        alert(`Failed to send message: ${errorData.error || 'Please try again'}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSendNewMessage = async () => {
    if (!newMessageRecipient || !newMessageText.trim()) return;

    try {
      setSending(true);
      const recipientIdInt = parseInt(newMessageRecipient.id);
      
      console.log('Sending message to:', {
        recipientId: recipientIdInt,
        originalId: newMessageRecipient.id,
        recipientName: newMessageRecipient.name,
        relatedVacancyId: newMessageRecipient.relatedVacancyId,
        relatedPlayerAvailabilityId: newMessageRecipient.relatedPlayerAvailabilityId,
        messageType: newMessageRecipient.messageType
      });
      
      const body: any = {
        recipientId: recipientIdInt,
        subject: `Message regarding ${newMessageRecipient.context || 'availability'}`,
        message: newMessageText.trim(),
        messageType: newMessageRecipient.messageType || 'vacancy_interest'
      };

      // Add related IDs if available
      if (newMessageRecipient.relatedVacancyId) {
        // Extract numeric ID from strings like "test-1" or just "1"
        const vacancyIdStr = String(newMessageRecipient.relatedVacancyId);
        const numericMatch = vacancyIdStr.match(/\d+$/);
        const vacancyId = numericMatch ? parseInt(numericMatch[0]) : parseInt(vacancyIdStr);
        
        if (!isNaN(vacancyId)) {
          body.relatedVacancyId = vacancyId;
          console.log('Added relatedVacancyId:', body.relatedVacancyId, 'from:', newMessageRecipient.relatedVacancyId);
        } else {
          console.warn('Invalid relatedVacancyId:', newMessageRecipient.relatedVacancyId);
        }
      }
      if (newMessageRecipient.relatedPlayerAvailabilityId) {
        // Extract numeric ID from strings like "test-1" or just "1"
        const availabilityIdStr = String(newMessageRecipient.relatedPlayerAvailabilityId);
        const numericMatch = availabilityIdStr.match(/\d+$/);
        const availabilityId = numericMatch ? parseInt(numericMatch[0]) : parseInt(availabilityIdStr);
        
        if (!isNaN(availabilityId)) {
          body.relatedPlayerAvailabilityId = availabilityId;
          console.log('Added relatedPlayerAvailabilityId:', body.relatedPlayerAvailabilityId, 'from:', newMessageRecipient.relatedPlayerAvailabilityId);
        } else {
          console.warn('Invalid relatedPlayerAvailabilityId:', newMessageRecipient.relatedPlayerAvailabilityId);
        }
      }
      
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setNewMessageText('');
        setNewMessageRecipient(null);
        setNewMessageOpen(false);
        // Wait a moment for the database to update, then refresh conversations
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadConversations();
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: 'Unknown error occurred' };
        }
        
        console.error('Failed to send message:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          sentBody: body
        });
        
        // Provide user-friendly error messages
        let errorMessage = 'Failed to send message. ';
        if (response.status === 401 || response.status === 403) {
          errorMessage += 'Your session has expired. Please log out and log back in to continue.';
        } else if (response.status === 404 && errorData.error?.includes('Recipient not found')) {
          errorMessage += 'The user you are trying to message could not be found. They may have deleted their account.';
        } else if (response.status === 400 && errorData.errors) {
          // Show validation errors
          const validationErrors = errorData.errors.map((e: any) => e.msg).join(', ');
          errorMessage += validationErrors;
        } else if (errorData.error) {
          errorMessage += errorData.error;
        } else {
          errorMessage += `Server error (${response.status}). Please try again.`;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Failed to send new message:', error);
      alert('Failed to send message. Please check your internet connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const getStageIcon = (stage: MatchProgressStage) => {
    switch (stage) {
      case 'initial_interest': return <MessageIcon />;
      case 'dialogue_active': return <MessageIcon />;
      case 'trial_invited': return <ScheduleIcon />;
      case 'trial_scheduled': return <ScheduleIcon />;
      case 'trial_completed': return <CheckCircleIcon />;
      case 'decision_pending': return <PendingIcon />;
      case 'match_confirmed': return <CheckCircleIcon />;
      case 'match_declined': return <CloseIcon />;
      case 'completed': return <CheckCircleIcon />;
      default: return <MessageIcon />;
    }
  };

  const getStageLabel = (stage: MatchProgressStage): string => {
    switch (stage) {
      case 'initial_interest': return 'Initial Interest';
      case 'dialogue_active': return 'In Discussion';
      case 'trial_invited': return 'Trial Invited';
      case 'trial_scheduled': return 'Trial Scheduled';
      case 'trial_completed': return 'Trial Completed';
      case 'decision_pending': return 'Awaiting Decision';
      case 'match_confirmed': return 'Match Confirmed';
      case 'match_declined': return 'Match Declined';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  // Get message template suggestions based on user role and context
  const getMessageTemplates = (): Array<{ label: string; text: string }> => {
    const templates: Array<{ label: string; text: string }> = [];

    if (user?.role === 'Coach') {
      // Coach-specific templates
      templates.push(
        {
          label: 'Express Interest',
          text: "Hi! I saw your profile and I'm impressed with your experience. We're looking for players like you for our team. Would you be interested in discussing further?"
        },
        {
          label: 'Trial Invitation',
          text: "We'd love to see you in action! Would you be available for a trial session? We can arrange a time that works best for you."
        },
        {
          label: 'Follow-up',
          text: "Just checking in to see if you're still interested. Let me know if you have any questions about our program or team."
        },
        {
          label: 'Offer Position',
          text: "Based on your profile, I think you'd be a great fit for our [position] role. We'd like to offer you a spot on our squad."
        }
      );
    } else {
      // Player/Parent templates
      templates.push(
        {
          label: 'Express Interest',
          text: "Hi! I'm interested in this playing opportunity. Can you tell me more about the position, training schedule, and what you're looking for in a player?"
        },
        {
          label: 'Ask Questions',
          text: "Thanks for reaching out! I have a few questions: What's the training frequency?  What level of experience are you looking for? And what's the age group composition?"
        },
        {
          label: 'Confirm Availability',
          text: "Great! I'm very interested. I'm available for trials and haven't committed elsewhere. When would you like to schedule a session?"
        },
        {
          label: 'Accept Offer',
          text: "Thank you for the offer! I'm excited to join your team. When can I start training?"
        }
      );
    }

    return templates;
  };

  const insertTemplate = (text: string) => {
    if (replyOpen) {
      setReplyMessage(text);
    } else if (newMessageOpen) {
      setNewMessageText(text);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Messages & Match Progress"
        subtitle="Centralised communication hub and match tracking"
        icon={<MessageIcon sx={{ fontSize: 32 }} />}
        maxWidth="xl"
      />
      <Container maxWidth="xl">

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab 
            label={
              <Badge badgeContent={conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)} color="error">
                Conversations
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={matchProgress.filter(m => m.assignedTo === user?.role.toLowerCase()).length} color="warning">
                Match Progress
              </Badge>
            } 
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Conversations List */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Conversations</Typography>
                  <IconButton onClick={loadConversations} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Box>
                {conversations.length === 0 ? (
                  <Typography color="text.secondary" align="center" py={4}>
                    No conversations yet
                  </Typography>
                ) : (
                  <List>
                    {conversations.map((conversation) => {
                      const otherParticipant = conversation.participants.find(p => p.userId !== user?.id);
                      return (
                        <ListItem
                          key={conversation.id}
                          button
                          selected={selectedConversation?.id === conversation.id}
                          onClick={() => handleConversationSelect(conversation)}
                        >
                          <ListItemAvatar>
                            <Badge badgeContent={conversation.unreadCount} color="error">
                              <Avatar>
                                <PersonIcon />
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${otherParticipant?.firstName} ${otherParticipant?.lastName}`}
                            secondary={
                              <React.Fragment>
                                <Typography variant="body2" noWrap component="span" display="block">
                                  {conversation.latestMessage.message}
                                </Typography>
                                <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: '4px' }}>
                                  <Chip 
                                    size="small" 
                                    label={getStageLabel(conversation.matchProgressStage)}
                                    color={getStageColor(conversation.matchProgressStage) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                                    variant="outlined"
                                  />
                                  <Typography variant="caption" color="text.secondary" component="span">
                                    {formatDistanceToNow(new Date(conversation.latestMessage.createdAt))}
                                  </Typography>
                                </Box>
                              </React.Fragment>
                            }
                            secondaryTypographyProps={{ component: 'div' }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Conversation Messages */}
          <Grid item xs={12} md={8}>
            {selectedConversation ? (
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Conversation with {selectedConversation.participants.find(p => p.userId !== user?.id)?.firstName}
                    </Typography>
                    <Button
                      startIcon={<ReplyIcon />}
                      onClick={() => setReplyOpen(true)}
                      variant="contained"
                    >
                      Reply
                    </Button>
                  </Box>

                  {/* Status and Quick Actions */}
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={600}>Status:</Typography>
                        <Chip
                          icon={getStageIcon(selectedConversation.matchProgressStage)}
                          label={getStageLabel(selectedConversation.matchProgressStage)}
                          color={getStageColor(selectedConversation.matchProgressStage) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                          size="small"
                        />
                      </Box>
                      {/* Quick action buttons for next stages */}
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {getNextStages(selectedConversation.matchProgressStage)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((option) => (
                          <Button
                            key={option.stage}
                            size="small"
                            variant="outlined"
                            onClick={() => updateMatchStage(selectedConversation.id, option.stage)}
                          >
                            {option?.label || 'Next step'}
                          </Button>
                        ))}
                      </Box>
                    </Box>

                    {/* Advert Context */}
                    {(selectedConversation.relatedVacancyId || selectedConversation.relatedPlayerAvailabilityId) && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          📋 Related posting context
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedConversation.relatedVacancyId 
                            ? 'Team Vacancy' 
                            : selectedConversation.relatedPlayerAvailabilityId 
                            ? 'Player Availability' 
                            : 'General Inquiry'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {selectedConversation.relatedVacancyId || selectedConversation.relatedPlayerAvailabilityId || 'Not specified'}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {messages.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>
                      No messages in this conversation
                    </Typography>
                  ) : (
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {messages.map((message) => {
                        const isFromMe = message.senderId === user?.id;
                        return (
                          <Paper
                            key={message.id}
                            sx={{
                              p: 2,
                              mb: 2,
                              ml: isFromMe ? 4 : 0,
                              mr: isFromMe ? 0 : 4,
                              bgcolor: isFromMe ? 'primary.light' : 'grey.100'
                            }}
                          >
                            <Typography variant="body1" gutterBottom>
                              {message.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {isFromMe ? 'You' : message.senderName} • {formatDistanceToNow(new Date(message.createdAt))}
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <Box textAlign="center" py={8}>
                    <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      Select a conversation to view messages
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {matchProgress.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box textAlign="center" py={8}>
                    <CheckCircleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No active matches in progress
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            matchProgress.map((match, index) => (
              <Grid item xs={12} md={6} key={match.id || `match-${index}`}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6">
                          {user?.role === 'Coach' ? match.playerName : match.teamName}
                        </Typography>
                        <Typography color="text.secondary">
                          {match.position} • {match.ageGroup}
                        </Typography>
                      </Box>
                      <Chip
                        icon={getStageIcon(match.stage)}
                        label={getStageLabel(match.stage)}
                        color={getStageColor(match.stage) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      />
                    </Box>
                    
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Last activity: {formatDistanceToNow(new Date(match.lastActivity))}
                      </Typography>
                      {match.nextAction && (
                        <Typography variant="body2" fontWeight="medium" mt={1}>
                          Next: {match.nextAction}
                        </Typography>
                      )}
                      {match.trialDate && (
                        <Typography variant="body2" mt={1}>
                          Trial scheduled: {new Date(match.trialDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>

                    <Box display="flex" gap={1}>
                      <Button 
                        size="small" 
                        onClick={() => {
                          const conversation = conversations.find(c => c.id === match.conversationId);
                          if (conversation) {
                            setTabValue(0);
                            handleConversationSelect(conversation);
                          }
                        }}
                      >
                        View Conversation
                      </Button>
                      {match.assignedTo === user?.role.toLowerCase() && (
                        <Button size="small" variant="contained">
                          Take Action
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </TabPanel>

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onClose={() => setReplyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Reply</DialogTitle>
        <DialogContent>
          {/* Message Templates */}
          {replyMessage.length === 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                💡 Quick templates ({getMessageTemplates().length} available):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {getMessageTemplates().filter(Boolean).map((template) => (
                  <Button
                    key={template?.label || 'template'}
                    size="small"
                    variant="outlined"
                    onClick={() => insertTemplate(template.text)}
                    sx={{ textTransform: 'none' }}
                  >
                    {template?.label || 'Template'}
                  </Button>
                ))}
              </Box>
              <Divider sx={{ my: 2 }} />
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Type your message..."
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSendReply}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={!replyMessage.trim() || sending}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Message Dialog */}
      <Dialog open={newMessageOpen} onClose={() => {
        setNewMessageOpen(false);
        setNewMessageRecipient(null);
        setNewMessageText('');
      }} maxWidth="sm" fullWidth>
        <DialogTitle>
          New Message {newMessageRecipient && `to ${newMessageRecipient.name}`}
        </DialogTitle>
        <DialogContent>
          {/* Message Templates */}
          {newMessageText.length === 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                💡 Quick templates ({getMessageTemplates().length} available):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {getMessageTemplates().filter(Boolean).map((template) => (
                  <Button
                    key={template?.label || 'template'}
                    size="small"
                    variant="outlined"
                    onClick={() => insertTemplate(template.text)}
                    sx={{ textTransform: 'none' }}
                  >
                    {template?.label || 'Template'}
                  </Button>
                ))}
              </Box>
              <Divider sx={{ my: 2 }} />
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={6}
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            placeholder="Type your message..."
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNewMessageOpen(false);
            setNewMessageRecipient(null);
            setNewMessageText('');
          }}>Cancel</Button>
          <Button
            onClick={handleSendNewMessage}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={!newMessageText.trim() || !newMessageRecipient || sending}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default MessagesPage;
