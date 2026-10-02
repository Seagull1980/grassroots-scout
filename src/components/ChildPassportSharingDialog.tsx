import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { passportAPI } from '../services/api';

interface Props {
  open: boolean;
  childId: number;
  childFirstName: string;
  isPublic: boolean;
  onClose: () => void;
  onChanged: (isPublic: boolean) => void;
}

const SHOWN = ['First name and last initial only', 'Position', 'Club history (team and season)', 'Achievements'];
const NEVER = ['Date of birth or age', 'School', 'Medical and emergency contact details', 'Bio', 'Photos', 'Messages'];

const ChildPassportSharingDialog: React.FC<Props> = ({ open, childId, childFirstName, isPublic, onClose, onChanged }) => {
  const navigate = useNavigate();
  const [understood, setUnderstood] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setUnderstood(false);
      setError('');
    }
  }, [open]);

  const update = async (next: boolean) => {
    setSaving(true);
    setError('');
    try {
      const result = await passportAPI.setChildVisibility(childId, next);
      onChanged(result.isPublic);
      onClose();
    } catch {
      setError('Could not update sharing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{childFirstName}'s Football Passport</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Alert severity={isPublic ? 'warning' : 'success'} sx={{ mb: 2 }}>
          {isPublic
            ? 'SHARED: visible to signed-in members of Grassroots Scout.'
            : 'PRIVATE: nobody else can see this passport. It is private unless you, as parent or guardian, choose to share it.'}
        </Alert>

        <Typography variant="subtitle2" gutterBottom>If shared, signed-in members can see:</Typography>
        <Box component="ul" sx={{ mt: 0, mb: 2 }}>
          {SHOWN.map((item) => <li key={item}><Typography variant="body2">{item}</Typography></li>)}
        </Box>

        <Typography variant="subtitle2" gutterBottom>Never shown, whatever you choose:</Typography>
        <Box component="ul" sx={{ mt: 0, mb: 2 }}>
          {NEVER.map((item) => <li key={item}><Typography variant="body2">{item}</Typography></li>)}
        </Box>

        {!isPublic && (
          <FormControlLabel
            control={<Checkbox checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />}
            label={`I am ${childFirstName}'s parent or guardian. I understand this will be visible to signed-in members and I choose to share it.`}
          />
        )}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          You can make it private again at any time.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{isPublic ? 'Close' : 'Keep private'}</Button>
        {isPublic ? (
          <>
            <Button onClick={() => navigate(`/passport/child/${childId}`)}>View passport</Button>
            <Button color="error" variant="contained" disabled={saving} onClick={() => update(false)}>
              {saving ? 'Saving...' : 'Make private'}
            </Button>
          </>
        ) : (
          <Button variant="contained" disabled={!understood || saving} onClick={() => update(true)}>
            {saving ? 'Saving...' : 'Share passport'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ChildPassportSharingDialog;
