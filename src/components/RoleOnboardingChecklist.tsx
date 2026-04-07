import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  TaskAlt as TaskAltIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

type SupportedRole = 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  action: string;
  actionLabel: string;
}

interface RoleOnboardingChecklistProps {
  role: SupportedRole;
}

const getRoleKey = (role: SupportedRole) => role.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const CHECKLISTS: Record<SupportedRole, { title: string; subtitle: string; items: ChecklistItem[] }> = {
  Coach: {
    title: 'Coach launch plan',
    subtitle: 'Set up the basics, then start managing incoming player interest.',
    items: [
      {
        id: 'profile',
        label: 'Complete your coach profile',
        description: 'Add your experience and contact details so players know who they are speaking to.',
        action: '/profile',
        actionLabel: 'Open Profile',
      },
      {
        id: 'vacancy',
        label: 'Post your first vacancy',
        description: 'Get in front of players by publishing a live role for your team.',
        action: '/post-vacancy',
        actionLabel: 'Post Vacancy',
      },
      {
        id: 'applications',
        label: 'Review your applications hub',
        description: 'Keep interest, trials, and next steps in one place so nobody gets missed.',
        action: '/coach-applications',
        actionLabel: 'Open Hub',
      },
    ],
  },
  Player: {
    title: 'Player launch plan',
    subtitle: 'Show coaches what you offer, then keep your follow-ups organised.',
    items: [
      {
        id: 'profile',
        label: 'Complete your player profile',
        description: 'Add position, experience, and location so recommendations improve.',
        action: '/profile',
        actionLabel: 'Open Profile',
      },
      {
        id: 'availability',
        label: 'Post your availability',
        description: 'Create a player advert so coaches can find you without extra back-and-forth.',
        action: '/post-availability',
        actionLabel: 'Post Availability',
      },
      {
        id: 'tracker',
        label: 'Track your active applications',
        description: 'See replies, trials, and outstanding next actions in one tracker.',
        action: '/my-applications',
        actionLabel: 'Open Tracker',
      },
    ],
  },
  'Parent/Guardian': {
    title: 'Family launch plan',
    subtitle: 'Set up each child clearly so you can manage opportunities without confusion.',
    items: [
      {
        id: 'children',
        label: 'Add your first child profile',
        description: 'Create the child record first so age, position, and medical details are stored properly.',
        action: '/children',
        actionLabel: 'Manage Children',
      },
      {
        id: 'availability',
        label: 'Post child availability',
        description: 'Publish a child availability advert only after the profile details are ready.',
        action: '/child-player-availability',
        actionLabel: 'Open Availability',
      },
      {
        id: 'tracker',
        label: 'Track coach replies',
        description: 'Keep child-related conversations and decisions visible in one place.',
        action: '/my-applications',
        actionLabel: 'Open Tracker',
      },
    ],
  },
  Admin: {
    title: 'Admin launch plan',
    subtitle: 'Start with the operational views that keep the platform healthy.',
    items: [
      {
        id: 'moderation',
        label: 'Open moderation tools',
        description: 'Review flagged content and unresolved safety signals first.',
        action: '/admin/moderation',
        actionLabel: 'Open Moderation',
      },
      {
        id: 'users',
        label: 'Review user admin',
        description: 'Check access, roles, and approval queues before making broader changes.',
        action: '/admin/users',
        actionLabel: 'Open Users',
      },
      {
        id: 'analytics',
        label: 'Review performance analytics',
        description: 'Use the live metrics page as your shared view of platform health.',
        action: '/performance-analytics',
        actionLabel: 'Open Analytics',
      },
    ],
  },
};

const RoleOnboardingChecklist: React.FC<RoleOnboardingChecklistProps> = ({ role }) => {
  const navigate = useNavigate();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [dismissOpen, setDismissOpen] = useState(false);

  const roleKey = getRoleKey(role);
  const dismissedKey = `onboarding_dismissed_${roleKey}`;
  const progressKey = `onboarding_progress_${roleKey}`;

  const checklist = CHECKLISTS[role];

  useEffect(() => {
    const saved = localStorage.getItem(progressKey);
    if (!saved) {
      setCompletedIds([]);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      setCompletedIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCompletedIds([]);
    }
  }, [progressKey]);

  const completionPercentage = useMemo(() => {
    if (checklist.items.length === 0) return 0;
    return Math.round((completedIds.length / checklist.items.length) * 100);
  }, [checklist.items.length, completedIds.length]);

  const allComplete = completedIds.length === checklist.items.length;

  const toggleComplete = (itemId: string) => {
    const next = completedIds.includes(itemId)
      ? completedIds.filter((id) => id !== itemId)
      : [...completedIds, itemId];

    setCompletedIds(next);
    localStorage.setItem(progressKey, JSON.stringify(next));
  };

  const handleDismiss = () => {
    localStorage.setItem(dismissedKey, 'true');
    setDismissOpen(false);
    window.location.reload();
  };

  if (localStorage.getItem(dismissedKey)) {
    return null;
  }

  return (
    <>
      <Card
        sx={{
          mb: 3,
          color: 'white',
          background: 'linear-gradient(135deg, #0b5fff 0%, #0e8f68 100%)',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TaskAltIcon />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {checklist.title}
                </Typography>
                <Chip
                  label={allComplete ? 'Complete' : `${completionPercentage}% done`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white' }}
                />
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.92, mb: 2 }}>
                {checklist.subtitle}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={completionPercentage}
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'white',
                  },
                }}
              />
            </Box>
            <Button sx={{ color: 'white', minWidth: 'auto' }} onClick={() => setDismissOpen(true)}>
              <CloseIcon />
            </Button>
          </Box>

          <List sx={{ mt: 2, p: 0 }}>
            {checklist.items.map((item, index) => {
              const completed = completedIds.includes(item.id);
              return (
                <ListItem
                  key={item.id}
                  sx={{
                    px: 0,
                    py: 1.5,
                    alignItems: 'flex-start',
                    borderBottom: index < checklist.items.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'white', mt: 0.25 }}>
                    {completed ? <CheckCircleIcon sx={{ color: '#d6ffea' }} /> : <RadioButtonUncheckedIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 600, textDecoration: completed ? 'line-through' : 'none' }}>
                        {item.label}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                        {item.description}
                      </Typography>
                    }
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'stretch', minWidth: 148 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.72)' }}
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate(item.action)}
                    >
                      {item.actionLabel}
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      sx={{ color: 'white' }}
                      onClick={() => toggleComplete(item.id)}
                    >
                      {completed ? 'Mark not done' : 'Mark done'}
                    </Button>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>

      <Dialog open={dismissOpen} onClose={() => setDismissOpen(false)}>
        <DialogTitle>Hide this checklist?</DialogTitle>
        <DialogContent>
          <Typography>
            This only hides the checklist card. The steps and pages will still be available from your normal navigation.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDismissOpen(false)}>Keep showing</Button>
          <Button variant="contained" onClick={handleDismiss}>
            Hide checklist
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RoleOnboardingChecklist;