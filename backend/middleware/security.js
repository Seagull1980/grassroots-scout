const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');

// Generate CSP nonce for each request
const generateNonce = () => crypto.randomBytes(16).toString('base64');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`⚠️  Rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({ error: message });
    }
  });
};

// General rate limiter
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later'
);

// Auth rate limiter (more restrictive)
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 login attempts per windowMs
  'Too many authentication attempts, please try again later'
);

// Profile update rate limiter
const profileLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  10, // limit profile updates
  'Too many profile update attempts, please try again later'
);

// Security headers middleware with enhanced CSP
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://*.googleapis.com", "https://*.gstatic.com", "https://*.gravatar.com"],
      scriptSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com", "https://www.googleapis.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow cross-origin requests for maps
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

// CSRF Protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Generate CSRF token for GET requests to pages that need it
  if (req.method === 'GET' && req.path.match(/^\/(login|register|profile|admin)/)) {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.locals.csrfToken = csrfToken;
    // In production, store this in session/redis
    // For now, we'll use a simple in-memory store (not suitable for production)
    if (!global.csrfTokens) global.csrfTokens = new Set();
    global.csrfTokens.add(csrfToken);
    // Clean up old tokens periodically (simple implementation)
    if (global.csrfTokens.size > 1000) {
      global.csrfTokens.clear();
    }
  }

  // Validate CSRF token for state-changing requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] || req.body._csrf;

    if (!token) {
      console.warn(`🚨 CSRF token missing for ${req.method} ${req.path} from IP: ${req.ip}`);
      return res.status(403).json({ error: 'CSRF token missing' });
    }

    // In production, validate against session/redis store
    if (!global.csrfTokens || !global.csrfTokens.has(token)) {
      console.warn(`🚨 Invalid CSRF token for ${req.method} ${req.path} from IP: ${req.ip}`);
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    // Token used, remove it (one-time use)
    global.csrfTokens.delete(token);
  }

  next();
};
const sanitizeRequest = (req, res, next) => {
  // Log suspicious activity
  const suspiciousPatterns = [
    /[<>\"'%;()&+]/g, // Basic XSS patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/gi, // SQL injection patterns
    /(javascript:|data:|vbscript:)/gi, // Script injection patterns
  ];

  const checkSuspicious = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  // Check request body for suspicious content
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    if (checkSuspicious(bodyString)) {
      console.warn(`⚠️  Suspicious request detected from IP: ${req.ip}, body: ${bodyString.substring(0, 100)}...`);
    }
  }

  // Check query parameters
  Object.values(req.query || {}).forEach(value => {
    if (checkSuspicious(value)) {
      console.warn(`⚠️  Suspicious query parameter from IP: ${req.ip}, value: ${value}`);
    }
  });

  next();
};

// Input validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

const sanitizeString = (str, maxLength = 500) => {
  if (!str || typeof str !== 'string') return str;
  
  // Remove potentially dangerous characters
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/[<>\"']/g, '');
  
  // Trim to max length
  return sanitized.substring(0, maxLength).trim();
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Security audit logging
const auditLogger = (action, userId, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    ip: details.ip,
    userAgent: details.userAgent
  };
  
  // In production, you might want to write to a secure log file or database
  console.log(`🔍 AUDIT: ${JSON.stringify(logEntry)}`);
};

module.exports = {
  generalLimiter,
  authLimiter,
  profileLimiter,
  securityHeaders,
  csrfProtection,
  sanitizeRequest,
  validateEmail,
  validatePhone,
  sanitizeString,
  validatePasswordStrength,
  auditLogger
};
