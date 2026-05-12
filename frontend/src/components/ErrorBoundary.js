import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div style={styles.shell}>
        <div style={styles.panel}>
          <h1 style={styles.title}>Something crashed on this page</h1>
          <p style={styles.message}>
            Please refresh once. If it happens again, the message below will help identify the broken screen.
          </p>
          <pre style={styles.error}>{this.state.error.message}</pre>
          <button style={styles.button} onClick={() => window.location.assign('/dashboard')}>
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }
}

const styles = {
  shell: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#080b12',
    color: '#e8eaf0',
    padding: 24
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    background: '#131a24',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 28
  },
  title: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 26,
    margin: '0 0 10px'
  },
  message: {
    color: '#94a3b8',
    lineHeight: 1.5
  },
  error: {
    whiteSpace: 'pre-wrap',
    background: '#080b12',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    color: '#fca5a5',
    fontSize: 13
  },
  button: {
    background: '#00e5a0',
    color: '#080b12',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'pointer'
  }
};
