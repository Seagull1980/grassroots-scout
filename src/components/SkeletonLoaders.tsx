import React from 'react';
import { Skeleton, Card, CardContent, Box, Grid } from '@mui/material';

export const SearchCardSkeleton: React.FC = () => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      {/* Title */}
      <Skeleton variant="text" width="70%" height={32} sx={{ mb: 1 }} />
      
      {/* Chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={100} height={24} />
        <Skeleton variant="rounded" width={90} height={24} />
      </Box>
      
      {/* Description */}
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" sx={{ mb: 2 }} />
      
      {/* Location and contact */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Skeleton variant="circular" width={20} height={20} sx={{ mr: 1 }} />
        <Skeleton variant="text" width="40%" />
      </Box>
      
      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Skeleton variant="rounded" width={120} height={36} />
        <Skeleton variant="rounded" width={100} height={36} />
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
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="40%" height={40} />
        </Box>
        <Skeleton variant="circular" width={56} height={56} />
      </Box>
    </CardContent>
  </Card>
);

export const ProfileCardSkeleton: React.FC = () => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Skeleton variant="circular" width={80} height={80} sx={{ mr: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="50%" height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="70%" height={20} />
        </Box>
      </Box>
      
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="95%" sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Skeleton variant="rounded" width={100} height={32} />
        <Skeleton variant="rounded" width={100} height={32} />
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
            <Skeleton variant="text" width="90%" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const ListItemSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </Box>
      </Box>
    ))}
  </Box>
);
