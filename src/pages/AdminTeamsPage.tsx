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
  Sports as SportsIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Team {
  id: number;
  teamName: string;
  clubName: string;
  ageGroup: string;
  league: string;
  teamGender: string;
}

const AdminTeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { clubName } = useParams<{ clubName: string }>();
  const { user } = useAuth();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const decodedClubName = decodeURIComponent(clubName || '');

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/admin');
      return;
    }
    fetchTeams();
  }, [user, navigate, decodedClubName]);

  const fetchTeams = async () => {
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
      const allTeams = Array.isArray(data.teams) ? data.teams : [];
      
      // Filter teams by club name
      const clubTeams = allTeams
        .filter((team: any) => (team.clubName || 'Unassigned') === decodedClubName)
        .sort((a: any, b: any) => a.teamName.localeCompare(b.teamName));

      setTeams(clubTeams);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch teams');
      console.error('Error fetching teams:', err);
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

  // Filter teams based on search query
  const filteredTeams = teams.filter(team =>
    team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.ageGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.league.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedTeams = filteredTeams.slice(
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
              onClick={() => navigate('/admin/clubs')}
              sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Back to Clubs
            </Button>
            <Box>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                {decodedClubName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                {teams.length} team{teams.length !== 1 ? 's' : ''}
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
              placeholder="Search teams..."
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
                    <TableCell><strong>Team Name</strong></TableCell>
                    <TableCell><strong>Age Group</strong></TableCell>
                    <TableCell><strong>League</strong></TableCell>
                    <TableCell><strong>Gender</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : paginatedTeams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        <SportsIcon sx={{ fontSize: 48, mb: 2, display: 'block', opacity: 0.5 }} />
                        <Typography>No teams found in this club</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTeams.map((team) => (
                      <TableRow 
                        key={team.id}
                        sx={{ 
                          '&:hover': { backgroundColor: '#f9fafb' },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {team.teamName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={team.ageGroup} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{team.league}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{team.teamGender}</Typography>
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
              count={filteredTeams.length}
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

export default AdminTeamsPage;
