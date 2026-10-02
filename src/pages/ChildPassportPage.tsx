import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { passportAPI, PublicChildPassport } from '../services/api';

const ChildPassportPage: React.FC = () => {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [passport, setPassport] = useState<PublicChildPassport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    passportAPI
      .getPublicChild(Number(childId))
      .then(setPassport)
      .catch(() => setPassport({ isPublic: false }))
      .finally(() => setLoading(false));
  }, [childId]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!passport?.isPublic) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">This passport is not shared.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go back</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary">Football Passport</Typography>
        <Typography variant="h5" gutterBottom>{passport.displayName}</Typography>
        {passport.position && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Position: {passport.position}
          </Typography>
        )}

        <Typography variant="subtitle2" gutterBottom>Club history</Typography>
        {passport.history && passport.history.length > 0 ? (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {passport.history.map((entry, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, py: 0.5, borderTop: '1px solid #eee' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>{entry.season}</Typography>
                <Typography variant="body2">{entry.teamName}</Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No history added yet.</Typography>
        )}

        {passport.achievements && passport.achievements.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>Achievements</Typography>
            <Stack spacing={0.5}>
              {passport.achievements.map((achievement, index) => (
                <Typography key={index} variant="body2">
                  {achievement.title}{achievement.year ? ` (${achievement.year})` : ''}
                </Typography>
              ))}
            </Stack>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default ChildPassportPage;
