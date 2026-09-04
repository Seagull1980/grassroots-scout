import React from 'react';
import { Alert, Button } from '@mui/material';
import { Feedback as FeedbackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BetaBanner: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Alert
      severity="info"
      icon={<FeedbackIcon />}
      action={(
        <Button color="inherit" size="small" onClick={() => navigate(user ? '/my-feedback' : '/login')}>
          Share feedback
        </Button>
      )}
      sx={{
        borderRadius: 0,
        alignItems: 'center',
        '& .MuiAlert-message': { flex: 1 }
      }}
    >
      Grassroots Scout is currently in beta testing. Your feedback is very welcome.
    </Alert>
  );
};

export default BetaBanner;
