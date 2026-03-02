import { Location } from '../types';

// Utility functions for Google Maps integration

export const calculateDistance = (
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (value: number): number => {
  return value * Math.PI / 180;
};

export const geocodeAddress = async (address: string): Promise<Location | null> => {
  return new Promise((resolve) => {
    if (!window.google) {
      resolve(null);
      return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const result = results[0];
        const location: Location = {
          address: result.formatted_address,
          latitude: result.geometry.location.lat(),
          longitude: result.geometry.location.lng(),
          placeId: result.place_id
        };
        resolve(location);
      } else {
        resolve(null);
      }
    });
  });
};

export const getCurrentLocation = (): Promise<{ lat: number; lng: number; accuracy?: number } | { error: string; userMessage: string } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      resolve({ error: 'Geolocation not supported', userMessage: 'Geolocation is not supported by your browser. Please click on the map to set your location.' });
      return;
    }

    const requestPosition = (options: PositionOptions) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          console.log('[Geolocation] Raw coordinates received:', {
            lat: latitude,
            lng: longitude,
            accuracy: accuracy ? `±${Math.round(accuracy)}m` : 'unknown',
            timestamp: new Date(position.timestamp).toISOString()
          });

          if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            console.error('[Geolocation] Invalid coordinates detected:', { latitude, longitude });
            resolve({
              error: 'Invalid location coordinates received',
              userMessage: 'Invalid location received. Please try again or set location manually on the map.'
            });
            return;
          }

          if (typeof accuracy === 'number' && accuracy > 10000) {
            console.warn('[Geolocation] Low accuracy rejected:', { accuracy, threshold: 10000 });
            resolve({
              error: `Low accuracy location (±${Math.round(accuracy)}m)`,
              userMessage: `Your location is too imprecise (±${Math.round(accuracy / 1000)}km). Please enable precise location and try again.`
            });
            return;
          }

          console.log('[Geolocation] Location accepted and returning:', { lat: latitude, lng: longitude, accuracy });
          resolve({
            lat: latitude,
            lng: longitude,
            accuracy
          });
        },
      (error) => {
        let errorMessage = 'Unknown error';
        let logLevel = 'warn';
        let userMessage = 'Could not get your location. Please try again.';
        
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location access denied by user';
            userMessage = 'Location access denied. Please allow location permissions and try again.';
            logLevel = 'info'; // This is expected user behavior, not an error
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location information unavailable (GPS/network issue)';
            userMessage = 'Location unavailable. Please check your GPS/network connection and try again.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out after 15 seconds';
            userMessage = 'Location request timed out. Please try again or click on the map manually.';
            break;
          default:
            errorMessage = `Unknown geolocation error (code: ${error.code})`;
            userMessage = 'Location error occurred. Please try clicking on the map manually.';
        }
        
        // Log with more details for debugging
        if (logLevel === 'info') {
          console.info('Geolocation:', errorMessage, { code: error.code, message: error.message });
        } else {
          console.warn('Geolocation failed:', errorMessage, { code: error.code, message: error.message, error });
        }
        
        // Return error with user-friendly message
        resolve({ error: errorMessage, userMessage });
      },
      options
    );
    };

    requestPosition({
      timeout: 20000,
      enableHighAccuracy: true,
      maximumAge: 0
    });
  });
};

export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

export const isWithinRadius = (
  center: { lat: number; lng: number },
  point: { lat: number; lng: number },
  radiusKm: number
): boolean => {
  const distance = calculateDistance(center, point);
  return distance <= radiusKm;
};
