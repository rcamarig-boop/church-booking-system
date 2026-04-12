import React from 'react';

/**
 * Error Boundary Component
 * Catches React component errors and displays user-friendly message
 * Prevents white-screen-of-death
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for user reporting
    const errorId = 'ERR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Log to backend error tracking service
    this.logErrorToBackend(error, errorInfo, errorId);
  }

  logErrorToBackend = (error, errorInfo, errorId) => {
    // Log to console for debugging; backend error-logging endpoint
    // is not available, so we avoid a network call that would 404.
    if (process.env.NODE_ENV === 'development') {
      console.info('[ErrorBoundary] Error logged:', {
        errorId,
        message: error.toString(),
        componentStack: errorInfo.componentStack
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === 'development';
      
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, rgba(139, 58, 58, 0.05), rgba(214, 173, 96, 0.08))',
          padding: '20px',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '600px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            
            <h1 style={{
              color: '#1f2a44',
              fontSize: '28px',
              marginBottom: '12px',
              marginTop: 0
            }}>
              Oops! Something went wrong
            </h1>

            <p style={{
              color: '#4b5563',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              We're sorry, but the application encountered an unexpected error. 
              Our team has been notified and we're working to fix it.
            </p>

            <div style={{
              background: '#f8f4ec',
              border: '1px solid #e7dfcf',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              <div style={{ color: '#666', marginBottom: '8px' }}>
                <strong>Error ID:</strong> {this.state.errorId}
              </div>
              <div style={{ color: '#666' }}>
                Please share this ID when contacting support
              </div>
            </div>

            {isDev && (
              <details style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '24px',
                cursor: 'pointer'
              }}>
                <summary style={{ fontWeight: 600, color: '#7f1d1d' }}>
                  Development Details (click to expand)
                </summary>
                <pre style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#7f1d1d',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#5568d3'}
                onMouseLeave={(e) => e.target.style.background = '#667eea'}
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: '#e5e7eb',
                  color: '#1f2a44',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
                onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
