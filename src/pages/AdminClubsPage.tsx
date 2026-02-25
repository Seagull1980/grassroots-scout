import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Club {
  name: string;
  teamCount: number;
}

const AdminClubsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/admin');
      return;
    }
    fetchClubs();
  }, [user, navigate]);

  const fetchClubs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      const teams = Array.isArray(data.teams) ? data.teams : [];
      
      // Group teams by club and count them
      const clubMap = new Map<string, number>();
      teams.forEach((team: any) => {
        const clubName = team.clubName || 'Unassigned';
        clubMap.set(clubName, (clubMap.get(clubName) || 0) + 1);
      });

      // Convert to array and sort by name
      const clubsList = Array.from(clubMap, ([name, teamCount]) => ({
        name,
        teamCount
      })).sort((a, b) => a.name.localeCompare(b.name));

      setClubs(clubsList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch clubs');
      console.error('Error fetching clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter clubs based on search query
  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedClubs = filteredClubs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (!user || user.role !== 'Admin') {
    return null;
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        mb: 3,
        py: 3
      }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/admin')}
              sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Back
            </Button>
            <Box>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                Clubs Management
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                View all clubs and their teams
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper elevation={2}>
          <Box sx={{ p: 2 }}>
            {/* Search */}
            <TextField
              fullWidth
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f3f4f6' }}>
                    <TableCell><strong>Club Name</strong></TableCell>
                    <TableCell align="right"><strong>Teams</strong></TableCell>
                    <TableCell align="right"><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : paginatedClubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        <GroupIcon sx={{ fontSize: 48, mb: 2, display: 'block', opacity: 0.5 }} />
                        <Typography>No clubs found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedClubs.map((club) => (
                      <TableRow 
                        key={club.name}
                        sx={{ 
                          '&:hover': { backgroundColor: '#f9fafb' },
                          cursor: 'pointer'
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {club.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            icon={<GroupIcon />}
                            label={club.teamCount}
                            color={club.teamCount > 0 ? 'primary' : 'default'}
                            variant={club.teamCount > 0 ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/admin/clubs/${encodeURIComponent(club.name)}`)}
                          >
                            View Teams
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredClubs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminClubsPage;
