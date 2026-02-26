import {
  Box,
  Container,
  Typography,
  Grid,
  Link,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      component="footer"
      sx={{
        background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
        color: 'white',
        py: 8,
        mt: 10,
        borderTop: '1px solid rgba(0, 102, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="flex-start">
          {/* Logo and Brand Section */}
          <Grid item xs={12} md={3}>
            <Box sx={{ pb: 3, borderBottom: { xs: '1px solid rgba(0, 102, 255, 0.1)', md: 'none' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  component="img"
                  src="/logo.jpg"
                  alt="The Grassroots Hub Logo"
                  sx={{
                    height: 50,
                    width: 50,
                    borderRadius: '8px',
                    objectFit: 'cover',
                    mr: 2,
                  }}
                />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    The Grassroots Hub
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      fontStyle: 'italic',
                      fontSize: '0.9rem'
                    }}
                  >
                    Connect. Play. Develop
                  </Typography>
                </Box>
              </Box>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.7)', maxWidth: '300px', lineHeight: 1.8 }}
              >
                Building bridges between talented players and grassroots football teams across communities.
              </Typography>
            </Box>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} md={3}>
            <Box sx={{ pb: 3, borderBottom: { xs: '1px solid rgba(0, 102, 255, 0.1)', md: 'none' } }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#0066FF', mb: 2 }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/search')}
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    textAlign: 'left',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: '#0066FF', transform: 'translateX(4px)' }
                  }}
                >
                  Find Teams
                </Link>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/post-advert')}
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    textAlign: 'left',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: '#0066FF', transform: 'translateX(4px)' }
                  }}
                >
                  Post Vacancy
                </Link>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/success-stories')}
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    textAlign: 'left',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: '#0066FF', transform: 'translateX(4px)' }
                  }}
                >
                  Success Stories
                </Link>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/about')}
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    textAlign: 'left',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: '#0066FF', transform: 'translateX(4px)' }
                  }}
                >
                  About Us
                </Link>
              </Box>
            </Box>
          </Grid>

          {/* Contact & Info */}
          <Grid item xs={12} md={3}>
            <Box sx={{ pb: 3, borderBottom: { xs: '1px solid rgba(0, 102, 255, 0.1)', md: 'none' } }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#FF6B35', mb: 2 }}>
                Get In Touch
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, lineHeight: 1.8, fontSize: '0.95rem' }}
              >
                Have questions or suggestions? We'd love to hear from you and help you connect with the perfect opportunity.
              </Typography>
              <Box sx={{ 
                backgroundColor: 'rgba(0, 102, 255, 0.1)', 
                p: 2, 
                borderRadius: 2,
                border: '1px solid rgba(0, 102, 255, 0.2)'
              }}>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}
                >
                  📧 thegrassrootsupp@gmail.com
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Resources Section */}
          <Grid item xs={12} md={3}>
            <Box sx={{ pb: 3, borderBottom: { xs: '1px solid rgba(0, 102, 255, 0.1)', md: 'none' } }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#10B981', mb: 2 }}>
                Resources
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/about')}
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    textAlign: 'left',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: '#10B981', transform: 'translateX(4px)' }
                  }}
                >
                  Privacy Policy
                </Link>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/about')}
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    textAlign: 'left',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: '#10B981', transform: 'translateX(4px)' }
                  }}
                >
                  Terms of Service
                </Link>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/about')}
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    textAlign: 'left',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: '#10B981', transform: 'translateX(4px)' }
                  }}
                >
                  Contact Support
                </Link>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Bottom Section */}
        <Box
          sx={{
            borderTop: '1px solid rgba(0, 102, 255, 0.1)',
            mt: 6,
            pt: 4,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
          >
            © {new Date().getFullYear()} The Grassroots Hub. Connecting communities through football.
          </Typography>
          <Typography
            variant="caption"
            sx={{ 
              color: 'rgba(255,255,255,0.5)', 
              display: 'block', 
              mt: 1,
              fontStyle: 'italic' 
            }}
          >
            "Connect. Play. Develop" - Building tomorrow's football stars today
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
