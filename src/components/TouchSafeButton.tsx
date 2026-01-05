import { ReactNode, useState, useCallback, useRef } from 'react';
import { SxProps, Theme } from '@mui/material/styles';

interface TouchSafeButtonProps {
  children: ReactNode;
  onClick: (event?: React.MouseEvent | React.TouchEvent) => void;
  sx?: SxProps<Theme>;
  disabled?: boolean;
  component?: React.ElementType;
  className?: string;
  preventDoubleClick?: boolean;
  debounceMs?: number;
  [key: string]: unknown; // Allow other props to pass through
}

/**
 * A wrapper component that provides touch-safe click handling for mobile devices.
 * Prevents common mobile touch issues like ghost clicks, double taps, and touch sensitivity.
 */
const TouchSafeButton = ({
  children,
  onClick,
  sx = {},
  disabled = false,
  component: Component = 'div',
  className,
  preventDoubleClick = true,
  debounceMs = 300,
  ...otherProps
}: TouchSafeButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const touchTimeRef = useRef<number>(0);
  const clickTimeRef = useRef<number>(0);
  const pointerDownRef = useRef<number>(0);

  // Handle pointer events (modern approach that unifies touch/mouse/pen)
  const handlePointerDown = useCallback(() => {
    if (disabled || isProcessing) {
      return;
    }
    pointerDownRef.current = Date.now();
  }, [disabled, isProcessing]);

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    if (disabled || isProcessing) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const now = Date.now();
    
    // Ensure this is a deliberate tap (minimum time)
    if (now - pointerDownRef.current < 50) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Prevent double actions
    if (preventDoubleClick && now - clickTimeRef.current < debounceMs) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    clickTimeRef.current = now;
    
    if (preventDoubleClick) {
      setIsProcessing(true);
    }

    event.preventDefault();
    event.stopPropagation();
    
    // Longer delay for pointer events to ensure single action
    setTimeout(() => {
      onClick(event);
    }, 200);

    if (preventDoubleClick) {
      setTimeout(() => setIsProcessing(false), Math.max(debounceMs, 600));
    }
  }, [disabled, isProcessing, onClick, preventDoubleClick, debounceMs]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (disabled || isProcessing) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const now = Date.now();
    
    // Prevent double clicks if enabled
    if (preventDoubleClick && now - clickTimeRef.current < debounceMs) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // If there was a recent touch event, ignore this click (prevents ghost clicks)
    // Increased timeout for more aggressive ghost click prevention
    if (now - touchTimeRef.current < 1000) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    clickTimeRef.current = now;
    
    if (preventDoubleClick) {
      setIsProcessing(true);
    }

    event.preventDefault();
    event.stopPropagation();
    
    // Add extra delay to prevent rapid navigation
    setTimeout(() => {
      onClick(event);
    }, 50);

    if (preventDoubleClick) {
      setTimeout(() => setIsProcessing(false), debounceMs);
    }
  }, [disabled, isProcessing, onClick, preventDoubleClick, debounceMs]);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (disabled || isProcessing) {
      return;
    }

    touchTimeRef.current = Date.now();
    
    // Prevent scrolling while touching
    event.preventDefault();
  }, [disabled, isProcessing]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (disabled || isProcessing) {
      event.preventDefault();
      return;
    }

    const now = Date.now();
    
    // Prevent double taps if enabled
    if (preventDoubleClick && now - clickTimeRef.current < debounceMs) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    clickTimeRef.current = now;
    
    if (preventDoubleClick) {
      setIsProcessing(true);
    }

    event.preventDefault();
    event.stopPropagation();
    
    // Add significant delay for touch events to prevent sensitivity issues
    setTimeout(() => {
      onClick(event);
    }, 150);

    if (preventDoubleClick) {
      // Longer processing time for touch events
      setTimeout(() => setIsProcessing(false), Math.max(debounceMs, 500));
    }
  }, [disabled, isProcessing, onClick, preventDoubleClick, debounceMs]);

  const enhancedSx = {
    cursor: disabled ? 'not-allowed' : 'pointer',
    // Prevent text selection
    userSelect: 'none',
    WebkitUserSelect: 'none',
    // Prevent touch callout on iOS
    WebkitTouchCallout: 'none',
    // Prevent tap highlight
    WebkitTapHighlightColor: 'transparent',
    // Prevent touch delay on iOS - more aggressive
    touchAction: 'manipulation',
    // Additional mobile optimizations
    WebkitUserDrag: 'none',
    WebkitTouchStart: 'none',
    // Visual feedback for processing state
    opacity: isProcessing ? 0.6 : 1,
    transition: 'opacity 0.15s ease-in-out',
    // Prevent context menu
    contextMenu: 'none',
    // Disable selection highlighting
    MozUserSelect: 'none',
    msUserSelect: 'none',
    // Pointer events optimization
    pointerEvents: disabled ? 'none' : 'auto',
    ...sx,
  };

  return (
    <Component
      className={className}
      sx={enhancedSx}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
      aria-disabled={disabled || isProcessing}
      role="button"
      tabIndex={disabled ? -1 : 0}
      {...otherProps}
    >
      {children}
    </Component>
  );
};

export default TouchSafeButton;
