import { Container } from '@mui/material';
import Recommendations from '../components/Recommendations';

const RecommendationsPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <Recommendations />
    </Container>
  );
};

export default RecommendationsPage;
