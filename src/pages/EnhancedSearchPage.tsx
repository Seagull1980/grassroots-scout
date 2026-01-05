import { Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EnhancedSearch from '../components/EnhancedSearch';
import { SearchFilters } from '../types';

const EnhancedSearchPage = () => {
  const navigate = useNavigate();

  const handleSearch = (searchParams: SearchFilters) => {
    // Navigate to search results or handle search
    navigate('/search', { state: { searchParams } });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <EnhancedSearch onSearch={handleSearch} />
    </Container>
  );
};

export default EnhancedSearchPage;
