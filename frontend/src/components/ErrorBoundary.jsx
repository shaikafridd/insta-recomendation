import React from 'react';

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in child component tree and displays a graceful fallback UI.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="main"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            color: '#0f172a',
            fontFamily: 'sans-serif'
          }}
        >
          <h1 style={{ fontSize: '1.8rem', color: '#d95700', marginBottom: '12px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#475569', maxWidth: '480px', marginBottom: '20px' }}>
            The Reels recommender encountered an unexpected error.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ff6b00',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
