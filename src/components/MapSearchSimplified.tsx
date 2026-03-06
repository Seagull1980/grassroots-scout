import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Checkbox,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  Slider,
  FormControlLabel,
  Switch,
  Tooltip,
  Divider
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Message as MessageIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  AutoAwesome as RecommendIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { analyticsTracking } from '../services/analyticsTracking';
const UK_CENTER = { lat: 54.0, lng: -2.5 };

type SortMode = 'relevance' | 'distance' | 'age' | 'recent';

interface SavedMapSearch {
  id: string;
  name: string;
  searchType: 'vacancies' | 'players' | 'both';
  center: google.maps.LatLngLiteral;
  zoom: number;
  radiusKm: number;
  ageGroup: string;
  positions: string[];
  sortBy: SortMode;
  createdAt: string;
}

interface MapSearchSimplifiedProps {
  searchType: 'vacancies' | 'players' | 'both';
}

const getInitialMapCenter = (): google.maps.LatLngLiteral => {
  if (typeof window === 'undefined') return UK_CENTER;

  const savedMapCenter = localStorage.getItem('mapCenter');
  const legacySearchLocation = localStorage.getItem('mapSearchLocation');

  const parseCenter = (value: string | null): google.maps.LatLngLiteral | null => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      if (
        typeof parsed?.lat === 'number' &&
        typeof parsed?.lng === 'number' &&
        parsed.lat >= -90 &&
        parsed.lat <= 90 &&
        parsed.lng >= -180 &&
        parsed.lng <= 180
      ) {
        return { lat: parsed.lat, lng: parsed.lng };
      }
      return null;
    } catch {
      return null;
    }
  };

  return parseCenter(savedMapCenter) ?? parseCenter(legacySearchLocation) ?? UK_CENTER;
};

const getInitialMapZoom = (): number => {
  if (typeof window === 'undefined') return 8;
  const savedMapZoom = localStorage.getItem('mapZoom');
  const zoom = savedMapZoom ? parseInt(savedMapZoom, 10) : NaN;
  return !isNaN(zoom) && zoom >= 3 && zoom <= 20 ? zoom : 8;
};

const getRecentStatus = (createdAt?: string): 'New' | 'Active' | 'Open' => {
  if (!createdAt) return 'Open';
  const createdTime = new Date(createdAt).getTime();
  if (!isFinite(createdTime)) return 'Open';
  const ageMs = Date.now() - createdTime;
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return 'New';
  if (ageMs <= 30 * 24 * 60 * 60 * 1000) return 'Active';
  return 'Open';
};

const getItemDateValue = (item: any): number => {
  const source = item.updatedAt || item.createdAt || item.datePosted || item.postedAt;
  const parsed = source ? new Date(source).getTime() : NaN;
  return isNaN(parsed) ? 0 : parsed;
};

const MapSearchSimplified: React.FC<MapSearchSimplifiedProps> = ({ searchType }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markerByKeyRef = useRef<Record<string, google.maps.Marker>>({});
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const mapIdleListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const radiusCircleRef = useRef<google.maps.Circle | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const mapOpenTrackedRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [hasActiveFilter, setHasActiveFilter] = useState(false);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortMode>('relevance');
  const [radiusKm, setRadiusKm] = useState<number>(() => {
    const raw = localStorage.getItem('mapSearchRadiusKm');
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return !isNaN(parsed) && parsed >= 5 && parsed <= 100 ? parsed : 25;
  });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedMapSearch[]>(() => {
    try {
      const raw = localStorage.getItem('savedMapSearches');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [selectedSavedSearchId, setSelectedSavedSearchId] = useState<string>('');
  const [savedSearchName, setSavedSearchName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => localStorage.getItem('mapOnboardingDismissed') !== 'true');
  const [clusteredHiddenCount, setClusteredHiddenCount] = useState(0);
  const [selectedResultKey, setSelectedResultKey] = useState<string | null>(null);
  const [mapCenter] = useState<google.maps.LatLngLiteral>(() => getInitialMapCenter());
  const [mapZoom] = useState(() => getInitialMapZoom());
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, {
    id: string;
    name: string;
    relatedVacancyId?: string;
    relatedPlayerAvailabilityId?: string;
    messageType: string;
    context: string;
  }>>({});
  
  // Filter options
  const ageGroups = [
    'U6', 'U7', 'U8', 'U9', 'U10',
    'U11', 'U12', 'U13', 'U14', 'U15', 'U16',
    'U17', 'U18', 'U19', 'U20', 'U21',
    'Adult (18+)', 'Veterans (35+)'
  ];

  const positions = [
    'Goalkeeper', 'Right-back', 'Left-back', 'Centre-back', 'Full-back', 'Wing-back',
    'Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder',
    'Right Winger', 'Left Winger', 'Winger', 'Striker', 'Defender', 'Midfielder', 'Attacker'
  ];

  // Position hierarchy mapping - generic positions to specific positions
  const positionHierarchy: { [key: string]: string[] } = {
    'defender': ['right-back', 'left-back', 'centre-back', 'center-back', 'full-back', 'wing-back', 'right back', 'left back', 'centre back', 'center back', 'defender'],
    'midfielder': ['defensive midfielder', 'central midfielder', 'attacking midfielder', 'midfielder'],
    'attacker': ['striker', 'right winger', 'left winger', 'winger', 'forward', 'attacker']
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedRadius = parseInt(params.get('radiusKm') || '', 10);
    const sharedAgeGroup = params.get('ageGroup') || '';
    const sharedPositions = params.get('positions') || '';
    const sharedSort = params.get('sortBy') as SortMode | null;

    if (!isNaN(sharedRadius) && sharedRadius >= 5 && sharedRadius <= 100) {
      setRadiusKm(sharedRadius);
    }
    if (sharedAgeGroup) {
      setSelectedAgeGroup(sharedAgeGroup);
    }
    if (sharedPositions) {
      setSelectedPositions(sharedPositions.split('|').filter(Boolean));
    }
    if (sharedSort && ['relevance', 'distance', 'age', 'recent'].includes(sharedSort)) {
      setSortBy(sharedSort);
    }
  }, []);

  const getMapCenter = (): google.maps.LatLngLiteral => {
    const center = mapInstanceRef.current?.getCenter();
    if (!center) return mapCenter;
    return { lat: center.lat(), lng: center.lng() };
  };

  const toDistanceKm = (origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral): number | null => {
    if (!window.google?.maps?.geometry?.spherical?.computeDistanceBetween || !window.google?.maps?.LatLng) {
      return null;
    }
    const from = new window.google.maps.LatLng(origin.lat, origin.lng);
    const to = new window.google.maps.LatLng(destination.lat, destination.lng);
    const meters = window.google.maps.geometry.spherical.computeDistanceBetween(from, to);
    return meters / 1000;
  };

  const resolveResultPosition = (result: any): google.maps.LatLngLiteral | null => {
    if (result.locationData) {
      return { lat: result.locationData.latitude, lng: result.locationData.longitude };
    }
    if (result.trainingLocationData) {
      return { lat: result.trainingLocationData.latitude, lng: result.trainingLocationData.longitude };
    }
    if (result.matchLocationData) {
      return { lat: result.matchLocationData.latitude, lng: result.matchLocationData.longitude };
    }
    return null;
  };

  const getDistanceText = (result: any): string => {
    const pos = resolveResultPosition(result);
    if (!pos) return 'N/A';
    const distance = toDistanceKm(getMapCenter(), pos);
    if (distance === null) return 'N/A';
    return `${distance.toFixed(1)} km`;
  };

  const sortResults = (items: any[]): any[] => {
    const cloned = [...items];
    if (sortBy === 'relevance') return cloned;

    if (sortBy === 'recent') {
      return cloned.sort((a, b) => getItemDateValue(b) - getItemDateValue(a));
    }

    if (sortBy === 'age') {
      return cloned.sort((a, b) => (a.ageGroup || '').localeCompare(b.ageGroup || ''));
    }

    if (sortBy === 'distance') {
      const center = getMapCenter();
      return cloned.sort((a, b) => {
        const aPos = resolveResultPosition(a);
        const bPos = resolveResultPosition(b);
        if (!aPos && !bPos) return 0;
        if (!aPos) return 1;
        if (!bPos) return -1;
        const aDistance = toDistanceKm(center, aPos) ?? Number.MAX_SAFE_INTEGER;
        const bDistance = toDistanceKm(center, bPos) ?? Number.MAX_SAFE_INTEGER;
        return aDistance - bDistance;
      });
    }

    return cloned;
  };

  const saveSearchesToStorage = (nextSearches: SavedMapSearch[]) => {
    setSavedSearches(nextSearches);
    localStorage.setItem('savedMapSearches', JSON.stringify(nextSearches));
  };

  const handleSaveSearch = () => {
    const name = savedSearchName.trim() || `Search ${new Date().toLocaleDateString()}`;
    const payload: SavedMapSearch = {
      id: `${Date.now()}`,
      name,
      searchType,
      center: getMapCenter(),
      zoom: mapInstanceRef.current?.getZoom() || mapZoom,
      radiusKm,
      ageGroup: selectedAgeGroup,
      positions: selectedPositions,
      sortBy,
      createdAt: new Date().toISOString()
    };
    const next = [payload, ...savedSearches].slice(0, 20);
    saveSearchesToStorage(next);
    setSelectedSavedSearchId(payload.id);
    setSavedSearchName('');
    analyticsTracking.track('map_search_saved', {
      category: 'Map',
      action: 'save_search',
      label: payload.name,
      searchType
    });
  };

  const applySavedSearch = (searchId: string) => {
    setSelectedSavedSearchId(searchId);
    const match = savedSearches.find(item => item.id === searchId);
    if (!match || match.searchType !== searchType || !mapInstanceRef.current) return;
    mapInstanceRef.current.setCenter(match.center);
    mapInstanceRef.current.setZoom(match.zoom);
    setRadiusKm(match.radiusKm);
    setSelectedAgeGroup(match.ageGroup);
    setSelectedPositions(match.positions || []);
    setSortBy(match.sortBy || 'relevance');
    analyticsTracking.track('map_search_loaded', {
      category: 'Map',
      action: 'load_search',
      label: match.name,
      searchType
    });
  };

  const handleShareSearch = async () => {
    const center = getMapCenter();
    const url = new URL(window.location.href);
    url.searchParams.set('mapLat', center.lat.toFixed(5));
    url.searchParams.set('mapLng', center.lng.toFixed(5));
    url.searchParams.set('mapZoom', String(mapInstanceRef.current?.getZoom() || mapZoom));
    url.searchParams.set('radiusKm', String(radiusKm));
    url.searchParams.set('ageGroup', selectedAgeGroup || '');
    url.searchParams.set('positions', selectedPositions.join('|'));
    url.searchParams.set('sortBy', sortBy);
    await navigator.clipboard.writeText(url.toString());
    analyticsTracking.track('map_search_shared', {
      category: 'Map',
      action: 'share_search',
      searchType
    });
  };

  const handleExportResults = () => {
    if (!filteredResults.length) return;
    const rows = filteredResults.map(result => ({
      name: result.teamName || result.title || result.fullName || result.name || '',
      type: result.itemType === 'player' ? 'Player' : 'Team',
      ageGroup: result.ageGroup || '',
      position: Array.isArray(result.positions) ? result.positions.join('; ') : (result.preferredPosition || result.position || ''),
      location: result.location || '',
      league: result.league || (Array.isArray(result.preferredLeagues) ? result.preferredLeagues.join('; ') : result.preferredLeagues || ''),
      distance: getDistanceText(result),
      status: getRecentStatus(result.createdAt)
    }));
    const headers = Object.keys(rows[0]);
    const csvBody = rows
      .map(row => headers.map(header => `"${String((row as any)[header] ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const csv = `${headers.join(',')}\n${csvBody}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `map-results-${searchType}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    analyticsTracking.track('map_results_exported', {
      category: 'Map',
      action: 'export_results',
      value: rows.length,
      searchType
    });
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    if (!window.google?.maps?.Map) {
      console.warn('Google Maps API not available yet');
      return;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      clickableIcons: false
    });

    mapInstanceRef.current = map;

    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('mapLat') || '');
    const lng = parseFloat(params.get('mapLng') || '');
    const zoomParam = parseInt(params.get('mapZoom') || '', 10);
    if (!isNaN(lat) && !isNaN(lng)) {
      map.setCenter({ lat, lng });
    }
    if (!isNaN(zoomParam)) {
      map.setZoom(zoomParam);
    }

    if (!mapOpenTrackedRef.current) {
      analyticsTracking.track('map_opened', {
        category: 'Map',
        action: 'open_map',
        label: searchType
      });
      mapOpenTrackedRef.current = true;
    }
    
    // Save map position when user moves or zooms
    map.addListener('idle', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (center && zoom) {
        const newCenter = { lat: center.lat(), lng: center.lng() };
        localStorage.setItem('mapCenter', JSON.stringify(newCenter));
        localStorage.setItem('mapZoom', zoom.toString());
      }
    });

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (mapIdleListenerRef.current) {
        window.google?.maps?.event?.removeListener(mapIdleListenerRef.current);
      }
    };
  }, []);

  // Viewport-based filtering: keep search area aligned to current visible map bounds
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.event) return;

    if (mapIdleListenerRef.current) {
      window.google.maps.event.removeListener(mapIdleListenerRef.current);
      mapIdleListenerRef.current = null;
    }

    mapIdleListenerRef.current = mapInstanceRef.current.addListener('idle', () => {
      const bounds = mapInstanceRef.current?.getBounds();
      const inView = filterResultsByMapArea(results, bounds);
      const finalFiltered = sortResults(applyAdditionalFilters(inView));
      setFilteredResults(finalFiltered);
      setHasActiveFilter(true);
    });

    // Run once immediately when mode turns on/results change
    const initialBounds = mapInstanceRef.current.getBounds();
    const inView = filterResultsByMapArea(results, initialBounds);
    const finalFiltered = sortResults(applyAdditionalFilters(inView));
    setFilteredResults(finalFiltered);
    setHasActiveFilter(true);

    return () => {
      if (mapIdleListenerRef.current) {
        window.google.maps.event.removeListener(mapIdleListenerRef.current);
        mapIdleListenerRef.current = null;
      }
    };
  }, [results, selectedAgeGroup, selectedPositions, radiusKm, sortBy]);

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
              return { type: 'player', items: data.availability || [] };
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

  // Re-apply filters when age group or position selections change
  useEffect(() => {
    // Get the base filtered results (viewport)
    let baseFiltered: any[] = [];
    let shouldActivate = false;

    if (mapInstanceRef.current?.getBounds()) {
      // Default viewport search
      baseFiltered = filterResultsByMapArea(results, mapInstanceRef.current.getBounds());
      shouldActivate = true;
    } else {
      // No map bounds yet, don't update
      return;
    }

    // Apply additional filters
    const finalFiltered = sortResults(applyAdditionalFilters(baseFiltered));
    setFilteredResults(finalFiltered);
    
    // Set hasActiveFilter to true if we have any filters
    if (shouldActivate) {
      setHasActiveFilter(true);
    }
  }, [selectedAgeGroup, selectedPositions, results, radiusKm, sortBy]);

  useEffect(() => {
    localStorage.setItem('mapSearchRadiusKm', String(radiusKm));

    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps?.Circle) return;

    const center = map.getCenter();
    if (!center) return;

    const circleCenter = { lat: center.lat(), lng: center.lng() };
    if (!radiusCircleRef.current) {
      radiusCircleRef.current = new window.google.maps.Circle({
        map,
        center: circleCenter,
        radius: radiusKm * 1000,
        fillColor: '#1976d2',
        fillOpacity: 0.08,
        strokeColor: '#1976d2',
        strokeWeight: 2,
        clickable: false
      });
    } else {
      radiusCircleRef.current.setCenter(circleCenter);
      radiusCircleRef.current.setRadius(radiusKm * 1000);
      radiusCircleRef.current.setMap(map);
    }
  }, [radiusKm, filteredResults.length]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!showHeatmap) {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
      return;
    }

    if (!window.google?.maps?.visualization?.HeatmapLayer || !window.google?.maps?.LatLng) return;

    const heatmapData = filteredResults
      .map(item => getResultPosition(item))
      .filter((pos): pos is google.maps.LatLngLiteral => Boolean(pos))
      .map(pos => new window.google.maps.LatLng(pos.lat, pos.lng));

    if (!heatmapRef.current) {
      heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        radius: 22,
        opacity: 0.55
      });
    } else {
      heatmapRef.current.setData(heatmapData);
    }
    heatmapRef.current.setMap(map);
  }, [showHeatmap, filteredResults]);

  // Render markers when results change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.Marker) return;

    // Only show markers if there's an active filter (radius or drawing)
    const displayResults = hasActiveFilter ? filteredResults : [];
    const currentZoom = mapInstanceRef.current.getZoom() || 8;
    const isClusteredMode = currentZoom < 9 && displayResults.length > 120;
    const markerResults = isClusteredMode ? displayResults.slice(0, 120) : displayResults;
    setClusteredHiddenCount(isClusteredMode ? Math.max(0, displayResults.length - markerResults.length) : 0);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    markerByKeyRef.current = {};

    // Create info window if it doesn't exist
    if (!infoWindowRef.current && window.google?.maps?.InfoWindow) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    // Create new markers
    markerResults.forEach((result, index) => {
      const position = getResultPosition(result);
      const resultKey = getResultKey(result);
      
      if (!position || !isFinite(position.lat) || !isFinite(position.lng)) return;

      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current as google.maps.Map,
        title: result.teamName || result.title || result.fullName || result.name || 'Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: result.itemType === 'player' ? '#1e88e5' : '#d32f2f',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8
        },
        label: {
          text: String(index + 1),
          color: '#ffffff',
          fontWeight: '700'
        },
        optimized: false,
        visible: true
      });

      // Create info window content
      const createInfoContent = (item: any, markerIndex: number) => {
        const title = item.teamName || item.title || item.fullName || item.name || 'Location';
        const type = item.itemType === 'player' ? 'Player' : 'Team';
        const markerColor = item.itemType === 'player' ? '#2196f3' : '#f44336';
        const ageGroup = item.ageGroup ? `<br><strong>Age:</strong> ${item.ageGroup}` : '';
        
        // Use positions array from backend
        let positionStr = '';
        if (item.positions && Array.isArray(item.positions) && item.positions.length > 0) {
          positionStr = `<br><strong>Position:</strong> ${item.positions.join(', ')}`;
        } else if (item.preferredPosition) {
          positionStr = `<br><strong>Position:</strong> ${item.preferredPosition}`;
        }
        
        const league = item.league || (item.preferredLeagues && Array.isArray(item.preferredLeagues) ? item.preferredLeagues.join(', ') : '') || '';
        const leagueStr = league ? `<br><strong>League:</strong> ${league}` : '';
        const location = item.location ? `<br><strong>Location:</strong> ${item.location}` : '';
        const distance = getDistanceText(item);
        const distanceStr = distance !== 'N/A' ? `<br><strong>Distance:</strong> ${distance}` : '';
        const status = getRecentStatus(item.createdAt);
        const statusColor = status === 'New' ? '#2e7d32' : status === 'Active' ? '#0288d1' : '#6d6d6d';
        
        // Add preferred team gender for players
        const preferredGenderStr = item.preferredTeamGender && item.itemType === 'player' 
          ? `<br><strong>Preferred Team:</strong> ${item.preferredTeamGender}` 
          : '';
        
        // Add description/bio text (truncate if too long)
        const description = item.description || '';
        const descriptionStr = description 
          ? `<div style="
              margin-top: 8px;
              padding: 8px;
              background-color: #f9f9f9;
              border-left: 3px solid ${markerColor};
              border-radius: 4px;
              font-size: 13px;
              color: #555;
              line-height: 1.4;
              max-width: 280px;
            ">
              ${description.length > 200 ? description.substring(0, 200) + '...' : description}
            </div>` 
          : '';
        
        // Check if messaging is available for this item
        const recipient = getMessageRecipient(item);
        const messageButton = recipient && type === 'Player' ? `
          <button 
            id="map-message-btn-${getResultKey(item)}"
            style="
              margin-top: 8px;
              padding: 6px 12px;
              background-color: #1976d2;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 4px;
            "
            onmouseover="this.style.backgroundColor='#1565c0'"
            onmouseout="this.style.backgroundColor='#1976d2'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            Message
          </button>
        ` : '';
        
        return `
          <div 
            id="map-info-content-${getResultKey(item)}"
            style="
              padding: 8px; 
              min-width: 220px;
              cursor: pointer;
            "
            onmouseover="this.style.backgroundColor='#f5f5f5'"
            onmouseout="this.style.backgroundColor='transparent'"
          >
            <div style="
              display: flex; 
              align-items: center; 
              gap: 8px; 
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 2px solid ${markerColor};
            ">
              <div style="
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background-color: ${markerColor};
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 14px;
              ">
                ${markerIndex}
              </div>
              <h3 style="margin: 0; color: #1976d2; font-size: 16px; flex: 1;">${title}</h3>
            </div>
            <p style="margin: 4px 0 4px 8px; color: #666; font-size: 14px;">
              <strong>Type:</strong> ${type}
              ${ageGroup}
              ${positionStr}
              ${leagueStr}
              ${location}
              ${distanceStr}
              ${preferredGenderStr}
            </p>
            <div style="margin-left: 8px; margin-top: 6px;">
              <span style="
                display: inline-block;
                padding: 2px 8px;
                border-radius: 9999px;
                font-size: 12px;
                background-color: ${statusColor};
                color: white;
              ">${status}</span>
            </div>
            ${descriptionStr}
            <p style="
              margin: 8px 0 0 8px; 
              font-size: 12px; 
              color: #999;
              font-style: italic;
            ">
              Click to view in table below
            </p>
            ${messageButton}
          </div>
        `;
      };

      marker.addListener('click', () => {
        analyticsTracking.track('map_marker_clicked', {
          category: 'Map',
          action: 'marker_click',
          label: result.itemType || 'item',
          searchType
        });
        setSelectedItem(result);
        setSelectedResultKey(resultKey);
        rowRefs.current[resultKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (infoWindowRef.current && mapInstanceRef.current) {
          infoWindowRef.current.setContent(createInfoContent(result, index + 1));
          infoWindowRef.current.open(mapInstanceRef.current, marker);
          
          // Add event listeners when info window is ready
          window.google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
            // Message button handler
            const messageBtn = document.getElementById(`map-message-btn-${resultKey}`);
            if (messageBtn) {
              messageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const recipient = getMessageRecipient(result);
                if (recipient) {
                  analyticsTracking.track('map_message_clicked', {
                    category: 'Map',
                    action: 'message_from_result',
                    label: 'info_window',
                    searchType
                  });
                  navigate('/messages', { 
                    state: { 
                      recipientId: recipient.id,
                      recipientName: recipient.name
                    } 
                  });
                }
              });
            }
            
            // Info window content click handler to highlight table row
            const infoContent = document.getElementById(`map-info-content-${resultKey}`);
            if (infoContent) {
              infoContent.addEventListener('click', () => {
                setSelectedResultKey(resultKey);
                rowRefs.current[resultKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
            }
          });
        }
      });

      markersRef.current.push(marker);
      markerByKeyRef.current[resultKey] = marker;
    });

  }, [results, filteredResults, hasActiveFilter]);

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
      mapInstanceRef.current.setCenter(mapCenter);
      mapInstanceRef.current.setZoom(mapZoom);
    }
    // Reset filter selections only
    handleClearAll();
  };

  const handleClearAll = () => {
    setSelectedAgeGroup('');
    setSelectedPositions([]);
    setSortBy('relevance');
  };

  useEffect(() => {
    const visibleKeys = new Set(filteredResults.map(result => getResultKey(result)));
    setSelectedRecipients(prev => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([key]) => visibleKeys.has(key))
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [filteredResults]);

  const handleToggleRecipientSelection = (result: any) => {
    const resultKey = getResultKey(result);
    const recipient = getMessageRecipient(result);
    if (!recipient) return;

    const isTeamTarget = result.itemType === 'team';

    setSelectedRecipients(prev => {
      if (prev[resultKey]) {
        const { [resultKey]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [resultKey]: {
          id: recipient.id,
          name: recipient.name,
          relatedPlayerAvailabilityId: !isTeamTarget && result.id ? String(result.id) : undefined,
          relatedVacancyId: isTeamTarget && result.id ? String(result.id) : undefined,
          messageType: isTeamTarget ? 'vacancy_interest' : 'availability_interest',
          context: result.title || (isTeamTarget ? 'team advert' : 'player advert')
        }
      };
    });
  };

  const handleMessageSelected = () => {
    const recipients = Object.values(selectedRecipients);
    if (!recipients.length) return;

    const teamCount = recipients.filter(r => r.relatedVacancyId).length;

    analyticsTracking.track('map_message_clicked', {
      category: 'Map',
      action: 'message_from_result',
      label: 'bulk',
      value: recipients.length,
      searchType
    });

    navigate('/messages', {
      state: {
        bulkRecipients: recipients,
        context: teamCount > 0 ? 'team adverts' : 'player adverts'
      }
    });
  };

  const isBulkMessagingEnabled = user?.role === 'Coach' || user?.role === 'Player' || user?.role === 'Parent/Guardian';
  const canBulkMessageResult = (result: any) => {
    if (!isBulkMessagingEnabled) return false;
    if (user?.role === 'Coach') return result.itemType === 'player';
    return result.itemType === 'team';
  };
  const hasBulkEligibleResults = filteredResults.some(canBulkMessageResult);
  const selectedCount = Object.keys(selectedRecipients).length;
  const selectedTeamCount = Object.values(selectedRecipients).filter(r => r.relatedVacancyId).length;
  const selectedTypeLabel = selectedTeamCount > 0 ? 'team' : 'player';
  const recommendations = sortResults(results)
    .filter(item => {
      if (searchType === 'players') return item.itemType === 'player';
      if (searchType === 'vacancies') return item.itemType === 'vacancy' || item.itemType === 'team';
      return true;
    })
    .slice(0, 3);

  // Apply additional filters (age group and position)
  const applyAdditionalFilters = (results: any[]) => {
    let filtered = [...results];

    // Filter by age group
    if (selectedAgeGroup) {
      filtered = filtered.filter(result => {
        const ageGroup = result.ageGroup || '';
        return ageGroup.toLowerCase().includes(selectedAgeGroup.toLowerCase()) ||
               selectedAgeGroup.toLowerCase().includes(ageGroup.toLowerCase());
      });
    }

    // Filter by positions
    if (selectedPositions.length > 0) {
      filtered = filtered.filter(result => {
        // Use positions array from backend API response
        let resultPositions: string[] = result.positions || [];
        
        // Fallback to parsing if needed
        if (resultPositions.length === 0 && result.position) {
          if (typeof result.position === 'string') {
            try {
              const parsed = JSON.parse(result.position);
              resultPositions = Array.isArray(parsed) ? parsed : [result.position];
            } catch {
              resultPositions = [result.position];
            }
          } else if (Array.isArray(result.position)) {
            resultPositions = result.position;
          }
        }
        
        if (result.preferredPosition && resultPositions.length === 0) {
          resultPositions = [result.preferredPosition];
        }

        // Check if any of the result's positions match any selected positions
        return selectedPositions.some(selectedPos => {
          const selectedLower = selectedPos.toLowerCase();
          
          // Check for specific hierarchy matches
          const hierarchyMatches = positionHierarchy[selectedLower];
          
          return resultPositions.some(resultPos => {
            const resultLower = resultPos.toLowerCase();
            
            // Direct match (including partial matches)
            if (resultLower.includes(selectedLower) || selectedLower.includes(resultLower)) {
              return true;
            }
            
            // Hierarchical match - if selected position is generic (e.g., "Midfielder"),
            // check if result is a specific variant (e.g., "Central Midfielder")
            if (hierarchyMatches) {
              return hierarchyMatches.some(specificPos => {
                const specificLower = specificPos.toLowerCase();
                return resultLower.includes(specificLower) || specificLower.includes(resultLower);
              });
            }
            
            return false;
          });
        });
      });
    }

    return filtered;
  };

  const getResultPosition = (result: any): google.maps.LatLngLiteral | null => {
    return resolveResultPosition(result);
  };

  const filterResultsByBounds = (items: any[], bounds: google.maps.LatLngBounds | null | undefined) => {
    if (!bounds || !window.google?.maps?.LatLng) return items;

    return items.filter(result => {
      const position = getResultPosition(result);
      if (!position) return false;
      const latLng = new window.google.maps.LatLng(position.lat, position.lng);
      return bounds.contains(latLng);
    });
  };

  const filterResultsByMapArea = (items: any[], bounds: google.maps.LatLngBounds | null | undefined) => {
    const inBounds = filterResultsByBounds(items, bounds);
    const center = getMapCenter();
    if (!window.google?.maps?.geometry?.spherical?.computeDistanceBetween || !window.google?.maps?.LatLng) {
      return inBounds;
    }

    return inBounds.filter(result => {
      const position = getResultPosition(result);
      if (!position) return false;
      const from = new window.google.maps.LatLng(center.lat, center.lng);
      const to = new window.google.maps.LatLng(position.lat, position.lng);
      const distanceMeters = window.google.maps.geometry.spherical.computeDistanceBetween(from, to);
      return distanceMeters <= radiusKm * 1000;
    });
  };

  const getResultKey = (result: any): string => {
    const pos = getResultPosition(result);
    return [
      result.itemType || 'item',
      result.id ?? result.availabilityId ?? result.postId ?? result.playerAvailabilityId ?? result.title ?? result.name ?? 'unknown',
      pos?.lat ?? 'no-lat',
      pos?.lng ?? 'no-lng'
    ].join('-');
  };

  const getMessageRecipient = (result: any): { id: string; name: string } | null => {
    const candidateValues = [
      result.parentId,
      result.parentid,
      result.postedBy,
      result.postedby,
      result.userId,
      result.userid,
      result.createdBy,
      result.createdby,
      result.playerId,
      result.playerid
    ];

    const rawId = candidateValues.find(value => value !== null && value !== undefined && String(value).trim() !== '');
    if (rawId === undefined) return null;

    const idString = String(rawId);
    const numericMatch = idString.match(/\d+$/);
    const normalizedId = numericMatch ? numericMatch[0] : idString;

    if (!normalizedId || normalizedId.toLowerCase() === 'undefined' || normalizedId.toLowerCase() === 'null') {
      return null;
    }

    return {
      id: normalizedId,
      name: result.parentName || result.fullName || result.name || result.title || 'Player/Guardian'
    };
  };

  return (
    <Box>
      {/* Control Panel */}
      <Paper elevation={2} sx={{ p: 1.5, mb: 1 }}>
        <Stack spacing={1}>
          {showOnboarding && (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setShowOnboarding(false);
                    localStorage.setItem('mapOnboardingDismissed', 'true');
                  }}
                >
                  Dismiss
                </Button>
              }
            >
              Drag the map, zoom to your area, and use filters. Results update by visible area and radius.
            </Alert>
          )}

          {/* Top Controls Row */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              icon={searchType === 'vacancies' ? <GroupsIcon /> : <PersonIcon />}
              label={hasActiveFilter ? `${filteredResults.length} in map area` : `${results.length} total`}
              color={hasActiveFilter ? 'success' : 'default'}
              variant="outlined"
              size="small"
            />

            <Chip
              label={`Radius ${radiusKm} km`}
              color="primary"
              variant="outlined"
              size="small"
            />
            
            {(selectedAgeGroup || selectedPositions.length > 0) && (
              <Button
                size="small"
                onClick={handleClearAll}
                variant="outlined"
                color="warning"
              >
                Clear Filters
              </Button>
            )}
            
            <Button
              onClick={handleRecenter}
              variant="outlined"
              size="small"
            >
              Reset
            </Button>

            <Tooltip title="Save current map, filters, radius and sort">
              <Button size="small" startIcon={<SaveIcon />} variant="outlined" onClick={handleSaveSearch}>
                Save Search
              </Button>
            </Tooltip>

            <Tooltip title="Copy shareable search link">
              <Button size="small" startIcon={<ShareIcon />} variant="outlined" onClick={handleShareSearch}>
                Share
              </Button>
            </Tooltip>

            <Tooltip title="Export visible results to CSV">
              <Button size="small" startIcon={<DownloadIcon />} variant="outlined" onClick={handleExportResults}>
                Export
              </Button>
            </Tooltip>

            {isLoading && <CircularProgress size={20} />}
          </Stack>

          {/* Legend */}
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Blue = Player | Red = Team | Circle = search radius | Toggle heatmap for density view
            </Typography>
          </Stack>

          {clusteredHiddenCount > 0 && (
            <Alert severity="info" sx={{ py: 0 }}>
              Showing a clustered view. Zoom in to reveal {clusteredHiddenCount} additional markers.
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              size="small"
              label="Saved search name"
              value={savedSearchName}
              onChange={(e) => setSavedSearchName(e.target.value)}
              sx={{ minWidth: { md: 220 } }}
            />
            <FormControl size="small" sx={{ minWidth: { md: 260 } }}>
              <InputLabel>Load Saved Search</InputLabel>
              <Select
                value={selectedSavedSearchId}
                label="Load Saved Search"
                onChange={(e) => applySavedSearch(String(e.target.value))}
              >
                <MenuItem value=""><em>Select saved search</em></MenuItem>
                {savedSearches
                  .filter(item => item.searchType === searchType)
                  .map(item => (
                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { md: 170 } }}>
              <InputLabel>Sort Results</InputLabel>
              <Select
                value={sortBy}
                label="Sort Results"
                onChange={(e) => {
                  const next = e.target.value as SortMode;
                  setSortBy(next);
                  analyticsTracking.track('map_sort_changed', {
                    category: 'Map',
                    action: 'sort_change',
                    label: next,
                    searchType
                  });
                }}
              >
                <MenuItem value="relevance">Relevance</MenuItem>
                <MenuItem value="distance">Distance</MenuItem>
                <MenuItem value="age">Age Group</MenuItem>
                <MenuItem value="recent">Most Recent</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} size="small" />}
              label="Heatmap"
            />
          </Stack>

          <Box sx={{ px: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Search radius: {radiusKm} km
            </Typography>
            <Slider
              min={5}
              max={100}
              step={5}
              marks
              value={radiusKm}
              onChange={(_, value) => setRadiusKm(value as number)}
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>

          {/* Age Group and Position Filters */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            <FormControl size="small" sx={{ minWidth: { sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel>Age Group</InputLabel>
              <Select
                value={selectedAgeGroup}
                onChange={(e) => {
                  setSelectedAgeGroup(e.target.value);
                  analyticsTracking.track('map_filter_applied', {
                    category: 'Map',
                    action: 'age_filter',
                    label: e.target.value || 'all',
                    searchType
                  });
                }}
                label="Age Group"
              >
                <MenuItem value=""><em>All Age Groups</em></MenuItem>
                {ageGroups.map((age) => (
                  <MenuItem key={age} value={age}>{age}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: { sm: 250 }, width: { xs: '100%', sm: 'auto' } }}
              options={positions}
              value={selectedPositions}
              onChange={(_, newValue) => {
                setSelectedPositions(newValue);
                analyticsTracking.track('map_filter_applied', {
                  category: 'Map',
                  action: 'position_filter',
                  label: newValue.join(',') || 'all',
                  searchType
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Position" placeholder="Select positions" />
              )}
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5, mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <RecommendIcon color="primary" />
          <Typography variant="subtitle2">Recommended nearby</Typography>
        </Stack>
        <Divider sx={{ my: 1 }} />
        {recommendations.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No recommendations available yet.</Typography>
        ) : (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            {recommendations.map((rec) => {
              const key = getResultKey(rec);
              return (
                <Paper key={key} variant="outlined" sx={{ p: 1, flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{rec.teamName || rec.title || rec.fullName || rec.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{rec.itemType === 'player' ? 'Player' : 'Team'} • {getDistanceText(rec)}</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        const pos = getResultPosition(rec);
                        if (pos && mapInstanceRef.current) {
                          mapInstanceRef.current.setCenter(pos);
                          mapInstanceRef.current.setZoom(12);
                        }
                        setSelectedResultKey(key);
                      }}
                    >
                      Focus
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Map Container */}
      <Paper elevation={3} sx={{ position: 'relative', height: { xs: '55vh', sm: '600px' }, minHeight: 420, overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} aria-label="Map" />
        
        {/* Floating Zoom Controls */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            right: { xs: 8, sm: 16 },
            top: { xs: 8, sm: 16 },
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            p: { xs: 0.5, sm: 1 },
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
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
                <Typography variant="body2" color="text.secondary">
                  Distance: {getDistanceText(selectedItem)}
                </Typography>
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
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip
                    size="small"
                    color={getRecentStatus(selectedItem.createdAt) === 'New' ? 'success' : getRecentStatus(selectedItem.createdAt) === 'Active' ? 'info' : 'default'}
                    label={getRecentStatus(selectedItem.createdAt)}
                  />
                  {(selectedItem.coachingLevel || selectedItem.coachingQualification) && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Coach: ${selectedItem.coachingLevel || selectedItem.coachingQualification}`}
                    />
                  )}
                </Stack>
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

      {/* No Filter Warning */}
      {!hasActiveFilter && results.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Move or zoom the map to view {searchType === 'players' ? 'players' : searchType === 'vacancies' ? 'teams' : 'results'} in the visible area.
        </Alert>
      )}

      {/* Results Table */}
      {hasActiveFilter && filteredResults.length > 0 && (
        <>
          {isBulkMessagingEnabled && hasBulkEligibleResults && (
            <Paper sx={{ mt: 2, p: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  {selectedCount} {selectedTypeLabel}{selectedCount === 1 ? '' : 's'} selected
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setSelectedRecipients({})}
                    disabled={selectedCount === 0}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<MessageIcon />}
                    onClick={handleMessageSelected}
                    disabled={selectedCount === 0}
                  >
                    Message Selected
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {isBulkMessagingEnabled && hasBulkEligibleResults && (
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Select</TableCell>
                )}
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Age Group</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Position</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Location</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>League</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Distance</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredResults.map((result, index) => {
                const resultKey = getResultKey(result);
                const rowNumber = index + 1;
                // Use positions array from backend
                let positionDisplay = 'N/A';
                if (result.positions && Array.isArray(result.positions) && result.positions.length > 0) {
                  positionDisplay = result.positions.join(', ');
                } else if (result.preferredPosition) {
                  positionDisplay = result.preferredPosition;
                } else if (result.position) {
                  // Fallback: try to parse raw position field
                  if (typeof result.position === 'string') {
                    try {
                      const parsed = JSON.parse(result.position);
                      positionDisplay = Array.isArray(parsed) ? parsed.join(', ') : result.position;
                    } catch {
                      positionDisplay = result.position;
                    }
                  } else if (Array.isArray(result.position)) {
                    positionDisplay = result.position.join(', ');
                  }
                }

                // Age group should be available directly
                let ageGroupDisplay = result.ageGroup || 'N/A';
                
                // Fallback: Extract from title if ageGroup is missing
                if (ageGroupDisplay === 'N/A' && result.title) {
                  const ageGroupMatch = result.title.match(/\b(U\d+|Veterans \d+\+|Open Age|Adult)\b/i);
                  if (ageGroupMatch) {
                    ageGroupDisplay = ageGroupMatch[1];
                  }
                }
                
                // Fallback: Extract positions from title if positions array is missing
                if (positionDisplay === 'N/A' && result.title) {
                  // Common position keywords
                  const positionKeywords = [
                    'Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Striker',
                    'Left Wing', 'Right Wing', 'Left-back', 'Right-back', 'Centre-back',
                    'Central Midfielder', 'Attacking Midfielder', 'Defensive Midfielder',
                    'Wing-back', 'Full-back'
                  ];
                  
                  const foundPositions: string[] = [];
                  positionKeywords.forEach(keyword => {
                    if (result.title.toLowerCase().includes(keyword.toLowerCase())) {
                      foundPositions.push(keyword);
                    }
                  });
                  
                  if (foundPositions.length > 0) {
                    positionDisplay = foundPositions.join(', ');
                  }
                }
                
                return (
                  <TableRow 
                    key={resultKey}
                    ref={(element) => {
                      rowRefs.current[resultKey] = element;
                    }}
                    hover
                    onClick={() => {
                      setSelectedItem(result);
                      setSelectedResultKey(resultKey);
                      const pos = getResultPosition(result);
                      if (pos && mapInstanceRef.current) {
                        mapInstanceRef.current.setCenter(pos);
                        mapInstanceRef.current.setZoom(13);
                      }

                      const marker = markerByKeyRef.current[resultKey];
                      if (marker) {
                        window.google?.maps?.event?.trigger(marker, 'click');
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: selectedResultKey === resultKey ? 'action.selected' : 'inherit'
                    }}
                  >
                    {isBulkMessagingEnabled && hasBulkEligibleResults && (
                      <TableCell>
                        {canBulkMessageResult(result) && (
                          <Checkbox
                            size="small"
                            checked={Boolean(selectedRecipients[resultKey])}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleRecipientSelection(result);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell>{rowNumber}. {result.teamName || result.title || result.fullName || result.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={result.itemType === 'player' ? 'Player' : 'Team'} 
                        color={result.itemType === 'player' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{ageGroupDisplay}</TableCell>
                    <TableCell>{positionDisplay}</TableCell>
                    <TableCell>{result.location || 'N/A'}</TableCell>
                    <TableCell>{result.league || result.preferredLeagues || 'N/A'}</TableCell>
                    <TableCell>{getDistanceText(result)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRecentStatus(result.createdAt)}
                        size="small"
                        color={getRecentStatus(result.createdAt) === 'New' ? 'success' : getRecentStatus(result.createdAt) === 'Active' ? 'info' : 'default'}
                        variant={getRecentStatus(result.createdAt) === 'Open' ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell>
                      {result.itemType === 'player' && (
                        (() => {
                          const recipient = getMessageRecipient(result);
                          return (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<MessageIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!recipient) return;
                            analyticsTracking.track('map_message_clicked', {
                              category: 'Map',
                              action: 'message_from_result',
                              label: 'single',
                              searchType
                            });
                            navigate('/messages', {
                              state: {
                                recipientId: recipient.id,
                                recipientName: recipient.name,
                                recipientEmail: result.email || '',
                                relatedPlayerAvailabilityId: result.id ? String(result.id) : undefined,
                                messageType: 'availability_interest',
                                context: result.title || 'player advert'
                              }
                            });
                          }}
                          disabled={!recipient}
                        >
                          Message
                        </Button>
                          );
                        })()
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        </>
      )}

      {/* No Results Message */}
      {hasActiveFilter && filteredResults.length === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No {searchType === 'players' ? 'players' : searchType === 'vacancies' ? 'teams' : 'results'} found in the selected search area. Try expanding your search radius or drawing a larger area.
        </Alert>
      )}
    </Box>
  );
};

export default MapSearchSimplified;
