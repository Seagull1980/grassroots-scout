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

  // Force cleanup function that removes ALL Google Maps elements from entire document
  const forceGlobalCleanup = () => {
    if (cleanupExecutedRef.current) return;
    cleanupExecutedRef.current = true;
    
    console.log('MapsPage: Executing global Google Maps cleanup');
    
    // IMMEDIATELY hide and disable all Google Maps elements
    const allMapElements = document.querySelectorAll('[class*="gm-"], [class*="gmnoprint"], [class*="gm-style"], .pac-container');
    allMapElements.forEach(el => {
      const element = el as HTMLElement;
      element.style.display = 'none';
      element.style.pointerEvents = 'none';
      element.style.visibility = 'hidden';
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

  // Monitor location changes - if we're navigating away, cleanup immediately
  useEffect(() => {
    // Listen for clicks on navigation elements
    const handleNavigationClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if clicking on navigation
      const isNavigation = target.closest('nav') || 
                          target.closest('.MuiBottomNavigation-root') ||
                          target.closest('.MuiAppBar-root') ||
                          target.closest('a[href]') ||
                          target.closest('button[aria-label]');
      
      if (isNavigation && containerRef.current) {
        console.log('Navigation click detected - removing Maps page container');
        
        // Remove ALL Google Maps elements immediately
        const allMapElements = document.querySelectorAll('[class*="gm-"], [class*="gmnoprint"], [class*="gm-style"], .pac-container');
        allMapElements.forEach(el => {
          try {
            el.remove();
          } catch (e) {
            // Ignore
          }
        });
        
        // Hide the maps container itself to allow new page to render
        containerRef.current.style.display = 'none';
      }
    };

    // Add listener with capture phase
    document.addEventListener('click', handleNavigationClick, true);
    
    return () => {
      document.removeEventListener('click', handleNavigationClick, true);
      
      // Final cleanup on unmount
      cleanupExecutedRef.current = false;
      forceGlobalCleanup();
    };
  }, []);

  // Execute cleanup on unmount
  useEffect(() => {
    cleanupExecutedRef.current = false; // Reset on mount
    
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
