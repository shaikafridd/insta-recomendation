const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const reelRoutes = require('./routes/reelRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const { getConnectionStatus } = require('./config/db');
const cache = require('./config/redis');
const env = require('./config/env');

const app = express();

const path = require('path');

// Log redaction to prevent accidental API key leaks in logs
const sanitizeLog = (str) => (typeof str === 'string' ? str.replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_GROQ_KEY]') : str);

// Global Middlewares
app.use(cors());
app.use(
  morgan((tokens, req, res) => {
    const raw = [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'),
      '-',
      tokens['response-time'](req, res),
      'ms'
    ].join(' ');
    return sanitizeLog(raw);
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fs = require('fs');

// Serve frontend static assets (check dist first, fallback to root)
const distPath = path.join(__dirname, '../frontend/dist');
const staticPath = fs.existsSync(distPath) ? distPath : path.join(__dirname, '../frontend');
app.use(express.static(staticPath));

// Health and Status Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: getConnectionStatus() ? 'connected' : 'disconnected',
      redis: cache.isRedisActive() ? 'connected' : 'in-memory-fallback',
      groq: env.GROQ_API_KEY ? 'configured' : 'fallback-mode',
      cloudinary: env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'mock-mode'
    }
  });
});

// API Routes
app.use('/reels', reelRoutes);
app.use('/interactions', interactionRoutes);
app.use('/', recommendationRoutes);

// Fallback for frontend SPA route or 404
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
      ? path.join(distPath, 'index.html')
      : path.join(__dirname, '../frontend/index.html');
    return res.sendFile(indexPath);
  }
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Error Middleware]:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
