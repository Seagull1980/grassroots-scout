import React from 'react';
import { Tooltip, Chip, Box } from '@mui/material';
import {
  Verified as VerifiedIcon,
  CheckCircle as CheckCircleIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';

interface VerificationBadgeProps {
  isVerified: boolean;
  verifiedRole?: 'Coach' | 'Player' | 'Parent/Guardian';
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified,
  verifiedRole,
  size = 'small',
  showLabel = false
}) => {
  if (!isVerified) return null;

  const getTooltipText = () => {
    switch (verifiedRole) {
      case 'Coach':
        return 'Verified Coach - Identity and credentials confirmed';
      case 'Player':
        return 'Verified Player - Identity confirmed';
      case 'Parent/Guardian':
        return 'Verified Parent/Guardian - Identity confirmed';
      default:
        return 'Verified User';
    }
  };

  const getIcon = () => {
    switch (verifiedRole) {
      case 'Coach':
        return <ShieldIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
      case 'Player':
        return <CheckCircleIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
      default:
        return <VerifiedIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
    }
  };

  const getBadgeColor = () => {
    switch (verifiedRole) {
      case 'Coach':
        return '#1976d2'; // blue
      case 'Player':
        return '#2e7d32'; // green
      case 'Parent/Guardian':
        return '#ed6c02'; // orange
      default:
        return '#1976d2';
    }
  };

  if (showLabel) {
    return (
      <Tooltip title={getTooltipText()} arrow>
        <Chip
          icon={getIcon()}
          label="Verified"
          size={size}
          sx={{
            bgcolor: getBadgeColor(),
            color: 'white',
            '& .MuiChip-icon': {
              color: 'white'
            }
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={getTooltipText()} arrow>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          color: getBadgeColor(),
          ml: 0.5
        }}
      >
        {getIcon()}
      </Box>
    </Tooltip>
  );
};

export default VerificationBadge;
