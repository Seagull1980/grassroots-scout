import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🚨 ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary - Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            {this.state.error && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Error:</strong> {this.state.error.message}
              </Typography>
            )}
            {this.state.errorInfo && (
              <details style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                <summary>Error Details</summary>
                {this.state.error && this.state.error.stack}
                {this.state.errorInfo.componentStack}
              </details>
            )}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
          >
            Try again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
