import React, { useEffect, useRef } from 'react';
import { TextField } from '@mui/material';
import { Location } from '../types';
import { geocodeAddress } from '../utils/maps';

interface LocationInputProps {
  onChange: (location: Location | null) => void;
  value?: string;
  fullWidth?: boolean;
  label?: string;
  placeholder?: string;
  debugId?: string; // Add debug ID to identify multiple instances
}

const LocationInput: React.FC<LocationInputProps> = ({
  onChange,
  value = '',
  fullWidth = false,
  label,
  placeholder = 'Start typing an address...',
  debugId
}) => {
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const legacyAutocompleteRef = useRef<google.maps.places.Autocomplete>();

  // Debug logging to identify multiple instances
  useEffect(() => {
    if (debugId) {
      console.log(`LocationInput mounted: ${debugId}`);
      return () => console.log(`LocationInput unmounted: ${debugId}`);
    }
  }, [debugId]);

  useEffect(() => {
    // Wait a bit for Google Maps to fully load
    const timer = setTimeout(() => {
      // Use legacy Autocomplete API for better compatibility and to avoid new API issues
      if (fallbackInputRef.current && window.google?.maps?.places?.Autocomplete) {
        legacyAutocompleteRef.current = new google.maps.places.Autocomplete(
          fallbackInputRef.current,
          {
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'gb' }, // Restrict to UK
            fields: ['place_id', 'formatted_address', 'geometry']
          }
        );

        const handlePlaceSelect = async () => {
          const place = legacyAutocompleteRef.current?.getPlace();
          if (place?.geometry?.location) {
            const location: Location = {
              address: place.formatted_address || '',
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
              placeId: place.place_id
            };
            onChange(location);
          }
        };

        legacyAutocompleteRef.current.addListener('place_changed', handlePlaceSelect);

        return () => {
          if (legacyAutocompleteRef.current) {
            google.maps.event.clearInstanceListeners(legacyAutocompleteRef.current);
          }
        };
      }
    }, 100); // Small delay to ensure Google Maps is fully loaded

    return () => clearTimeout(timer);
  }, [onChange, placeholder, fullWidth, value]);

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // If the user clears the input, reset the location
    if (newValue === '') {
      onChange(null);
    }
  };

  const handleBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
    // If user types an address manually (without using autocomplete)
    const inputValue = event.target.value;
    if (inputValue && !legacyAutocompleteRef.current?.getPlace()) {
      const location = await geocodeAddress(inputValue);
      if (location) {
        onChange(location);
      }
    }
  };

  // Use legacy TextField with Autocomplete
  return (
    <TextField
      inputRef={fallbackInputRef}
      value={value}
      onChange={handleInputChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      label={label}
      fullWidth={fullWidth}
    />
  );
};

export default LocationInput;
