import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { Lock, Public } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { passportAPI } from '../services/api';

const PassportSharing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCoach = user?.role === 'Coach';

  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    passportAPI
      .getVisibility()
      .then((result) => setIsPublic(result.isPublic))
      .catch(() => setError('Could not load your sharing setting.'));
  }, []);

  const update = async (next: boolean) => {
    setSaving(true);
    setError('');
    try {
      const result = await passportAPI.setVisibility(next);
      setIsPublic(result.isPublic);
      setConfirmOpen(false);
      setUnderstood(false);
    } catch {
      setError('Could not update your setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isPublic === null) {
    return error ? <Alert severity="error">{error}</Alert> : <CircularProgress />;
  }

  const shownItems = isCoach
    ? ['Your name and role', 'Your coaching history (teams, leagues, age groups, seasons)', 'Your achievements', 'Testimonials you have chosen to make public']
    : ['Your name and role', 'Your position', 'Your playing history (teams, leagues, age groups, seasons)', 'Your achievements', 'Testimonials you have chosen to make public'];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Football Passport sharing
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your passport is <strong>private by default</strong>. Nobody else can see it unless you choose to share it here.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderWidth: 2,
          borderColor: isPublic ? 'warning.main' : 'success.main'
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          {isPublic ? <Public color="warning" fontSize="large" /> : <Lock color="success" fontSize="large" />}
          <Box>
            <Typography variant="h6">
              {isPublic ? 'SHARED: visible to signed-in members' : 'PRIVATE: only you can see your passport'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isPublic
                ? 'Only people signed in to Grassroots Scout can see the details listed below. It is not visible to the general public or search engines.'
                : 'Nothing from your passport is visible to other people.'}
            </Typography>
          </Box>
        </Stack>

        {isPublic ? (
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => user && navigate(`/profile/view/${user.id}`)}>
              View my shared passport
            </Button>
            <Button color="error" variant="contained" disabled={saving} onClick={() => update(false)}>
              {saving ? 'Saving...' : 'Make private'}
            </Button>
          </Stack>
        ) : (
          <Button variant="contained" onClick={() => setConfirmOpen(true)}>
            Share my passport with signed-in members
          </Button>
        )}
      </Paper>

      <Typography variant="subtitle2" gutterBottom>If you share your passport, people can see:</Typography>
      <Box component="ul" sx={{ mt: 0, mb: 2 }}>
        {shownItems.map((item) => (
          <li key={item}><Typography variant="body2">{item}</Typography></li>
        ))}
      </Box>

      <Typography variant="subtitle2" gutterBottom>Never shown, whatever you choose:</Typography>
      <Box component="ul" sx={{ mt: 0 }}>
        {['Email address and phone number', 'Date of birth and home location', 'Medical and emergency contact details', 'Private notes on your history entries', 'Your messages'].map((item) => (
          <li key={item}><Typography variant="body2">{item}</Typography></li>
        ))}
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        You can switch this off at any time and your passport becomes private straight away.
      </Alert>

      <Dialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Share your Football Passport?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            If you continue, anyone signed in to Grassroots Scout will be able to see:
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 2 }}>
            {shownItems.map((item) => (
              <li key={item}><Typography variant="body2">{item}</Typography></li>
            ))}
          </Box>
          <FormControlLabel
            control={<Checkbox checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />}
            label="I understand this will be visible to signed-in members and I choose to share it."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>Keep private</Button>
          <Button variant="contained" disabled={!understood || saving} onClick={() => update(true)}>
            {saving ? 'Saving...' : 'Share passport'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PassportSharing;
