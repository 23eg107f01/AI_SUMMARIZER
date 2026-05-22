import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error('Application error boundary caught an error:', error, info);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-gray-900">
          <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 shadow-glow dark:border-red-900/40 dark:bg-gray-950">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-500">Something went wrong</p>
            <h1 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-50">The app hit a render error.</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Try reloading this view. If the error keeps happening, the current session may be missing a required dependency or a network request failed.
            </p>
            {this.state.error ? (
              <pre className="mt-4 overflow-auto rounded-2xl bg-gray-100 p-4 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                {this.state.error.message}
              </pre>
            ) : null}
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-offset-gray-950"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;