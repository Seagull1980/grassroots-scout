import { useState, useCallback } from 'react';

interface UseLoadingState {
  loading: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  setLoading: (value: boolean) => void;
}

/**
 * Custom hook for managing button loading states
 * Provides easy state management for async operations
 * 
 * Usage:
 * const { loading, start, stop } = useLoadingState();
 * 
 * const handleSubmit = async () => {
 *   start();
 *   try {
 *     await someAsyncOperation();
 *   } finally {
 *     stop();
 *   }
 * };
 */
export const useLoadingState = (initialState = false): UseLoadingState => {
  const [loading, setLoading] = useState(initialState);

  const start = useCallback(() => {
    setLoading(true);
  }, []);

  const stop = useCallback(() => {
    setLoading(false);
  }, []);

  const toggle = useCallback(() => {
    setLoading(prev => !prev);
  }, []);

  return { loading, start, stop, toggle, setLoading };
};

export default useLoadingState;
