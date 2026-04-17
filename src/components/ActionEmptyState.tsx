import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Paper,
  Stack,
  Typography } from '@mui/material';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
}

interface ActionEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  suggestions?: string[];
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

const ActionEmptyState: React.FC<ActionEmptyStateProps> = ({
  icon,
  title,
  description,
  suggestions = [],
  primaryAction,
  secondaryAction }) => {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Avatar
        sx={{
          width: 72,
          height: 72,
          mx: 'auto',
          mb: 2,
          bgcolor: 'primary.light',
          color: 'primary.main' }}
      >
        {icon}
      </Avatar>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 540, mx: 'auto', mb: suggestions.length > 0 ? 2 : 3 }}>
        {description}
      </Typography>
      {suggestions.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {suggestions.map((suggestion) => (
            <Typography key={suggestion} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {suggestion}
            </Typography>
          ))}
        </Box>
      )}
      {(primaryAction || secondaryAction) && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
          {primaryAction && (
            <Button variant={primaryAction.variant || 'contained'} onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant={secondaryAction.variant || 'outlined'} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </Stack>
      )}
    </Paper>
  );
};

export default ActionEmptyState;