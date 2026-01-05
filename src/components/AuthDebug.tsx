import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Typography, Paper } from '@mui/material';

const AuthDebug: React.FC = () => {
  const { user, isLoading } = useAuth();

  return (
    <Paper sx={{ p: 2, m: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
      <Typography variant="h6">Authentication Debug Info</Typography>
      <Typography>Loading: {isLoading ? 'Yes' : 'No'}</Typography>
      <Typography>User: {user ? 'Logged in' : 'Not logged in'}</Typography>
      {user && (
        <>
          <Typography>Email: {user.email}</Typography>
          <Typography>Name: {user.firstName} {user.lastName}</Typography>
          <Typography>Role: {user.role}</Typography>
          <Typography>ID: {user.id}</Typography>
        </>
      )}
      <Typography>Token in localStorage: {localStorage.getItem('token') ? 'Present' : 'Missing'}</Typography>
    </Paper>
  );
};

export default AuthDebug;