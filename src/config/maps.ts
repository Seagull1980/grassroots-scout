// Google Maps configuration
export const GOOGLE_MAPS_CONFIG = {
  // You'll need to replace this with your actual Google Maps API key
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
  libraries: ['places', 'geometry'] as ('places' | 'geometry')[], // Include geometry for polygon operations
  version: 'quarterly', // Use quarterly version for better stability
  defaultCenter: {
    lat: 51.5074, // London coordinates as default
    lng: -0.1278
  },
  defaultZoom: 10,
  searchRadius: 500, // km - increased for initial search to cover all UK
  mapOptions: {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    gestureHandling: 'cooperative' as 'cooperative', // Changed from 'greedy' to prevent capturing all touch/scroll events
  }
};

export const MAP_STYLES = {
  default: [],
  // You can add custom map styles here
  grassroots: [
    {
      featureType: 'poi.sports_complex',
      elementType: 'labels',
      stylers: [{ visibility: 'on' }]
    }
  ]
};

export const MARKER_ICONS = {
  team: {
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2196F3" width="24" height="24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `),
    scaledSize: { width: 32, height: 32 }
  },
  player: {
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4CAF50" width="24" height="24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `),
    scaledSize: { width: 32, height: 32 }
  },
  homePitch: {
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF5722" width="24" height="24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `),
    scaledSize: { width: 32, height: 32 }
  },
  trainingGround: {
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF9800" width="24" height="24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `),
    scaledSize: { width: 32, height: 32 }
  }
};
