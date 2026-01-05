import { Container } from '@mui/material';
import EnhancedDashboard from '../components/EnhancedDashboard';

const EnhancedDashboardPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <EnhancedDashboard />
    </Container>
  );
};

export default EnhancedDashboardPage;
