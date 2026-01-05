import React, { useEffect, useState } from 'react';

interface MarkerProps {
  position: google.maps.LatLngLiteral;
  map?: google.maps.Map;
  title?: string;
  icon?: google.maps.Icon | google.maps.Symbol | string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const Marker: React.FC<MarkerProps> = ({
  position,
  map,
  title,
  icon,
  onClick,
  children
}) => {
  const [marker, setMarker] = useState<google.maps.marker.AdvancedMarkerElement | google.maps.Marker>();
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow>();

  useEffect(() => {
    if (!map) return;

    let newMarker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

    // Try to use AdvancedMarkerElement first (recommended by Google)
    if (window.google?.maps?.marker?.AdvancedMarkerElement) {
      try {
        // Create a simple pin element for the icon
        let pinElement: google.maps.marker.PinElement | undefined;
        
        if (typeof icon === 'string' && icon.includes('red-dot')) {
          pinElement = new google.maps.marker.PinElement({
            background: '#EA4335',
            borderColor: '#C5221F',
            glyphColor: '#FFFFFF'
          });
        } else if (typeof icon === 'string' && icon.includes('blue-dot')) {
          pinElement = new google.maps.marker.PinElement({
            background: '#4285F4',
            borderColor: '#1A73E8',
            glyphColor: '#FFFFFF'
          });
        }

        newMarker = new google.maps.marker.AdvancedMarkerElement({
          position,
          map,
          title,
          content: pinElement?.element,
        });

        console.log('AdvancedMarkerElement created:', { position, title });
      } catch (error) {
        console.warn('Failed to create AdvancedMarkerElement, falling back to legacy marker:', error);
        // Fallback to legacy marker
        newMarker = new google.maps.Marker({
          position,
          map,
          title,
          icon
        });
        console.log('Legacy Marker created:', { position, title });
      }
    } else {
      // Fallback to legacy marker if AdvancedMarkerElement not available
      newMarker = new google.maps.Marker({
        position,
        map,
        title,
        icon
      });
      console.log('Legacy Marker created (API not available):', { position, title });
    }

    setMarker(newMarker);

    if (children) {
      const newInfoWindow = new google.maps.InfoWindow();
      setInfoWindow(newInfoWindow);
    }

    return () => {
      if (newMarker) {
        // Handle cleanup for both AdvancedMarkerElement and legacy Marker
        if (newMarker instanceof google.maps.Marker) {
          newMarker.setMap(null);
        } else if (window.google?.maps?.marker?.AdvancedMarkerElement && newMarker instanceof google.maps.marker.AdvancedMarkerElement) {
          newMarker.map = null;
        }
      }
    };
  }, [map, position, title, icon, children]);

  useEffect(() => {
    if (!marker) return;

    const clickListener = () => {
      console.log('Marker clicked!', { title, position });
      onClick?.();
      if (infoWindow && children) {
        const content = document.createElement('div');
        // Here you would render React content to the div
        // For simplicity, we'll use a simple approach
        infoWindow.setContent(content);
        
        // InfoWindow works with both marker types
        if (marker instanceof google.maps.Marker) {
          infoWindow.open(map, marker);
        } else {
          // For AdvancedMarkerElement, use position
          infoWindow.setPosition(position);
          infoWindow.open(map);
        }
      }
    };

    // Handle event listeners for both marker types
    let listener: google.maps.MapsEventListener | undefined;
    
    if (marker instanceof google.maps.Marker) {
      // Legacy Marker
      listener = marker.addListener('click', clickListener);
    } else if (window.google?.maps?.marker?.AdvancedMarkerElement && marker instanceof google.maps.marker.AdvancedMarkerElement) {
      // AdvancedMarkerElement
      listener = marker.addListener('click', clickListener);
    }

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [marker, onClick, infoWindow, children, map, position]);

  return null;
};

export default Marker;
