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
  const [marker, setMarker] = useState<google.maps.Marker>();
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow>();

  useEffect(() => {
    if (!map) return;

    // Use legacy Marker API directly (simpler and more reliable)
    const newMarker = new google.maps.Marker({
      position,
      map,
      title,
      icon: icon || undefined,
      visible: true,
      optimized: false, // Force non-optimized rendering for better visibility
    });

    setMarker(newMarker);

    if (children) {
      const newInfoWindow = new google.maps.InfoWindow();
      setInfoWindow(newInfoWindow);
    }

    return () => {
      newMarker.setMap(null);
    };
  }, [map, position, title, icon, children]);

  useEffect(() => {
    if (!marker) return;

    const clickListener = () => {
      onClick?.();
      if (infoWindow && children && marker instanceof google.maps.Marker) {
        const content = document.createElement('div');
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      }
    };

    const listener = marker.addListener('click', clickListener);

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [marker, onClick, infoWindow, children, map, position]);

  return null;
};

export default Marker;
