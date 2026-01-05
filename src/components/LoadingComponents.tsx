import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Grid,
  Stack,
  Paper
} from '@mui/material';
import { useResponsive } from '../hooks/useResponsive';

// Generic loading component
export const LoadingSpinner: React.FC<{ size?: number; text?: string }> = ({ 
  size = 40, 
  text = 'Loading...' 
}) => (
  <Box 
    display="flex" 
    flexDirection="column" 
    alignItems="center" 
    justifyContent="center" 
    p={4}
  >
    <Skeleton variant="circular" width={size} height={size} sx={{ mb: 2 }} />
    <Skeleton variant="text" width={120}>
      {text}
    </Skeleton>
  </Box>
);

// Card skeleton for lists
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  const { isMobile } = useResponsive();
  
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} sx={{ mb: 2, height: isMobile ? 200 : 250 }}>
          <CardContent>
            <Stack spacing={2}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="100%" height={20} />
              <Skeleton variant="text" width="100%" height={20} />
              <Skeleton variant="text" width="80%" height={20} />
              <Box display="flex" justifyContent="space-between" mt={2}>
                <Skeleton variant="rectangular" width={80} height={32} />
                <Skeleton variant="rectangular" width={100} height={32} />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

// Search results skeleton
export const SearchResultsSkeleton: React.FC = () => {
  const { isMobile } = useResponsive();
  
  return (
    <Grid container spacing={isMobile ? 1 : 2}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card sx={{ height: 280 }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Skeleton variant="text" width="70%" height={28} />
                <Skeleton variant="text" width="50%" height={20} />
                <Skeleton variant="text" width="100%" height={16} />
                <Skeleton variant="text" width="100%" height={16} />
                <Skeleton variant="text" width="90%" height={16} />
                <Box display="flex" gap={1} mt={2}>
                  <Skeleton variant="rectangular" width={60} height={24} />
                  <Skeleton variant="rectangular" width={80} height={24} />
                </Box>
                <Box display="flex" justifyContent="space-between" mt={2}>
                  <Skeleton variant="rectangular" width={90} height={36} />
                  <Skeleton variant="rectangular" width={90} height={36} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => {
  const { isMobile } = useResponsive();
  
  return (
    <Box p={isMobile ? 2 : 3}>
      {/* Header skeleton */}
      <Box mb={4}>
        <Skeleton variant="text" width="300px" height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="200px" height={24} />
      </Box>
      
      {/* Stats cards skeleton */}
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={32} />
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      {/* Content skeleton */}
      <Grid container spacing={isMobile ? 2 : 3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Skeleton variant="text" width="200px" height={28} sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Box key={index} display="flex" alignItems="center" gap={2}>
                  <Skeleton variant="circular" width={48} height={48} />
                  <Box flex={1}>
                    <Skeleton variant="text" width="70%" height={20} />
                    <Skeleton variant="text" width="50%" height={16} />
                  </Box>
                  <Skeleton variant="rectangular" width={80} height={32} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width="150px" height={28} sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Box key={index} display="flex" alignItems="center" gap={2}>
                  <Skeleton variant="rectangular" width={40} height={40} />
                  <Box flex={1}>
                    <Skeleton variant="text" width="80%" height={16} />
                    <Skeleton variant="text" width="60%" height={14} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <Paper sx={{ overflow: 'hidden' }}>
    {/* Header */}
    <Box display="flex" p={2} borderBottom={1} borderColor="divider">
      {Array.from({ length: cols }).map((_, index) => (
        <Box key={index} flex={1} px={1}>
          <Skeleton variant="text" width="80%" height={20} />
        </Box>
      ))}
    </Box>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box key={rowIndex} display="flex" p={2} borderBottom={1} borderColor="divider">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Box key={colIndex} flex={1} px={1}>
            <Skeleton variant="text" width="90%" height={16} />
          </Box>
        ))}
      </Box>
    ))}
  </Paper>
);

// Form skeleton
export const FormSkeleton: React.FC = () => {
  const { isMobile } = useResponsive();
  
  return (
    <Paper sx={{ p: isMobile ? 2 : 3 }}>
      <Skeleton variant="text" width="200px" height={32} sx={{ mb: 3 }} />
      
      <Stack spacing={3}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Box key={index}>
            <Skeleton variant="text" width="120px" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={56} />
          </Box>
        ))}
        
        <Box display="flex" gap={2} justifyContent="flex-end" mt={4}>
          <Skeleton variant="rectangular" width={100} height={40} />
          <Skeleton variant="rectangular" width={120} height={40} />
        </Box>
      </Stack>
    </Paper>
  );
};

// Map skeleton
export const MapSkeleton: React.FC = () => (
  <Paper sx={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Stack alignItems="center" spacing={2}>
      <Skeleton variant="rectangular" width={60} height={60} />
      <Skeleton variant="text" width={150} height={20} />
      <Skeleton variant="text" width={200} height={16} />
    </Stack>
  </Paper>
);

// Profile skeleton
export const ProfileSkeleton: React.FC = () => {
  const { isMobile } = useResponsive();
  
  return (
    <Box p={isMobile ? 2 : 3}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={3} mb={3}>
          <Skeleton variant="circular" width={80} height={80} />
          <Box flex={1}>
            <Skeleton variant="text" width="250px" height={32} />
            <Skeleton variant="text" width="180px" height={20} />
            <Skeleton variant="text" width="200px" height={16} />
          </Box>
          {!isMobile && (
            <Skeleton variant="rectangular" width={120} height={40} />
          )}
        </Box>
        
        {isMobile && (
          <Skeleton variant="rectangular" width="100%" height={40} sx={{ mb: 2 }} />
        )}
      </Paper>
      
      <Grid container spacing={isMobile ? 2 : 3}>
        <Grid item xs={12} md={8}>
          <FormSkeleton />
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width="150px" height={24} sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Box key={index}>
                  <Skeleton variant="text" width="100%" height={16} />
                  <Skeleton variant="text" width="80%" height={14} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};