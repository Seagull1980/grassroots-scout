import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import { CheckCircle, Error, Warning } from '@mui/icons-material';

interface ApiAvailability {
  googleMaps: boolean;
  places: boolean;
  marker: boolean;
  advancedMarker: boolean;
  placeAutocomplete: boolean;
  placeAutocompleteElement: boolean;
  geometry: boolean;
  drawing: boolean;
}

const GoogleMapsApiTest: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<ApiAvailability>({
    googleMaps: false,
    places: false,
    marker: false,
    advancedMarker: false,
    placeAutocomplete: false,
    placeAutocompleteElement: false,
    geometry: false,
    drawing: false,
  });

  useEffect(() => {
    const checkAPIs = () => {
      const status: ApiAvailability = {
        googleMaps: !!window.google?.maps,
        places: !!window.google?.maps?.places,
        marker: !!window.google?.maps?.marker,
        advancedMarker: !!window.google?.maps?.marker?.AdvancedMarkerElement,
        placeAutocomplete: !!window.google?.maps?.places?.Autocomplete,
        placeAutocompleteElement: !!window.google?.maps?.places?.PlaceAutocompleteElement,
        geometry: !!window.google?.maps?.geometry,
        drawing: !!window.google?.maps?.drawing,
      };

      setApiStatus(status);
    };

    // Check immediately
    checkAPIs();

    // Check again after delays in case APIs are still loading
    const timers = [
      setTimeout(checkAPIs, 1000),
      setTimeout(checkAPIs, 3000),
      setTimeout(checkAPIs, 5000),
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  const getIcon = (available: boolean, deprecated?: boolean) => {
    if (!available) return <Error color="error" />;
    if (deprecated) return <Warning color="warning" />;
    return <CheckCircle color="success" />;
  };

  const getStatusText = (available: boolean, deprecated?: boolean) => {
    if (!available) return "Not Available";
    if (deprecated) return "Available (Deprecated)";
    return "Available";
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h4" gutterBottom>
        Google Maps API Status
      </Typography>
      
      <Typography variant="body1" color="textSecondary" paragraph>
        This component checks the availability of various Google Maps APIs and libraries.
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            {getIcon(apiStatus.googleMaps)}
          </ListItemIcon>
          <ListItemText 
            primary="Google Maps Core API"
            secondary={getStatusText(apiStatus.googleMaps)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            {getIcon(apiStatus.places)}
          </ListItemIcon>
          <ListItemText 
            primary="Places Library"
            secondary={getStatusText(apiStatus.places)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            {getIcon(apiStatus.marker)}
          </ListItemIcon>
          <ListItemText 
            primary="Marker Library"
            secondary={getStatusText(apiStatus.marker)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            {getIcon(apiStatus.advancedMarker)}
          </ListItemIcon>
          <ListItemText 
            primary="AdvancedMarkerElement"
            secondary={getStatusText(apiStatus.advancedMarker) + " (Recommended)"}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            {getIcon(apiStatus.placeAutocomplete, true)}
          </ListItemIcon>
          <ListItemText 
            primary="Legacy Autocomplete"
            secondary={getStatusText(apiStatus.placeAutocomplete, true)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            {getIcon(apiStatus.placeAutocompleteElement)}
          </ListItemIcon>
          <ListItemText 
            primary="PlaceAutocompleteElement"
            secondary={getStatusText(apiStatus.placeAutocompleteElement) + " (Recommended)"}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            {getIcon(apiStatus.geometry)}
          </ListItemIcon>
          <ListItemText 
            primary="Geometry Library"
            secondary={getStatusText(apiStatus.geometry)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            {getIcon(apiStatus.drawing)}
          </ListItemIcon>
          <ListItemText 
            primary="Drawing Library"
            secondary={getStatusText(apiStatus.drawing)}
          />
        </ListItem>
      </List>

      <Box sx={{ mt: 3 }}>
        <Alert severity={apiStatus.advancedMarker ? "success" : "warning"}>
          {apiStatus.advancedMarker 
            ? "✅ AdvancedMarkerElement is available! The app will use the modern marker API with Map ID."
            : "⚠️ AdvancedMarkerElement is not yet available. Using legacy Marker with deprecation warnings."
          }
        </Alert>
      </Box>

      {apiStatus.placeAutocompleteElement && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="success">
            ✅ PlaceAutocompleteElement is available! The app will use the modern autocomplete API.
          </Alert>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Migration Status:</strong>
            <br />
            • Markers: {apiStatus.advancedMarker ? "✅ Migrated to AdvancedMarkerElement with Map ID" : "⏳ Using legacy Marker (deprecated)"}
            <br />
            • Autocomplete: {apiStatus.placeAutocompleteElement ? "✅ Migrated to PlaceAutocompleteElement" : "⏳ Using legacy Autocomplete"}
            <br />
            • Map ID: ✅ Configured for Advanced Markers support
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default GoogleMapsApiTest;
