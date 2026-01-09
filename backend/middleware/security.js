const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

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

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://*.googleapis.com", "https://*.gstatic.com"],
      scriptSrc: ["'self'", "https://maps.googleapis.com", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.mapbox.com", "https://maps.googleapis.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow cross-origin requests for maps
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Request sanitization middleware
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
  sanitizeRequest,
  validateEmail,
  validatePhone,
  sanitizeString,
  validatePasswordStrength,
  auditLogger
};
