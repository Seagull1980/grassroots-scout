import axios from 'axios';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
  postcode?: string;
  displayName?: string;
}

/**
 * Geocode an address or postcode to coordinates using OpenStreetMap Nominatim
 * Free to use with attribution
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address + ', UK', // Append UK for better results
        format: 'json',
        limit: 1,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'GrassrootsHub/1.0' // Nominatim requires a user agent
      }
    });

    if (response.data.length > 0) {
      const result = response.data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        address: result.display_name,
        postcode: result.address?.postcode,
        displayName: result.display_name
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Reverse geocode coordinates to an address
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<GeocodeResult | null> => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'GrassrootsHub/1.0'
      }
    });

    if (response.data) {
      return {
        latitude,
        longitude,
        address: response.data.display_name,
        postcode: response.data.address?.postcode,
        displayName: response.data.display_name
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Get user's current location using browser geolocation API
 */
export const getUserLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

/**
 * Validate UK postcode format
 */
export const isValidUKPostcode = (postcode: string): boolean => {
  const ukPostcodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i;
  return ukPostcodeRegex.test(postcode.trim());
};

/**
 * Format postcode to standard UK format (e.g., "SW1A 1AA")
 */
export const formatPostcode = (postcode: string): string => {
  const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
  
  if (cleaned.length < 5) return postcode;
  
  const outward = cleaned.slice(0, -3);
  const inward = cleaned.slice(-3);
  
  return `${outward} ${inward}`;
};

/**
 * Batch geocode multiple addresses
 * Note: Add delay between requests to respect Nominatim usage policy (max 1 request/second)
 */
export const batchGeocode = async (
  addresses: string[],
  delayMs: number = 1000
): Promise<(GeocodeResult | null)[]> => {
  const results: (GeocodeResult | null)[] = [];
  
  for (const address of addresses) {
    const result = await geocodeAddress(address);
    results.push(result);
    
    // Wait before next request to respect rate limits
    if (addresses.indexOf(address) < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
};

/**
 * Get coordinates from Google Maps link or coordinates string
 * Supports formats like:
 * - "51.5074, -0.1278"
 * - "51.5074,-0.1278"
 * - Google Maps URLs
 */
export const parseCoordinates = (input: string): { latitude: number; longitude: number } | null => {
  // Try parsing as comma-separated coordinates
  const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
  const match = input.trim().match(coordPattern);
  
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { latitude: lat, longitude: lon };
    }
  }
  
  // Try extracting from Google Maps URL
  const googleMapsPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const googleMatch = input.match(googleMapsPattern);
  
  if (googleMatch) {
    return {
      latitude: parseFloat(googleMatch[1]),
      longitude: parseFloat(googleMatch[2])
    };
  }
  
  return null;
};

export default {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  getUserLocation,
  isValidUKPostcode,
  formatPostcode,
  batchGeocode,
  parseCoordinates
};
