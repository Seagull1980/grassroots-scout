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
import { useAuth } from '../contexts/AuthContext';
const UK_CENTER = { lat: 54.0, lng: -2.5 };

interface MapSearchSimplifiedProps {
  searchType: 'vacancies' | 'players' | 'both';
}

const MapSearchSimplified: React.FC<MapSearchSimplifiedProps> = ({ searchType }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(UK_CENTER);
  const [mapZoom, setMapZoom] = useState(8);
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, {
    id: string;
    name: string;
    relatedVacancyId?: string;
    relatedPlayerAvailabilityId?: string;
    messageType: string;
    context: string;
  }>>({});
  
  // Load saved location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('mapSearchLocation');
    const savedRadius = localStorage.getItem('mapSearchRadius');
    const savedMapCenter = localStorage.getItem('mapCenter');
    const savedMapZoom = localStorage.getItem('mapZoom');
    
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
    
    if (savedMapCenter) {
      try {
        const center = JSON.parse(savedMapCenter);
        setMapCenter(center);
      } catch (e) {
        console.error('Failed to parse saved map center:', e);
      }
    }
    
    if (savedMapZoom) {
      const zoom = parseInt(savedMapZoom, 10);
      if (!isNaN(zoom) && zoom >= 3 && zoom <= 20) {
        setMapZoom(zoom);
      }
    } else {
      setMapZoom(8); // Default zoom out 2 levels
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

  // Draw search radius circle on map
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || isDrawing) {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      return;
    }

    // Remove old circle if exists
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // Create new circle
    circleRef.current = new window.google.maps.Circle({
      center: userLocation,
      radius: searchRadius * 1000, // Convert km to meters
      map: mapInstanceRef.current,
      fillColor: '#2196F3',
      fillOpacity: 0.15,
      strokeColor: '#1976D2',
      strokeOpacity: 0.6,
      strokeWeight: 2,
      clickable: false
    });
  }, [userLocation, searchRadius, isDrawing]);

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
      if (circleRef.current) circleRef.current.setMap(null);
      if (polylineRef.current) polylineRef.current.setMap(null);
      if (mapClickListenerRef.current) {
        window.google?.maps?.event?.removeListener(mapClickListenerRef.current);
      }
      if (mapIdleListenerRef.current) {
        window.google?.maps?.event?.removeListener(mapIdleListenerRef.current);
      }
    };
  }, []);



  // Setup map click listener for drawing or setting location
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
    } else if (!useViewportSearch) {
      // Add click listener for setting search location
      mapClickListenerRef.current = mapInstanceRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        
        const location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
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
      });
    }

    return () => {
      if (mapClickListenerRef.current) {
        window.google?.maps?.event?.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
      }
    };
  }, [isDrawing, useViewportSearch, searchRadius, results]);

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
    // Check if we have any filters active (age group or position)
    const hasAgeOrPositionFilter = selectedAgeGroup !== '' || selectedPositions.length > 0;

    // Get the base filtered results (from radius or drawing)
    let baseFiltered: any[] = [];
    let shouldActivate = false;

    if (useViewportSearch && mapInstanceRef.current?.getBounds()) {
      baseFiltered = filterResultsByBounds(results, mapInstanceRef.current.getBounds());
      shouldActivate = true;
    } else if (userLocation && circleRef.current) {
      // Radius filter is active
      baseFiltered = results.filter(result => {
        const pos = getResultPosition(result);
        if (!pos) return false;
        const distance = calculateDistance(userLocation, pos);
        return distance <= searchRadius;
      });
      shouldActivate = true;
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
      shouldActivate = true;
    } else if (hasAgeOrPositionFilter) {
      // If no geographic filter but we have age/position filters, use all results as base
      baseFiltered = results;
      shouldActivate = true;
    } else {
      // No filters active, don't update
      return;
    }

    // Apply additional filters
    const finalFiltered = applyAdditionalFilters(baseFiltered);
    setFilteredResults(finalFiltered);
    
    // Set hasActiveFilter to true if we have any filters
    if (shouldActivate) {
      setHasActiveFilter(true);
    }
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
        icon: result.itemType === 'player' 
          ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
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
              ${preferredGenderStr}
            </p>
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

  }, [results, filteredResults, isDrawing, hasActiveFilter, useViewportSearch]);

  // Auto-fit map bounds to show filtered results
  useEffect(() => {
    if (!mapInstanceRef.current || !hasActiveFilter || filteredResults.length === 0 || useViewportSearch) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidBounds = false;

    filteredResults.forEach(result => {
      const pos = getResultPosition(result);
      if (pos) {
        bounds.extend(new window.google.maps.LatLng(pos.lat, pos.lng));
        hasValidBounds = true;
      }
    });

    if (hasValidBounds) {
      mapInstanceRef.current.fitBounds(bounds);
      // Adjust zoom after fitBounds to avoid being too close
      setTimeout(() => {
        if (mapInstanceRef.current) {
          const currentZoom = mapInstanceRef.current.getZoom();
          if (currentZoom && currentZoom > 15) {
            mapInstanceRef.current.setZoom(15); // Max zoom to avoid being too close
          }
        }
      }, 100);
    }
  }, [filteredResults, hasActiveFilter, useViewportSearch]);

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
      mapInstanceRef.current.setZoom(10);
      setMapCenter(UK_CENTER);
      setMapZoom(10);
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
    setSelectedRecipients({});
    
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
    
    // Filter results by distance (no visual circle)
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
      <Paper elevation={2} sx={{ p: 1.5, mb: 1 }}>
        <Stack spacing={1}>
          {/* Top Controls Row */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              icon={searchType === 'vacancies' ? <GroupsIcon /> : <PersonIcon />}
              label={hasActiveFilter ? `${filteredResults.length} in search area` : `${results.length} total`}
              color={hasActiveFilter ? 'success' : 'default'}
              variant="outlined"
              size="small"
            />
            
            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
            
            <Button
              startIcon={<MyLocationIcon />}
              onClick={handleUseMyLocation}
              variant={userLocation ? 'contained' : 'outlined'}
              size="small"
            >
              My Location
            </Button>

            <Button
              onClick={() => {
                setUseViewportSearch(true);
                setUserLocation(null);
              }}
              variant={useViewportSearch ? 'contained' : 'outlined'}
              size="small"
            >
              Visible Area
            </Button>

            {!useViewportSearch && !isDrawing && (
              <Chip
                size="small"
                label="Click map to set center"
                color="info"
                variant="outlined"
              />
            )}

            <Button
              startIcon={isDrawing ? <ClearIcon /> : <BrushIcon />}
              onClick={isDrawing ? handleClearDrawing : handleStartDrawing}
              variant={isDrawing ? 'contained' : 'outlined'}
              size="small"
              color={isDrawing ? 'error' : 'primary'}
            >
              {isDrawing ? 'Cancel' : 'Draw'}
            </Button>

            {isDrawing && drawingPointCount > 0 && (
              <Button
                onClick={handleFinishDrawing}
                variant="contained"
                size="small"
                color="success"
              >
                Finish ({drawingPointCount})
              </Button>
            )}
            
            {hasActiveFilter && !isDrawing && (
              <Button
                size="small"
                onClick={handleClearAll}
                variant="outlined"
                color="warning"
              >
                Clear
              </Button>
            )}
            
            <Button
              onClick={handleRecenter}
              variant="outlined"
              size="small"
            >
              Reset
            </Button>

            {isLoading && <CircularProgress size={20} />}
          </Stack>

          {/* Legend */}
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Blue = Player | Red = Team | Click marker to view details and highlight in table
            </Typography>
          </Stack>

          {/* Radius Control */}
          {userLocation && !isDrawing && (
            <Box sx={{ px: 1, mt: 1 }}>
              <Typography variant="caption" gutterBottom sx={{ display: 'block', mb: 0.5 }}>
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
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Age Group</InputLabel>
              <Select
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value)}
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
              sx={{ minWidth: 250 }}
              options={positions}
              value={selectedPositions}
              onChange={(_, newValue) => setSelectedPositions(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Position" placeholder="Select positions" />
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
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} aria-label="Map" />
        
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
