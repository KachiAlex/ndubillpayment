import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected error occurred.';
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-6">
                The app ran into a problem while loading this screen. You can retry or return home.
              </p>
              <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-left">
                <p className="text-sm font-semibold text-red-900">Error details</p>
                <p className="mt-1 text-sm text-red-700 break-words">{errorMessage}</p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-800">Technical details</summary>
                  <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-gray-700">
                    {this.state.error?.stack || this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={this.handleReset}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Try again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition font-semibold"
                >
                  Go home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
