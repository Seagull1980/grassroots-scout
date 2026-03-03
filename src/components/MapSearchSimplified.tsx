import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Slider,
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
  TextField
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Brush as BrushIcon,
  Clear as ClearIcon,
  Message as MessageIcon
} from '@mui/icons-material';
const UK_CENTER = { lat: 54.0, lng: -2.5 };

interface MapSearchSimplifiedProps {
  searchType: 'vacancies' | 'players' | 'both';
}

const MapSearchSimplified: React.FC<MapSearchSimplifiedProps> = ({ searchType }) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markerByKeyRef = useRef<Record<string, google.maps.Marker>>({});
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const circleRef = useRef<google.maps.Circle | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const drawingPathRef = useRef<google.maps.LatLng[]>([]);
  const isDrawingRef = useRef(false); // Use ref to track drawing state
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const mapIdleListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const locationMarkerRef = useRef<google.maps.Marker | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [searchRadius, setSearchRadius] = useState(10); // km
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPointCount, setDrawingPointCount] = useState(0);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [hasActiveFilter, setHasActiveFilter] = useState(false);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedResultKey, setSelectedResultKey] = useState<string | null>(null);
  const [useViewportSearch, setUseViewportSearch] = useState(true);
  // Load saved location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('mapSearchLocation');
    const savedRadius = localStorage.getItem('mapSearchRadius');
    
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setUserLocation(location);
      } catch (e) {
        console.error('Failed to parse saved location:', e);
      }
    }
    
    if (savedRadius) {
      const radius = parseInt(savedRadius, 10);
      if (!isNaN(radius) && radius > 0 && radius <= 50) {
        setSearchRadius(radius);
      }
    }
  }, []);

  // Save location to localStorage when it changes
  useEffect(() => {
    if (userLocation) {
      localStorage.setItem('mapSearchLocation', JSON.stringify(userLocation));
    }
  }, [userLocation]);

  // Save radius to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('mapSearchRadius', searchRadius.toString());
  }, [searchRadius]);


  // Filter options
  const ageGroups = [
    'Under 6', 'Under 7', 'Under 8', 'Under 9', 'Under 10',
    'Under 11', 'Under 12', 'Under 13', 'Under 14', 'Under 15', 'Under 16',
    'Under 17', 'Under 18', 'Under 19', 'Under 20', 'Under 21',
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

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

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
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (circleRef.current) circleRef.current.setMap(null);
      if (polylineRef.current) polylineRef.current.setMap(null);
      if (locationMarkerRef.current) locationMarkerRef.current.setMap(null);
      if (mapClickListenerRef.current) {
        window.google?.maps?.event?.removeListener(mapClickListenerRef.current);
      }
      if (mapIdleListenerRef.current) {
        window.google?.maps?.event?.removeListener(mapIdleListenerRef.current);
      }
    };
  }, []);

  // Update draggable search-center marker
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.Marker || !userLocation) return;

    if (locationMarkerRef.current) {
      locationMarkerRef.current.setMap(null);
    }

    const marker = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      title: 'Search Center (drag to move)',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4CAF50',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2
      },
      draggable: true,
      zIndex: 1000
    });

    marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const newLocation = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      setUserLocation(newLocation);

      if (hasActiveFilter && !isDrawing) {
        const filtered = results.filter(result => {
          const pos = getResultPosition(result);
          if (!pos) return false;
          const distance = calculateDistance(newLocation, pos);
          return distance <= searchRadius;
        });
        setFilteredResults(applyAdditionalFilters(filtered));
      }
    });

    locationMarkerRef.current = marker;

    return () => {
      marker.setMap(null);
    };
  }, [userLocation, hasActiveFilter, isDrawing, searchRadius, results]);

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
        setDrawingPointCount(drawingPathRef.current.length); // Update state to trigger re-render
        
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

  // Viewport-based filtering: keep search area aligned to current visible map bounds
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.event || !useViewportSearch) return;

    if (mapIdleListenerRef.current) {
      window.google.maps.event.removeListener(mapIdleListenerRef.current);
      mapIdleListenerRef.current = null;
    }

    mapIdleListenerRef.current = mapInstanceRef.current.addListener('idle', () => {
      const bounds = mapInstanceRef.current?.getBounds();
      const inView = filterResultsByBounds(results, bounds);
      const finalFiltered = applyAdditionalFilters(inView);
      setFilteredResults(finalFiltered);
      setHasActiveFilter(true);
    });

    // Run once immediately when mode turns on/results change
    const initialBounds = mapInstanceRef.current.getBounds();
    const inView = filterResultsByBounds(results, initialBounds);
    const finalFiltered = applyAdditionalFilters(inView);
    setFilteredResults(finalFiltered);
    setHasActiveFilter(true);

    return () => {
      if (mapIdleListenerRef.current) {
        window.google.maps.event.removeListener(mapIdleListenerRef.current);
        mapIdleListenerRef.current = null;
      }
    };
  }, [useViewportSearch, results, selectedAgeGroup, selectedPositions]);

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
    if (!hasActiveFilter) return;

    // Get the base filtered results (from radius or drawing)
    let baseFiltered: any[] = [];

    if (useViewportSearch && mapInstanceRef.current?.getBounds()) {
      baseFiltered = filterResultsByBounds(results, mapInstanceRef.current.getBounds());
    } else if (userLocation && circleRef.current) {
      // Radius filter is active
      baseFiltered = results.filter(result => {
        const pos = getResultPosition(result);
        if (!pos) return false;
        const distance = calculateDistance(userLocation, pos);
        return distance <= searchRadius;
      });
    } else if (drawingPathRef.current.length >= 3 && window.google?.maps?.geometry?.poly) {
      // Drawing filter is active
      const polygon = drawingPathRef.current;
      baseFiltered = results.filter(result => {
        const position = getResultPosition(result);
        if (!position) return false;
        const latLng = new window.google.maps.LatLng(position.lat, position.lng);
        return window.google.maps.geometry.poly.containsLocation(latLng, { 
          getAt: (i: number) => polygon[i],
          length: polygon.length,
          getLength: () => polygon.length
        } as any);
      });
    } else {
      baseFiltered = filteredResults;
    }

    // Apply additional filters
    const finalFiltered = applyAdditionalFilters(baseFiltered);
    setFilteredResults(finalFiltered);
  }, [selectedAgeGroup, selectedPositions, useViewportSearch, results, userLocation, searchRadius]);

  // Render markers when results change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.Marker) return;

    // Only show markers if there's an active filter (radius or drawing)
    const displayResults = hasActiveFilter ? filteredResults : [];

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    markerByKeyRef.current = {};

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;

    // Create info window if it doesn't exist
    if (!infoWindowRef.current && window.google?.maps?.InfoWindow) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    // Create new markers
    displayResults.forEach((result, index) => {
      const position = getResultPosition(result);
      const resultKey = getResultKey(result);
      
      if (!position || !isFinite(position.lat) || !isFinite(position.lng)) return;

      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current as google.maps.Map,
        title: result.teamName || result.title || result.fullName || result.name || 'Location',
        label: {
          text: String(index + 1),
          color: '#ffffff',
          fontWeight: '700'
        },
        icon: result.itemType === 'player' 
          ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        optimized: false,
        visible: true
      });

      // Create info window content
      const createInfoContent = (item: any) => {
        const title = item.teamName || item.title || item.fullName || item.name || 'Location';
        const type = item.itemType === 'player' ? 'Player' : 'Team';
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
        
        return `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #1976d2; font-size: 16px;">${title}</h3>
            <p style="margin: 4px 0; color: #666; font-size: 14px;">
              <strong>Type:</strong> ${type}
              ${ageGroup}
              ${positionStr}
              ${leagueStr}
              ${location}
            </p>
          </div>
        `;
      };

      marker.addListener('click', () => {
        setSelectedItem(result);
        setSelectedResultKey(resultKey);
        rowRefs.current[resultKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (infoWindowRef.current && mapInstanceRef.current) {
          infoWindowRef.current.setContent(createInfoContent(result));
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      markersRef.current.push(marker);
      markerByKeyRef.current[resultKey] = marker;
      bounds.extend(position);
      hasValidMarkers = true;
    });

    // Fit bounds if we have markers and not in drawing mode
    if (hasValidMarkers && mapInstanceRef.current && !isDrawing && !useViewportSearch) {
      mapInstanceRef.current.fitBounds(bounds);
      
      // Prevent too much zoom
      window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
        if (mapInstanceRef.current && mapInstanceRef.current.getZoom()! > 15) {
          mapInstanceRef.current.setZoom(15);
        }
      });
    }
  }, [results, filteredResults, isDrawing, hasActiveFilter, useViewportSearch]);

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
    // Clear all filters and search areas
    handleClearAll();
  };

  const handleClearAll = () => {
    setUseViewportSearch(true);
    setUserLocation(null);
    setFilteredResults([]);
    setHasActiveFilter(false);
    setSelectedResultKey(null);
    setIsDrawing(false);
    drawingPathRef.current = [];
    setDrawingPointCount(0);
    setSelectedAgeGroup('');
    setSelectedPositions([]);
    
    localStorage.removeItem('mapSearchLocation');
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  };

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
        // Support hierarchical matching (e.g., "Defender" matches "Left-back")
        return selectedPositions.some(selectedPos => {
          const selectedLower = selectedPos.toLowerCase();
          
          // Check for specific hierarchy matches
          const hierarchyMatches = positionHierarchy[selectedLower];
          
          return resultPositions.some(resultPos => {
            const resultLower = resultPos.toLowerCase();
            
            // Direct match
            if (resultLower.includes(selectedLower) || selectedLower.includes(resultLower)) {
              return true;
            }
            
            // Hierarchical match - if selected position is generic, check if result is a specific variant
            if (hierarchyMatches) {
              return hierarchyMatches.some(specificPos => 
                resultLower.includes(specificPos) || specificPos.includes(resultLower)
              );
            }
            
            return false;
          });
        });
      });
    }

    return filtered;
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUseViewportSearch(false);
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(location);
            mapInstanceRef.current.setZoom(12);
          }
          
          // Automatically apply initial radius filter
          const filtered = results.filter(result => {
            const pos = getResultPosition(result);
            if (!pos) return false;
            const distance = calculateDistance(location, pos);
            return distance <= searchRadius;
          });
          const finalFiltered = applyAdditionalFilters(filtered);
          setFilteredResults(finalFiltered);
          setHasActiveFilter(true);
        },
        (_error) => {
          setError('Could not get your location. Please check permissions.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSetCustomLocation = () => {
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      if (center) {
        setUseViewportSearch(false);
        const location = {
          lat: center.lat(),
          lng: center.lng()
        };
        setUserLocation(location);
        
        // Apply radius filter with new location
        const filtered = results.filter(result => {
          const pos = getResultPosition(result);
          if (!pos) return false;
          const distance = calculateDistance(location, pos);
          return distance <= searchRadius;
        });
        const finalFiltered = applyAdditionalFilters(filtered);
        setFilteredResults(finalFiltered);
        setHasActiveFilter(true);
      }
    }
  };

  const handleStartDrawing = () => {
    setUseViewportSearch(false);
    setIsDrawing(true);
    drawingPathRef.current = [];
    setDrawingPointCount(0);
    if (polylineRef.current) polylineRef.current.setMap(null);
    polylineRef.current = null;
    // Close info window when starting to draw
    if (infoWindowRef.current) infoWindowRef.current.close();
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
      const finalFiltered = applyAdditionalFilters(filtered);
      setFilteredResults(finalFiltered);
      setHasActiveFilter(true);
    }
  };

  const handleClearDrawing = () => {
    setIsDrawing(false);
    setUseViewportSearch(true);
    drawingPathRef.current = [];
    setDrawingPointCount(0);
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    setFilteredResults([]);
    setHasActiveFilter(false);
  };

  const handleRadiusChange = (newRadius: number) => {
    setUseViewportSearch(false);
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
      const finalFiltered = applyAdditionalFilters(filtered);
      setFilteredResults(finalFiltered);
      setHasActiveFilter(true);
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

  const filterResultsByBounds = (items: any[], bounds: google.maps.LatLngBounds | null | undefined) => {
    if (!bounds || !window.google?.maps?.LatLng) return items;

    return items.filter(result => {
      const position = getResultPosition(result);
      if (!position) return false;
      const latLng = new window.google.maps.LatLng(position.lat, position.lng);
      return bounds.contains(latLng);
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
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          {/* Top Row */}
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip
              icon={searchType === 'vacancies' ? <GroupsIcon /> : <PersonIcon />}
              label={hasActiveFilter ? `${filteredResults.length} in search area` : `${results.length} total`}
              color={hasActiveFilter ? 'success' : 'default'}
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
              startIcon={<LocationIcon />}
              onClick={handleSetCustomLocation}
              variant="outlined"
              size="small"
            >
              Set Map Center
            </Button>

            <Button
              onClick={() => {
                setUseViewportSearch(true);
                setUserLocation(null);
                if (circleRef.current) {
                  circleRef.current.setMap(null);
                  circleRef.current = null;
                }
              }}
              variant={useViewportSearch ? 'contained' : 'outlined'}
              size="small"
            >
              Use Visible Map Area
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

            {isDrawing && drawingPointCount > 0 && (
              <Button
                onClick={handleFinishDrawing}
                variant="contained"
                size="small"
                color="success"
              >
                Finish Drawing ({drawingPointCount} points)
              </Button>
            )}
            
            {hasActiveFilter && !isDrawing && (
              <Button
                startIcon={<ClearIcon />}
                onClick={handleClearAll}
                variant="outlined"
                size="small"
                color="warning"
              >
                Clear Search
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

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">
              Marker key:
            </Typography>
            <Chip size="small" label="Blue # = Player advert" sx={{ bgcolor: '#e3f2fd' }} />
            <Chip size="small" label="Red # = Team vacancy" sx={{ bgcolor: '#ffebee' }} />
            <Typography variant="caption" color="text.secondary">
              Click a marker or row to sync both views.
            </Typography>
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

          {/* Age Group and Position Filters */}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Age Group</InputLabel>
              <Select
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value)}
                label="Filter by Age Group"
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
              sx={{ minWidth: 300 }}
              options={positions}
              value={selectedPositions}
              onChange={(_, newValue) => setSelectedPositions(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Filter by Position" placeholder="Select positions" />
              )}
            />
          </Stack>
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

      {/* No Filter Warning */}
      {!hasActiveFilter && results.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Please select a search area (use "My Location" for radius search or "Draw Area" to outline a region) to view {searchType === 'players' ? 'players' : searchType === 'vacancies' ? 'teams' : 'results'} on the map.
        </Alert>
      )}

      {/* Results Table */}
      {hasActiveFilter && filteredResults.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Age Group</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Position</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Location</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>League</TableCell>
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
