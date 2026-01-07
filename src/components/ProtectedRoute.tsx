import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute]', {
    path: location.pathname,
    requireAuth,
    isLoading,
    hasUser: !!user,
    userEmail: user?.email
  });

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('[ProtectedRoute] Loading authentication state...');
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    console.log('[ProtectedRoute] Redirecting to login - auth required but no user');
    // Save the attempted location for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check beta access for logged-in users (except on beta-access-denied page and admin routes)
  if (requireAuth && user) {
    const isBetaAccessDeniedPage = location.pathname === '/beta-access-denied';
    const isAdmin = user.role === 'Admin';
    const hasBetaAccess = user.betaAccess === true || user.betaAccess === 1 || user.betaAccess === '1' || isAdmin;

    console.log('[ProtectedRoute] Beta access check:', {
      betaAccess: user.betaAccess,
      betaAccessType: typeof user.betaAccess,
      isAdmin,
      hasBetaAccess
    });

    // Redirect to beta access denied if user doesn't have access
    if (!isBetaAccessDeniedPage && !hasBetaAccess) {
      console.log('[ProtectedRoute] Redirecting to beta-access-denied - no beta access');
      return <Navigate to="/beta-access-denied" replace />;
    }

    // Redirect from beta-access-denied if user now has access
    if (isBetaAccessDeniedPage && hasBetaAccess) {
      console.log('[ProtectedRoute] Redirecting to dashboard - beta access granted');
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If user is logged in but trying to access login/register pages, redirect to dashboard
  if (!requireAuth && user && (location.pathname === '/login' || location.pathname === '/register')) {
    console.log('[ProtectedRoute] Redirecting to dashboard - user already logged in');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('[ProtectedRoute] Rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute;
