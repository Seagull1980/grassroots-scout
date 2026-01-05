import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  IconButton,
  Slider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  Close as CloseIcon,
  DirectionsRun as DirectionsRunIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/map.css';
import axios from 'axios';

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker icons for teams with/without vacancies
const createCustomIcon = (hasVacancies: boolean) => {
  const color = hasVacancies ? '#4caf50' : '#9e9e9e';
  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26C32 7.163 24.837 0 16 0z" 
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });
};

interface TrainingLocation {
  id: number;
  title: string;
  teamName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  latitude: number;
  longitude: number;
  distance?: number;
  hasVacancies: boolean;
  contactEmail: string;
  description?: string;
  locationData?: {
    address: string;
    postcode: string;
    facilities?: string[];
  };
  participantCount?: number;
  maxParticipants?: number;
}

interface TrainingMapViewProps {
  userLocation?: { latitude: number; longitude: number };
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
}

// Component to handle map recenter
const RecenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
};

const TrainingMapView: React.FC<TrainingMapViewProps> = ({ 
  userLocation: initialLocation,
  onLocationChange 
}) => {
  const [locations, setLocations] = useState<TrainingLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    initialLocation || null
  );
  const [radius, setRadius] = useState(15); // Default 15km radius
  const [showVacanciesOnly, setShowVacanciesOnly] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<TrainingLocation | null>(null);
  const [searchPostcode, setSearchPostcode] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.5074, -0.1278]); // Default London
  const [locationType, setLocationType] = useState<'training' | 'match'>('training'); // Location type toggle

  // Get user's current location
  const getUserLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(newLocation);
          setMapCenter([newLocation.latitude, newLocation.longitude]);
          onLocationChange?.(newLocation);
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enter a postcode or allow location access.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  }, [onLocationChange]);

  // Fetch training locations from API
  const fetchTrainingLocations = useCallback(async () => {
    if (!userLocation) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/calendar/training-locations', {
        params: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius,
          hasVacancies: showVacanciesOnly ? 'true' : undefined,
          locationType
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setLocations(response.data.trainingLocations || []);
    } catch (err: any) {
      console.error('Error fetching training locations:', err);
      setError(err.response?.data?.error || 'Failed to load training locations');
    } finally {
      setLoading(false);
    }
  }, [userLocation, radius, showVacanciesOnly, locationType]);

  // Initial load - get user location
  useEffect(() => {
    if (!initialLocation) {
      getUserLocation();
    }
  }, [getUserLocation, initialLocation]);

  // Fetch locations when parameters change
  useEffect(() => {
    if (userLocation) {
      fetchTrainingLocations();
    }
  }, [userLocation, radius, showVacanciesOnly, locationType, fetchTrainingLocations]);

  // Geocode postcode to coordinates
  const searchByPostcode = async () => {
    if (!searchPostcode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Use OpenStreetMap Nominatim for geocoding (free)
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: searchPostcode + ', UK',
          format: 'json',
          limit: 1
        }
      });

      if (response.data.length > 0) {
        const newLocation = {
          latitude: parseFloat(response.data[0].lat),
          longitude: parseFloat(response.data[0].lon)
        };
        setUserLocation(newLocation);
        setMapCenter([newLocation.latitude, newLocation.longitude]);
        onLocationChange?.(newLocation);
      } else {
        setError('Postcode not found. Please try again.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to search postcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerClick = (location: TrainingLocation) => {
    setSelectedLocation(location);
  };

  const handleContactTeam = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <Box>
      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Desktop: Side-by-side layout, Mobile: Stacked layout */}
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, minHeight: '700px' }}>
        {/* Search and Filter Controls - Sidebar on desktop */}
        <Card sx={{ 
          width: { xs: '100%', sm: '100%', md: '350px' }, 
          flexShrink: 0,
          height: 'fit-content',
          position: { md: 'sticky' },
          top: { md: 16 }
        }}>
          <CardContent sx={{ backgroundColor: '#f5f5f5' }}>
            <Stack spacing={2}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
                🔍 Find Training Locations
              </Typography>

              {/* Location Search */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexDirection: { xs: 'row', md: 'column' } }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search by Postcode"
                  value={searchPostcode}
                  onChange={(e) => setSearchPostcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchByPostcode()}
                  placeholder="e.g., SW1A 1AA"
                />
                <Button
                  variant="contained"
                  onClick={searchByPostcode}
                  disabled={loading || !searchPostcode.trim()}
                  fullWidth
                  sx={{ display: { xs: 'none', md: 'block' } }}
                >
                  Search
                </Button>
                <Box sx={{ display: 'flex', gap: 1, width: { xs: 'auto', md: '100%' } }}>
                  <Button
                    variant="contained"
                    onClick={searchByPostcode}
                    disabled={loading || !searchPostcode.trim()}
                    sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                  >
                    Search
                  </Button>
                  <IconButton
                    color="primary"
                    onClick={getUserLocation}
                    disabled={loading}
                    title="Use my current location"
                  >
                    <MyLocationIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Filters */}
              <Box>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  Location Type
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant={locationType === 'training' ? 'contained' : 'outlined'}
                    size="small"
                    fullWidth
                    onClick={() => setLocationType('training')}
                  >
                    Training
                  </Button>
                  <Button
                    variant={locationType === 'match' ? 'contained' : 'outlined'}
                    size="small"
                    fullWidth
                    onClick={() => setLocationType('match')}
                  >
                    Match
                  </Button>
                </Box>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={showVacanciesOnly}
                      onChange={(e) => setShowVacanciesOnly(e.target.checked)}
                    />
                  }
                  label="Show only teams with vacancies"
                />
              </Box>
              
              <Box>
                <Typography variant="body2" gutterBottom>
                  Search Radius: {radius}km
                </Typography>
                <Slider
                  value={radius}
                  onChange={(_, value) => setRadius(value as number)}
                  min={1}
                  max={50}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 5, label: '5km' },
                    { value: 15, label: '15km' },
                    { value: 30, label: '30km' },
                    { value: 50, label: '50km' }
                  ]}
                />
              </Box>

              {/* Results Summary */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Found {locations.length} training location{locations.length !== 1 ? 's' : ''}
                  {userLocation && ` within ${radius}km`}
                </Typography>
                <Chip
                  size="small"
                  icon={<CheckCircleIcon />}
                  label={`${locations.filter(l => l.hasVacancies).length} with vacancies`}
                  color="success"
                  variant="outlined"
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Map - Full width on desktop */}
        <Card sx={{ flex: 1, minHeight: '600px' }}>
        <CardContent sx={{ p: 0, height: '100%' }}>
          {loading && !locations.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
              <CircularProgress />
            </Box>
          ) : userLocation ? (
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: '600px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <RecenterMap center={mapCenter} />

              {/* User location marker */}
              <Marker position={[userLocation.latitude, userLocation.longitude]}>
                <Popup>
                  <strong>Your Location</strong>
                </Popup>
              </Marker>

              {/* Training location markers */}
              {locations.map((location) => (
                <Marker
                  key={location.id}
                  position={[location.latitude, location.longitude]}
                  icon={createCustomIcon(location.hasVacancies)}
                  eventHandlers={{
                    click: () => handleMarkerClick(location)
                  }}
                >
                  <Popup maxWidth={300}>
                    <Box sx={{ p: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        {location.teamName || location.title}
                      </Typography>
                      
                      {location.distance && (
                        <Chip
                          size="small"
                          icon={<DirectionsRunIcon />}
                          label={`${location.distance}km away`}
                          sx={{ mb: 1 }}
                        />
                      )}
                      
                      {location.hasVacancies && (
                        <Chip
                          size="small"
                          icon={<CheckCircleIcon />}
                          label="Has vacancies"
                          color="success"
                          sx={{ mb: 1, ml: 1 }}
                        />
                      )}
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        📍 {location.location}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        📅 {new Date(location.date).toLocaleDateString()} at {location.startTime}
                      </Typography>
                      
                      {location.locationData?.facilities && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          ⚽ {location.locationData.facilities.join(', ')}
                        </Typography>
                      )}
                      
                      <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={() => handleMarkerClick(location)}
                      >
                        View Details
                      </Button>
                    </Box>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <MyLocationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Set Your Location
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Allow location access or enter your postcode to find nearby training sessions
              </Typography>
              <Button variant="contained" onClick={getUserLocation}>
                Use My Location
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
      </Box>

      {/* Location Details Dialog */}
      <Dialog
        open={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedLocation && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  {selectedLocation.teamName || selectedLocation.title}
                </Typography>
                <IconButton onClick={() => setSelectedLocation(null)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                {selectedLocation.distance && (
                  <Chip
                    icon={<DirectionsRunIcon />}
                    label={`${selectedLocation.distance}km from you`}
                    color="primary"
                  />
                )}
                
                {selectedLocation.hasVacancies && (
                  <Alert severity="success">
                    This team is currently looking for players!
                  </Alert>
                )}

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Training Time
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedLocation.date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                  <Typography variant="body1">
                    {selectedLocation.startTime} - {selectedLocation.endTime}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1">{selectedLocation.location}</Typography>
                  {selectedLocation.locationData?.postcode && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedLocation.locationData.postcode}
                    </Typography>
                  )}
                </Box>

                {selectedLocation.description && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">{selectedLocation.description}</Typography>
                  </Box>
                )}

                {selectedLocation.locationData?.facilities && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Facilities
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {selectedLocation.locationData.facilities.map((facility, idx) => (
                        <Chip key={idx} label={facility} size="small" />
                      ))}
                    </Box>
                  </Box>
                )}

                {selectedLocation.maxParticipants && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Capacity
                    </Typography>
                    <Typography variant="body1">
                      {selectedLocation.participantCount || 0} / {selectedLocation.maxParticipants} participants
                    </Typography>
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedLocation(null)}>Close</Button>
              <Button
                variant="contained"
                onClick={() => handleContactTeam(selectedLocation.contactEmail)}
              >
                Contact Coach
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default TrainingMapView;
