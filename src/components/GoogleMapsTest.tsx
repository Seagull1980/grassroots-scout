import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert } from '@mui/material';

const GoogleMapsTest: React.FC = () => {
  const [testResults, setTestResults] = useState<{
    googleMaps: boolean;
    places: boolean;
    autocomplete: boolean;
    placeAutocompleteElement: boolean;
  }>({
    googleMaps: false,
    places: false,
    autocomplete: false,
    placeAutocompleteElement: false,
  });

  useEffect(() => {
    const checkAPIs = () => {
      setTestResults({
        googleMaps: !!window.google?.maps,
        places: !!window.google?.maps?.places,
        autocomplete: !!window.google?.maps?.places?.Autocomplete,
        placeAutocompleteElement: !!window.google?.maps?.places?.PlaceAutocompleteElement,
      });
    };

    // Check immediately
    checkAPIs();

    // Check again after a delay in case APIs are still loading
    const timer = setTimeout(checkAPIs, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Google Maps API Test
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Alert severity={testResults.googleMaps ? 'success' : 'error'}>
          Google Maps: {testResults.googleMaps ? 'Available' : 'Not Available'}
        </Alert>
        
        <Alert severity={testResults.places ? 'success' : 'error'}>
          Places Library: {testResults.places ? 'Available' : 'Not Available'}
        </Alert>
        
        <Alert severity={testResults.autocomplete ? 'success' : 'warning'}>
          Legacy Autocomplete: {testResults.autocomplete ? 'Available (Deprecated)' : 'Not Available'}
        </Alert>
        
        <Alert severity={testResults.placeAutocompleteElement ? 'success' : 'warning'}>
          PlaceAutocompleteElement: {testResults.placeAutocompleteElement ? 'Available (Recommended)' : 'Not Available'}
        </Alert>
      </Box>
    </Box>
  );
};

export default GoogleMapsTest;
