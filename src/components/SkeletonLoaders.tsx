import React from 'react';
import { Skeleton, Card, CardContent, Box } from '@mui/material';

// Enhanced skeleton with wave animation
const EnhancedSkeleton = (props: any) => (
  <Skeleton 
    {...props}
    animation="wave"
    sx={{
      ...props.sx,
      '&::after': {
        animationDuration: '1.2s',
      },
    }}
  />
);

export const SearchCardSkeleton: React.FC = () => (
  <Card 
    sx={{ 
      mb: 2,
      animation: 'fadeInScale 0.3s ease-out',
      '@keyframes fadeInScale': {
        from: {
          opacity: 0,
          transform: 'scale(0.95)',
        },
        to: {
          opacity: 1,
          transform: 'scale(1)',
        },
      },
    }}
  >
    <CardContent>
      {/* Title */}
      <EnhancedSkeleton variant="text" width="70%" height={32} sx={{ mb: 1 }} />
      
      {/* Chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <EnhancedSkeleton variant="rounded" width={80} height={24} />
        <EnhancedSkeleton variant="rounded" width={100} height={24} />
        <EnhancedSkeleton variant="rounded" width={90} height={24} />
      </Box>
      
      {/* Description */}
      <EnhancedSkeleton variant="text" width="100%" />
      <EnhancedSkeleton variant="text" width="90%" sx={{ mb: 2 }} />
      
      {/* Location and contact */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <EnhancedSkeleton variant="circular" width={20} height={20} sx={{ mr: 1 }} />
        <EnhancedSkeleton variant="text" width="40%" />
      </Box>
      
      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <EnhancedSkeleton variant="rounded" width={120} height={36} />
        <EnhancedSkeleton variant="rounded" width={100} height={36} />
      </Box>
    </CardContent>
  </Card>
);

export const SearchResultsSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <SearchCardSkeleton key={index} />
    ))}
  </Box>
);

export const DashboardCardSkeleton: React.FC = () => (
  <Card
    sx={{
      animation: 'fadeInScale 0.3s ease-out',
      '@keyframes fadeInScale': {
        from: { opacity: 0, transform: 'scale(0.95)' },
        to: { opacity: 1, transform: 'scale(1)' },
      },
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <EnhancedSkeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
          <EnhancedSkeleton variant="text" width="40%" height={40} />
        </Box>
        <EnhancedSkeleton variant="circular" width={56} height={56} />
      </Box>
    </CardContent>
  </Card>
);

export const ProfileCardSkeleton: React.FC = () => (
  <Card
    sx={{
      animation: 'fadeInScale 0.3s ease-out',
      '@keyframes fadeInScale': {
        from: { opacity: 0, transform: 'scale(0.95)' },
        to: { opacity: 1, transform: 'scale(1)' },
      },
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <EnhancedSkeleton variant="circular" width={80} height={80} sx={{ mr: 2 }} />
        <Box sx={{ flex: 1 }}>
          <EnhancedSkeleton variant="text" width="50%" height={32} sx={{ mb: 1 }} />
          <EnhancedSkeleton variant="text" width="70%" height={20} />
        </Box>
      </Box>
      
      <EnhancedSkeleton variant="text" width="100%" />
      <EnhancedSkeleton variant="text" width="90%" />
      <EnhancedSkeleton variant="text" width="95%" sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        <EnhancedSkeleton variant="rounded" width={100} height={32} />
        <EnhancedSkeleton variant="rounded" width={100} height={32} />
      </Box>
    </CardContent>
  </Card>
);

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <>
    {Array.from({ length: 5 }).map((_, rowIndex) => (
      <tr key={rowIndex}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <td key={colIndex} style={{ padding: '16px' }}>
            <EnhancedSkeleton variant="text" width="90%" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const ListItemSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <Box 
        key={index} 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`,
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(10px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <EnhancedSkeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
        <Box sx={{ flex: 1 }}>
          <EnhancedSkeleton variant="text" width="60%" />
          <EnhancedSkeleton variant="text" width="40%" />
        </Box>
      </Box>
    ))}
  </Box>
);

