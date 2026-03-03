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
  Divider,
  Slider
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Brush as BrushIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
const UK_CENTER = { lat: 54.0, lng: -2.5 };

interface MapSearchSimplifiedProps {
  searchType: 'vacancies' | 'players' | 'both';
}

const MapSearchSimplified: React.FC<MapSearchSimplifiedProps> = ({ searchType }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const drawingPathRef = useRef<google.maps.LatLng[]>([]);
  const isDrawingRef = useRef(false); // Use ref to track drawing state
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [searchRadius, setSearchRadius] = useState(10); // km
  const [isDrawing, setIsDrawing] = useState(false);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);

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
      clickableIcons: false
    });

    mapInstanceRef.current = map;

    return () => {
      // Cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (circleRef.current) circleRef.current.setMap(null);
      if (polylineRef.current) polylineRef.current.setMap(null);
      if (mapClickListenerRef.current) {
        window.google?.maps?.event?.removeListener(mapClickListenerRef.current);
      }
    };
  }, []);

  // Setup map click listener for drawing
  useEffect(() => {
    isDrawingRef.current = isDrawing;

    if (!mapInstanceRef.current || !window.google?.maps?.event) return;

    // Remove old listener if exists
    if (mapClickListenerRef.current) {
      window.google.maps.event.removeListener(mapClickListenerRef.current);
      mapClickListenerRef.current = null;
    }

    if (isDrawing) {
      // Add click listener for drawing
      mapClickListenerRef.current = mapInstanceRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        
        const latLng = event.latLng;
        drawingPathRef.current.push(latLng);
        
        // Update polyline
        if (polylineRef.current) {
          polylineRef.current.setPath(drawingPathRef.current);
        } else {
          polylineRef.current = new window.google.maps.Polyline({
            path: drawingPathRef.current,
            geodesic: true,
            strokeColor: '#2196F3',
            strokeOpacity: 0.7,
            strokeWeight: 2,
            map: mapInstanceRef.current
          });
        }
      });
    }

    return () => {
      if (mapClickListenerRef.current) {
        window.google?.maps?.event?.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
      }
    };
  }, [isDrawing]);

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
            }).then(async r => {
              if (!r.ok) throw new Error(`Teams endpoint failed: ${r.status}`);
              const data = await r.json();
              return { type: 'vacancy', items: Array.isArray(data) ? data : data.data || [] };
            })
          );
        }

        if (searchType === 'players' || searchType === 'both') {
          endpoints.push(
            fetch(`${import.meta.env.VITE_API_URL || 'https://grassroots-scout-backend-production-7b21.up.railway.app'}/api/player-availability?sort=recent`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(async r => {
              if (!r.ok) throw new Error(`Player endpoint failed: ${r.status}`);
              const data = await r.json();
              return { type: 'player', items: Array.isArray(data) ? data : data.data || [] };
            })
          );
        }

        const responses = await Promise.all(endpoints);
        const allResults: any[] = [];

        responses.forEach(response => {
          const items = Array.isArray(response.items) ? response.items : [];
          items.forEach(item => {
            // Check for location data - be permissive and accept any location field
            const hasLocation = item.locationData || 
              item.trainingLocationData || 
              item.matchLocationData;
            
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
        console.error('Map data fetch error:', err);
        setError('Failed to load map data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchType]);

  // Render markers when results change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.Marker) return;

    // Use filtered results if available, otherwise use all results
    const displayResults = filteredResults.length > 0 ? filteredResults : results;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;

    // Create new markers
    displayResults.forEach(result => {
      const position = getResultPosition(result);
      
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

    // Fit bounds if we have markers and not in drawing mode
    if (hasValidMarkers && mapInstanceRef.current && !isDrawing) {
      mapInstanceRef.current.fitBounds(bounds);
      
      // Prevent too much zoom
      window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
        if (mapInstanceRef.current && mapInstanceRef.current.getZoom()! > 15) {
          mapInstanceRef.current.setZoom(15);
        }
      });
    }
  }, [results, filteredResults, isDrawing]);

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

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(location);
            mapInstanceRef.current.setZoom(12);
          }
        },
        (_error) => {
          setError('Could not get your location. Please check permissions.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    drawingPathRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);
    polylineRef.current = null;
  };

  const handleFinishDrawing = () => {
    setIsDrawing(false);
    // Filter results based on drawn polygon
    if (drawingPathRef.current.length >= 3 && window.google?.maps?.geometry?.poly) {
      const polygon = drawingPathRef.current;
      const filtered = results.filter(result => {
        const position = getResultPosition(result);
        if (!position) return false;
        const latLng = new window.google.maps.LatLng(position.lat, position.lng);
        return window.google.maps.geometry.poly.containsLocation(latLng, { 
          getAt: (i: number) => polygon[i],
          length: polygon.length,
          getLength: () => polygon.length
        } as any);
      });
      setFilteredResults(filtered);
    }
  };

  const handleClearDrawing = () => {
    setIsDrawing(false);
    drawingPathRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    setFilteredResults([]);
  };

  const handleRadiusChange = (newRadius: number) => {
    setSearchRadius(newRadius);
    
    // Update circle on map
    if (userLocation && mapInstanceRef.current) {
      if (circleRef.current) {
        circleRef.current.setRadius(newRadius * 1000); // Convert km to meters
      } else {
        circleRef.current = new window.google.maps.Circle({
          center: userLocation,
          radius: newRadius * 1000,
          fillColor: '#2196F3',
          fillOpacity: 0.1,
          strokeColor: '#2196F3',
          strokeOpacity: 0.5,
          strokeWeight: 2,
          map: mapInstanceRef.current
        });
      }
    }
    
    // Filter results by distance
    if (userLocation) {
      const filtered = results.filter(result => {
        const position = getResultPosition(result);
        if (!position) return false;
        const distance = calculateDistance(userLocation, position);
        return distance <= newRadius;
      });
      setFilteredResults(filtered);
    }
  };

  const calculateDistance = (from: google.maps.LatLngLiteral, to: google.maps.LatLngLiteral): number => {
    const R = 6371; // Radius of earth in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getResultPosition = (result: any): google.maps.LatLngLiteral | null => {
    if (result.locationData) {
      return { lat: result.locationData.latitude, lng: result.locationData.longitude };
    } else if (result.trainingLocationData) {
      return { lat: result.trainingLocationData.latitude, lng: result.trainingLocationData.longitude };
    } else if (result.matchLocationData) {
      return { lat: result.matchLocationData.latitude, lng: result.matchLocationData.longitude };
    }
    return null;
  };

  return (
    <Box>
      {/* Control Panel */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          {/* Top Row */}
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip
              icon={searchType === 'vacancies' ? <GroupsIcon /> : <PersonIcon />}
              label={`${filteredResults.length > 0 ? filteredResults.length : results.length} items`}
              color="primary"
              variant="outlined"
            />
            
            <Divider orientation="vertical" flexItem />
            
            <Button
              startIcon={<MyLocationIcon />}
              onClick={handleUseMyLocation}
              variant={userLocation ? 'contained' : 'outlined'}
              size="small"
            >
              Use My Location
            </Button>

            <Button
              startIcon={isDrawing ? <ClearIcon /> : <BrushIcon />}
              onClick={isDrawing ? handleClearDrawing : handleStartDrawing}
              variant={isDrawing ? 'contained' : 'outlined'}
              size="small"
              color={isDrawing ? 'error' : 'primary'}
            >
              {isDrawing ? 'Cancel Drawing' : 'Draw Area'}
            </Button>

            {isDrawing && drawingPathRef.current.length > 0 && (
              <Button
                onClick={handleFinishDrawing}
                variant="contained"
                size="small"
                color="success"
              >
                Done ({drawingPathRef.current.length} points)
              </Button>
            )}
            
            <Button
              onClick={handleRecenter}
              variant="outlined"
              size="small"
            >
              Reset View
            </Button>

            {isLoading && <CircularProgress size={24} />}
          </Stack>

          {/* Radius Control */}
          {userLocation && !isDrawing && (
            <Box sx={{ px: 1 }}>
              <Typography variant="body2" gutterBottom>
                Search Radius: {searchRadius} km
              </Typography>
              <Slider
                value={searchRadius}
                onChange={(_, newValue) => handleRadiusChange(newValue as number)}
                min={1}
                max={50}
                marks={[
                  { value: 1, label: '1km' },
                  { value: 25, label: '25km' },
                  { value: 50, label: '50km' }
                ]}
                step={1}
              />
            </Box>
          )}
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
