import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import BetaAccessManager from '../components/admin/BetaAccessManager';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const BetaAccessPage: React.FC = () => {
  const { user } = useAuth();

  // Only admins can access this page
  if (!user || user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Beta Access Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Control which users have access to the beta version of The Grassroots Hub.
        </Typography>
      </Box>
      
      <BetaAccessManager />
    </Container>
  );
};

export default BetaAccessPage;
