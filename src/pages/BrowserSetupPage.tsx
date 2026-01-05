import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { storage } from '../utils/storage';

const BrowserSetupPage: React.FC = () => {
  const storageType = storage.getStorageType();
  const isWorking = storageType === 'localStorage';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Browser Setup Guide
      </Typography>
      
      <Alert
        severity={isWorking ? 'success' : 'warning'}
        icon={isWorking ? <CheckCircleIcon /> : <WarningIcon />}
        sx={{ mb: 3 }}
      >
        <Typography variant="h6" component="div">
          Storage Status: <Chip 
            label={isWorking ? 'Working Correctly' : 'Using Fallback Mode'} 
            color={isWorking ? 'success' : 'warning'}
            size="small"
          />
        </Typography>
        {isWorking ? (
          'Your browser is configured correctly for The Grassroots Scout.'
        ) : (
          'Your browser is blocking storage access. Follow the guide below to fix this issue.'
        )}
      </Alert>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Why am I seeing this?
        </Typography>
        <Typography variant="body1" paragraph>
          Some browsers have tracking prevention features that block websites from storing data locally. 
          While The Grassroots Scout will still work, you may need to log in again each time you visit.
        </Typography>
      </Paper>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Browser-Specific Solutions
      </Typography>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Safari (Mac/iPhone/iPad)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="body1" gutterBottom>
              <strong>Desktop Safari:</strong>
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="1. Go to Safari → Preferences → Privacy" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. Uncheck 'Prevent cross-site tracking'" />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. Or add grassrootshub.com to exceptions" />
              </ListItem>
            </List>

            <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
              <strong>Mobile Safari:</strong>
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="1. Settings → Safari → Privacy & Security" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. Turn off 'Prevent Cross-Site Tracking'" />
              </ListItem>
            </List>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Firefox</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            <ListItem>
              <ListItemText primary="1. Click the shield icon in the address bar" />
            </ListItem>
            <ListItem>
              <ListItemText primary="2. Turn off 'Enhanced Tracking Protection' for this site" />
            </ListItem>
            <ListItem>
              <ListItemText primary="3. Or go to Settings → Privacy & Security → manage exceptions" />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Microsoft Edge</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            <ListItem>
              <ListItemText primary="1. Click the lock icon in the address bar" />
            </ListItem>
            <ListItem>
              <ListItemText primary="2. Click 'Tracking prevention'" />
            </ListItem>
            <ListItem>
              <ListItemText primary="3. Turn off tracking prevention for this site" />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Chrome (Usually Works)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1">
            Chrome typically doesn't block localStorage by default. If you're having issues:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="1. Check if you're in Incognito mode" />
            </ListItem>
            <ListItem>
              <ListItemText primary="2. Clear browser data and try again" />
            </ListItem>
            <ListItem>
              <ListItemText primary="3. Disable ad blockers temporarily" />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      <Paper elevation={1} sx={{ p: 3, mt: 4, backgroundColor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          Alternative Solutions
        </Typography>
        <Typography variant="body1">
          If you prefer to keep your privacy settings as they are:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="• The app will work normally, just bookmark the login page" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Consider using a dedicated browser for grassroots football activities" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Use Chrome or another browser that doesn't block storage by default" />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
};

export default BrowserSetupPage;
