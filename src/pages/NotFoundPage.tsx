import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { SportsFootball } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          textAlign: 'center',
          gap: 3 }}
      >
        <SportsFootball sx={{ fontSize: 80, color: 'text.disabled' }} />
        <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 800, color: 'text.disabled', lineHeight: 1 }}>
          404
        </Typography>
        <Typography variant="h5" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
          This page doesn't exist or may have been moved. Head back to find players and teams.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(user ? '/start' : '/')}
          >
            Go Home
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/search')}
          >
            Search
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default NotFoundPage;
