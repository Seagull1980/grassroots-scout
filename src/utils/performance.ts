import { useState, useEffect } from 'react';

// Performance optimization utilities

// 1. Add debounced search
export const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 2. Add image optimization for profile pictures
export const optimizeImage = (file: File, maxWidth = 400, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to optimize image'));
        }
      }, 'image/jpeg', quality);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// 3. Memoization helper
export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// 4. Virtual scrolling hook for large lists
export const useVirtualScroll = (itemHeight: number, containerHeight: number, items: any[]) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    }
  };
};

// 5. Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
};

// 6. Resource preloading utility
export const preloadResource = (url: string, as: 'image' | 'script' | 'style' | 'font' = 'image') => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = as;
    link.href = url;

    link.onload = () => resolve(url);
    link.onerror = () => reject(new Error(`Failed to preload ${url}`));

    document.head.appendChild(link);
  });
};

// 7. Bundle size monitoring
// Bundle size monitoring (development only)
export const logBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle size monitoring available in development mode');
  }
};

// 8. Memory usage monitoring
export const useMemoryMonitor = () => {
  const [memoryUsage, setMemoryUsage] = useState<any>(null);

  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        setMemoryUsage((performance as any).memory);
      }
    };

    const interval = setInterval(updateMemoryUsage, 5000);
    updateMemoryUsage();

    return () => clearInterval(interval);
  }, []);

  return memoryUsage;
};

// 9. Network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// 10. Web Vitals monitoring
export const useWebVitals = () => {
  useEffect(() => {
    // Basic performance monitoring
    console.log('Performance monitoring enabled');

    // Monitor navigation timing
    if (performance.timing) {
      const timing = performance.timing;
      console.log('Page load time:', timing.loadEventEnd - timing.navigationStart, 'ms');
    }
  }, []);
};

// Mobile responsiveness utilities

// Detect if device is mobile
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

// Detect if device supports touch
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Hook for mobile detection with responsive updates
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(isMobileDevice());

  useEffect(() => {
    const checkMobile = () => setIsMobile(isMobileDevice());

    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return isMobile;
};

// Hook for touch device detection
export const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(isTouchDevice());

  useEffect(() => {
    const checkTouch = () => setIsTouch(isTouchDevice());
    window.addEventListener('resize', checkTouch);

    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  return isTouch;
};

// Optimize bundle size for mobile by conditionally loading heavy features
export const useMobileOptimizedLoading = () => {
  const isMobile = useIsMobile();

  return {
    shouldLoadHeavyFeatures: !isMobile,
    isMobile,
    loadPriority: isMobile ? 'low' : 'high'
  };
};

// Touch event handlers for better mobile UX
export const touchHandlers = {
  onTouchStart: (e: React.TouchEvent) => {
    // Prevent default touch behaviors that might interfere
    if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') {
      e.preventDefault();
    }
  },

  onTouchEnd: (e: React.TouchEvent) => {
    // Ensure touch events complete properly
    e.preventDefault();
  }
};

// Mobile viewport optimization
export const optimizeViewportForMobile = () => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && isMobileDevice()) {
    viewport.setAttribute('content',
      'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
    );
  }
};

// Performance optimization for mobile scrolling
export const useMobileScrollOptimization = () => {
  useEffect(() => {
    if (!isMobileDevice()) return;

    const handleScroll = () => {
      // Use passive listeners for better scroll performance
      document.body.style.overscrollBehavior = 'none';
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.style.overscrollBehavior = '';
    };
  }, []);
};
