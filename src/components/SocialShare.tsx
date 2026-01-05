import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Share as ShareIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  WhatsApp as WhatsAppIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon
} from '@mui/icons-material';

interface SocialShareProps {
  shareType: 'vacancy' | 'player_availability' | 'trial';
  targetId: number;
  title: string;
  description: string;
  url?: string;
  size?: 'small' | 'medium' | 'large';
}

const SocialShare: React.FC<SocialShareProps> = ({
  shareType,
  targetId,
  title,
  description,
  url,
  size = 'medium'
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const shareUrl = url || `${window.location.origin}/details/${shareType}/${targetId}`;
  const shareText = `${title} - ${description}`;

  const handleShareClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const trackShare = async (platform: string) => {
    try {
      await fetch('/api/social/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          shareType: shareType === 'player_availability' ? 'player' : shareType,
          targetId,
          targetType: shareType,
          platform
        })
      });
    } catch (error) {
      console.warn('Failed to track share:', error);
    }
  };

  const handleShare = async (platform: string, shareFunction: () => void) => {
    try {
      shareFunction();
      await trackShare(platform);
      handleClose();
    } catch (error) {
      console.error('Share failed:', error);
      setSnackbar({
        open: true,
        message: 'Failed to share. Please try again.',
        severity: 'error'
      });
    }
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=GrassrootsFootball,Football`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareToLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
  };

  const shareToWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${description}\n\nCheck it out: ${shareUrl}\n\nShared from The Grassroots Hub`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setSnackbar({
        open: true,
        message: 'Link copied to clipboard!',
        severity: 'success'
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${shareText}\n${shareUrl}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setSnackbar({
        open: true,
        message: 'Link copied to clipboard!',
        severity: 'success'
      });
    }
  };

  const shareOptions = [
    {
      name: 'Facebook',
      icon: <FacebookIcon sx={{ color: '#1877f2' }} />,
      action: () => handleShare('facebook', shareToFacebook)
    },
    {
      name: 'Twitter',
      icon: <TwitterIcon sx={{ color: '#1da1f2' }} />,
      action: () => handleShare('twitter', shareToTwitter)
    },
    {
      name: 'LinkedIn',
      icon: <LinkedInIcon sx={{ color: '#0077b5' }} />,
      action: () => handleShare('linkedin', shareToLinkedIn)
    },
    {
      name: 'WhatsApp',
      icon: <WhatsAppIcon sx={{ color: '#25d366' }} />,
      action: () => handleShare('whatsapp', shareToWhatsApp)
    },
    {
      name: 'Email',
      icon: <EmailIcon sx={{ color: '#ea4335' }} />,
      action: () => handleShare('email', shareViaEmail)
    },
    {
      name: 'Copy Link',
      icon: <CopyIcon />,
      action: () => handleShare('copy', copyToClipboard)
    }
  ];

  return (
    <Box>
      <Tooltip title="Share">
        <IconButton
          onClick={handleShareClick}
          size={size}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'action.hover'
            }
          }}
        >
          <ShareIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 200,
            boxShadow: 3
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {shareOptions.map((option) => (
          <MenuItem
            key={option.name}
            onClick={option.action}
            sx={{
              py: 1.5,
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {option.icon}
            </ListItemIcon>
            <ListItemText primary={option.name} />
          </MenuItem>
        ))}
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SocialShare;
