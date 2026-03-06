import React, { useEffect, useRef, useState, useTransition } from 'react';
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
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Message as MessageIcon,
  AutoAwesome as RecommendIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { analyticsTracking } from '../services/analyticsTracking';
const UK_CENTER = { lat: 54.0, lng: -2.5 };

type SortMode = 'relevance' | 'distance' | 'age' | 'recent';

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
  const [showHeatmap, setShowHeatmap] = useState(false);
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
  const [, startTransition] = useTransition();
  
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

  const normalizeText = (value: unknown): string => String(value ?? '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  const normalizeAgeGroup = (value: unknown): string => {
    const raw = String(value ?? '').toLowerCase().trim();
    if (!raw) return '';

    const underMatch = raw.match(/(?:u|under)\s*[-]?\s*(\d{1,2})/i);
    if (underMatch) return `u${underMatch[1]}`;

    if (raw.includes('adult')) return 'adult';
    if (raw.includes('veteran')) return 'veterans';

    return normalizeText(raw);
  };

  const positionAliases: Record<string, string[]> = {
    goalkeeper: ['goalkeeper', 'gk', 'goalie', 'keeper'],
    defender: ['defender', 'centreback', 'centerback', 'cb', 'fullback', 'wingback', 'rightback', 'leftback'],
    midfielder: ['midfielder', 'cm', 'cdm', 'cam'],
    attacker: ['attacker', 'forward', 'striker', 'st', 'winger', 'rw', 'lw']
  };

  const parsePositions = (result: any): string[] => {
    if (Array.isArray(result.positions)) return result.positions.filter(Boolean);

    if (typeof result.positions === 'string' && result.positions.trim()) {
      try {
        const parsed = JSON.parse(result.positions);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        return [result.positions];
      } catch {
        return [result.positions];
      }
    }

    if (Array.isArray(result.position)) return result.position.filter(Boolean);

    if (typeof result.position === 'string' && result.position.trim()) {
      try {
        const parsed = JSON.parse(result.position);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        return [result.position];
      } catch {
        return [result.position];
      }
    }

    if (result.preferredPosition) return [result.preferredPosition];
    return [];
  };

  const positionMatches = (selectedPos: string, resultPos: string): boolean => {
    const selectedNorm = normalizeText(selectedPos);
    const resultNorm = normalizeText(resultPos);

    if (!selectedNorm || !resultNorm) return false;
    if (selectedNorm.includes(resultNorm) || resultNorm.includes(selectedNorm)) return true;

    const hierarchyMatches = positionHierarchy[selectedPos.toLowerCase()] || [];
    const hierarchyNormalized = hierarchyMatches.map(normalizeText);
    if (hierarchyNormalized.some(pos => resultNorm.includes(pos) || pos.includes(resultNorm))) return true;

    const aliasSet = new Set<string>([
      selectedNorm,
      ...(positionAliases[selectedNorm] || []).map(normalizeText)
    ]);

    return Array.from(aliasSet).some(alias => resultNorm.includes(alias) || alias.includes(resultNorm));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedAgeGroup = params.get('ageGroup') || '';
    const sharedPositions = params.get('positions') || '';
    const sharedSort = params.get('sortBy') as SortMode | null;

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
  }, [results, selectedAgeGroup, selectedPositions, sortBy]);

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

  const handleMyLocation = () => {
    if (!mapInstanceRef.current) return;
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          mapInstanceRef.current?.setCenter(userLocation);
          mapInstanceRef.current?.setZoom(12);
          
          analyticsTracking.track('map_my_location_used', {
            category: 'Map',
            action: 'use_my_location',
            searchType
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location. Please check your browser permissions.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
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
      const selectedAgeNormalized = normalizeAgeGroup(selectedAgeGroup);
      filtered = filtered.filter(result => {
        const ageNormalized = normalizeAgeGroup(result.ageGroup || result.playerAgeGroup || result.teamAgeGroup || '');
        if (!ageNormalized) return false;
        if (ageNormalized === selectedAgeNormalized) return true;
        return ageNormalized.includes(selectedAgeNormalized) || selectedAgeNormalized.includes(ageNormalized);
      });
    }

    // Filter by positions
    if (selectedPositions.length > 0) {
      filtered = filtered.filter(result => {
        const resultPositions = parsePositions(result);
        if (resultPositions.length === 0) return false;

        return selectedPositions.some(selectedPos =>
          resultPositions.some(resultPos => positionMatches(selectedPos, resultPos))
        );
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
    return filterResultsByBounds(items, bounds);
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
        <Stack spacing={1.5}>
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
                  Got it
                </Button>
              }
              sx={{ py: 0.5 }}
            >
              Pan/zoom the map to search different areas. Use filters below to refine results.
            </Alert>
          )}

          {/* Compact Top Row: Results, Filters, Actions */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
            <Chip
              icon={searchType === 'vacancies' ? <GroupsIcon /> : <PersonIcon />}
              label={`${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''}`}
              color="primary"
              variant="outlined"
              size="small"
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort</InputLabel>
              <Select
                value={sortBy}
                label="Sort"
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

            <Button
              onClick={handleMyLocation}
              variant="contained"
              color="primary"
              size="small"
              startIcon={<MyLocationIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              My Location
            </Button>

            {(selectedAgeGroup || selectedPositions.length > 0) && (
              <Button
                size="small"
                onClick={handleClearAll}
                variant="text"
                color="warning"
              >
                Clear
              </Button>
            )}

            {isLoading && <CircularProgress size={20} />}
          </Stack>

          {/* Filters Row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: { sm: 150 }, width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel>Age Group</InputLabel>
              <Select
                value={selectedAgeGroup}
                onChange={(e) => {
                  const ageValue = e.target.value;
                  startTransition(() => {
                    setSelectedAgeGroup(ageValue);
                  });
                  analyticsTracking.track('map_filter_applied', {
                    category: 'Map',
                    action: 'age_filter',
                    label: ageValue || 'all',
                    searchType
                  });
                }}
                label="Age Group"
              >
                <MenuItem value=""><em>All Ages</em></MenuItem>
                {ageGroups.map((age) => (
                  <MenuItem key={age} value={age}>{age}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: { sm: 200 }, flex: 1, width: { xs: '100%', sm: 'auto' } }}
              options={positions}
              value={selectedPositions}
              onChange={(_, newValue) => {
                startTransition(() => {
                  setSelectedPositions(newValue);
                });
                analyticsTracking.track('map_filter_applied', {
                  category: 'Map',
                  action: 'position_filter',
                  label: newValue.join(',') || 'all',
                  searchType
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Position" placeholder="Any position" />
              )}
            />
          </Stack>

          {clusteredHiddenCount > 0 && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Zoom in to reveal {clusteredHiddenCount} more result{clusteredHiddenCount !== 1 ? 's' : ''}.
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Recommended Section - More Compact */}
      {recommendations.length > 0 && (
        <Paper sx={{ p: 1, mb: 1 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
            <RecommendIcon color="primary" fontSize="small" />
            <Typography variant="body2" fontWeight={600}>Top Matches</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5} divider={<Divider orientation="vertical" flexItem />}>
            {recommendations.map((rec) => {
              const key = getResultKey(rec);
              return (
                <Box key={key} sx={{ flex: 1, p: 0.5 }}>
                  <Typography variant="body2" noWrap fontWeight={500}>
                    {rec.teamName || rec.title || rec.fullName || rec.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {rec.itemType === 'player' ? 'Player' : 'Team'} • {getDistanceText(rec)}
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 0.5, py: 0, px: 1, minHeight: 24 }}
                    onClick={() => {
                      const pos = getResultPosition(rec);
                      if (pos && mapInstanceRef.current) {
                        mapInstanceRef.current.setCenter(pos);
                        mapInstanceRef.current.setZoom(12);
                      }
                      setSelectedResultKey(key);
                    }}
                  >
                    View
                  </Button>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Map Container */}
      <Paper elevation={3} sx={{ position: 'relative', height: { xs: '55vh', sm: '600px' }, minHeight: 420, overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} aria-label="Map" />
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
          No {searchType === 'players' ? 'players' : searchType === 'vacancies' ? 'teams' : 'results'} found in the visible map area. Try zooming out or panning to a different location.
        </Alert>
      )}
    </Box>
  );
};

export default MapSearchSimplified;
