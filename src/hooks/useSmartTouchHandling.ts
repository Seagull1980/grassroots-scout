import { useCallback, useRef, useEffect } from 'react';

interface TouchState {
  startTime: number;
  startX: number;
  startY: number;
  moved: boolean;
  scrolling: boolean;
}

interface SmartTouchOptions {
  onTap?: (event: TouchEvent) => void;
  onClick?: (event: MouseEvent) => void;
  allowScrolling?: boolean;
  tapTimeout?: number;
  moveThreshold?: number;
  scrollThreshold?: number;
}

export const useSmartTouchHandling = (options: SmartTouchOptions = {}) => {
  const touchStateRef = useRef<TouchState | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    onTap,
    onClick,
    allowScrolling = true,
    tapTimeout = 300,
    moveThreshold = 10,
    scrollThreshold = 5
  } = options;

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    
    touchStateRef.current = {
      startTime: Date.now(),
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
      scrolling: false
    };

    // Clear any existing timeouts
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchStateRef.current) return;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStateRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchStateRef.current.startY);
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Mark as moved if beyond threshold
    if (totalMovement > moveThreshold) {
      touchStateRef.current.moved = true;
    }

    // Detect if this is likely scrolling
    if (deltaY > scrollThreshold && deltaY > deltaX * 1.5) {
      touchStateRef.current.scrolling = true;
    }

    // Allow scrolling to continue
    if (allowScrolling && touchStateRef.current.scrolling) {
      return;
    }

    // Prevent default for non-scrolling movements that might be accidental
    if (totalMovement > moveThreshold && !touchStateRef.current.scrolling) {
      event.preventDefault();
    }
  }, [allowScrolling, moveThreshold, scrollThreshold]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchStateRef.current) return;

    const touchState = touchStateRef.current;
    const touchDuration = Date.now() - touchState.startTime;
    
    // Clean up
    touchStateRef.current = null;

    // Don't trigger tap if:
    // - Touch was too long (likely drag or hold)
    // - Touch involved significant movement
    // - User was scrolling
    if (
      touchDuration > tapTimeout ||
      touchState.moved ||
      touchState.scrolling
    ) {
      return;
    }

    // Prevent the synthetic click event that follows
    event.preventDefault();

    // Trigger the tap callback
    if (onTap) {
      onTap(event);
    }

    // Set a short timeout to prevent any synthetic mouse events
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
    }, 350);
    
  }, [onTap, tapTimeout]);

  const handleClick = useCallback((event: MouseEvent) => {
    // Block synthetic clicks after touch
    if (scrollTimeoutRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }

    // Allow normal mouse clicks
    if (onClick) {
      onClick(event);
    }
  }, [onClick]);

  const attachListeners = useCallback((element: HTMLElement) => {
    if (elementRef.current) {
      // Remove old listeners
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
      elementRef.current.removeEventListener('click', handleClick);
    }

    elementRef.current = element;

    if (element) {
      // Add passive listeners for touch events to improve scroll performance
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd, { passive: false });
      element.addEventListener('click', handleClick);
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleClick]);

  const detachListeners = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
      elementRef.current.removeEventListener('click', handleClick);
      elementRef.current = null;
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detachListeners();
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [detachListeners]);

  return {
    attachListeners,
    detachListeners,
    isScrolling: touchStateRef.current?.scrolling || false
  };
};
