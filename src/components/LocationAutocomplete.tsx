import React, { useEffect, useRef, useState } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

interface LocationAutocompleteProps extends Omit<TextFieldProps, 'onChange'> {
  value: string;
  onChange: (value: string, placeDetails?: google.maps.places.PlaceResult) => void;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  placeholder?: string;
}

/**
 * LocationAutocomplete component using Google Places Autocomplete API
 * Falls back to regular text input if Google Maps is not loaded
 */
export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = 'Enter location...',
  ...textFieldProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps is loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsGoogleMapsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isGoogleMapsLoaded || !inputRef.current) return;

    // Initialize Google Places Autocomplete
    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'gb' }, // Restrict to UK
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        types: ['geocode', 'establishment']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.geometry || !place.geometry.location) {
          // User entered something that is not a valid place
          console.warn('No geometry found for place');
          return;
        }

        const address = place.formatted_address || place.name || '';
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        onChange(address, place);
        
        if (onLocationSelect) {
          onLocationSelect({ lat, lng, address });
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isGoogleMapsLoaded, onChange, onLocationSelect]);

  return (
    <TextField
      {...textFieldProps}
      inputRef={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      helperText={
        textFieldProps.helperText || 
        (isGoogleMapsLoaded ? 'Start typing to see suggestions' : 'Google Maps autocomplete not available')
      }
    />
  );
};
