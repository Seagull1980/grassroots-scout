import { useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationState {
  isNavigating: boolean;
  lastNavigationTime: number;
  pendingNavigations: Set<string>;
}

const NAVIGATION_COOLDOWN = 1000; // 1 second between navigations
const DEFAULT_NAVIGATION_DELAY = 150; // Small delay to prevent double taps

export const useSmartNavigation = () => {
  const navigate = useNavigate();
  const stateRef = useRef<NavigationState>({
    isNavigating: false,
    lastNavigationTime: 0,
    pendingNavigations: new Set(),
  });

  const canNavigate = useCallback((path: string) => {
    const now = Date.now();
    const state = stateRef.current;
    
    // Check if we're already navigating
    if (state.isNavigating) {
      console.log('Navigation blocked: already navigating');
      return false;
    }
    
    // Check cooldown period
    if (now - state.lastNavigationTime < NAVIGATION_COOLDOWN) {
      console.log('Navigation blocked: cooldown period', now - state.lastNavigationTime);
      return false;
    }
    
    // Check if there's already a pending navigation to this path
    if (state.pendingNavigations.has(path)) {
      console.log('Navigation blocked: already pending for', path);
      return false;
    }
    
    return true;
  }, []);

  const safeNavigate = useCallback((path: string, options?: { delay?: number; replace?: boolean }) => {
    if (!canNavigate(path)) {
      return false;
    }

    const delay = options?.delay ?? DEFAULT_NAVIGATION_DELAY;
    const state = stateRef.current;

    // Mark as navigating immediately
    state.isNavigating = true;
    state.pendingNavigations.add(path);

    console.log('Scheduling navigation to:', path, 'with delay:', delay);

    // Schedule the actual navigation
    setTimeout(() => {
      try {
        console.log('Executing navigation to:', path);
        if (options?.replace) {
          navigate(path, { replace: true });
        } else {
          navigate(path);
        }
        
        // Update state
        state.lastNavigationTime = Date.now();
        state.pendingNavigations.delete(path);
        
      } catch (error) {
        console.error('Navigation error:', error);
      }
      
      // Keep navigating state for a bit longer to prevent immediate subsequent navigations
      setTimeout(() => {
        state.isNavigating = false;
        console.log('Navigation cooldown ended');
      }, 500);
      
    }, delay);

    return true;
  }, [navigate, canNavigate]);

  const clearNavigationState = useCallback(() => {
    const state = stateRef.current;
    state.isNavigating = false;
    state.pendingNavigations.clear();
    console.log('Navigation state cleared');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearNavigationState();
    };
  }, [clearNavigationState]);

  return {
    navigate: safeNavigate,
    isNavigating: stateRef.current.isNavigating,
    canNavigate,
    clearNavigationState,
  };
};
