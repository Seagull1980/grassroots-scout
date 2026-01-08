# Security Improvements Implementation Guide

## ✅ Implemented (Current Deploy)

1. **Stronger Password Requirements**
   - Minimum 8 characters (was 6)
   - Requires uppercase letter
   - Requires lowercase letter
   - Requires number
   - Requires special character (@$!%*?&)

2. **Security Headers Re-enabled**
   - Content Security Policy (CSP)
   - HTTP Strict Transport Security (HSTS)
   - X-Frame-Options
   - X-Content-Type-Options

3. **Password Validation Helper**
   - Added `validatePasswordStrength()` function
   - Provides detailed error messages

## 🚀 Ready to Implement Next

### 1. Age Verification & Parental Consent

Create `/backend/middleware/childProtection.js`:

```javascript
// Age verification for COPPA/UK Children's Code compliance
const requireAgeVerification = async (req, res, next) => {
  const { dateOfBirth } = req.body;
  
  if (!dateOfBirth) {
    return res.status(400).json({ error: 'Date of birth is required' });
  }
  
  const age = calculateAge(dateOfBirth);
  
  if (age < 13) {
    // COPPA: Require parental consent
    return res.status(403).json({ 
      error: 'Parental consent required',
      requiresParentalConsent: true
    });
  }
  
  if (age < 16) {
    // Additional protection for under-16
    req.isMinor = true;
  }
  
  next();
};

// Additional encryption for children's data
const encryptChildData = (data, age) => {
  if (age < 16) {
    // Apply additional encryption layer
    return doubleEncrypt(data);
  }
  return encrypt(data);
};
```

### 2. Token Refresh System

Update JWT token configuration:

```javascript
// Access token: 30 minutes
const ACCESS_TOKEN_EXPIRY = '30m';

// Refresh token: 7 days
const REFRESH_TOKEN_EXPIRY = '7d';

// Generate both tokens on login
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
};
```

### 3. Session Management

Add session tracking table:

```sql
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  refreshToken TEXT NOT NULL,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  lastActivity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP NOT NULL,
  isRevoked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4. Account Deletion (GDPR Compliance)

```javascript
app.delete('/api/auth/account', authenticateToken, async (req, res) => {
  const { password } = req.body;
  const userId = req.user.userId;
  
  // Verify password before deletion
  const user = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
  const isValid = await bcrypt.compare(password, user.rows[0].password);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  // Cascade delete all user data
  await db.query('DELETE FROM users WHERE id = ?', [userId]);
  
  // Audit log
  auditLogger('account_deleted', userId, {
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  res.json({ message: 'Account successfully deleted' });
});
```

### 5. Data Export (GDPR Right to Access)

```javascript
app.get('/api/auth/export-data', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  // Gather all user data
  const userData = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  const profileData = await db.query('SELECT * FROM user_profiles WHERE userId = ?', [userId]);
  const postsData = await db.query('SELECT * FROM vacancy_posts WHERE userId = ?', [userId]);
  
  // Decrypt sensitive data
  const exportData = {
    personalInfo: decryptUserData(userData.rows[0]),
    profile: decryptUserData(profileData.rows[0]),
    posts: postsData.rows,
    exportDate: new Date().toISOString()
  };
  
  res.json(exportData);
});
```

### 6. Login Notifications

```javascript
// After successful login
await emailService.sendLoginNotification(
  user.email,
  user.firstName,
  {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  }
);
```

### 7. Two-Factor Authentication (2FA)

For parent accounts handling children's data:

```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

app.post('/api/auth/enable-2fa', authenticateToken, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `GrassrootsHub (${req.user.email})`
  });
  
  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  // Save secret to database (encrypted)
  await db.query(
    'UPDATE users SET twoFactorSecret = ? WHERE id = ?',
    [encryptionService.encrypt(secret.base32), req.user.userId]
  );
  
  res.json({ qrCode, secret: secret.base32 });
});
```

## 📋 Required Environment Variables

Add to `.env`:

```env
# JWT Secrets
JWT_SECRET=your-super-secure-secret-key-here
REFRESH_TOKEN_SECRET=your-refresh-token-secret-here

# Encryption (already exists)
ENCRYPTION_KEY=your-64-character-hex-key

# Session Settings
SESSION_TIMEOUT_MINUTES=30
ACCESS_TOKEN_EXPIRY=30m
REFRESH_TOKEN_EXPIRY=7d

# HTTPS Enforcement
FORCE_HTTPS=true
```

## 🔒 Children's Data Protection Checklist

- [ ] Age verification on registration
- [ ] Parental consent workflow for under-13
- [ ] Additional encryption for children's data
- [ ] Data minimization for children
- [ ] Privacy by default settings
- [ ] Parental control dashboard
- [ ] Restricted data sharing for children
- [ ] Regular data audits

## 📝 Privacy Policy Requirements

Your privacy policy must include:

1. What data you collect and why
2. How you protect children's data
3. Parents' rights to access/delete children's data
4. How long you retain data
5. Who you share data with (if anyone)
6. How to exercise GDPR rights
7. Contact information for privacy concerns

## 🛡️ Next Steps Priority Order

1. **IMMEDIATE (This Week)**
   - ✅ Stronger passwords (DONE)
   - ✅ Re-enable security headers (DONE)
   - [ ] Add age verification
   - [ ] Implement parental consent workflow

2. **HIGH PRIORITY (This Month)**
   - [ ] Token refresh system
   - [ ] Account deletion endpoint
   - [ ] Data export endpoint
   - [ ] Login notifications

3. **MEDIUM PRIORITY (Next 3 Months)**
   - [ ] 2FA for parent accounts
   - [ ] Session management dashboard
   - [ ] Security audit logging dashboard
   - [ ] Automated security testing

## 📞 Support

For security concerns or questions:
- Review: `/SECURITY_REVIEW.md`
- Implementation: This file
- Contact: Your security team
