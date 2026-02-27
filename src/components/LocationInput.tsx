import React, { useEffect, useRef, useState } from 'react';
import { TextField, Box } from '@mui/material';
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
  const autocompleteElementRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(value);
  const isAutocompleteSelection = useRef(false);
  const [useLegacyAPI, setUseLegacyAPI] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Debug logging to identify multiple instances
  useEffect(() => {
    if (debugId) {
      console.log(`LocationInput mounted: ${debugId}`);
      return () => console.log(`LocationInput unmounted: ${debugId}`);
    }
  }, [debugId]);

  // Check Google Maps availability
  useEffect(() => {
    if (window.google?.maps?.places) {
      setIsGoogleMapsLoaded(true);
      // Check if new API is available, otherwise use legacy
      if (!window.google.maps.places.PlaceAutocompleteElement) {
        setUseLegacyAPI(true);
      }
    }
  }, []);

  // Sync internal state with external value prop
  useEffect(() => {
    if (!isAutocompleteSelection.current) {
      setInputValue(value);
    }
    isAutocompleteSelection.current = false;
  }, [value]);

  useEffect(() => {
    if (!isGoogleMapsLoaded) return;

    // Wait a bit for Google Maps to fully load
    const timer = setTimeout(() => {
      // Try new PlaceAutocompleteElement API first
      if (!useLegacyAPI && containerRef.current && window.google?.maps?.places?.PlaceAutocompleteElement) {
        try {
          const { PlaceAutocompleteElement } = window.google.maps.places;

          const autocompleteElement = new PlaceAutocompleteElement({
            componentRestrictions: { country: 'gb' } // Restrict to UK
          });

          autocompleteElement.addEventListener('gmp-placeselect', async (event: any) => {
            const place = event.place;
            
            if (!place) return;

            try {
              await place.fetchFields({
                fields: ['formatted_address', 'geometry', 'place_id']
              });

              if (place?.geometry?.location) {
                const location: Location = {
                  address: place.formatted_address || '',
                  latitude: typeof place.geometry.location.lat === 'function' 
                    ? place.geometry.location.lat() 
                    : place.geometry.location.lat,
                  longitude: typeof place.geometry.location.lng === 'function'
                    ? place.geometry.location.lng()
                    : place.geometry.location.lng,
                  placeId: place.place_id
                };
                isAutocompleteSelection.current = true;
                setInputValue(location.address);
                onChange(location);
              }
            } catch (error) {
              console.error('Error fetching place details:', error);
            }
          });

          containerRef.current.appendChild(autocompleteElement);
          autocompleteElementRef.current = autocompleteElement;
        } catch (error) {
          console.error('Error initializing PlaceAutocompleteElement:', error);
          setUseLegacyAPI(true);
        }
      }
      // Fall back to legacy Autocomplete API if new API not available
      else if (useLegacyAPI && fallbackInputRef.current && window.google?.maps?.places?.Autocomplete) {
        const legacyAutocomplete = new google.maps.places.Autocomplete(
          fallbackInputRef.current,
          {
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'gb' }, // Restrict to UK
            fields: ['place_id', 'formatted_address', 'geometry']
          }
        );

        const handlePlaceSelect = async () => {
          const place = legacyAutocomplete.getPlace();
          if (place?.geometry?.location) {
            const location: Location = {
              address: place.formatted_address || '',
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
              placeId: place.place_id
            };
            isAutocompleteSelection.current = true;
            setInputValue(location.address);
            onChange(location);
          }
        };

        legacyAutocomplete.addListener('place_changed', handlePlaceSelect);

        return () => {
          google.maps.event.clearInstanceListeners(legacyAutocomplete);
        };
      }
    }, 100); // Small delay to ensure Google Maps is fully loaded

    return () => {
      clearTimeout(timer);
      if (autocompleteElementRef.current) {
        autocompleteElementRef.current.remove();
      }
    };
  }, [onChange, isGoogleMapsLoaded, useLegacyAPI]);

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    
    // If the user clears the input, reset the location
    if (newValue === '') {
      onChange(null);
    }
  };

  const handleBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
    // If user types an address manually (without using autocomplete)
    const inputValue = event.target.value;
    if (inputValue) {
      const location = await geocodeAddress(inputValue);
      if (location) {
        onChange(location);
      }
    }
  };

  // Render new PlaceAutocompleteElement or legacy TextField
  if (!useLegacyAPI && isGoogleMapsLoaded) {
    return (
      <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
        <Box ref={containerRef} sx={{ width: '100%' }} />
      </Box>
    );
  }

  // Use TextField with internal state to allow typing (legacy fallback)
  return (
    <TextField
      inputRef={fallbackInputRef}
      value={inputValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      label={label}
      fullWidth={fullWidth}
    />
  );
};

export default LocationInput;
