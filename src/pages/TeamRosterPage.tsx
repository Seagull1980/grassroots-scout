import { Box, Container, Typography, Breadcrumbs, Link } from '@mui/material';
import { Home as HomeIcon, Groups as GroupsIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import TeamRosterManagement from '../components/TeamRosterManagement';

const TeamRosterPage = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          component={RouterLink} 
          to="/dashboard" 
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          underline="hover"
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Typography 
          color="text.primary" 
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <GroupsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Team Roster Management
        </Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Team Roster Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage your team rosters, add players with their positions, and analyze squad gaps
        </Typography>
      </Box>

      {/* Team Roster Management Component */}
      <TeamRosterManagement />
    </Container>
  );
};

export default TeamRosterPage;
