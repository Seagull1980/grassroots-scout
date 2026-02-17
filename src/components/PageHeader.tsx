import React from 'react';
import {
  Box,
  Container,
  Typography,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: React.ComponentProps<typeof Container>['maxWidth'];
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  maxWidth = 'lg',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        borderRadius: 0,
        mb: 3,
      }}
    >
      <Container maxWidth={maxWidth}>
        <Box
          sx={{
            py: 3,
            px: 2,
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {icon && (
              <Avatar
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  width: isMobile ? 44 : 56,
                  height: isMobile ? 44 : 56,
                }}
              >
                {icon}
              </Avatar>
            )}
            <Box>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                component="h1"
                sx={{
                  fontWeight: 700,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 500,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {actions && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {actions}
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default PageHeader;
