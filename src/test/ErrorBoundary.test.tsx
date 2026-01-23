import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary';

// Mock console.error to avoid noise in test output
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Component that throws an error for testing
const ErrorThrowingComponent = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('catches and displays error when child component throws', () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText("We're sorry, but an unexpected error occurred. Our team has been notified.")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('displays retry button and handles retry', async () => {
    // eslint-disable-next-line prefer-const
    let shouldThrow = true;

    const RetryableComponent = () => {
      if (shouldThrow) {
        throw new Error('Retryable error');
      }
      return <div>Recovered content</div>;
    };

    render(
      <ErrorBoundary>
        <RetryableComponent />
      </ErrorBoundary>
    );

    // Should show error initially
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

    // Click retry
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    // Should recover and show content
    await waitFor(() => {
      expect(screen.getByText('Recovered content')).toBeInTheDocument();
    });
  });

  it('disables retry button after max retries', () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });

    // Click retry multiple times
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    fireEvent.click(retryButton); // 4th attempt should be disabled

    expect(retryButton).toBeDisabled();
    expect(screen.getByText('Try Again (3/3)')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onErrorMock = vi.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('displays technical details in development mode', () => {
    // Mock NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Technical Details (Development Only)')).toBeInTheDocument();

    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });

  it('does not display technical details in production mode', () => {
    // Mock NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Technical Details (Development Only)')).not.toBeInTheDocument();

    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });
});