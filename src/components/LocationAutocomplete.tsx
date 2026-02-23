import React, { useEffect, useRef, useState } from 'react';
import { TextField, TextFieldProps, Box } from '@mui/material';

interface LocationAutocompleteProps extends Omit<TextFieldProps, 'onChange'> {
  value: string;
  onChange: (value: string, placeDetails?: google.maps.places.PlaceResult) => void;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  placeholder?: string;
}

/**
 * LocationAutocomplete component using Google Places PlaceAutocompleteElement API
 * (Migrated from legacy Autocomplete as recommended by Google)
 * Falls back to regular text input if Google Maps is not loaded
 */
export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = 'Enter location...',
  ...textFieldProps
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<any>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [useLegacyAPI, setUseLegacyAPI] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if Google Maps is loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsGoogleMapsLoaded(true);
      // Force legacy API as PlaceAutocompleteElement doesn't support controlled values
      setUseLegacyAPI(true);
    }
  }, []);

  useEffect(() => {
    if (!isGoogleMapsLoaded) return;
    
    // Check for appropriate ref based on API type
    if (!useLegacyAPI && !containerRef.current) return;
    if (useLegacyAPI && !inputRef.current) return;

    // Use new PlaceAutocompleteElement API if available
    if (!useLegacyAPI && window.google?.maps?.places?.PlaceAutocompleteElement) {
      try {
        const { PlaceAutocompleteElement } = window.google.maps.places;

        const autocompleteElement = new PlaceAutocompleteElement({
          componentRestrictions: { country: 'gb' } // Restrict to UK
        });

        autocompleteElement.addEventListener('gmp-placeselect', async (event: any) => {
          const place = event.place;
          
          if (!place) {
            console.warn('No place data received');
            return;
          }

          // Fetch place details with specific fields
          try {
            await place.fetchFields({
              fields: ['formatted_address', 'geometry', 'name', 'place_id']
            });

            if (!place.geometry || !place.geometry.location) {
              console.warn('No geometry found for place');
              return;
            }

            const address = place.formatted_address || place.displayName || '';
            const lat = typeof place.geometry.location.lat === 'function' 
              ? place.geometry.location.lat() 
              : place.geometry.location.lat;
            const lng = typeof place.geometry.location.lng === 'function'
              ? place.geometry.location.lng()
              : place.geometry.location.lng;

            onChange(address, place);
            
            if (onLocationSelect) {
              onLocationSelect({ lat, lng, address });
            }
          } catch (error) {
            console.error('Error fetching place details:', error);
          }
        });

        if (containerRef.current) {
          containerRef.current.appendChild(autocompleteElement);
          autocompleteElementRef.current = autocompleteElement;
        }
      } catch (error) {
        console.error('Error initializing PlaceAutocompleteElement:', error);
        setUseLegacyAPI(true);
      }
    }
    // Fall back to legacy Autocomplete if new API not available
    else if (useLegacyAPI && inputRef.current) {
      try {
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'gb' },
          fields: ['address_components', 'formatted_address', 'geometry', 'name'],
          types: ['geocode', 'establishment']
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (!place.geometry || !place.geometry.location) {
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
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
      }
    }

    return () => {
      // Cleanup
      if (autocompleteElementRef.current) {
        autocompleteElementRef.current.remove();
      }
    };
  }, [isGoogleMapsLoaded, useLegacyAPI]);

  // Render new PlaceAutocompleteElement or legacy TextField
  if (!useLegacyAPI && isGoogleMapsLoaded) {
    return (
      <Box sx={{ width: '100%' }}>
        <div ref={containerRef} style={{ width: '100%' }} />
        {textFieldProps.helperText && (
          <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
            {textFieldProps.helperText}
          </Box>
        )}
      </Box>
    );
  }

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
