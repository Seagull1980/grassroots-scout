import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import { Map as MapIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import MapSearchSimplified from '../components/MapSearchSimplified';
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

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Render the Maps page
  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Map Search"
        subtitle="Find teams and players using our interactive map"
        icon={<MapIcon sx={{ fontSize: 32 }} />}
        maxWidth="xl"
      />
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Paper elevation={2}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab label="Team Vacancies" />
            <Tab label="Available Players" />
            <Tab label="All Results" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <MapSearchSimplified key="vacancies-tab" searchType="vacancies" />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <MapSearchSimplified key="players-tab" searchType="players" />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <MapSearchSimplified key="both-tab" searchType="both" />
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default MapsPage;
