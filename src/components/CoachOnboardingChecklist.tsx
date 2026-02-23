import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  action: string;
  actionLabel: string;
}

interface CoachOnboardingChecklistProps {
  onDismiss?: () => void;
}

const CoachOnboardingChecklist: React.FC<CoachOnboardingChecklistProps> = ({ onDismiss }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const expanded = true; // Always expanded for now

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    // Use default items (backend endpoint not implemented)
    setItems(getDefaultItems());
  };

  const getDefaultItems = (): ChecklistItem[] => [
    {
      id: 'profile',
      label: '✓ Complete Your Profile',
      description: 'Add your coaching credentials, experience, and contact info',
      completed: false,
      action: '/profile',
      actionLabel: 'Complete Profile',
    },
    {
      id: 'team',
      label: '✓ Create Your First Team',
      description: 'Set up your team with age group, league, and location',
      completed: false,
      action: '/team-management',
      actionLabel: 'Create Team',
    },
    {
      id: 'vacancy',
      label: '✓ Post Your First Vacancy',
      description: 'Post an open position to start recruiting players',
      completed: false,
      action: '/post-advert',
      actionLabel: 'Post Vacancy',
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const completionPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const allComplete = completedCount === items.length;

  const handleDismiss = () => {
    setDismissDialogOpen(true);
  };

  const confirmDismiss = () => {
    localStorage.setItem('coach_onboarding_dismissed', 'true');
    setDismissDialogOpen(false);
    onDismiss?.();
  };

  const handleActionClick = (action: string) => {
    navigate(action);
  };

  if (allComplete && !expanded) {
    return null;
  }

  return (
    <>
      <Card
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 3,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                🚀 Welcome to Grassroots Scout!
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, opacity: 0.95 }}>
                Complete these 3 steps to get started recruiting players:
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">Progress</Typography>
                  <Typography variant="caption">{completionPercentage}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={completionPercentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: '#fff',
                    },
                  }}
                />
              </Box>

              {allComplete && (
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                  ✨ All set! You're ready to start recruiting.
                </Typography>
              )}
            </Box>

            <Button
              onClick={handleDismiss}
              sx={{
                color: 'white',
                minWidth: 'auto',
                ml: 2,
              }}
            >
              <CloseIcon />
            </Button>
          </Box>
        </CardContent>

        <Collapse in={expanded}>
          <Box sx={{ px: 3, pb: 3, borderTop: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <List sx={{ p: 0 }}>
              {items.map((item, index) => (
                <ListItem
                  key={item.id}
                  sx={{
                    py: 1.5,
                    px: 0,
                    borderBottom: index < items.length - 1 ? 1 : 0,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
                    {item.completed ? (
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    ) : (
                      <RadioButtonUncheckedIcon />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          textDecoration: item.completed ? 'line-through' : 'none',
                        }}
                      >
                        {item.label}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        {item.description}
                      </Typography>
                    }
                  />
                  {!item.completed && (
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{
                        color: 'white',
                        borderColor: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                      }}
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => handleActionClick(item.action)}
                    >
                      {item.actionLabel}
                    </Button>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>
      </Card>

      {/* Dismiss Dialog */}
      <Dialog open={dismissDialogOpen} onClose={() => setDismissDialogOpen(false)}>
        <DialogTitle>Hide Onboarding Guide?</DialogTitle>
        <DialogContent>
          <Typography>
            You can access this guide again from your dashboard. Complete the steps at your own pace!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDismissDialogOpen(false)}>Keep Showing</Button>
          <Button onClick={confirmDismiss} variant="contained">
            Hide
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CoachOnboardingChecklist;
