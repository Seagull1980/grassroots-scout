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

  // Continuous cleanup to prevent Google Maps from blocking navigation
  useEffect(() => {
    // Ensure navigation elements stay above Google Maps
    const ensureNavigationAccessible = () => {
      // Disable pointer events on ALL Google Maps overlays
      const mapElements = document.querySelectorAll('[class*="gm-"], [class*="gmnoprint"], [class*="gm-style"], .pac-container');
      mapElements.forEach(el => {
        const element = el as HTMLElement;
        // Only disable pointer events on overlay elements, not the main map container
        if (!element.closest('[id^="map-container"]')) {
          element.style.pointerEvents = 'none';
        }
      });
      
      // Ensure navigation has high z-index
      const navElements = document.querySelectorAll('nav, .MuiBottomNavigation-root, .MuiAppBar-root, header');
      navElements.forEach(el => {
        const element = el as HTMLElement;
        if (element.style.zIndex === '' || parseInt(element.style.zIndex) < 9999) {
          element.style.zIndex = '9999';
        }
      });
    };

    // Run immediately
    ensureNavigationAccessible();
    
    // Run periodically to catch dynamically added elements
    const intervalId = setInterval(ensureNavigationAccessible, 100);
    
    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
      
      // Full cleanup
      console.log('MapsPage: Cleaning up Google Maps elements');
      const selectors = [
        '[class*="gm-"]',
        '[class*="gmnoprint"]', 
        '[class*="gm-style"]',
        '.pac-container'
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          try {
            el.remove();
          } catch (e) {
            // Ignore
          }
        });
      });
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
