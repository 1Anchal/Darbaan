import { Lock } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Typography
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Lock sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            
            <Typography component="h1" variant="h4" gutterBottom>
              Access Denied
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              You don't have permission to access this page.
            </Typography>
            
            {user && (
              <Typography variant="body2" color="text.secondary" paragraph>
                Your current role: {user.role}
              </Typography>
            )}
            
            <Button
              variant="contained"
              onClick={handleGoBack}
              sx={{ mt: 2 }}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default UnauthorizedPage;