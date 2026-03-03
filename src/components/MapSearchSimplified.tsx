import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Divider
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Groups as GroupsIcon
} from '@mui/icons-material';
const UK_CENTER = { lat: 54.0, lng: -2.5 };

interface MapSearchSimplifiedProps {
  searchType: 'vacancies' | 'players' | 'both';
}

const MapSearchSimplified: React.FC<MapSearchSimplifiedProps> = ({ searchType }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    // Wait for Google Maps API to be available
    if (!window.google?.maps?.Map) {
      console.warn('Google Maps API not available yet');
      return;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: UK_CENTER,
      zoom: 6,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    return () => {
      // Cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  // Fetch data based on search type
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const endpoints = [];
        
        if (searchType === 'vacancies' || searchType === 'both') {
          endpoints.push(
            fetch(`${import.meta.env.VITE_API_URL || 'https://grassroots-scout-backend-production-7b21.up.railway.app'}/api/teams`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.json()).then(data => ({ type: 'vacancy', items: data }))
          );
        }

        if (searchType === 'players' || searchType === 'both') {
          endpoints.push(
            fetch(`${import.meta.env.VITE_API_URL || 'https://grassroots-scout-backend-production-7b21.up.railway.app'}/api/player-availability?sort=recent`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.json()).then(data => ({ type: 'player', items: data.data || [] }))
          );
        }

        const responses = await Promise.all(endpoints);
        const allResults: any[] = [];

        responses.forEach(response => {
          const items = Array.isArray(response.items) ? response.items : [];
          items.forEach(item => {
            // Check for location data
            const hasLocation = item.locationData || 
              (item.trainingLocationData && searchType !== 'players') ||
              (item.matchLocationData && searchType !== 'players');
            
            if (hasLocation) {
              allResults.push({
                ...item,
                itemType: response.type
              });
            }
          });
        });

        setResults(allResults);
        
      } catch (err) {
        setError('Failed to load map data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchType]);

  // Render markers when results change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.Marker) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;

    // Create new markers
    results.forEach(result => {
      let position: google.maps.LatLngLiteral | null = null;

      // Get position from various possible location fields
      if (result.locationData) {
        position = {
          lat: result.locationData.latitude,
          lng: result.locationData.longitude
        };
      } else if (result.trainingLocationData) {
        position = {
          lat: result.trainingLocationData.latitude,
          lng: result.trainingLocationData.longitude
        };
      } else if (result.matchLocationData) {
        position = {
          lat: result.matchLocationData.latitude,
          lng: result.matchLocationData.longitude
        };
      }

      if (!position || !isFinite(position.lat) || !isFinite(position.lng)) return;

      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current as google.maps.Map,
        title: result.teamName || result.fullName || result.name || 'Location',
        icon: result.itemType === 'player' 
          ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        optimized: false,
        visible: true
      });

      marker.addListener('click', () => {
        setSelectedItem(result);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
      hasValidMarkers = true;
    });

    // Fit bounds if we have markers
    if (hasValidMarkers && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds);
      
      // Prevent too much zoom
      window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
        if (mapInstanceRef.current && mapInstanceRef.current.getZoom()! > 15) {
          mapInstanceRef.current.setZoom(15);
        }
      });
    }
  }, [results]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || 6;
      mapInstanceRef.current.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || 6;
      mapInstanceRef.current.setZoom(currentZoom - 1);
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(UK_CENTER);
      mapInstanceRef.current.setZoom(6);
    }
  };

  return (
    <Box>
      {/* Control Panel */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Chip
            icon={searchType === 'vacancies' ? <GroupsIcon /> : <PersonIcon />}
            label={`${results.length} ${searchType === 'vacancies' ? 'Teams' : searchType === 'players' ? 'Players' : 'Results'}`}
            color="primary"
            variant="outlined"
          />
          
          <Divider orientation="vertical" flexItem />
          
          <Button
            startIcon={<MyLocationIcon />}
            onClick={handleRecenter}
            variant="outlined"
            size="small"
          >
            Reset View
          </Button>

          {isLoading && <CircularProgress size={24} />}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Map Container */}
      <Paper elevation={3} sx={{ position: 'relative', height: '600px', overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        
        {/* Floating Zoom Controls */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            p: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.95)'
          }}
        >
          <IconButton onClick={handleZoomIn} size="small" sx={{ bgcolor: 'background.paper' }}>
            <ZoomInIcon />
          </IconButton>
          <IconButton onClick={handleZoomOut} size="small" sx={{ bgcolor: 'background.paper' }}>
            <ZoomOutIcon />
          </IconButton>
        </Paper>
      </Paper>

      {/* Selected Item Details */}
      {selectedItem && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <LocationIcon color="primary" />
              <Box flex={1}>
                <Typography variant="h6">
                  {selectedItem.teamName || selectedItem.fullName || selectedItem.name}
                </Typography>
                {selectedItem.ageGroup && (
                  <Typography variant="body2" color="text.secondary">
                    Age Group: {selectedItem.ageGroup}
                  </Typography>
                )}
                {selectedItem.preferredPosition && (
                  <Typography variant="body2" color="text.secondary">
                    Position: {selectedItem.preferredPosition}
                  </Typography>
                )}
                {selectedItem.league && (
                  <Typography variant="body2" color="text.secondary">
                    League: {selectedItem.league}
                  </Typography>
                )}
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedItem(null)}
              >
                Close
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {results.length} {searchType === 'vacancies' ? 'team locations' : searchType === 'players' ? 'player locations' : 'locations'} on the map
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default MapSearchSimplified;
