import React, { useEffect, useRef } from 'react';
import { Box, TextField } from '@mui/material';
import { Location } from '../types';
import { geocodeAddress } from '../utils/maps';

interface LocationInputProps {
  onChange: (location: Location | null) => void;
  value?: string;
  fullWidth?: boolean;
  label?: string;
  placeholder?: string;
}

const LocationInput: React.FC<LocationInputProps> = ({
  onChange,
  value = '',
  fullWidth = false,
  label,
  placeholder = 'Start typing an address...'
}) => {
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<any>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const legacyAutocompleteRef = useRef<google.maps.places.Autocomplete>();

  useEffect(() => {
    // Wait a bit for Google Maps to fully load
    const timer = setTimeout(() => {
      // Prefer legacy Autocomplete to avoid accessibility issues with PlaceAutocompleteElement
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

      // Fallback to PlaceAutocompleteElement if legacy is not available
      if (window.google?.maps?.places?.PlaceAutocompleteElement) {
        try {
          // Create the PlaceAutocompleteElement with options
          const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
            componentRestrictions: { country: 'gb' }, // Restrict to UK
            types: ['establishment', 'geocode']
          });
          
          // Set attributes
          autocompleteElement.setAttribute('placeholder', placeholder);
          if (value) {
            autocompleteElement.setAttribute('value', value);
          }
          
          // Style the element to match Material-UI TextField
          Object.assign(autocompleteElement.style, {
            width: fullWidth ? '100%' : 'auto',
            height: '56px',
            border: '1px solid rgba(0, 0, 0, 0.23)',
            borderRadius: '4px',
            padding: '16.5px 14px',
            fontSize: '16px',
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            outline: 'none',
            transition: 'border-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            backgroundColor: 'white'
          });

          // Add focus and blur styles
          autocompleteElement.addEventListener('focus', () => {
            autocompleteElement.style.borderColor = '#1976d2';
            autocompleteElement.style.borderWidth = '2px';
          });

          autocompleteElement.addEventListener('blur', () => {
            autocompleteElement.style.borderColor = 'rgba(0, 0, 0, 0.23)';
            autocompleteElement.style.borderWidth = '1px';
          });

          // Handle place selection
          autocompleteElement.addEventListener('gmp-placeselect', (event: any) => {
            const place = event.detail.place;
            if (place?.geometry?.location) {
              const location: Location = {
                address: place.formattedAddress || place.displayName || place.name || '',
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng(),
                placeId: place.id || place.place_id
              };
              onChange(location);
            }
          });

          // Handle input changes
          autocompleteElement.addEventListener('input', (event: any) => {
            const inputValue = event.target.value;
            if (!inputValue || inputValue.trim() === '') {
              onChange(null);
            }
          });

          elementRef.current = autocompleteElement;

          // Add to DOM
          if (autocompleteRef.current) {
            autocompleteRef.current.appendChild(autocompleteElement);
          }

          return () => {
            if (autocompleteRef.current && elementRef.current) {
              try {
                autocompleteRef.current.removeChild(elementRef.current);
              } catch (e) {
                // Element might have already been removed
              }
            }
          };
        } catch (error) {
          // Fall through to legacy implementation
        }
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

  // Prefer legacy Autocomplete to avoid accessibility issues with PlaceAutocompleteElement
  const hasLegacyAPI = window.google?.maps?.places?.Autocomplete && fallbackInputRef.current;
  const hasNewAPI = window.google?.maps?.places?.PlaceAutocompleteElement && elementRef.current;
  
  if (hasLegacyAPI) {
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
  }

  // Fallback to PlaceAutocompleteElement if legacy is not available
  if (hasNewAPI) {
    return (
      <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <Box
            component="label"
            sx={{
              color: 'rgba(0, 0, 0, 0.6)',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              fontWeight: 400,
              fontSize: '12px',
              lineHeight: 1.4375,
              letterSpacing: '0.00938em',
              position: 'absolute',
              top: '-9px',
              left: '14px',
              background: 'white',
              padding: '0 4px',
              zIndex: 1,
            }}
          >
            {label}
          </Box>
        )}
        <div ref={autocompleteRef} style={{ width: '100%' }} />
      </Box>
    );
  }
};

export default LocationInput;
