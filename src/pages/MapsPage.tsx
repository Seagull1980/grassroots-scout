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

  // Add global CSS to ensure navigation is always accessible
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'maps-nav-fix';
    style.textContent = `
      /* Ensure navigation elements are always clickable and on top */
      nav,
      .MuiAppBar-root,
      .MuiBottomNavigation-root,
      header,
      [role="navigation"] {
        position: relative !important;
        z-index: 10000 !important;
        pointer-events: auto !important;
      }
      
      /* Ensure map container doesn't cover navigation */
      #map-container {
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* Google Maps controls should not block navigation */
      .gm-style,
      .gm-style > div,
      .gm-style-cc {
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup on unmount
    return () => {
      const existingStyle = document.getElementById('maps-nav-fix');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      // Remove Google Maps elements
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
