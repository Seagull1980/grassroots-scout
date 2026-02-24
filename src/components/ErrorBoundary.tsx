import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore, Refresh, Home, BugReport } from '@mui/icons-material';
import ContactFormModal from './ContactFormModal';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  showContactModal: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    showContactModal: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🚨 ErrorBoundary caught an error:', error);
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId, showContactModal: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary - Uncaught error:', error, errorInfo);

    // Report error to tracking service
    this.reportError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ error, errorInfo });
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send error to analytics service
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          custom_map: {
            componentStack: errorInfo.componentStack,
            errorId: this.state.errorId
          }
        });
      }

      // Log to console with structured data
      console.error('🚨 Error Report:', {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        retryCount: this.retryCount
      });

      // Send error details to backend for diagnostics (best-effort)
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId: this.state.errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      }).catch(() => undefined);

      // Could send to external error tracking service here
      // Example: Sentry, LogRocket, etc.
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportIssue = () => {
    this.setState({ showContactModal: true });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{
          p: 3,
          maxWidth: 800,
          mx: 'auto',
          mt: 4,
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom color="error.main">
                Oops! Something went wrong
              </Typography>
              <Typography variant="body1">
                We're sorry, but an unexpected error occurred. Our team has been notified.
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRetry}
                disabled={this.retryCount >= this.maxRetries}
              >
                Try Again {this.retryCount > 0 && `(${this.retryCount}/${this.maxRetries})`}
              </Button>

              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={this.handleGoHome}
              >
                Go Home
              </Button>

              <Button
                variant="text"
                startIcon={<BugReport />}
                onClick={this.handleReportIssue}
                color="secondary"
              >
                Report Issue
              </Button>
            </Box>

            {/* Technical Details */}
            {
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Technical Details
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Error ID: {this.state.errorId}
                    </Typography>

                    {this.state.error && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="error.main">
                          Error Message:
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                          {this.state.error.message}
                        </Typography>
                      </Box>
                    )}

                    {this.state.error?.stack && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="error.main">
                          Stack Trace:
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.100', p: 1, borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                          {this.state.error.stack}
                        </Typography>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="subtitle2" color="error.main">
                        Component Stack:
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.100', p: 1, borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                        {this.state.errorInfo?.componentStack || 'Component stack not available.'}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            }
          </Paper>

          <ContactFormModal
            open={this.state.showContactModal}
            onClose={() => this.setState({ showContactModal: false })}
            defaultSubject={`Bug Report: ${this.state.error?.message || 'Unknown Error'}`}
            defaultMessage={`Error ID: ${this.state.errorId}
Error: ${this.state.error?.message}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
`}
            pageUrl={window.location.href}
          />
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
