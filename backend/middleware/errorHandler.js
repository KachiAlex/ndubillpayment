// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      status: 400
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = {
      message,
      status: 400
    };
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      status: 404
    };
  }

  res.status(error.status).json({
    success: false,
    error: error.message
  });
};

module.exports = errorHandler;
