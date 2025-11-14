/**
 * Advanced Error Boundary with recovery and reporting
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError, logFatal } from '../utils/logger';

interface Props {
  children: ReactNode;
  /** Custom fallback UI */
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Enable automatic retry */
  enableRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Reset after timeout (ms) */
  resetTimeout?: number;
  /** Context name for logging */
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Advanced Error Boundary Component
 * Catches React errors and provides recovery mechanisms
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimer?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, context = 'ErrorBoundary', maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    // Log error
    if (retryCount >= maxRetries) {
      logFatal(`Unrecoverable error in ${context}`, context, error);
    } else {
      logError(`Error in ${context}`, context, error);
    }

    // Call custom error handler
    onError?.(error, errorInfo);

    // Store error info
    this.setState({ errorInfo });

    // Schedule automatic reset if enabled
    if (this.props.resetTimeout && retryCount < maxRetries) {
      this.scheduleReset();
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  }

  private scheduleReset = (): void => {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.handleReset();
    }, this.props.resetTimeout);
  };

  private handleReset = (): void => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
    }
  };

  render(): ReactNode {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, maxRetries = 3 } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      return (
        <DefaultErrorFallback
          error={error}
          retryCount={retryCount}
          maxRetries={maxRetries}
          onReset={this.handleReset}
        />
      );
    }

    return children;
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  retryCount,
  maxRetries,
  onReset,
}: {
  error: Error;
  retryCount: number;
  maxRetries: number;
  onReset: () => void;
}) {
  const canRetry = retryCount < maxRetries;

  return (
    <div
      style={{
        padding: '2rem',
        backgroundColor: '#fee',
        border: '2px solid #f00',
        borderRadius: '8px',
        margin: '1rem',
      }}
    >
      <h2 style={{ color: '#c00', margin: '0 0 1rem 0' }}>Something went wrong</h2>
      <details style={{ marginBottom: '1rem' }}>
        <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
          Error details
        </summary>
        <pre
          style={{
            backgroundColor: '#fff',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.875rem',
          }}
        >
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
      </details>

      {canRetry && (
        <button
          onClick={onReset}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Try Again ({maxRetries - retryCount} attempts remaining)
        </button>
      )}

      {!canRetry && (
        <p style={{ color: '#c00', margin: '0' }}>
          Maximum retry attempts reached. Please refresh the page.
        </p>
      )}
    </div>
  );
}

/**
 * Hook for error boundary integration
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setState] = React.useState();

  return React.useCallback((error: Error) => {
    setState(() => {
      throw error;
    });
  }, []);
}

/**
 * Async error boundary wrapper
 * Catches errors in async operations
 */
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  return function WithAsyncErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
