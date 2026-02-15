import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { Delete, Search } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../services/api';

interface FrozenVacancy {
  id: number;
  title: string;
  description: string;
  league: string;
  ageGroup: string;
  position: string;
  teamGender: string;
  location: string;
  postedBy: number;
  createdAt: string;
  status: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface FrozenAvailability {
  id: number;
  title: string;
  description: string;
  ageGroup: string;
  positions: string;
  preferredTeamGender: string;
  location: string;
  postedBy: number;
  createdAt: string;
  status: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

const AdminFrozenAdvertsPage: React.FC = () => {
  const [tab, setTab] = useState<'vacancy' | 'player'>('vacancy');
  const [search, setSearch] = useState('');
  const [vacancies, setVacancies] = useState<FrozenVacancy[]>([]);
  const [availability, setAvailability] = useState<FrozenAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFrozenAdverts = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/frozen-adverts`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search: search.trim() || undefined
        }
      });

      setVacancies(response.data?.vacancies || []);
      setAvailability(response.data?.playerAvailability || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch frozen adverts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: 'vacancy' | 'player', id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this advert?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/adverts/${type}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchFrozenAdverts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete advert');
    }
  };

  useEffect(() => {
    fetchFrozenAdverts();
  }, []);

  const data = tab === 'vacancy' ? vacancies : availability;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Frozen Adverts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Frozen adverts are created when a user is deleted. Admins can search and permanently remove them.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Search frozen adverts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 280 }}
          />
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={fetchFrozenAdverts}
            disabled={loading}
          >
            Search
          </Button>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label={`Team Vacancies (${vacancies.length})`} value="vacancy" />
          <Tab label={`Player Availability (${availability.length})`} value="player" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : data.length === 0 ? (
          <Alert severity="info">No frozen adverts found.</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Posted By</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((item: any) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.location || 'N/A'}</TableCell>
                    <TableCell>
                      {item.firstName || item.lastName
                        ? `${item.firstName || ''} ${item.lastName || ''}`.trim()
                        : item.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(tab, item.id)}
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default AdminFrozenAdvertsPage;
