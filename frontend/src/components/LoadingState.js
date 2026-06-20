import React from 'react';

const LoadingState = ({
  title = 'Loading...',
  message = 'Please wait while we prepare your experience.',
  compact = false,
}) => {
  return (
    <div
      className={`flex items-center justify-center ${compact ? 'py-8' : 'min-h-screen bg-gray-50 px-4'}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center max-w-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default LoadingState;
