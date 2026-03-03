import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import { Map as MapIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import MapSearch from '../components/MapSearch';
import PageHeader from '../components/PageHeader';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 1.5 }}>{children}</Box>}
    </div>
  );
};

const MapsPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Set tab to Available Players for coaches
  useEffect(() => {
    if (user?.role === 'Coach') {
      setTabValue(1);
    }
  }, [user?.role]);
  const [shouldRenderMaps, setShouldRenderMaps] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Immediately unmount maps when component is about to unmount
  useEffect(() => {
    return () => {
      console.log('MapsPage unmounting - hiding Maps immediately');
      setShouldRenderMaps(false);
      
      // Hide all Google Maps elements immediately
      setTimeout(() => {
        const mapElements = document.querySelectorAll('[class*="gm-"], [class*="gmnoprint"], [class*="gm-style"], .pac-container');
        mapElements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      }, 0);
    };
  }, []);

  // Inject global CSS to keep Maps below navbar while preserving map interactions
  useEffect(() => {
    const styleId = 'maps-z-index-override';
    
    // Remove existing style if any
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Inject CSS that keeps Maps elements below the navbar
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
      
      /* Ensure navbar stays on top and always clickable */
      header[class*="MuiAppBar"],
      nav[class*="MuiAppBar"],
      nav a,
      header a,
      header button,
      nav button {
        z-index: 999999 !important;
        position: relative !important;
        pointer-events: auto !important;
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
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Map Search"
        subtitle="Find teams and players using our interactive map"
        icon={<MapIcon sx={{ fontSize: 32 }} />}
        maxWidth="xl"
      />
      <Container ref={containerRef} maxWidth="xl" sx={{ py: 1.5, position: 'relative', zIndex: 1 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
          Find teams and players using our interactive map with location-based search. Click anywhere on the map, draw custom search areas, and see results with precise locations and distances.
        </Typography>

        <Paper id="maps-paper" elevation={2} sx={{ position: 'relative', zIndex: 1 }}>
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
          {shouldRenderMaps && <MapSearch key="vacancies-tab" searchType="vacancies" />}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {shouldRenderMaps && <MapSearch key="availability-tab" searchType="availability" />}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {shouldRenderMaps && <MapSearch key="both-tab" searchType="both" />}
        </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default MapsPage;
