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

  // Inject global CSS to keep Maps below navbar and allow navigation clicks
  useEffect(() => {
    const styleId = 'maps-z-index-override';
    
    // Remove existing style if any
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Inject CSS that forces Maps elements below navbar
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Force all Google Maps elements below navigation */
      .gm-style,
      .gm-style-iw,
      .gm-style-cc,
      .gmnoprint,
      [class*="gm-"] {
        z-index: 1000 !important;
        max-z-index: 1000 !important;
      }
      
      /* Ensure navbar stays on top */
      header[class*="MuiAppBar"],
      nav[class*="MuiAppBar"] {
        z-index: 999999 !important;
        position: relative !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Remove style on unmount
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
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
