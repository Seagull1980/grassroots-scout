import React, { useCallback, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Box, CircularProgress, Alert } from '@mui/material';
import { GOOGLE_MAPS_CONFIG } from '../config/maps';

const render = (status: Status): React.ReactElement => {
  switch (status) {
    case Status.LOADING:
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      );
    case Status.FAILURE:
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          <Box>
            <strong>Google Maps Loading Failed</strong>
            <br />
            <br />
            This is likely due to a billing or API configuration issue. To resolve:
            <br />
            <br />
            <strong>1. Enable Billing:</strong>
            <br />
            • Go to Google Cloud Console: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a>
            <br />
            • Navigate to Billing and enable billing for your project
            <br />
            <br />
            <strong>2. Enable Required APIs:</strong>
            <br />
            • Maps JavaScript API
            <br />
            • Places API
            <br />
            • Geocoding API
            <br />
            • Geometry API
            <br />
            <br />
            <strong>3. Check API Key Restrictions:</strong>
            <br />
            • Ensure your API key is not restricted to specific domains
            <br />
            • Or add localhost and your domain to allowed referrers
          </Box>
        </Alert>
      );
    default:
      return <div>Loading map...</div>;
  }
};

interface GoogleMapsWrapperProps {
  children: React.ReactNode;
}

const GoogleMapsWrapper: React.FC<GoogleMapsWrapperProps> = ({ children }) => {
  const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
  
  if (apiKey === 'YOUR_GOOGLE_MAPS_API_KEY' || !apiKey) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <Box>
          <strong>Google Maps API Key Required</strong>
          <br />
          <br />
          To use map functionality:
          <br />
          <br />
          <strong>1. Get an API Key:</strong>
          <br />
          • Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
          <br />
          • Create a new project or select existing one
          <br />
          • Enable billing for the project
          <br />
          • Go to APIs & Services → Credentials
          <br />
          • Create API key
          <br />
          <br />
          <strong>2. Add to Environment:</strong>
          <br />
          • Add VITE_GOOGLE_MAPS_API_KEY=your_api_key to your .env file
          <br />
          <br />
          <strong>3. Enable Required APIs:</strong>
          <br />
          • Maps JavaScript API
          <br />
          • Places API  
          <br />
          • Geocoding API
          <br />
          • Geometry API
        </Box>
      </Alert>
    );
  }

  return (
    <Wrapper
      apiKey={apiKey}
      render={render}
      libraries={GOOGLE_MAPS_CONFIG.libraries}
      version={GOOGLE_MAPS_CONFIG.version}
    >
      {children}
    </Wrapper>
  );
};

interface MapProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  children?: React.ReactNode;
  onMapLoad?: (map: google.maps.Map) => void;
  style?: React.CSSProperties;
}

export const Map: React.FC<MapProps> = ({
  center,
  zoom,
  children,
  onMapLoad,
  style = { height: '400px', width: '100%' }
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();

  const initMap = useCallback(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        ...GOOGLE_MAPS_CONFIG.mapOptions
      });
      setMap(newMap);
      onMapLoad?.(newMap);
    }
  }, [center, zoom, map, onMapLoad]);

  React.useEffect(() => {
    initMap();
  }, [initMap]);

  React.useEffect(() => {
    if (map) {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  // Cleanup Google Maps instance when component unmounts
  React.useEffect(() => {
    return () => {
      if (map) {
        // Disable all map interactions and destroy the map
        map.setOptions({ draggable: false, scrollwheel: false, disableDoubleClickZoom: true });
        // Remove the map from the DOM
        if (ref.current) {
          ref.current.innerHTML = '';
        }
        console.log('Map instance cleaned up on unmount');
      }
    };
  }, [map]);

  return (
    <>
      <div ref={ref} style={style} />
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { map });
        }
        return child;
      })}
    </>
  );
};

export default GoogleMapsWrapper;
