import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { authAPI, RegisterData } from '../services/api';
import { storage } from '../utils/storage';
import { isApiError } from '../utils/errorHandling';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  impersonateUser: (userType: 'Coach' | 'Player' | 'Parent/Guardian') => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;
  originalUser: User | null;
  storageWarning: string | null;
  loginError: string | null;
  setLoginError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored user session
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing authentication...');
      
      // Check storage availability and set warning if needed
      const warning = storage.getStorageWarning();
      setStorageWarning(warning);
      
      const token = storage.getItem('token');
      console.log('[AuthContext] Token found:', token ? 'Yes' : 'No');
      
      if (token) {
        try {
          // Use localStorage user data for mobile compatibility
          const storedUserStr = storage.getItem('user');
          if (storedUserStr) {
            const storedUser = JSON.parse(storedUserStr);
            console.log('[AuthContext] User restored from storage:', storedUser.email);
            setUser(storedUser);
          } else {
            console.warn('[AuthContext] Token exists but no user data found');
            storage.removeItem('token'); // Clean up orphaned token
          }
        } catch (error) {
          console.error('[AuthContext] Failed to restore user session:', error);
          storage.removeItem('token');
          storage.removeItem('user');
        }
      } else {
        console.log('[AuthContext] No existing session found');
      }
      
      console.log('[AuthContext] Initialization complete');
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('[AuthContext] Login attempt for:', email);
    setIsLoading(true);
    setLoginError(null);
    try {
      console.log('[AuthContext] Calling authAPI.login...');
      const response = await authAPI.login(email, password);
      console.log('[AuthContext] Login API response received:', response);
      
      if (response.user && response.token) {
        console.log('[AuthContext] Login successful, user found:', response.user.email);
        const user = response.user as User;
        setUser(user);
        storage.setItem('token', response.token);
        storage.setItem('user', JSON.stringify(user));
        
        const hasCompletedOnboarding = storage.getItem(`onboarding_completed_${user.id}`);
        
        // Check if account was created within the last 24 hours
        const accountCreatedAt = new Date(user.createdAt);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60);
        const isRecentlyCreated = hoursSinceCreation < 24;
        
        // Check if beta access was granted in the last 24 hours
        let isBetaAccessRecent = false;
        if (user.betaAccessGrantedAt) {
          const betaGrantedAt = new Date(user.betaAccessGrantedAt);
          const hoursSinceBetaGrant = (now.getTime() - betaGrantedAt.getTime()) / (1000 * 60 * 60);
          isBetaAccessRecent = hoursSinceBetaGrant < 24;
        }
        
        // Mark as new user if:
        // 1. They have the pending flag from registration (normal flow), OR
        // 2. Account is less than 24 hours old AND they haven't completed onboarding, OR
        // 3. Beta access was granted in the last 24 hours AND they haven't completed onboarding
        if (!hasCompletedOnboarding && (isRecentlyCreated || isBetaAccessRecent)) {
          storage.setItem(`new_user_${user.id}`, 'true');
          localStorage.removeItem('pending_new_user');
        } else if (!isRecentlyCreated && !isBetaAccessRecent) {
          // Clean up stale flags for old accounts
          localStorage.removeItem('pending_new_user');
          storage.removeItem(`new_user_${user.id}`);
        }
        
        console.log('[AuthContext] Login successful');
        return true;
      }
      console.warn('[AuthContext] Login failed - invalid response');
      setLoginError('Invalid email or password. Please check your credentials and try again.');
      return false;
    } catch (error: unknown) {
      console.error('[AuthContext] Login error caught:', error);
      console.error('[AuthContext] Error type:', typeof error);
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('[AuthContext] Error status:', (error as any).response?.status);
        console.error('[AuthContext] Error data:', (error as any).response?.data);
      }
      
      // Handle email verification requirement
      if (isApiError(error) && error.response?.status === 403 && error.response?.data?.requiresVerification) {
        // Store email for verification resend and rethrow with special flag
        localStorage.setItem('pendingVerificationEmail', email);
        throw { ...error, requiresVerification: true };
      }
      
      console.log('[AuthContext] About to return false for login failure');
      console.log('[AuthContext] Login failed due to error, returning false');
      // Add visual indicator that would show in LoginPage
      console.log('[AuthContext] VISUAL INDICATOR: AuthContext returning false');
      setLoginError('Invalid email or password. Please check your credentials and try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt'> & { password: string; dateOfBirth?: string }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const registerData: RegisterData = {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      };

      // Include date of birth if provided
      if (userData.dateOfBirth) {
        registerData.dateOfBirth = userData.dateOfBirth;
      }
      
      const response = await authAPI.register(registerData);
      
      // Registration successful - log the user in directly (email verification disabled)
      if (response.user && response.token) {
        setUser(response.user);
        storage.setItem('token', response.token);
        storage.setItem('user', JSON.stringify(response.user));
        // Store pending new user flag - will be converted to new_user flag on first successful login
        localStorage.setItem('pending_new_user', 'true');
      }
      return true;
    } catch (error: unknown) {
      console.error('Registration error:', error);
      
      // Handle age restriction errors
      if (isApiError(error) && error.response?.data?.ageRestriction) {
        // Let the component handle this specific error
        throw error;
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setOriginalUser(null);
    setIsImpersonating(false);
    storage.removeItem('token');
    storage.removeItem('user');
  };

  const impersonateUser = useCallback((userType: 'Coach' | 'Player' | 'Parent/Guardian') => {
    console.log('🔄 AuthContext: impersonateUser called with:', userType);
    console.log('👤 Current user:', user);
    console.log('🔐 Current isImpersonating:', isImpersonating);
    
    if (!user || user.role !== 'Admin') {
      console.error('❌ AuthContext: User is not admin or not logged in');
      return;
    }
    
    try {
      // Save original user if not already impersonating
      if (!isImpersonating) {
        console.log('💾 Saving original user for impersonation');
        setOriginalUser(user);
      }
      
      // Create a mock user for testing purposes
      const mockUser: User = {
        ...user,
        role: userType,
        firstName: `Test ${userType}`,
        lastName: `User`,
        email: `test.${userType.toLowerCase().replace('/', '.').replace(' ', '.')}@example.com`,
      };
      
      console.log('👤 Created mock user:', mockUser);
      
      setUser(mockUser);
      setIsImpersonating(true);
      
      console.log('✅ AuthContext: Impersonation successful');
    } catch (error) {
      console.error('❌ AuthContext: Error during impersonation:', error);
    }
  }, [user, isImpersonating]);

  const stopImpersonation = useCallback(() => {
    console.log('🔄 AuthContext: stopImpersonation called');
    console.log('👤 Original user:', originalUser);
    console.log('🔐 Is impersonating:', isImpersonating);
    
    if (originalUser && isImpersonating) {
      console.log('🔄 Restoring original user');
      setUser(originalUser);
      setOriginalUser(null);
      setIsImpersonating(false);
      console.log('✅ AuthContext: Impersonation stopped successfully');
    } else {
      console.warn('⚠️ AuthContext: Cannot stop impersonation - no original user or not impersonating');
    }
  }, [originalUser, isImpersonating]);

  const value = {
    user,
    login,
    register,
    logout,
    isLoading,
    impersonateUser,
    stopImpersonation,
    isImpersonating,
    originalUser,
    storageWarning,
    loginError,
    setLoginError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
