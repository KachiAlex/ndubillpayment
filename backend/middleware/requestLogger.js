const crypto = require('crypto');

function generateRequestId() {
  return crypto.randomUUID();
}

function requestLogger(req, res, next) {
  const requestId = generateRequestId();
  req.requestId = requestId;
  
  const startTime = Date.now();
  
  // Log request
  console.log(`[${requestId}] [REQ] ${req.method} ${req.url} | IP: ${req.ip || req.socket.remoteAddress}`);
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] [RES] ${req.method} ${req.url} | Status: ${res.statusCode} | Duration: ${duration}ms`);
    originalSend.call(this, data);
  };
  
  next();
}

module.exports = requestLogger;
