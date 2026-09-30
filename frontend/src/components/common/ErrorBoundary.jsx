import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('SmartLib UI error:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold">Something went wrong.</h2>
          <p className="mt-2 text-sm text-fg-muted">This page hit an unexpected error. You can try again or go back to your dashboard.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" className="btn-secondary" onClick={() => this.setState({ error: null })}>
              Try Again
            </button>
            <a href="/dashboard" className="btn-primary">
              Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
