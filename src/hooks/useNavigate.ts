import { useNavigate as useReactRouterNavigate } from 'react-router-dom';
import { useRef, useCallback } from 'react';

/**
 * Enhanced navigate hook that prevents rapid navigation and touch sensitivity issues
 */
export const useNavigate = () => {
  const navigate = useReactRouterNavigate();
  const lastNavigationRef = useRef<number>(0);
  const isNavigatingRef = useRef<boolean>(false);

  const safeNavigate = useCallback((path: string, options?: { delay?: number; force?: boolean }) => {
    const now = Date.now();
    const minDelay = options?.delay || 500;
    
    // Prevent rapid navigation unless forced
    if (!options?.force && (
      isNavigatingRef.current || 
      now - lastNavigationRef.current < minDelay
    )) {
      console.log('Navigation blocked - too rapid or already navigating');
      return;
    }

    console.log('Safe navigation to:', path);
    lastNavigationRef.current = now;
    isNavigatingRef.current = true;

    // Add small delay for mobile touch handling
    setTimeout(() => {
      navigate(path);
      
      // Reset navigation lock after completion
      setTimeout(() => {
        isNavigatingRef.current = false;
        console.log('Navigation completed for:', path);
      }, 300);
    }, 200);
  }, [navigate]);

  // Return both the safe navigate function and the original navigate
  return {
    navigate: safeNavigate,
    navigateOriginal: navigate,
    isNavigating: isNavigatingRef.current
  };
};

export default useNavigate;
