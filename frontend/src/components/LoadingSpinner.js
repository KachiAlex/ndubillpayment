import React from 'react';
import LoadingState from './LoadingState';

const LoadingSpinner = ({ title, message, compact }) => {
  return (
    <LoadingState
      title={title}
      message={message}
      compact={compact}
    />
  );
};

export default LoadingSpinner;
