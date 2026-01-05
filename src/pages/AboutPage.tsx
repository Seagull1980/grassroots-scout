import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Divider,
  Paper
} from '@mui/material';
import {
  Sports,
  Code,
  Groups,
  Favorite,
  EmojiEvents
} from '@mui/icons-material';
import { AboutContent, defaultAboutContent } from '../types/about';

const AboutPage: React.FC = () => {
  const [aboutContent, setAboutContent] = useState<AboutContent>(defaultAboutContent);

  useEffect(() => {
    loadAboutContent();
  }, []);

  const loadAboutContent = async () => {
    try {
      // In a real app, this would fetch from your backend
      // For now, we'll use localStorage or default content
      const savedContent = localStorage.getItem('aboutContent');
      if (savedContent) {
        const content = JSON.parse(savedContent);
        setAboutContent(content);
      }
    } catch (err) {
      console.error('Failed to load about content:', err);
      // Use default content if loading fails
      setAboutContent(defaultAboutContent);
    }
  };
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {aboutContent.title}
        </Typography>
        <Typography variant="h5" color="textSecondary" sx={{ maxWidth: 800, mx: 'auto' }}>
          {aboutContent.subtitle}
        </Typography>
      </Box>

      {/* Founder's Story Section */}
      <Paper elevation={3} sx={{ p: 4, mb: 6, borderRadius: 3 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 150,
                height: 150,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
                fontSize: '3rem'
              }}
            >
              CG
            </Avatar>
            <Typography variant="h4" gutterBottom>
              {aboutContent.founderName}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {aboutContent.founderTitle}
            </Typography>
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
              My Story
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
              {aboutContent.personalStory.paragraph1}
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
              {aboutContent.personalStory.paragraph2}
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
              {aboutContent.personalStory.paragraph3}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Mission & Vision Section */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }} elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <EmojiEvents sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Typography variant="h4" sx={{ color: 'primary.main' }}>
                  Our Mission
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                {aboutContent.mission}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }} elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Favorite sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Typography variant="h4" sx={{ color: 'primary.main' }}>
                  Our Vision
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                {aboutContent.vision}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* What Makes Us Different */}
      <Paper elevation={2} sx={{ p: 4, mb: 6, borderRadius: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', color: 'primary.main', mb: 4 }}>
          What Makes The Grassroots Scout Different
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Sports sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {aboutContent.differentiators.footballPeople.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {aboutContent.differentiators.footballPeople.description}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Code sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {aboutContent.differentiators.modernTechnology.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {aboutContent.differentiators.modernTechnology.description}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Groups sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {aboutContent.differentiators.communityFocused.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {aboutContent.differentiators.communityFocused.description}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Personal Touch */}
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', textAlign: 'center', mb: 3 }}>
            A Personal Message
          </Typography>
          <Divider sx={{ mb: 3, width: '60%', mx: 'auto' }} />
          <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.8, fontStyle: 'italic', textAlign: 'center' }}>
            "{aboutContent.personalMessage}"
          </Typography>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="h6" sx={{ color: 'primary.main' }}>
              - {aboutContent.founderName}, Founder
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Box sx={{ textAlign: 'center', mt: 6, p: 4, bgcolor: 'primary.main', color: 'white', borderRadius: 3 }}>
        <Typography variant="h4" gutterBottom>
          {aboutContent.callToAction.title}
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '1.1rem', mb: 3, opacity: 0.9 }}>
          {aboutContent.callToAction.description}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {aboutContent.callToAction.footer}
        </Typography>
      </Box>
    </Container>
  );
};

export default AboutPage;
