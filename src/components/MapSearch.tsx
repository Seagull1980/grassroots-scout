import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AGE_GROUP_OPTIONS } from '../constants/options';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Chip,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Checkbox,
  Divider,
  Menu,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Alert,
  Stack,
  Autocomplete,
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  Close as CloseIcon,
  Directions as DirectionsIcon,
  Draw as DrawIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Save as SaveIcon,
  Folder as FolderIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Visibility as ViewIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import GoogleMapsWrapper, { Map } from './GoogleMapsWrapper';
import Marker from './Marker';
import { TeamVacancy, MapSearchResult, EmailAlert } from '../types';
import { GOOGLE_MAPS_CONFIG } from '../config/maps';
import { calculateDistance, getCurrentLocation, formatDistance } from '../utils/maps';
import { getTeamVacancies, getPlayerAvailability, emailAlertAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface MapSearchProps {
  searchType: 'vacancies' | 'availability' | 'both';
}

interface SavedRegionData {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number }[];
  createdAt: string;
  isVisible: boolean;
}

interface SavedSearchRegion {
  id: string;
  name: string;
  coordinates: google.maps.LatLng[];
  createdAt: Date;
  isVisible: boolean;
}

interface DrawingState {
  isActive: boolean;
  mode: 'draw' | 'edit' | 'view';
  currentPolygon: google.maps.Polygon | null;
}

const SAVED_REGIONS_KEY = 'grassroots-hub-saved-regions';

const MapSearch: React.FC<MapSearchProps> = ({ searchType }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mapCenter, setMapCenter] = useState(GOOGLE_MAPS_CONFIG.defaultCenter);
  const [mapZoom, setMapZoom] = useState(GOOGLE_MAPS_CONFIG.defaultZoom);
  const [searchRadius, setSearchRadius] = useState(GOOGLE_MAPS_CONFIG.searchRadius);
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<MapSearchResult | null>(null);
  const [, setLoading] = useState(false);
  const [map, setMap] = useState<google.maps.Map>();
  const [radiusCircle, setRadiusCircle] = useState<google.maps.Circle | null>(null);
  
  // Enhanced drawing functionality
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isActive: false,
    mode: 'view',
    currentPolygon: null
  });
  // Custom drawing state to replace deprecated DrawingManager
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPath, setDrawingPath] = useState<google.maps.LatLng[]>([]);
  const [drawingListeners, setDrawingListeners] = useState<google.maps.MapsEventListener[]>([]);
  const [drawingPolyline, setDrawingPolyline] = useState<google.maps.Polyline | null>(null);

  const isDrawingModeRef = useRef(isDrawingMode);
  const drawingPathRef = useRef<google.maps.LatLng[]>(drawingPath);
  const drawingPolylineRef = useRef<google.maps.Polyline | null>(drawingPolyline);

  useEffect(() => {
    isDrawingModeRef.current = isDrawingMode;
  }, [isDrawingMode]);

  useEffect(() => {
    drawingPathRef.current = drawingPath;
  }, [drawingPath]);

  useEffect(() => {
    drawingPolylineRef.current = drawingPolyline;
  }, [drawingPolyline]);
  const [drawnPolygon, setDrawnPolygon] = useState<google.maps.Polygon | null>(null);
  const [useDrawnArea, setUseDrawnArea] = useState(false);
  
  // Saved regions functionality
  const [savedRegions, setSavedRegions] = useState<SavedSearchRegion[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [regionName, setRegionName] = useState('');
  const [showRegionsMenu, setShowRegionsMenu] = useState(false);
  const [regionsMenuAnchor, setRegionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Multi-select functionality
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showBulkContactDialog, setShowBulkContactDialog] = useState(false);
  const [bulkContactForm, setBulkContactForm] = useState({
    subject: '',
    message: ''
  });
  
  // Mobile-friendly states
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileResultsList, setShowMobileResultsList] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isSwipeGestureActive, setIsSwipeGestureActive] = useState(false);
  
  // Email Alert functionality
  const [emailAlerts, setEmailAlerts] = useState<EmailAlert[]>([]);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  
  // Filter states
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [locationType, setLocationType] = useState<'training' | 'match'>('training'); // Location type toggle
  
  // Available filter options
  const leagues = ['County League', 'Regional League', 'Youth League', 'Premier Youth League', 'Championship Youth', 'Local League'];
  const ageGroups = AGE_GROUP_OPTIONS;

  // Load saved regions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_REGIONS_KEY);
    if (saved) {
      try {
        const parsedRegions = JSON.parse(saved).map((region: SavedRegionData) => ({
          ...region,
          createdAt: new Date(region.createdAt),
          coordinates: region.coordinates.map((coord: { lat: number; lng: number }) => new google.maps.LatLng(coord.lat, coord.lng))
        }));
        setSavedRegions(parsedRegions);
      } catch (error) {
        console.error('Error loading saved regions:', error);
      }
    }
  }, []);

  // Load email alerts
  useEffect(() => {
    if (user) {
      loadEmailAlerts();
    }
  }, [user]);

  // Mobile detection
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || '';
      const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const screenCheck = window.innerWidth < 768;
      setIsMobile(mobileCheck || screenCheck);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Touch gesture handling for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchStartY(e.touches[0].clientY);
      setIsSwipeGestureActive(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY === null) return;
      
      const touchEndY = e.touches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      
      // Swipe up to show results (minimum 50px swipe)
      if (deltaY > 50 && !isSwipeGestureActive) {
        setIsSwipeGestureActive(true);
        setShowMobileResultsList(true);
      }
      // Swipe down to hide results
      else if (deltaY < -50 && !isSwipeGestureActive) {
        setIsSwipeGestureActive(true);
        setShowMobileResultsList(false);
      }
    };

    const handleTouchEnd = () => {
      setTouchStartY(null);
      setIsSwipeGestureActive(false);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStartY, isSwipeGestureActive, isMobile]);

  // Complete polygon drawing
  const completePolygon = useCallback((pathOverride?: google.maps.LatLng[]) => {
    const pathToUse = pathOverride ?? drawingPath;
    if (!map || pathToUse.length < 3) return;
    
    // Remove previous polygon if it exists
    if (drawnPolygon) {
      drawnPolygon.setMap(null);
    }
    
    // Clear drawing markers and listeners
    drawingListeners.forEach(listener => {
      if ('setMap' in listener && typeof listener.setMap === 'function') {
        listener.setMap(null);
      } else {
        google.maps.event.removeListener(listener);
      }
    });
    setDrawingListeners([]);
    
    // Clear drawing polyline
    if (drawingPolyline) {
      drawingPolyline.setMap(null);
      setDrawingPolyline(null);
    }
    
    // Create polygon from path
    const polygon = new google.maps.Polygon({
      paths: pathToUse,
      strokeColor: '#2196F3',
      strokeWeight: 3,
      fillColor: '#2196F3',
      fillOpacity: 0.2,
      editable: true,
      draggable: true,
      map: map
    } as any);
    
    setDrawnPolygon(polygon);
    setDrawingState(prev => ({ ...prev, isActive: false, mode: 'edit', currentPolygon: polygon }));
    setUseDrawnArea(true);
    setIsDrawingMode(false);
    setDrawingPath([]);
    
    // Add edit listeners to the polygon
    addPolygonEditListeners(polygon);
    
    // Trigger search in the drawn area
    searchInDrawnArea(polygon);
    
    // Show success feedback
    setSnackbar({
      open: true,
      message: 'Search area drawn! You can now save this region or edit it by dragging the corners.',
      severity: 'success'
    });
  }, [map, drawingPath, drawnPolygon, drawingListeners]);

  // Keyboard support for polygon drawing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isDrawingMode) {
        if (event.key === 'Enter' && drawingPath.length >= 3) {
          event.preventDefault();
          completePolygon();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          handleClearDrawing();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawingMode, drawingPath, completePolygon]);

  const loadEmailAlerts = async () => {
    try {
      const response = await emailAlertAPI.getAll();
      setEmailAlerts(response.alerts);
    } catch (error) {
      console.error('Error loading email alerts:', error);
    }
  };

  // Multi-select functions
  const toggleResultSelection = (resultId: string) => {
    const newSelection = new Set(selectedResults);
    if (newSelection.has(resultId)) {
      newSelection.delete(resultId);
    } else {
      newSelection.add(resultId);
    }
    setSelectedResults(newSelection);
  };

  const selectAllResults = () => {
    const allIds = new Set(results.map((result, index) => `${result.type}_${index}`));
    setSelectedResults(allIds);
  };

  const clearSelection = () => {
    setSelectedResults(new Set());
    setIsMultiSelectMode(false);
  };

  const getSelectedResultsData = () => {
    return results.filter((result, index) => 
      selectedResults.has(`${result.type}_${index}`)
    );
  };

  const handleBulkContact = async () => {
    const selectedData = getSelectedResultsData();
    const promises = selectedData.map(async (result) => {
      const item = result.item;
      if (result.type === 'vacancy') {
        // Contact coach for team vacancy
        return fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            recipientId: item.postedBy,
            subject: bulkContactForm.subject,
            message: bulkContactForm.message,
            relatedVacancyId: item.id,
            messageType: 'vacancy_interest'
          })
        });
      } else {
        // Contact player for availability
        return fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            recipientId: item.postedBy, // Use postedBy for PlayerAvailability as well
            subject: bulkContactForm.subject,
            message: bulkContactForm.message,
            relatedPlayerAvailabilityId: item.id,
            messageType: 'player_inquiry'
          })
        });
      }
    });

    try {
      await Promise.all(promises);
      setSnackbar({
        open: true,
        message: `Successfully contacted ${selectedData.length} ${selectedData.length === 1 ? 'person' : 'people'}!`,
        severity: 'success'
      });
      setShowBulkContactDialog(false);
      clearSelection();
    } catch (error) {
      console.error('Bulk contact error:', error);
      setSnackbar({
        open: true,
        message: 'Some messages failed to send. Please try again.',
        severity: 'error'
      });
    }
  };

  // Create email alert for current search
  const createEmailAlert = async (alertType: 'new_match' | 'saved_search') => {
    if (!user) {
      setSnackbar({
        open: true,
        message: 'Please log in to create email alerts',
        severity: 'error'
      });
      return;
    }

    try {
      const alertData: {
        alertType: 'new_match' | 'saved_search';
        filters?: {
          league?: string;
          ageGroup?: string;
          radius?: number;
          center?: { lat: number; lng: number };
        };
        searchRegion?: {
          name: string;
          coordinates: { lat: number; lng: number }[];
        };
      } = {
        alertType: alertType as 'new_match' | 'saved_search'
      };

      if (alertType === 'new_match') {
        // Create alert for current search filters and location
        alertData.filters = {
          league: selectedLeague || undefined,
          ageGroup: selectedAgeGroup || undefined,
          radius: useDrawnArea ? undefined : searchRadius,
          center: useDrawnArea ? undefined : mapCenter
        };

        if (useDrawnArea && drawnPolygon) {
          const path = drawnPolygon.getPath();
          const coordinates = [];
          for (let i = 0; i < path.getLength(); i++) {
            const coord = path.getAt(i);
            coordinates.push({ lat: coord.lat(), lng: coord.lng() });
          }
          alertData.searchRegion = {
            name: `Search Area ${new Date().toLocaleDateString()}`,
            coordinates
          };
        }
      } else if (alertType === 'saved_search' && drawnPolygon) {
        // Create alert for saved search region
        const path = drawnPolygon.getPath();
        const coordinates = [];
        for (let i = 0; i < path.getLength(); i++) {
          const coord = path.getAt(i);
          coordinates.push({ lat: coord.lat(), lng: coord.lng() });
        }
        alertData.searchRegion = {
          name: regionName || `Search Area ${new Date().toLocaleDateString()}`,
          coordinates
        };
        alertData.filters = {
          league: selectedLeague || undefined,
          ageGroup: selectedAgeGroup || undefined
        };
      }

      await emailAlertAPI.create(alertData);
      setSnackbar({
        open: true,
        message: 'Email alert created successfully! You\'ll be notified of new matches.',
        severity: 'success'
      });
      
      // Reload alerts
      loadEmailAlerts();
      setShowAlertDialog(false);
    } catch (error) {
      console.error('Error creating email alert:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create email alert. Please try again.',
        severity: 'error'
      });
    }
  };

  // Delete email alert
  const deleteEmailAlert = async (alertId: string) => {
    try {
      await emailAlertAPI.delete(alertId);
      setSnackbar({
        open: true,
        message: 'Email alert deleted',
        severity: 'success'
      });
      loadEmailAlerts();
    } catch (error) {
      console.error('Error deleting email alert:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete email alert',
        severity: 'error'
      });
    }
  };

  // Toggle email alert status
  const toggleEmailAlert = async (alertId: string, isActive: boolean) => {
    try {
      await emailAlertAPI.update(alertId, { isActive });
      setSnackbar({
        open: true,
        message: `Email alert ${isActive ? 'enabled' : 'disabled'}`,
        severity: 'success'
      });
      loadEmailAlerts();
    } catch (error) {
      console.error('Error updating email alert:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update email alert',
        severity: 'error'
      });
    }
  };

  const handleMapLoad = useCallback((loadedMap: google.maps.Map) => {
    setMap(loadedMap);
  }, []);

  // Set up drawing listeners using refs to avoid stale state in event handlers
  useEffect(() => {
    if (!map) return;

    const handleMapClick = (event: google.maps.MapMouseEvent) => {
      if (isDrawingModeRef.current && event.latLng) {
        const newPath = [...drawingPathRef.current, event.latLng];
        setDrawingPath(newPath);
        drawingPathRef.current = newPath;
        
        // Create markers for visual feedback during drawing
        const marker = new google.maps.Marker({
          position: event.latLng,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillColor: '#2196F3',
            fillOpacity: 1,
            strokeColor: '#1976D2',
            strokeWeight: 2
          }
        });
        
        // Update drawing polyline for visual feedback
        if (drawingPolylineRef.current) {
          drawingPolylineRef.current.setMap(null);
        }
        
        if (newPath.length > 1) {
          const polyline = new google.maps.Polyline({
            path: newPath,
            strokeColor: '#2196F3',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            map: map
          });
          setDrawingPolyline(polyline);
          drawingPolylineRef.current = polyline;
        }
        
        // Store marker for cleanup
        setDrawingListeners(prev => [...prev, marker as any]);
      }
    };
    
    const handleMapDoubleClick = (_event: google.maps.MapMouseEvent) => {
      if (isDrawingModeRef.current && drawingPathRef.current.length >= 3) {
        completePolygon(drawingPathRef.current);
      }
    };
    
    // Add event listeners
    const clickListener = map.addListener('click', handleMapClick);
    const doubleClickListener = map.addListener('dblclick', handleMapDoubleClick);
    
    setDrawingListeners([clickListener, doubleClickListener]);

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(doubleClickListener);
    };
  }, [map, completePolygon]);
  // Add edit listeners to polygon
  const addPolygonEditListeners = (polygon: google.maps.Polygon) => {
    google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
      searchInDrawnArea(polygon);
    });
    
    google.maps.event.addListener(polygon.getPath(), 'insert_at', () => {
      searchInDrawnArea(polygon);
    });
    
    google.maps.event.addListener(polygon, 'dragend', () => {
      searchInDrawnArea(polygon);
    });
  };

  // Save current drawn region
  const saveCurrentRegion = () => {
    if (!drawnPolygon || !regionName.trim()) return;
    
    const path = drawnPolygon.getPath();
    const coordinates = [];
    for (let i = 0; i < path.getLength(); i++) {
      coordinates.push(path.getAt(i));
    }
    
    const newRegion: SavedSearchRegion = {
      id: Date.now().toString(),
      name: regionName.trim(),
      coordinates,
      createdAt: new Date(),
      isVisible: true
    };
    
    const updatedRegions = [...savedRegions, newRegion];
    setSavedRegions(updatedRegions);
    
    // Save to localStorage
    const regionsToSave = updatedRegions.map(region => ({
      ...region,
      coordinates: region.coordinates.map(coord => ({ lat: coord.lat(), lng: coord.lng() }))
    }));
    localStorage.setItem(SAVED_REGIONS_KEY, JSON.stringify(regionsToSave));
    
    setShowSaveDialog(false);
    setRegionName('');
    setSnackbar({
      open: true,
      message: `Search region "${newRegion.name}" saved successfully!`,
      severity: 'success'
    });
  };

  // Load a saved region
  const loadSavedRegion = (region: SavedSearchRegion) => {
    // Clear existing polygon
    if (drawnPolygon) {
      drawnPolygon.setMap(null);
    }
    
    // Create new polygon from saved coordinates
    const polygon = new google.maps.Polygon({
      paths: region.coordinates,
      strokeColor: '#2196F3',
      strokeWeight: 3,
      fillColor: '#2196F3',
      fillOpacity: 0.2,
      editable: true,
      draggable: true,
      map: map
    } as any);
    
    setDrawnPolygon(polygon);
    setUseDrawnArea(true);
    setDrawingState(prev => ({ ...prev, mode: 'edit', currentPolygon: polygon }));
    
    // Add edit listeners
    addPolygonEditListeners(polygon);
    
    // Center map on the region
    const bounds = new google.maps.LatLngBounds();
    region.coordinates.forEach(coord => bounds.extend(coord));
    map?.fitBounds(bounds);
    
    // Search in the loaded area
    searchInDrawnArea(polygon);
    
    setShowRegionsMenu(false);
    setSnackbar({
      open: true,
      message: `Loaded search region "${region.name}"`,
      severity: 'success'
    });
  };

  // Delete a saved region
  const deleteSavedRegion = (regionId: string) => {
    const updatedRegions = savedRegions.filter(region => region.id !== regionId);
    setSavedRegions(updatedRegions);
    
    const regionsToSave = updatedRegions.map(region => ({
      ...region,
      coordinates: region.coordinates.map(coord => ({ lat: coord.lat(), lng: coord.lng() }))
    }));
    localStorage.setItem(SAVED_REGIONS_KEY, JSON.stringify(regionsToSave));
    
    setSnackbar({
      open: true,
      message: 'Search region deleted',
      severity: 'success'
    });
  };

  const searchInArea = useCallback(async (center: { lat: number; lng: number }, radius: number) => {
    setLoading(true);
    try {
      const searchResults: MapSearchResult[] = [];

      // Use the new location-filtered endpoint for vacancies
      if (searchType === 'vacancies' || searchType === 'both') {
        try {
          const { getTeamVacanciesWithLocationType } = await import('../services/api');
          const response = await getTeamVacanciesWithLocationType({
            latitude: center.lat,
            longitude: center.lng,
            radius,
            locationType,
            hasVacancies: true
          });

          // Convert the location data to MapSearchResult format
          if (response.trainingLocations && response.trainingLocations.length > 0) {
            response.trainingLocations.forEach((location: any) => {
              searchResults.push({
                item: {
                  id: location.id.toString(),
                  title: location.teamName || location.title,
                  description: location.description || '',
                  league: location.league || '',
                  ageGroup: location.ageGroup || '',
                  position: location.position || '',
                  location: location.location || '',
                  contactInfo: location.contactEmail || '',
                  status: 'active',
                  createdAt: location.date || new Date().toISOString(),
                  firstName: 'Coach',
                  lastName: 'Team',
                  postedBy: '1',
                  locationData: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.locationData?.address || location.location,
                    postcode: location.locationData?.postcode || ''
                  }
                } as TeamVacancy,
                distance: location.distance,
                type: 'vacancy'
              });
            });
          }
        } catch (error) {
          console.error('Error fetching team vacancies:', error);
        }
      }

      if (searchType === 'availability' || searchType === 'both') {
        const availability = await getPlayerAvailability();
        availability.forEach((player) => {
          if (player.locationData) {
            // Apply filters
            if (selectedLeague && !player.preferredLeagues.includes(selectedLeague)) {
              return;
            }
            if (selectedAgeGroup && player.ageGroup !== selectedAgeGroup) {
              return;
            }
            
            const distance = calculateDistance(
              center,
              { lat: player.locationData.latitude, lng: player.locationData.longitude }
            );
            if (distance <= radius) {
              searchResults.push({
                item: player,
                distance,
                type: 'availability'
              });
            }
          }
        });
      }

      // Sort results by distance
      searchResults.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setResults(searchResults);
    } catch (error) {
      console.error('❌ Error searching area:', error);
    } finally {
      setLoading(false);
    }
  }, [searchType, selectedLeague, selectedAgeGroup, locationType]);

  const searchInDrawnArea = useCallback(async (polygon: google.maps.Polygon) => {
    setLoading(true);
    try {
      const searchResults: MapSearchResult[] = [];

      if (searchType === 'vacancies' || searchType === 'both') {
        const vacancies = await getTeamVacancies();
        vacancies.forEach((vacancy) => {
          if (vacancy.locationData) {
            // Apply filters
            if (selectedLeague && vacancy.league !== selectedLeague) return;
            if (selectedAgeGroup && vacancy.ageGroup !== selectedAgeGroup) return;
            
            const point = new google.maps.LatLng(
              vacancy.locationData.latitude,
              vacancy.locationData.longitude
            );
            
            if (google.maps.geometry.poly.containsLocation(point, polygon)) {
              searchResults.push({
                item: { ...vacancy, id: vacancy.id.toString(), postedBy: vacancy.postedBy.toString() } as TeamVacancy,
                distance: 0, // No distance calculation for polygon search
                type: 'vacancy'
              });
            }
          }
        });
      }

      if (searchType === 'availability' || searchType === 'both') {
        const availability = await getPlayerAvailability();
        availability.forEach((player) => {
          if (player.locationData) {
            // Apply filters
            if (selectedLeague && !player.preferredLeagues.includes(selectedLeague)) return;
            if (selectedAgeGroup && player.ageGroup !== selectedAgeGroup) return;
            
            const point = new google.maps.LatLng(
              player.locationData.latitude,
              player.locationData.longitude
            );
            
            if (google.maps.geometry.poly.containsLocation(point, polygon)) {
              searchResults.push({
                item: player,
                distance: 0,
                type: 'availability'
              });
            }
          }
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('❌ Error searching drawn area:', error);
    } finally {
      setLoading(false);
    }
  }, [searchType, selectedLeague, selectedAgeGroup, locationType]);

  // Initial search when component mounts
  useEffect(() => {
    if (!useDrawnArea) {
      searchInArea(mapCenter, searchRadius);
    }
  }, [searchType, selectedLeague, selectedAgeGroup, locationType, searchRadius, mapCenter, useDrawnArea, searchInArea]); // Re-search when filters change

  // Manage radius circle visualization
  useEffect(() => {
    if (!map || useDrawnArea) {
      // Remove circle if map not ready or using drawn area
      if (radiusCircle) {
        radiusCircle.setMap(null);
        setRadiusCircle(null);
      }
      return;
    }

    // Update or create circle
    if (radiusCircle) {
      // Update existing circle
      radiusCircle.setCenter(mapCenter);
      radiusCircle.setRadius(searchRadius * 1000); // Convert km to meters
    } else {
      // Create new circle
      const circle = new google.maps.Circle({
        strokeColor: '#2196F3',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#2196F3',
        fillOpacity: 0.1,
        map,
        center: mapCenter,
        radius: searchRadius * 1000 // Convert km to meters
      });
      setRadiusCircle(circle);
    }
  }, [map, mapCenter, searchRadius, useDrawnArea]);

  const handleStartDrawing = () => {
    setDrawingState(prev => ({ ...prev, isActive: true, mode: 'draw' }));
    setIsDrawingMode(true);
    setDrawingPath([]);
    
    setSnackbar({
      open: true,
      message: 'Click on the map to start drawing your search area. Double-click or press Enter to finish.',
      severity: 'success'
    });
  };

  const handleClearDrawing = () => {
    if (drawnPolygon) {
      drawnPolygon.setMap(null);
      setDrawnPolygon(null);
    }
    
    // Clear drawing state
    setUseDrawnArea(false);
    setDrawingState({ isActive: false, mode: 'view', currentPolygon: null });
    setIsDrawingMode(false);
    setDrawingPath([]);
    
    // Clear any drawing markers/listeners
    drawingListeners.forEach(listener => {
      if ('setMap' in listener && typeof listener.setMap === 'function') {
        listener.setMap(null);
      } else {
        google.maps.event.removeListener(listener);
      }
    });
    setDrawingListeners([]);
    
    // Clear drawing polyline
    if (drawingPolyline) {
      drawingPolyline.setMap(null);
      setDrawingPolyline(null);
    }
    
    // Return to radius search
    searchInArea(mapCenter, searchRadius);
  };

  const handleEditDrawing = () => {
    if (drawnPolygon) {
      setDrawingState(prev => ({ ...prev, mode: 'edit' }));
      drawnPolygon.setEditable(true);
      setSnackbar({
        open: true,
        message: 'Edit mode: Drag the corners to adjust your search area.',
        severity: 'success'
      });
    }
  };

  const handleSaveRegion = () => {
    if (drawnPolygon) {
      setShowSaveDialog(true);
    }
  };

  const handleShowRegions = (event: React.MouseEvent<HTMLElement>) => {
    setRegionsMenuAnchor(event.currentTarget);
    setShowRegionsMenu(true);
  };

  const handleFilterChange = () => {
    if (useDrawnArea && drawnPolygon) {
      searchInDrawnArea(drawnPolygon);
    } else {
      searchInArea(mapCenter, searchRadius);
    }
  };

  const handleMyLocation = async () => {
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        setSnackbar({
          open: true,
          message: 'Geolocation is not supported by your browser. Please click on the map to set your search center.',
          severity: 'error'
        });
        return;
      }

      // Check if we're on HTTPS (required by many browsers)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        console.warn('Geolocation may require HTTPS in production');
      }

      // Show loading message
      setSnackbar({
        open: true,
        message: 'Getting your location...',
        severity: 'success'
      });

      const userLocation = await getCurrentLocation();
      if (userLocation && 'lat' in userLocation && 'lng' in userLocation) {
        console.log('Location obtained successfully:', userLocation);
        setMapCenter(userLocation);
        setMapZoom(15);
        searchInArea(userLocation, searchRadius);
        
        setSnackbar({
          open: true,
          message: 'Location found! Map centered on your position.',
          severity: 'success'
        });
      } else if (userLocation && 'error' in userLocation) {
        // Use the specific error message from the geolocation service
        setSnackbar({
          open: true,
          message: userLocation.userMessage,
          severity: 'error'
        });
      } else {
        // Check permission status if available
        if ('permissions' in navigator) {
          try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            console.log('Geolocation permission status:', permission.state);
            
            let message = 'Could not get your location. ';
            switch (permission.state) {
              case 'denied':
                message += 'Location access is blocked. Please enable it in your browser settings and try again.';
                break;
              case 'prompt':
                message += 'Please allow location access when prompted and try again.';
                break;
              default:
                message += 'Please try again or click on the map to set your search center manually.';
            }
            
            setSnackbar({
              open: true,
              message,
              severity: 'error'
            });
          } catch (permError) {
            console.warn('Could not check permission status:', permError);
            setSnackbar({
              open: true,
              message: 'Location access needed. Please allow location permissions and try again, or click on the map to set your search center manually.',
              severity: 'error'
            });
          }
        } else {
          setSnackbar({
            open: true,
            message: 'Location access needed. Please allow location permissions and try again, or click on the map to set your search center manually.',
            severity: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Unexpected error in handleMyLocation:', error);
      setSnackbar({
        open: true,
        message: 'Unexpected error accessing location. Please try clicking on the map manually.',
        severity: 'error'
      });
    }
  };

  const handleRadiusChange = (value: number) => {
    setSearchRadius(value);
    if (!useDrawnArea) {
      searchInArea(mapCenter, value);
    }
  };

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng && !drawingState.isActive && !useDrawnArea) {
      const center = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      setMapCenter(center);
      searchInArea(center, searchRadius);
    }
  }, [searchRadius, searchInArea, drawingState.isActive, useDrawnArea]);

  useEffect(() => {
    if (map) {
      const clickListener = map.addListener('click', handleMapClick);
      return () => google.maps.event.removeListener(clickListener);
    }
  }, [map, handleMapClick]);

  const renderMarkers = () => {
    return results.map((result) => {
      const item = result.item;
      if (!item.locationData) {
        return null;
      }

      const position = {
        lat: item.locationData.latitude,
        lng: item.locationData.longitude
      };

      // Simple colored icon for testing
      const icon = result.type === 'vacancy' 
        ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';

      return (
        <Marker
          key={`${result.type}-${item.id}`}
          position={position}
          icon={icon}
          title={item.title}
          onClick={() => {
            console.log('MapSearch: Marker onClick called for item:', item.id, item.title);
            setSelectedResult(result);
          }}
        />
      );
    });
  };

  const renderSelectedItemDialog = () => {
    console.log('renderSelectedItemDialog called, selectedResult:', selectedResult);
    if (!selectedResult) return null;

    const item = selectedResult.item;
    console.log('Dialog will render for item:', item.id, item.title);

    return (
      <Dialog
        open={Boolean(selectedResult)}
        onClose={() => setSelectedResult(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{item.title}</Typography>
            <IconButton onClick={() => setSelectedResult(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Chip
              label={selectedResult.type === 'vacancy' ? 'Team Vacancy' : 'Player Available'}
              color={selectedResult.type === 'vacancy' ? 'primary' : 'secondary'}
              size="small"
            />
            {selectedResult.distance && (
              <Chip
                label={`${formatDistance(selectedResult.distance)} away`}
                variant="outlined"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          
          <Typography variant="body1" paragraph>
            {item.description}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="textSecondary">
                League
              </Typography>
              <Typography variant="body2">
                {'league' in item ? item.league : item.preferredLeagues.join(', ')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Age Group
              </Typography>
              <Typography variant="body2">{item.ageGroup}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Position
              </Typography>
              <Typography variant="body2">
                {'position' in item ? item.position : item.positions?.join(', ') || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Location
              </Typography>
              <Typography variant="body2">{item.location}</Typography>
            </Grid>
          </Grid>

          <Box mt={2}>
            <Typography variant="subtitle2" color="textSecondary">
              Connect
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use the messaging feature to connect with this {selectedResult.type === 'vacancy' ? 'team' : 'player'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 1 }}
              startIcon={<MessageIcon />}
              onClick={() => {
                console.log('Sending message - Full item:', item);
                console.log('Selected result type:', selectedResult.type);
                console.log('Item ID:', item.id, 'Type:', typeof item.id);
                setSelectedResult(null);
                navigate('/messages', { 
                  state: { 
                    recipientId: String(item.postedBy),
                    recipientName: selectedResult.type === 'vacancy' ? item.title : `${item.firstName || 'Player'} ${item.lastName || ''}`.trim(),
                    context: selectedResult.type === 'vacancy' ? `Regarding: ${item.title}` : `Regarding player availability in ${item.ageGroup}`,
                    relatedVacancyId: selectedResult.type === 'vacancy' ? String(item.id) : undefined,
                    relatedPlayerAvailabilityId: selectedResult.type === 'availability' ? String(item.id) : undefined,
                    messageType: selectedResult.type === 'vacancy' ? 'vacancy_interest' : 'player_inquiry'
                  } 
                });
              }}
            >
              Send Message
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<ViewIcon />}
            onClick={() => {
              // Navigate to search page with filters to show this specific item
              const params = new URLSearchParams();
              
              if (selectedResult.type === 'vacancy') {
                params.set('tab', '0'); // Team vacancies tab
                params.set('league', ('league' in item) ? item.league : '');
                params.set('ageGroup', item.ageGroup);
                params.set('position', ('position' in item) ? item.position : '');
              } else {
                params.set('tab', '1'); // Player availability tab
                params.set('ageGroup', item.ageGroup);
                if ('preferredLeagues' in item && item.preferredLeagues.length > 0) {
                  params.set('league', item.preferredLeagues[0]);
                }
                if ('positions' in item && item.positions && item.positions.length > 0) {
                  params.set('position', item.positions[0]);
                }
              }
              
              params.set('location', item.location);
              params.set('highlightId', item.id); // Add ID to highlight the specific item
              
              navigate(`/search?${params.toString()}`);
              setSelectedResult(null);
            }}
            variant="contained"
          >
            View Details
          </Button>
          {item.locationData && (
            <Button
              startIcon={<DirectionsIcon />}
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${item.locationData!.latitude},${item.locationData!.longitude}`;
                window.open(url, '_blank');
              }}
            >
              Get Directions
            </Button>
          )}
          <Button onClick={() => setSelectedResult(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <GoogleMapsWrapper>
      <Box>
        {/* Search Controls */}
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Button
                  startIcon={<FilterIcon />}
                  onClick={() => setShowFilters(!showFilters)}
                  variant={showFilters ? 'contained' : 'outlined'}
                  size="small"
                >
                  Filters
                </Button>
                
                <Divider orientation="vertical" flexItem />

                {/* Location Type Toggle */}
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={locationType === 'training' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setLocationType('training')}
                  >
                    Training
                  </Button>
                  <Button
                    variant={locationType === 'match' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setLocationType('match')}
                  >
                    Match
                  </Button>
                </Stack>
                
                <Divider orientation="vertical" flexItem />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    startIcon={<DrawIcon />}
                    onClick={handleStartDrawing}
                    variant={drawingState.isActive ? 'contained' : 'outlined'}
                    size="small"
                    disabled={drawingState.isActive}
                  >
                    {drawingState.isActive ? 'Drawing...' : 'Draw Area'}
                  </Button>
                  
                  {drawnPolygon && (
                    <>
                      <Button
                        startIcon={<EditIcon />}
                        onClick={handleEditDrawing}
                        variant={drawingState.mode === 'edit' ? 'contained' : 'outlined'}
                        size="small"
                        color="primary"
                      >
                        Edit
                      </Button>
                      
                      <Button
                        startIcon={<SaveIcon />}
                        onClick={handleSaveRegion}
                        variant="outlined"
                        size="small"
                        color="success"
                      >
                        Save
                      </Button>
                      
                      <Button
                        startIcon={<ClearIcon />}
                        onClick={handleClearDrawing}
                        variant="outlined"
                        size="small"
                        color="secondary"
                      >
                        Clear
                      </Button>
                    </>
                  )}
                  
                  {savedRegions.length > 0 && (
                    <Button
                      startIcon={<FolderIcon />}
                      onClick={handleShowRegions}
                      variant="outlined"
                      size="small"
                    >
                      Saved ({savedRegions.length})
                    </Button>
                  )}
                </Stack>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={useDrawnArea}
                      disabled={!drawnPolygon}
                      size="small"
                    />
                  }
                  label="Use Drawn Area"
                  disabled={!drawnPolygon}
                />
                
                <Divider orientation="vertical" flexItem />
                
                <Button
                  startIcon={<MyLocationIcon />}
                  onClick={handleMyLocation}
                  variant="outlined"
                  size={isMobile ? "large" : "small"}
                  disabled={useDrawnArea}
                  sx={{ 
                    minHeight: isMobile ? 44 : 'auto',
                    fontSize: isMobile ? '0.9rem' : '0.875rem'
                  }}
                >
                  My Location
                </Button>

                {user && (
                  <>
                    <Divider orientation="vertical" flexItem />
                    
                    <Button
                      startIcon={<NotificationsIcon />}
                      onClick={() => setShowAlertDialog(true)}
                      variant="outlined"
                      size={isMobile ? "large" : "small"}
                      color="secondary"
                      sx={{ 
                        minHeight: isMobile ? 44 : 'auto',
                        fontSize: isMobile ? '0.9rem' : '0.875rem'
                      }}
                    >
                      {isMobile ? `Alerts (${emailAlerts.filter(alert => alert.isActive).length})` : `Email Alerts (${emailAlerts.filter(alert => alert.isActive).length})`}
                    </Button>
                  </>
                )}

                {/* Multi-select controls */}
                {results.length > 0 && (
                  <>
                    <Divider orientation="vertical" flexItem />
                    
                    <Button
                      onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                      variant={isMultiSelectMode ? 'contained' : 'outlined'}
                      size={isMobile ? "large" : "small"}
                      sx={{ 
                        minHeight: isMobile ? 44 : 'auto',
                        fontSize: isMobile ? '0.9rem' : '0.875rem'
                      }}
                    >
                      {isMultiSelectMode ? 'Exit Multi-Select' : 'Multi-Select'}
                    </Button>
                    
                    {isMultiSelectMode && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          onClick={selectAllResults}
                          size={isMobile ? "large" : "small"}
                          disabled={selectedResults.size === results.length}
                          sx={{ 
                            minHeight: isMobile ? 44 : 'auto',
                            fontSize: isMobile ? '0.9rem' : '0.875rem'
                          }}
                        >
                          Select All
                        </Button>
                        
                        <Button
                          onClick={clearSelection}
                          size={isMobile ? "large" : "small"}
                          disabled={selectedResults.size === 0}
                          sx={{ 
                            minHeight: isMobile ? 44 : 'auto',
                            fontSize: isMobile ? '0.9rem' : '0.875rem'
                          }}
                        >
                          Clear ({selectedResults.size})
                        </Button>
                        
                        <Button
                          onClick={() => setShowBulkContactDialog(true)}
                          variant="contained"
                          size={isMobile ? "large" : "small"}
                          disabled={selectedResults.size === 0}
                          startIcon={<EmailIcon />}
                          sx={{ 
                            minHeight: isMobile ? 44 : 'auto',
                            fontSize: isMobile ? '0.9rem' : '0.875rem'
                          }}
                        >
                          Contact ({selectedResults.size})
                        </Button>
                      </Stack>
                    )}
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Filters Panel */}
        {showFilters && (
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Search Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  fullWidth
                  size="small"
                  options={leagues}
                  value={selectedLeague || null}
                  onChange={(_, newValue) => {
                    setSelectedLeague(newValue || '');
                    setTimeout(handleFilterChange, 100);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="League"
                      placeholder="Type to search leagues..."
                    />
                  )}
                  filterOptions={(options, { inputValue }) => {
                    if (!inputValue) return options;
                    return options.filter(option =>
                      option.toLowerCase().includes(inputValue.toLowerCase())
                    );
                  }}
                  noOptionsText="No leagues found"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Age Group</InputLabel>
                  <Select
                    value={selectedAgeGroup}
                    label="Age Group"
                    onChange={(e) => {
                      setSelectedAgeGroup(e.target.value);
                      setTimeout(handleFilterChange, 100);
                    }}
                  >
                    <MenuItem value="">All Age Groups</MenuItem>
                    {ageGroups.map((ageGroup) => (
                      <MenuItem key={ageGroup} value={ageGroup}>
                        {ageGroup}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  onClick={() => {
                    setSelectedLeague('');
                    setSelectedAgeGroup('');
                    setTimeout(handleFilterChange, 100);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Radius Control (only shown when not using drawn area) */}
        {!useDrawnArea && (
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2">Search Radius:</Typography>
                  <Box sx={{ width: 150 }}>
                    <Slider
                      value={searchRadius}
                      onChange={(_, value) => handleRadiusChange(value as number)}
                      min={1}
                      max={100}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value}km`}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2">Map Zoom:</Typography>
                  <Box sx={{ width: 150 }}>
                    <Slider
                      value={mapZoom}
                      onChange={(_, value) => setMapZoom(value as number)}
                      min={6}
                      max={16}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  {drawingState.isActive 
                    ? 'Click on the map to start drawing a search area. Double-click to finish.'
                    : drawingState.mode === 'edit'
                    ? 'Edit mode: Drag the corners to adjust your search area'
                    : 'Click on the map to search different areas or draw a custom search area'
                  }
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        )}

        <Paper elevation={2}>
          <Map
            center={mapCenter}
            zoom={mapZoom}
            onMapLoad={handleMapLoad}
            style={{ height: '500px', width: '100%' }}
          >
            {renderMarkers()}
          </Map>
        </Paper>

        {/* Mobile-friendly results list that can be swiped */}
        {isMobile && (
          <Paper 
            elevation={3} 
            sx={{ 
              position: 'fixed', 
              bottom: showMobileResultsList ? 0 : -300, 
              left: 0, 
              right: 0, 
              transition: 'bottom 0.3s ease-in-out',
              zIndex: 1000,
              maxHeight: '60vh',
              overflow: 'hidden'
            }}
          >
            <Box 
              sx={{ 
                p: 1, 
                textAlign: 'center', 
                borderBottom: 1, 
                borderColor: 'divider',
                cursor: 'pointer'
              }}
              onClick={() => setShowMobileResultsList(!showMobileResultsList)}
            >
              <Typography variant="body2" color="text.secondary">
                {showMobileResultsList ? '📱 Swipe down to hide' : `📱 Swipe up to show ${results.length} results`}
              </Typography>
            </Box>
            {showMobileResultsList && (
              <Box sx={{ overflow: 'auto', maxHeight: 'calc(60vh - 48px)' }}>
                {results.map((result, index) => {
                  const resultId = `${result.type}_${index}`;
                  const isSelected = selectedResults.has(resultId);
                  return (
                    <Card key={resultId} sx={{ m: 1, border: isSelected ? 2 : 0, borderColor: 'primary.main' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box display="flex" alignItems="flex-start" gap={1}>
                          {isMultiSelectMode && (
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleResultSelection(resultId)}
                              size="large"
                            />
                          )}
                          <Box flex={1} onClick={() => !isMultiSelectMode && setSelectedResult(result)}>
                            <Typography variant="h6" component="h3" sx={{ fontSize: '1rem' }}>
                              {result.item.title}
                            </Typography>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                              <Chip
                                label={result.type === 'vacancy' ? 'Team' : 'Player'}
                                color={result.type === 'vacancy' ? 'primary' : 'secondary'}
                                size="small"
                              />
                              {result.distance && result.distance > 0 && (
                                <Typography variant="body2" color="primary">
                                  {formatDistance(result.distance)}
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                              {result.item.description.length > 60
                                ? `${result.item.description.substring(0, 60)}...`
                                : result.item.description}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Paper>
        )}

        <Box mt={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Search Results ({results.length})
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {selectedLeague && (
                <Chip
                  label={`League: ${selectedLeague}`}
                  size="small"
                  onDelete={() => {
                    setSelectedLeague('');
                    setTimeout(handleFilterChange, 100);
                  }}
                />
              )}
              {selectedAgeGroup && (
                <Chip
                  label={`Age: ${selectedAgeGroup}`}
                  size="small"
                  onDelete={() => {
                    setSelectedAgeGroup('');
                    setTimeout(handleFilterChange, 100);
                  }}
                />
              )}
              {useDrawnArea && (
                <Chip
                  label="Custom Area"
                  size="small"
                  color="primary"
                />
              )}
              {isMultiSelectMode && selectedResults.size > 0 && (
                <Chip
                  label={`${selectedResults.size} Selected`}
                  size="small"
                  color="success"
                  variant="filled"
                />
              )}
            </Box>
          </Box>
          <Grid container spacing={2}>
            {results.map((result, index) => {
              const resultId = `${result.type}_${index}`;
              const isSelected = selectedResults.has(resultId);
              return (
                <Grid item xs={12} md={6} key={`${result.type}-${result.item.id}-${index}`}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { elevation: 4 },
                      border: isSelected ? 2 : 0,
                      borderColor: 'primary.main',
                      position: 'relative'
                    }} 
                    onClick={() => !isMultiSelectMode ? setSelectedResult(result) : toggleResultSelection(resultId)}
                  >
                    <CardContent>
                      {isMultiSelectMode && (
                        <Box position="absolute" top={8} right={8}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleResultSelection(resultId)}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          />
                        </Box>
                      )}
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ pr: isMultiSelectMode ? 5 : 0 }}>
                        <Typography variant="h6" component="h3">
                          {result.item.title}
                        </Typography>
                        <Chip
                          label={result.type === 'vacancy' ? 'Team' : 'Player'}
                          color={result.type === 'vacancy' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {result.item.description.length > 100
                          ? `${result.item.description.substring(0, 100)}...`
                          : result.item.description}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">
                          {('position' in result.item ? result.item.position : result.item.positions?.join(', ') || 'N/A')} • {result.item.ageGroup}
                        </Typography>
                        {result.distance && result.distance > 0 ? (
                          <Typography variant="body2" color="primary">
                            {formatDistance(result.distance)}
                          </Typography>
                        ) : useDrawnArea ? (
                          <Typography variant="body2" color="secondary">
                            In Area
                          </Typography>
                        ) : null}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {renderSelectedItemDialog()}

        {/* Save Region Dialog */}
        <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
          <DialogTitle>Save Search Region</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Region Name"
              fullWidth
              variant="outlined"
              value={regionName}
              onChange={(e) => setRegionName(e.target.value)}
              placeholder="e.g., North London, City Center, etc."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button 
              onClick={saveCurrentRegion} 
              variant="contained"
              disabled={!regionName.trim()}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Saved Regions Menu */}
        <Menu
          anchorEl={regionsMenuAnchor}
          open={showRegionsMenu}
          onClose={() => setShowRegionsMenu(false)}
          PaperProps={{
            style: {
              maxHeight: 400,
              width: '300px',
            },
          }}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2">Saved Search Regions</Typography>
          </MenuItem>
          <Divider />
          {savedRegions.map((region) => (
            <MenuItem key={region.id} dense>
              <ListItemText
                primary={region.name}
                secondary={`Saved ${region.createdAt.toLocaleDateString()}`}
                onClick={() => loadSavedRegion(region)}
                style={{ cursor: 'pointer' }}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSavedRegion(region.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </MenuItem>
          ))}
          {savedRegions.length === 0 && (
            <MenuItem disabled>
              <Typography variant="body2" color="textSecondary">
                No saved regions yet
              </Typography>
            </MenuItem>
          )}
        </Menu>

        {/* Snackbar for feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Email Alert Dialog */}
        <Dialog 
          open={showAlertDialog} 
          onClose={() => setShowAlertDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Email Alerts</Typography>
              <IconButton onClick={() => setShowAlertDialog(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3}>
              {/* Create New Alert Section */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Create New Alert
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Get notified when new matches are found for your search criteria.
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      startIcon={<EmailIcon />}
                      onClick={() => createEmailAlert('new_match')}
                      variant="outlined"
                      fullWidth
                      disabled={!user}
                    >
                      Alert for Current Search
                    </Button>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {useDrawnArea ? 'Custom area' : `${searchRadius}km radius`}
                      {selectedLeague && ` • ${selectedLeague}`}
                      {selectedAgeGroup && ` • ${selectedAgeGroup}`}
                    </Typography>
                  </Grid>
                  
                  {drawnPolygon && (
                    <Grid item xs={12} sm={6}>
                      <Button
                        startIcon={<SaveIcon />}
                        onClick={() => createEmailAlert('saved_search')}
                        variant="outlined"
                        fullWidth
                        disabled={!user}
                      >
                        Alert for Saved Region
                      </Button>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Custom drawn area with current filters
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider />

              {/* Existing Alerts Section */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Your Active Alerts ({emailAlerts.filter(alert => alert.isActive).length})
                </Typography>
                
                {emailAlerts.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No email alerts created yet.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {emailAlerts.map((alert) => (
                      <Card key={alert.id} variant="outlined">
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box flex={1}>
                              <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Chip
                                  label={alert.alertType === 'new_match' ? 'Search Alert' : 'Region Alert'}
                                  size="small"
                                  color={alert.alertType === 'new_match' ? 'primary' : 'secondary'}
                                />
                                <Chip
                                  label={alert.isActive ? 'Active' : 'Inactive'}
                                  size="small"
                                  color={alert.isActive ? 'success' : 'default'}
                                />
                              </Box>
                              
                              <Typography variant="body2" color="textSecondary">
                                {alert.searchRegion ? (
                                  <>Custom region: {alert.searchRegion.name}</>
                                ) : (
                                  <>
                                    {alert.filters?.radius ? `${alert.filters.radius}km radius` : 'Location-based search'}
                                    {alert.filters?.league && ` • ${alert.filters.league}`}
                                    {alert.filters?.ageGroup && ` • ${alert.filters.ageGroup}`}
                                  </>
                                )}
                              </Typography>
                              
                              <Typography variant="caption" color="textSecondary">
                                Created: {new Date(alert.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                            
                            <Box display="flex" gap={1}>
                              <Switch
                                checked={alert.isActive}
                                onChange={(e) => toggleEmailAlert(alert.id, e.target.checked)}
                                size="small"
                              />
                              <IconButton
                                onClick={() => deleteEmailAlert(alert.id)}
                                size="small"
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAlertDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Contact Dialog */}
        <Dialog 
          open={showBulkContactDialog} 
          onClose={() => setShowBulkContactDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Contact Multiple {selectedResults.size > 0 && Array.from(selectedResults).some(id => id.startsWith('vacancy')) ? 'Teams' : 'Players'}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Send a message to {selectedResults.size} selected {selectedResults.size === 1 ? 'contact' : 'contacts'}
            </Typography>
            
            <TextField
              fullWidth
              label="Subject"
              value={bulkContactForm.subject}
              onChange={(e) => setBulkContactForm(prev => ({ ...prev, subject: e.target.value }))}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={6}
              value={bulkContactForm.message}
              onChange={(e) => setBulkContactForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Introduce yourself and explain your interest..."
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Selected contacts:
              </Typography>
              {getSelectedResultsData().slice(0, 3).map((result, index) => (
                <Typography key={index} variant="body2">
                  • {result.item.title} ({result.type === 'vacancy' ? 'Team' : 'Player'})
                </Typography>
              ))}
              {selectedResults.size > 3 && (
                <Typography variant="body2" color="text.secondary">
                  ... and {selectedResults.size - 3} more
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBulkContactDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkContact}
              variant="contained"
              disabled={!bulkContactForm.subject.trim() || !bulkContactForm.message.trim()}
            >
              Send Messages ({selectedResults.size})
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </GoogleMapsWrapper>
  );
};

export default MapSearch;
