const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const reelRoutes = require('./routes/reelRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const { getConnectionStatus } = require('./config/db');
const cache = require('./config/redis');
const env = require('./config/env');

const app = express();

// ==========================================
// 1. SECURITY & SANITIZATION MIDDLEWARE
// ==========================================

// Configure Helmet for secure HTTP headers (XSS, Clickjacking, MIME sniffing protection)
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow external media CDN video streaming
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false
  })
);

// Rate Limiter: Prevent brute-force and DoS attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 300, // Max 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/interactions', apiLimiter);
app.use('/recommendations', apiLimiter);

// NoSQL Injection Sanitizer: Recursively strip leading '$' and '.' from object keys
const sanitizeInput = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeInput);
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = key.replace(/^\$|\./g, '');
    sanitized[cleanKey] = sanitizeInput(value);
  }
  return sanitized;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
});

// Log Redaction: Prevent sensitive API keys from appearing in stdout/logs
const sanitizeLog = (str) =>
  typeof str === 'string' ? str.replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_GROQ_KEY]') : str;

// Standard CORS & Body Parsers
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
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
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ==========================================
// 2. STATIC ASSETS & FRONTEND SERVING
// ==========================================
const distPath = path.join(__dirname, '../frontend/dist');
const staticPath = fs.existsSync(distPath) ? distPath : path.join(__dirname, '../frontend');
app.use(express.static(staticPath));

// ==========================================
// 3. HEALTH CHECK & TELEMETRY
// ==========================================
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

// ==========================================
// 4. API ROUTES
// ==========================================
app.use('/reels', reelRoutes);
app.use('/interactions', interactionRoutes);
app.use('/', recommendationRoutes);

// ==========================================
// 5. SPA ROUTING & 404 HANDLER
// ==========================================
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

// ==========================================
// 6. GLOBAL CENTRALIZED ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error Handler] ${req.method} ${req.originalUrl} - Status ${statusCode}:`, message);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
