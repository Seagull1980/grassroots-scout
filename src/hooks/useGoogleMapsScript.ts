import { useEffect, useState } from 'react';
import { GOOGLE_MAPS_CONFIG } from '../config/maps';

/**
 * Hook to load Google Maps API script globally
 * Returns true when the script is loaded and window.google.maps is available
 */
export const useGoogleMapsScript = (): boolean => {
  const [isLoaded, setIsLoaded] = useState(() => {
    // Check if script is already loaded
    return !!(window.google?.maps?.places);
  });

  useEffect(() => {
    // If already loaded, return early
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.warn('Google Maps API key not configured');
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(',')}&callback=initMap`;
    script.async = true;
    script.defer = true;

    // Set up callback
    const onScriptLoad = () => {
      if (window.google?.maps?.places) {
        setIsLoaded(true);
      }
    };

    // Handle script load
    script.onload = onScriptLoad;
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
    };

    // Add script to document
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return isLoaded;
};
