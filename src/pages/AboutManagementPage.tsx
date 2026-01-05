import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { AboutContent, defaultAboutContent } from '../types/about';

const AboutManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [aboutContent, setAboutContent] = useState<AboutContent>(defaultAboutContent);
  const [originalContent, setOriginalContent] = useState<AboutContent>(defaultAboutContent);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadAboutContent();
  }, []);

  useEffect(() => {
    // Check if content has changed
    const contentChanged = JSON.stringify(aboutContent) !== JSON.stringify(originalContent);
    setHasChanges(contentChanged);
  }, [aboutContent, originalContent]);

  const loadAboutContent = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from your backend
      // For now, we'll use localStorage or default content
      const savedContent = localStorage.getItem('aboutContent');
      if (savedContent) {
        const content = JSON.parse(savedContent);
        setAboutContent(content);
        setOriginalContent(content);
      } else {
        setAboutContent(defaultAboutContent);
        setOriginalContent(defaultAboutContent);
      }
    } catch (err) {
      setError('Failed to load about content');
    } finally {
      setLoading(false);
    }
  };

  const saveAboutContent = async () => {
    try {
      setLoading(true);
      setError('');
      
      const updatedContent: AboutContent = {
        ...aboutContent,
        lastUpdated: new Date().toISOString(),
        updatedBy: user?.firstName + ' ' + user?.lastName || 'Admin'
      };

      // In a real app, this would save to your backend
      localStorage.setItem('aboutContent', JSON.stringify(updatedContent));
      
      setAboutContent(updatedContent);
      setOriginalContent(updatedContent);
      setSuccess('About content updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save about content');
    } finally {
      setLoading(false);
    }
  };

  const resetContent = () => {
    setAboutContent(originalContent);
    setError('');
    setSuccess('');
  };

  const handleFieldChange = (field: string, value: string) => {
    setAboutContent(prev => {
      const newContent = { ...prev };
      const fieldParts = field.split('.');
      
      if (fieldParts.length === 1) {
        (newContent as any)[fieldParts[0]] = value;
      } else if (fieldParts.length === 2) {
        (newContent as any)[fieldParts[0]][fieldParts[1]] = value;
      } else if (fieldParts.length === 3) {
        (newContent as any)[fieldParts[0]][fieldParts[1]][fieldParts[2]] = value;
      }
      
      return newContent;
    });
  };

  if (user?.role !== 'Admin') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          Access denied. Only administrators can manage the About page content.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
          Manage About Page Content
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
          Update the content displayed on the About Us page. Changes will be reflected immediately.
        </Typography>
        
        {aboutContent.lastUpdated && (
          <Chip 
            icon={<InfoIcon />} 
            label={`Last updated: ${new Date(aboutContent.lastUpdated).toLocaleDateString('en-GB')} by ${aboutContent.updatedBy}`}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveAboutContent}
            disabled={loading || !hasChanges}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={resetContent}
            disabled={loading || !hasChanges}
          >
            Reset Changes
          </Button>
        </Box>

        {hasChanges && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You have unsaved changes. Remember to save your updates.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Header Section */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Header Section</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Page Title"
                      value={aboutContent.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Subtitle"
                      value={aboutContent.subtitle}
                      onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Founder Section */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Founder Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Founder Name"
                      value={aboutContent.founderName}
                      onChange={(e) => handleFieldChange('founderName', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Founder Title"
                      value={aboutContent.founderTitle}
                      onChange={(e) => handleFieldChange('founderTitle', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Personal Story */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Personal Story</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Paragraph 1"
                      value={aboutContent.personalStory.paragraph1}
                      onChange={(e) => handleFieldChange('personalStory.paragraph1', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Paragraph 2"
                      value={aboutContent.personalStory.paragraph2}
                      onChange={(e) => handleFieldChange('personalStory.paragraph2', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Paragraph 3"
                      value={aboutContent.personalStory.paragraph3}
                      onChange={(e) => handleFieldChange('personalStory.paragraph3', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Mission & Vision */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Mission & Vision</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Mission Statement"
                      value={aboutContent.mission}
                      onChange={(e) => handleFieldChange('mission', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Vision Statement"
                      value={aboutContent.vision}
                      onChange={(e) => handleFieldChange('vision', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Differentiators */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">What Makes Us Different</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Football People - Title"
                      value={aboutContent.differentiators.footballPeople.title}
                      onChange={(e) => handleFieldChange('differentiators.footballPeople.title', e.target.value)}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Football People - Description"
                      value={aboutContent.differentiators.footballPeople.description}
                      onChange={(e) => handleFieldChange('differentiators.footballPeople.description', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Modern Technology - Title"
                      value={aboutContent.differentiators.modernTechnology.title}
                      onChange={(e) => handleFieldChange('differentiators.modernTechnology.title', e.target.value)}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Modern Technology - Description"
                      value={aboutContent.differentiators.modernTechnology.description}
                      onChange={(e) => handleFieldChange('differentiators.modernTechnology.description', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Community Focused - Title"
                      value={aboutContent.differentiators.communityFocused.title}
                      onChange={(e) => handleFieldChange('differentiators.communityFocused.title', e.target.value)}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Community Focused - Description"
                      value={aboutContent.differentiators.communityFocused.description}
                      onChange={(e) => handleFieldChange('differentiators.communityFocused.description', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Personal Message */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Personal Message</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Personal Message Quote"
                  value={aboutContent.personalMessage}
                  onChange={(e) => handleFieldChange('personalMessage', e.target.value)}
                  variant="outlined"
                  helperText="This appears as a quote from the founder"
                />
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Call to Action */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Call to Action</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Call to Action Title"
                      value={aboutContent.callToAction.title}
                      onChange={(e) => handleFieldChange('callToAction.title', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Call to Action Description"
                      value={aboutContent.callToAction.description}
                      onChange={(e) => handleFieldChange('callToAction.description', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Call to Action Footer"
                      value={aboutContent.callToAction.footer}
                      onChange={(e) => handleFieldChange('callToAction.footer', e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default AboutManagementPage;
