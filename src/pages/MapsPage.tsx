import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import MapSearch from '../components/MapSearch';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const MapsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupExecutedRef = useRef(false);
  const isUnmountingRef = useRef(false);

  // Force cleanup function that removes ALL Google Maps elements
  const forceGlobalCleanup = () => {
    if (cleanupExecutedRef.current) return;
    cleanupExecutedRef.current = true;
    
    console.log('MapsPage: Executing Google Maps cleanup');
    
    // PHASE 1: Immediately disable all Maps interactions
    const allMapElements = document.querySelectorAll('[class*="gm-"], [class*="gmnoprint"], [class*="gm-style"], .pac-container');
    allMapElements.forEach(el => {
      const element = el as HTMLElement;
      element.style.display = 'none !important';
      element.style.pointerEvents = 'none !important';
      element.style.visibility = 'hidden !important';
      element.style.zIndex = '-999999 !important';
    });
    
    // PHASE 2: Remove Maps elements from DOM
    const selectors = [
      '[class*="gm-"]',
      '[class*="gmnoprint"]', 
      '[class*="gm-style"]',
      '.pac-container',
      '[data-map-container]',
      '[class*="leaflet"]'
    ];
    
    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          el.remove();
        });
      } catch (e) {
        console.log('Cleanup error for selector:', selector);
      }
    });
    
    // PHASE 3: Remove Maps scripts
    document.querySelectorAll('script[src*="maps.googleapis"], script[src*="maps.gstatic"]').forEach(script => {
      script.remove();
    });
    
    // PHASE 4: Reset container styling
    if (containerRef.current) {
      containerRef.current.style.pointerEvents = 'auto';
      containerRef.current.style.zIndex = '1';
    }
    
    console.log('MapsPage: Cleanup complete');
  };

  // Intercept navigation away from Maps
  useEffect(() => {
    cleanupExecutedRef.current = false; // Reset cleanup flag when mounted
    isUnmountingRef.current = false;

    const handleBeforeUnload = () => {
      isUnmountingRef.current = true;
      forceGlobalCleanup();
    };

    const handlePopState = () => {
      console.log('Navigation detected - cleaning up Maps');
      isUnmountingRef.current = true;
      forceGlobalCleanup();
    };

    // Override history to catch navigation
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      handleBeforeUnload();
      return originalPushState.apply(window.history, args);
    };

    window.history.replaceState = function (...args) {
      handleBeforeUnload();
      return originalReplaceState.apply(window.history, args);
    };

    window.addEventListener('popstate', handlePopState);

    // Cleanup on unmount
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
      isUnmountingRef.current = true;
      forceGlobalCleanup();
    };
  }, []);

  // Additional cleanup on component unmount as safety net
  useEffect(() => {
    return () => {
      if (!isUnmountingRef.current) {
        isUnmountingRef.current = true;
        setTimeout(() => forceGlobalCleanup(), 0);
      }
    };
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Render the Maps page normally
  return (
    <Container ref={containerRef} maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Map Search
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Find teams and players using our interactive map with location-based search. Click anywhere on the map, draw custom search areas, and see results with precise locations and distances.
      </Typography>

      <Paper elevation={2} sx={{ position: 'relative', zIndex: 1 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Team Vacancies" />
          <Tab label="Available Players" />
          <Tab label="All Results" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <MapSearch key="vacancies-tab" searchType="vacancies" />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <MapSearch key="availability-tab" searchType="availability" />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <MapSearch key="both-tab" searchType="both" />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default MapsPage;
