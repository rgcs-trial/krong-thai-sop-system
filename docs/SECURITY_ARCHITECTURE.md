# Security Architecture Documentation
## Restaurant Krong Thai SOP Management System

## ⚠️ CRITICAL SECURITY ALERT

**Status**: Environment variable security vulnerabilities detected  
**Risk Level**: HIGH - Immediate action required  
**Impact**: Potential exposure of sensitive configuration data  
**Last Updated**: July 26, 2025  

### Immediate Security Actions Required
1. **Environment Variable Audit**: Review all `.env*` files for sensitive data exposure
2. **Production Configuration Hardening**: Secure environment variable management
3. **Secret Management Review**: Implement proper secret storage for production
4. **Access Control Validation**: Verify current authentication implementation

---

### Overview

This document outlines the comprehensive security architecture designed for the Restaurant Krong Thai SOP Management System. The security implementation is optimized for restaurant tablet environments while maintaining enterprise-grade security standards.

**CURRENT STATUS**: Security audit required due to identified environment variable concerns and production readiness issues.

### Security Architecture Components

#### 1. PIN-Based Authentication System

**Location**: `/src/lib/security/pin-auth.ts`

The PIN authentication system is designed specifically for restaurant staff using tablets:

- **4-digit PIN format** optimized for touch screen input
- **bcryptjs hashing** with 12 salt rounds (configurable by environment)
- **PIN strength validation** to prevent weak patterns
- **Session management** with 8-hour timeout for restaurant shifts
- **Automatic session refresh** when 30 minutes remain

**Key Features**:
- Prevents common weak PIN patterns (1111, 1234, etc.)
- Progressive PIN strength analysis (weak/medium/strong)
- Secure PIN change process with confirmation
- Session tokens with automatic expiration

#### 2. Rate Limiting & Brute Force Protection

**Location**: `/src/lib/security/rate-limiter.ts`

Multi-layered protection against automated attacks:

**PIN Authentication Rate Limiting**:
- Maximum 5 attempts per 15-minute window
- 30-minute lockout after exceeding limit
- Device-specific tracking to prevent bypassing

**API Rate Limiting**:
- 100 requests per minute per client
- Burst protection with 20 request limit
- Progressive delays for repeated violations

**Brute Force Detection**:
- Pattern analysis for suspicious behavior
- Risk scoring based on frequency and patterns
- Automatic blocking of high-risk activities
- User agent variation detection

#### 3. Device Binding & Fingerprinting

**Location**: `/src/lib/security/device-binding.ts`

Tablet-specific device identification and binding:

**Device Fingerprinting**:
- Screen dimensions and color depth
- Browser capabilities and settings
- Canvas and WebGL fingerprinting
- Timezone and language detection

**Device Management**:
- Maximum 3 devices per user
- 30-day device registration expiry
- Automatic cleanup of inactive devices
- Device comparison with fuzzy matching

#### 4. Authentication Middleware

**Location**: `/src/lib/security/auth-middleware.ts`

Comprehensive request validation and authorization:

**Session Validation**:
- Token-based authentication
- Device binding verification
- Role-based access control
- Permission checking

**Security Headers**:
- Content Security Policy (CSP)
- XSS protection headers
- Frame options and MIME type sniffing protection
- Restaurant-specific security headers

#### 5. Audit Logging System

**Location**: `/src/lib/security/audit-logger.ts`

Comprehensive security event logging for compliance:

**Event Categories**:
- Authentication events (login, logout, PIN changes)
- Authorization events (permission checks)
- Data access events (SOP views, modifications)
- Security violations (brute force, rate limiting)
- System events (configuration changes)

**Features**:
- Asynchronous logging with queue management
- Sensitive data sanitization
- Risk-based severity levels
- Automatic log rotation and cleanup

### Security Configuration

**Location**: `/src/lib/security/config.ts`

Centralized security configuration optimized for restaurant operations:

```typescript
// Example configuration highlights
PIN: {
  LENGTH: 4,
  HASH_ROUNDS: 12,
  VALIDATION_TIMEOUT: 30000,
}

SESSION: {
  DURATION: 8 * 60 * 60 * 1000, // 8 hours
  REFRESH_THRESHOLD: 30 * 60 * 1000, // 30 minutes
}

RATE_LIMIT: {
  PIN_ATTEMPTS: {
    MAX_ATTEMPTS: 5,
    WINDOW_MINUTES: 15,
    LOCKOUT_DURATION: 30 * 60 * 1000,
  }
}
```

### Restaurant-Specific Security Features

1. **Shift-Based Access**: Sessions aligned with restaurant operating hours
2. **Tablet Optimization**: Touch-friendly PIN input and error messages
3. **Bilingual Support**: Security messages in Thai and English
4. **Offline Resilience**: Local caching of security tokens during network issues
5. **Multi-Device Support**: Staff can use multiple tablets seamlessly

### Implementation Guide

#### 1. Basic Setup

```typescript
import { Security, createSecurityMiddleware } from '@/lib/security';

// Apply security middleware to API routes
export const middleware = createSecurityMiddleware({
  requireAuth: true,
  requiredRole: 'staff',
  rateLimit: { maxAttempts: 100, windowMinutes: 1 },
  auditLog: true,
});
```

#### 2. PIN Authentication

```typescript
import { Security } from '@/lib/security';

// Authenticate user with PIN
const authResult = await PinAuthenticator.authenticate({
  email: 'staff@krongthai.com',
  pin: '1234',
  deviceFingerprint: 'abc123...',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
});

if (authResult.success) {
  // User authenticated successfully
  const { sessionToken, user, expiresAt } = authResult;
}
```

#### 3. Device Registration

```typescript
import { Security } from '@/lib/security';

// Register tablet device
const deviceResult = await Security.Device.register(
  userId,
  deviceFingerprint,
  'Kitchen Tablet #1',
  'tablet',
  'Kitchen Station'
);

if (deviceResult.success) {
  console.log('Device registered:', deviceResult.deviceId);
}
```

#### 4. Audit Logging

```typescript
import { SecurityAudit } from '@/lib/security';

// Log SOP document access
SecurityAudit.logSopAccess(
  'view',
  restaurantId,
  userId,
  sopId,
  {
    sopTitle: 'Food Safety Procedures',
    category: 'FOOD_SAFETY',
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  }
);
```

### Security Best Practices

#### For Developers

1. **Always use the Security utility functions** rather than implementing custom logic
2. **Enable audit logging** for all sensitive operations
3. **Implement proper error handling** to prevent information leakage
4. **Use TypeScript types** for security-related data structures
5. **Test security middleware** with various attack scenarios

#### For Restaurant Operations

1. **Regular PIN changes** (system can enforce policy)
2. **Device registration** for all tablets used by staff
3. **Monitor audit logs** for suspicious activities
4. **Keep devices updated** and properly configured
5. **Train staff** on security procedures

### Security Monitoring

#### Health Check Endpoint

```typescript
import { getSecurityHealthCheck } from '@/lib/security';

// GET /api/security/health
export async function GET() {
  const healthCheck = getSecurityHealthCheck();
  
  return Response.json({
    status: healthCheck.status,
    checks: healthCheck.checks,
    timestamp: new Date().toISOString(),
  });
}
```

#### Key Metrics to Monitor

- **Active Sessions**: Normal range 10-100 depending on restaurant size
- **Failed Login Attempts**: Should be < 5% of total attempts
- **Rate Limit Violations**: Should be minimal in normal operations
- **Device Registrations**: Should match physical tablet count
- **Audit Log Volume**: Varies by restaurant activity

### Compliance & Regulations

The security architecture addresses common restaurant industry requirements:

- **PCI DSS**: Secure authentication and session management
- **GDPR/Privacy**: Data minimization and audit trails
- **Local Regulations**: Thai data protection requirements
- **Industry Standards**: Restaurant-specific security practices

### Performance Considerations

#### Optimizations for Restaurant Environment

- **In-memory caching** for frequently accessed security data
- **Asynchronous logging** to prevent blocking operations
- **Efficient fingerprinting** suitable for tablet hardware
- **Progressive cleanup** of expired security data

#### Scalability

- **Stateless design** allows horizontal scaling
- **Database-agnostic** audit logging (currently in-memory for development)
- **Rate limiting** prevents resource exhaustion
- **Session cleanup** prevents memory leaks

### Troubleshooting

#### Common Issues

1. **PIN Authentication Fails**
   - Check PIN format (exactly 4 digits)
   - Verify rate limiting status
   - Confirm device registration

2. **Session Expires Quickly**
   - Check system time synchronization
   - Verify session configuration
   - Monitor for cleanup issues

3. **Device Not Recognized**
   - Clear browser cache/cookies
   - Re-register device
   - Check fingerprinting script

4. **Rate Limiting Triggered**
   - Wait for lockout period to expire
   - Check for automated scripts
   - Review IP address conflicts

### Security Updates & Maintenance

#### Regular Tasks

- **Update dependencies** (especially bcryptjs and security libraries)
- **Review audit logs** for suspicious patterns
- **Clean up expired devices** and sessions
- **Update security configuration** based on threat landscape
- **Test backup/recovery procedures**

#### Emergency Procedures

- **Immediate lockout** of compromised accounts
- **Device de-registration** for lost/stolen tablets
- **Session termination** for security incidents
- **Audit trail preservation** for investigations

### Contact & Support

For security concerns or incidents:
- Review audit logs first using `Security.Audit.searchLogs()`
- Check security health with `getSecurityHealthCheck()`
- Monitor rate limiting with `Security.RateLimit.getStats()`
- Document incidents for future prevention

This security architecture provides enterprise-grade protection while maintaining the usability required for fast-paced restaurant operations.