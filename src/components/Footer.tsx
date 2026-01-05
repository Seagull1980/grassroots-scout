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
        py: 6,
        mt: 8,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          {/* Logo and Brand Section */}
          <Grid item xs={12} md={4}>
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
              sx={{ color: 'rgba(255,255,255,0.7)', maxWidth: '300px' }}
            >
              Building bridges between talented players and grassroots football teams 
              across communities. Your journey to football excellence starts here.
            </Typography>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/search')}
                sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  textAlign: 'left',
                  textDecoration: 'none',
                  '&:hover': { color: 'white', textDecoration: 'underline' }
                }}
              >
                Find Teams
              </Link>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/post-advert')}
                sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  textAlign: 'left',
                  textDecoration: 'none',
                  '&:hover': { color: 'white', textDecoration: 'underline' }
                }}
              >
                Post Vacancy
              </Link>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/success-stories')}
                sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  textAlign: 'left',
                  textDecoration: 'none',
                  '&:hover': { color: 'white', textDecoration: 'underline' }
                }}
              >
                Success Stories
              </Link>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/about')}
                sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  textAlign: 'left',
                  textDecoration: 'none',
                  '&:hover': { color: 'white', textDecoration: 'underline' }
                }}
              >
                About Us
              </Link>
            </Box>
          </Grid>

          {/* Contact & Info */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Get In Touch
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}
            >
              Have questions or suggestions? We'd love to hear from you and help 
              you connect with the perfect football opportunity.
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            >
              📧 thegrassrootsupp@gmail.com
            </Typography>
          </Grid>
        </Grid>

        {/* Bottom Section */}
        <Box
          sx={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            mt: 4,
            pt: 3,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.5)' }}
          >
            © {new Date().getFullYear()} The Grassroots Hub. Connecting communities through football.
          </Typography>
          <Typography
            variant="caption"
            sx={{ 
              color: 'rgba(255,255,255,0.4)', 
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
