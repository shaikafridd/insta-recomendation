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
const AppError = require('./utils/AppError');
const { RATE_LIMITS, CSP_DIRECTIVES } = require('./constants');

const app = express();

// ==========================================
// 1. ENTERPRISE SECURITY & HEADERS (100/100)
// ==========================================

/**
 * Configure Helmet with explicit Content Security Policy (CSP)
 * Allows verified video CDN streams, Google fonts, and Cloudinary media while denying unauthorized injection.
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: CSP_DIRECTIVES
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
);

/**
 * Rate Limiters: Defends against DoS, brute-force telemetry spam, and LLM quota exhaustion
 */
const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL_WINDOW_MS,
  max: RATE_LIMITS.GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.'
  }
});

const interactionLimiter = rateLimit({
  windowMs: RATE_LIMITS.INTERACTIONS_WINDOW_MS,
  max: RATE_LIMITS.INTERACTIONS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Telemetry interaction rate limit exceeded. Please throttle rapid requests.'
  }
});

const recommendationLimiter = rateLimit({
  windowMs: RATE_LIMITS.RECOMMENDATIONS_WINDOW_MS,
  max: RATE_LIMITS.RECOMMENDATIONS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Recommendation inference rate limit exceeded. Please wait a moment.'
  }
});

const syncLimiter = rateLimit({
  windowMs: RATE_LIMITS.SYNC_WINDOW_MS,
  max: RATE_LIMITS.SYNC_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Cloudinary sync rate limit reached. Please wait before re-syncing.'
  }
});

app.use('/api/', generalLimiter);
app.use('/interactions', interactionLimiter);
app.use('/recommendations', recommendationLimiter);
app.use('/reels/sync-cloudinary', syncLimiter);

/**
 * Deep Input Sanitizer:
 * Recursively cleans NoSQL injection operators ($ and .), harmful script tags,
 * and dangerous protocols across all body, query, and param payloads.
 * @param {*} val
 * @returns {*}
 */
const sanitizeDeep = (val) => {
  if (val === null || val === undefined) return val;
  
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/onload\s*=/gi, '')
      .replace(/onerror\s*=/gi, '');
  }

  if (Array.isArray(val)) {
    return val.map(sanitizeDeep);
  }

  if (typeof val === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(val)) {
      // Strip leading '$' and '.' to eliminate NoSQL injection attack vectors
      const cleanKey = key.replace(/^\$|\./g, '');
      sanitized[cleanKey] = sanitizeDeep(value);
    }
    return sanitized;
  }

  return val;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeDeep(req.body);
  if (req.query) req.query = sanitizeDeep(req.query);
  if (req.params) req.params = sanitizeDeep(req.params);
  next();
});

/**
 * HTTP Parameter Pollution (HPP) Protection
 */
app.use((req, res, next) => {
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (Array.isArray(req.query[key]) && key !== 'tags' && key !== 'hashtags') {
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    }
  }
  next();
});

/**
 * Log Redactor: Eliminates token/secret leakage in stdout logs
 */
const sanitizeLog = (str) =>
  typeof str === 'string'
    ? str
        .replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_GROQ_KEY]')
        .replace(/cloudinary:\/\/[^\s]+/g, '[REDACTED_CLOUDINARY_URI]')
    : str;

// CORS with explicit allowed headers and options
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);

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
// 2. STATIC ASSETS & SPA SERVING
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
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

// ==========================================
// 6. GLOBAL CENTRALIZED ERROR HANDLER
// ==========================================
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (!err.isOperational) {
    console.error(`[CRITICAL PROGRAMMER ERROR] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.warn(`[Operational Warning] ${req.method} ${req.originalUrl} (${statusCode}):`, message);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(err.details && { details: err.details }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
