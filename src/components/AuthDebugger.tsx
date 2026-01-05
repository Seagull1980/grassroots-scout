import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Debug component to monitor authentication state
const AuthDebugger: React.FC = () => {
  const { user, isImpersonating, originalUser } = useAuth();

  useEffect(() => {
    console.log('🔍 AuthDebugger - State Update:');
    console.log('👤 Current user:', user);
    console.log('🔐 Is impersonating:', isImpersonating);
    console.log('👤 Original user:', originalUser);
    console.log('---');
  }, [user, isImpersonating, originalUser]);

  // This component doesn't render anything visible
  return null;
};

export default AuthDebugger;
