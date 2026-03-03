# PowerShell script to add map features
$filePath = "src/components/MapSearchSimplified.tsx"
$content = Get-Content $filePath -Raw

# 1. Add locationMarkerRef after infoWindowRef
$content = $content -replace '(const infoWindowRef = useRef<google\.maps\.InfoWindow \| null>\(null\);)', '$1`n  const locationMarkerRef = useRef<google.maps.Marker | null>(null);'

# 2. Add localStorage useEffects after selectedPositions state
$newEffects = @'

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

'@

$content = $content -replace '(const \[selectedPositions, setSelectedPositions\] = useState<string\[\]>\(\[\]\);)', "`$1$newEffects"

# 3. Add locationMarkerRef cleanup in map initialization
$content = $content -replace '(if \(polylineRef\.current\) polylineRef\.current\.setMap\(null\);[\r\n]+\s+if \(mapClickListenerRef\.current\))', 'if (polylineRef.current) polylineRef.current.setMap(null);`n      if (locationMarkerRef.current) locationMarkerRef.current.setMap(null);`n      if (mapClickListenerRef.current)'

#4. Add draggable marker useEffect after first useEffect
$markerEffect = @'

  // Update location marker when user location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.Marker || !userLocation) return;

    // Remove old marker if exists
    if (locationMarkerRef.current) {
      locationMarkerRef.current.setMap(null);
    }

    // Create draggable location marker
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
        strokeWeight: 2,
      },
      draggable: true,
      zIndex: 1000
    });

    // Handle marker drag
    marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const newLocation = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        setUserLocation(newLocation);
        
        // Re-apply radius filter with new location
        if (hasActiveFilter && !isDrawing) {
          const filtered = results.filter(result => {
            const pos = getResultPosition(result);
            if (!pos) return false;
            const distance = calculateDistance(newLocation, pos);
            return distance <= searchRadius;
          });
          const finalFiltered = applyAdditionalFilters(filtered);
          setFilteredResults(finalFiltered);
        }
      }
    });

    locationMarkerRef.current = marker;

    return () => {
      if (locationMarkerRef.current) {
        locationMarkerRef.current.setMap(null);
      }
    };
  }, [userLocation, hasActiveFilter, isDrawing, searchRadius, results]);

'@

$content = $content -replace '(\}, \[\]\);[\r\n]+[\r\n]+\s+// Setup map click listener for drawing)', "$markerEffect`$1"

# 5. Add localStorage.removeItem and locationMarkerRef cleanup in handleClearAll
$content = $content -replace '(setSelectedPositions\(\[\]\);[\r\n]+\s+)', '$1localStorage.removeItem(''mapSearchLocation'');`n    '
$content = $content -replace '(polylineRef\.current = null;[\r\n]+\s+\}[\r\n]+\s+\}\);)', '$1`n    if (locationMarkerRef.current) {`n      locationMarkerRef.current.setMap(null);`n      locationMarkerRef.current = null;`n    }`n  });'

# 6. Add new handleSetCustomLocation function after handleUseMyLocation
$newFunction = @'

  const handleSetCustomLocation = () => {
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      if (center) {
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

'@

$content = $content -replace '(\};[\r\n]+[\r\n]+\s+const handleStartDrawing)', "$newFunction`$1"

# 7. Add Set Map Center button after Use My Location button
$newButton = @'

            <Button
              startIcon={<LocationIcon />}
              onClick={handleSetCustomLocation}
              variant="outlined"
              size="small"
            >
              Set Map Center
            </Button>

'@

$content = $content -replace '(Use My Location[\r\n]+\s+</Button>)', "$1$newButton"

# Save the modified content
$content | Set-Content $filePath -NoNewline

Write-Host "Map features added successfully!"
