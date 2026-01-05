import { useRef, useEffect } from 'react';

// Debug hook to track hook calls and identify violations
export const useHooksDebugger = (componentName: string) => {
  const hookCallsRef = useRef<string[]>([]);
  const renderCountRef = useRef(0);

  renderCountRef.current += 1;

  useEffect(() => {
    console.log(`🔍 ${componentName} - Render #${renderCountRef.current} - Hook calls:`, hookCallsRef.current);
    
    // Reset for next render
    hookCallsRef.current = [];
  });

  const trackHook = (hookName: string) => {
    hookCallsRef.current.push(hookName);
  };

  return { trackHook };
};
