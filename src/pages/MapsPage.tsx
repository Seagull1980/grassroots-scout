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
  const [isUnmounting, setIsUnmounting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupExecutedRef = useRef(false);

  // Force cleanup function that removes ALL Google Maps elements from entire document
  const forceGlobalCleanup = () => {
    if (cleanupExecutedRef.current) return;
    cleanupExecutedRef.current = true;
    
    console.log('MapsPage: Executing global Google Maps cleanup');
    
    // IMMEDIATELY disable pointer events on ALL map-related elements (but NOT the container)
    const mapElements = document.querySelectorAll('[class*="gm-"], [class*="gmnoprint"], [class*="gm-style"], .pac-container');
    mapElements.forEach(el => {
      (el as HTMLElement).style.pointerEvents = 'none';
      (el as HTMLElement).style.display = 'none';
    });
    
    // Remove ALL Google Maps related elements from the entire document
    const selectors = [
      '[class*="gm-"]',
      '[class*="gmnoprint"]', 
      '[class*="gm-style"]',
      '.pac-container',  // Autocomplete dropdown
      '[src*="maps.googleapis.com"]',
      '[src*="maps.gstatic.com"]'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        try {
          el.remove();
        } catch (e) {
          // Ignore removal errors
        }
      });
    });
    
    // Remove any remaining Google Maps API scripts
    const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    scripts.forEach(script => {
      try {
        script.remove();
      } catch (e) {
        // Ignore removal errors  
      }
    });
    
    console.log('MapsPage: Global cleanup complete');
  };

  // Intercept clicks on navigation elements BEFORE they try to navigate
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Ignore clicks within the MapsPage container (internal tab switching)
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }
      
      // Check if clicking on a navigation link
      const isNavClick = target.closest('a[href]') || 
                        target.closest('[role="tab"]') ||
                        target.closest('button[aria-label*="navigation"]') ||
                        target.closest('.MuiBottomNavigation-root') ||
                        target.closest('.MuiBottomNavigationAction-root') ||
                        target.closest('.MuiListItem-root') ||
                        target.closest('.MuiButton-root') ||
                        target.closest('nav');
      
      if (isNavClick) {
        console.log('Navigation click detected, unmounting Maps and disabling elements');
        
        // Immediately unmount Maps components to force React cleanup
        setIsUnmounting(true);
        
        // Disable Google Maps elements (but NOT the container - let the click through)
        const mapElements = document.querySelectorAll('[class*="gm-"], [class*="gmnoprint"], [class*="gm-style"], .pac-container');
        mapElements.forEach(el => {
          (el as HTMLElement).style.pointerEvents = 'none';
        });
        
        // Schedule full cleanup after navigation starts
        setTimeout(() => forceGlobalCleanup(), 100);
      }
    };

    // Add listener with capture phase to intercept clicks early
    document.addEventListener('click', handleDocumentClick, { capture: true });
    document.addEventListener('mousedown', handleDocumentClick, { capture: true });
    
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      document.removeEventListener('mousedown', handleDocumentClick, { capture: true });
    };
  }, []);

  // Execute cleanup on unmount
  useEffect(() => {
    cleanupExecutedRef.current = false;
    setIsUnmounting(false);
    
    return () => {
      // Small delay to ensure cleanup happens after any pending state updates
      setTimeout(() => {
        forceGlobalCleanup();
      }, 0);
    };
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Don't render Maps if unmounting
  if (isUnmounting) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Navigating...
        </Typography>
      </Container>
    );
  }

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
