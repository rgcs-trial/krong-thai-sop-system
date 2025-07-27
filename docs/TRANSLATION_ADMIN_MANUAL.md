# Translation System Administration Manual
# คู่มือการดูแลระบบการแปล

*Restaurant Krong Thai SOP Management System*  
*ระบบจัดการ SOP ร้านอาหารไทยกรองไทย*

**Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**Target Audience**: System Administrators, DevOps Engineers, IT Managers  
**ผู้ใช้เป้าหมาย**: ผู้ดูแลระบบ วิศวกร DevOps ผู้จัดการ IT

---

## Table of Contents / สารบัญ

1. [System Overview](#system-overview)
2. [Installation & Setup](#installation--setup)
3. [Configuration Management](#configuration-management)
4. [User Management](#user-management)
5. [Database Administration](#database-administration)
6. [Performance Monitoring](#performance-monitoring)
7. [Security Management](#security-management)
8. [Backup & Recovery](#backup--recovery)
9. [Maintenance Procedures](#maintenance-procedures)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

The Translation System Administration Manual provides comprehensive guidance for managing, monitoring, and maintaining the database-driven translation infrastructure in restaurant environments.

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
    ┌─────▼─────┐           ┌─────▼─────┐
    │  App       │           │  App      │
    │  Instance  │           │  Instance │
    │  1         │           │  2        │
    └─────┬─────┘           └─────┬─────┘
          │                       │
          └───────────┬───────────┘
                      │
    ┌─────────────────▼─────────────────┐
    │         Supabase Backend          │
    │  ┌─────────────────────────────┐  │
    │  │    PostgreSQL Database      │  │
    │  │  - Translation Tables      │  │
    │  │  - RLS Policies            │  │
    │  │  - Triggers & Functions    │  │
    │  └─────────────────────────────┘  │
    │  ┌─────────────────────────────┐  │
    │  │    Realtime Engine         │  │
    │  │  - WebSocket Connections   │  │
    │  │  - Event Broadcasting      │  │
    │  └─────────────────────────────┘  │
    │  ┌─────────────────────────────┐  │
    │  │       File Storage         │  │
    │  │  - Translation Exports     │  │
    │  │  - Backup Files           │  │
    │  └─────────────────────────────┘  │
    └───────────────────────────────────┘
```

### Component Dependencies

| Component | Technology | Purpose | Dependencies |
|-----------|------------|---------|--------------|
| **Frontend** | Next.js 15.4.4 | User interface | React 19.1.0, TypeScript 5.8.3 |
| **Backend** | Supabase | Database & API | PostgreSQL 15, PostgREST |
| **Database** | PostgreSQL 15 | Data persistence | Extensions: uuid-ossp, pg_trgm |
| **Cache** | Built-in | Performance | Database tables + memory |
| **Real-time** | Supabase Realtime | Live updates | WebSockets, PostgreSQL triggers |
| **Auth** | Custom + Supabase | Authentication | JWT tokens, sessions |

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores (4 recommended)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 20GB SSD (50GB recommended)
- **Network**: 100 Mbps (1 Gbps recommended)
- **Database**: PostgreSQL 13+ (15+ recommended)

#### Production Requirements
- **CPU**: 4-8 cores
- **RAM**: 16-32GB
- **Storage**: 100GB SSD with RAID 1
- **Network**: 1 Gbps with redundancy
- **Database**: PostgreSQL 15 with read replicas
- **Monitoring**: 99.9% uptime SLA

---

## Installation & Setup

### Initial System Setup

#### 1. Environment Preparation

```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
  nodejs npm \
  postgresql-client \
  redis-tools \
  curl wget \
  git \
  nginx \
  certbot

# Install specific Node.js version
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm package manager
npm install -g pnpm
```

#### 2. Application Installation

```bash
# Clone repository
git clone https://github.com/krongthai/sop-management-system.git
cd sop-management-system

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Configure environment variables
nano .env.local
```

#### 3. Environment Configuration

```bash
# .env.local - Production Configuration
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@localhost:5432/translations

# Translation System Specific
TRANSLATION_CACHE_TTL=3600
TRANSLATION_CACHE_MAX_SIZE=100MB
REALTIME_ENABLED=true
WEBSOCKET_MAX_CONNECTIONS=1000

# Security
JWT_SECRET=your-secure-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com

# Performance
REDIS_URL=redis://localhost:6379
ENABLE_COMPRESSION=true
MAX_REQUEST_SIZE=10MB

# Monitoring
ENABLE_ANALYTICS=true
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
```

#### 4. Database Setup

```bash
# Initialize Supabase (if self-hosting)
npx supabase init
npx supabase start

# Run migrations
npx supabase db push

# Verify setup
npx supabase db status
```

### SSL/TLS Configuration

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/translation-system
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Proxy Configuration
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static file caching
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

#### SSL Certificate Setup

```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal setup
sudo crontab -e
# Add line: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Configuration Management

### Environment Variables

#### Core Configuration

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=10000

# Translation System
TRANSLATION_DEFAULT_LOCALE=en
TRANSLATION_SUPPORTED_LOCALES=en,th,fr
TRANSLATION_CACHE_STRATEGY=memory+database
TRANSLATION_BATCH_SIZE=100
TRANSLATION_MAX_KEY_LENGTH=255
TRANSLATION_MAX_VALUE_LENGTH=10000

# Performance Tuning
NODE_OPTIONS="--max-old-space-size=4096"
NEXT_TELEMETRY_DISABLED=1
ENABLE_EXPERIMENTAL_FEATURES=false

# Security
ALLOWED_ORIGINS=https://your-domain.com,https://admin.your-domain.com
CORS_MAX_AGE=86400
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Feature Flags
ENABLE_REALTIME_UPDATES=true
ENABLE_BULK_OPERATIONS=true
ENABLE_TRANSLATION_ANALYTICS=true
ENABLE_ADMIN_INTERFACE=true
ENABLE_API_DOCUMENTATION=true
```

#### Production Overrides

```bash
# production.env
NODE_ENV=production
LOG_LEVEL=warn
DEBUG=false
ENABLE_DEV_TOOLS=false
SOURCEMAP_ENABLED=false
MINIFY_ENABLED=true
COMPRESSION_ENABLED=true
```

### Database Configuration

#### PostgreSQL Optimization

```sql
-- postgresql.conf optimizations for translation workload

# Memory Settings
shared_buffers = 256MB                    # 25% of RAM
effective_cache_size = 1GB                # 75% of RAM
work_mem = 4MB                           # Per operation
maintenance_work_mem = 64MB               # Maintenance operations

# Connection Settings
max_connections = 100                     # Concurrent connections
superuser_reserved_connections = 3       # Reserved for admin

# WAL Settings
wal_buffers = 16MB                       # WAL buffer size
checkpoint_completion_target = 0.9        # Checkpoint target
wal_compression = on                      # WAL compression

# Query Planner
random_page_cost = 1.1                   # SSD optimization
effective_io_concurrency = 200           # Concurrent I/O
default_statistics_target = 100          # Statistics quality

# Logging
log_min_duration_statement = 1000        # Log slow queries (1s+)
log_checkpoints = on                     # Log checkpoints
log_connections = off                    # Don't log connections
log_disconnections = off                 # Don't log disconnections
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Autovacuum (important for translation tables)
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
```

#### Translation-Specific Tuning

```sql
-- Table-specific autovacuum settings
ALTER TABLE translations SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE translation_history SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

-- Index maintenance
REINDEX INDEX CONCURRENTLY idx_translations_key_locale;
REINDEX INDEX CONCURRENTLY idx_translation_keys_category;

-- Statistics updates
ANALYZE translation_keys;
ANALYZE translations;
ANALYZE translation_cache;
```

### Application Configuration

#### Next.js Production Config

```javascript
// next.config.ts
const nextConfig = {
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
    turbotrace: {
      logLevel: 'error'
    }
  },
  
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif']
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options', 
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            translation: {
              test: /[\\/]hooks[\\/](use-translations|use-i18n)/,
              name: 'translation',
              priority: 20
            }
          }
        }
      };
    }
    return config;
  }
};

module.exports = nextConfig;
```

---

## User Management

### User Roles & Permissions

#### Role Hierarchy

```
Administrator
├── System Admin (Full access)
├── Content Manager (Translation management)
└── Restaurant Manager (Restaurant-specific access)
    ├── Translation Reviewer (Review & approve)
    ├── Translator (Create & edit)
    └── Viewer (Read-only access)
```

#### Permission Matrix

| Permission | System Admin | Content Manager | Restaurant Manager | Reviewer | Translator | Viewer |
|------------|--------------|-----------------|-------------------|----------|------------|--------|
| **System Configuration** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User Management** | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ |
| **Translation Keys** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Translations** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Edit Own Translations** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Edit All Translations** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Review Translations** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Approve Translations** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Publish Translations** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Bulk Operations** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Analytics Access** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **System Monitoring** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Restaurant managers can only manage users within their restaurant

### User Creation & Management

#### CLI User Management

```bash
# Add system administrator
npx supabase auth add-user \
  --email admin@krongthai.com \
  --password SecurePassword123! \
  --role system_admin \
  --confirm

# Add content manager
npx supabase auth add-user \
  --email content@krongthai.com \
  --password SecurePassword123! \
  --role content_manager \
  --restaurant-id all \
  --confirm

# Add restaurant-specific user
npx supabase auth add-user \
  --email manager@restaurant1.com \
  --password SecurePassword123! \
  --role restaurant_manager \
  --restaurant-id restaurant-uuid-1 \
  --confirm
```

#### Database User Management

```sql
-- Create user with specific role
INSERT INTO auth_users (
  email, 
  role, 
  restaurant_id, 
  permissions,
  is_active,
  created_at
) VALUES (
  'translator@krongthai.com',
  'translator',
  'restaurant-uuid',
  '["read", "create", "update"]',
  true,
  NOW()
);

-- Update user permissions
UPDATE auth_users 
SET permissions = '["read", "create", "update", "approve"]',
    role = 'reviewer',
    updated_at = NOW()
WHERE email = 'translator@krongthai.com';

-- Deactivate user
UPDATE auth_users 
SET is_active = false,
    deactivated_at = NOW(),
    deactivated_reason = 'User left company'
WHERE email = 'former@employee.com';

-- List users by role
SELECT 
  email, 
  role, 
  restaurant_id,
  is_active,
  last_login_at,
  created_at
FROM auth_users 
WHERE role = 'translator' 
AND is_active = true
ORDER BY created_at DESC;
```

### Access Control Lists (ACL)

#### Translation Key Access Control

```sql
-- Create access control for translation categories
CREATE TABLE translation_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id),
  category VARCHAR(50),
  access_level VARCHAR(20) CHECK (access_level IN ('read', 'write', 'admin')),
  restaurant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant category access
INSERT INTO translation_access_control (user_id, category, access_level, restaurant_id)
SELECT 
  (SELECT id FROM auth_users WHERE email = 'menu@manager.com'),
  'menu',
  'admin',
  'restaurant-uuid';

-- RLS policy for category-based access
CREATE POLICY category_access_policy ON translations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM translation_access_control tac
    JOIN translation_keys tk ON tk.category = tac.category
    WHERE tac.user_id = auth.uid()
    AND tk.id = translations.translation_key_id
    AND tac.access_level IN ('write', 'admin')
  )
);
```

### Session Management

#### Session Configuration

```javascript
// lib/auth-config.ts
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 2 * 60 * 60, // Update every 2 hours
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    maxAge: 8 * 60 * 60, // 8 hours
  },
  
  cookies: {
    sessionToken: {
      name: 'translation-session',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
};
```

#### Session Monitoring

```sql
-- Active session tracking
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id),
  session_token VARCHAR(255) UNIQUE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Session cleanup (run hourly)
DELETE FROM user_sessions 
WHERE expires_at < NOW() OR last_activity_at < NOW() - INTERVAL '24 hours';

-- Monitor concurrent sessions
SELECT 
  u.email,
  COUNT(*) as active_sessions,
  array_agg(s.ip_address) as ip_addresses,
  MAX(s.last_activity_at) as last_activity
FROM auth_users u
JOIN user_sessions s ON u.id = s.user_id
WHERE s.is_active = true
GROUP BY u.id, u.email
HAVING COUNT(*) > 3  -- Alert on more than 3 concurrent sessions
ORDER BY active_sessions DESC;
```

---

## Database Administration

### Daily Maintenance

#### Automated Maintenance Script

```bash
#!/bin/bash
# scripts/daily-maintenance.sh

LOG_FILE="/var/log/translation-system/maintenance-$(date +%Y%m%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "=== Daily Maintenance Started: $(date) ===" >> "$LOG_FILE"

# 1. Database statistics update
echo "Updating database statistics..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  ANALYZE translation_keys;
  ANALYZE translations;
  ANALYZE translation_history;
  ANALYZE translation_cache;
  ANALYZE translation_analytics;
" >> "$LOG_FILE" 2>&1

# 2. Cache cleanup
echo "Cleaning expired cache entries..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  DELETE FROM translation_cache 
  WHERE expires_at < NOW() OR is_valid = false;
  
  UPDATE translation_cache 
  SET is_valid = false 
  WHERE generated_at < NOW() - INTERVAL '24 hours';
" >> "$LOG_FILE" 2>&1

# 3. History cleanup (keep 90 days)
echo "Cleaning old history records..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  DELETE FROM translation_history 
  WHERE changed_at < NOW() - INTERVAL '90 days';
" >> "$LOG_FILE" 2>&1

# 4. Session cleanup
echo "Cleaning expired sessions..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  DELETE FROM user_sessions 
  WHERE expires_at < NOW() OR last_activity_at < NOW() - INTERVAL '24 hours';
" >> "$LOG_FILE" 2>&1

# 5. Analytics aggregation
echo "Aggregating analytics data..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  INSERT INTO translation_analytics_daily (
    recorded_date,
    total_requests,
    unique_users,
    popular_keys,
    performance_metrics
  )
  SELECT 
    CURRENT_DATE - INTERVAL '1 day',
    COUNT(*),
    COUNT(DISTINCT user_id),
    array_agg(DISTINCT translation_key_id),
    json_build_object(
      'avg_response_time', AVG(response_time_ms),
      'max_response_time', MAX(response_time_ms),
      'error_rate', AVG(CASE WHEN error_count > 0 THEN 1.0 ELSE 0.0 END)
    )
  FROM translation_analytics 
  WHERE recorded_date = CURRENT_DATE - INTERVAL '1 day'
  ON CONFLICT (recorded_date) DO NOTHING;
" >> "$LOG_FILE" 2>&1

# 6. Backup verification
echo "Verifying recent backups..." >> "$LOG_FILE"
if [ -f "/backups/translation-$(date -d yesterday +%Y%m%d).sql" ]; then
  echo "✅ Yesterday's backup found" >> "$LOG_FILE"
else
  echo "❌ Yesterday's backup missing!" >> "$LOG_FILE"
  # Send alert
  echo "Missing backup alert sent" >> "$LOG_FILE"
fi

# 7. Disk space check
echo "Checking disk space..." >> "$LOG_FILE"
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
  echo "⚠️  Disk usage high: ${DISK_USAGE}%" >> "$LOG_FILE"
  # Send alert
fi

# 8. Performance metrics
echo "Collecting performance metrics..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  SELECT 
    'Database Size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as value;
    
  SELECT 
    'Active Connections' as metric,
    COUNT(*) as value
  FROM pg_stat_activity 
  WHERE state = 'active';
  
  SELECT 
    'Cache Hit Ratio' as metric,
    ROUND(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2) || '%' as value
  FROM pg_statio_user_tables;
" >> "$LOG_FILE" 2>&1

echo "=== Daily Maintenance Completed: $(date) ===" >> "$LOG_FILE"

# Rotate logs (keep 30 days)
find /var/log/translation-system -name "maintenance-*.log" -mtime +30 -delete
```

### Weekly Maintenance

#### Weekly Maintenance Script

```bash
#!/bin/bash
# scripts/weekly-maintenance.sh

LOG_FILE="/var/log/translation-system/weekly-$(date +%Y%m%d).log"

echo "=== Weekly Maintenance Started: $(date) ===" >> "$LOG_FILE"

# 1. VACUUM ANALYZE (more thorough)
echo "Running VACUUM ANALYZE..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  VACUUM ANALYZE translation_keys;
  VACUUM ANALYZE translations;
  VACUUM ANALYZE translation_history;
  VACUUM ANALYZE translation_cache;
  VACUUM ANALYZE translation_analytics;
" >> "$LOG_FILE" 2>&1

# 2. Index maintenance
echo "Rebuilding indexes..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  REINDEX INDEX CONCURRENTLY idx_translations_key_locale;
  REINDEX INDEX CONCURRENTLY idx_translation_keys_category;
  REINDEX INDEX CONCURRENTLY idx_translation_cache_valid;
" >> "$LOG_FILE" 2>&1

# 3. Database bloat check
echo "Checking for database bloat..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" >> "$LOG_FILE" 2>&1

# 4. Security audit
echo "Running security audit..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  -- Check for users with excessive permissions
  SELECT 
    email,
    role,
    permissions,
    created_at
  FROM auth_users 
  WHERE role = 'system_admin' 
  OR array_length(string_to_array(permissions::text, ','), 1) > 5;
  
  -- Check for inactive admin accounts
  SELECT 
    email,
    role,
    last_login_at,
    created_at
  FROM auth_users 
  WHERE role IN ('system_admin', 'content_manager')
  AND (last_login_at IS NULL OR last_login_at < NOW() - INTERVAL '30 days');
" >> "$LOG_FILE" 2>&1

# 5. Performance analysis
echo "Analyzing slow queries..." >> "$LOG_FILE"
psql $DATABASE_URL -c "
  SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
  FROM pg_stat_statements 
  WHERE mean_time > 1000  -- Queries taking more than 1 second
  ORDER BY mean_time DESC 
  LIMIT 10;
" >> "$LOG_FILE" 2>&1

echo "=== Weekly Maintenance Completed: $(date) ===" >> "$LOG_FILE"
```

### Backup Strategies

#### Database Backup Script

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups/translation-system"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/translation-$DATE.sql"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting database backup: $DATE"

# Full database backup
pg_dump $DATABASE_URL \
  --verbose \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_FILE.custom"

# SQL format backup (for easy inspection)
pg_dump $DATABASE_URL \
  --verbose \
  --format=plain \
  --file="$BACKUP_FILE"

# Schema-only backup
pg_dump $DATABASE_URL \
  --verbose \
  --schema-only \
  --file="$BACKUP_DIR/schema-$DATE.sql"

# Data-only backup for translation tables
pg_dump $DATABASE_URL \
  --verbose \
  --data-only \
  --table=translation_keys \
  --table=translations \
  --table=translation_history \
  --file="$BACKUP_DIR/translation-data-$DATE.sql"

# Compress backups
gzip "$BACKUP_FILE"
gzip "$BACKUP_DIR/schema-$DATE.sql"
gzip "$BACKUP_DIR/translation-data-$DATE.sql"

# Verify backup integrity
if pg_restore --list "$BACKUP_FILE.custom" > /dev/null 2>&1; then
  echo "✅ Backup verification successful"
else
  echo "❌ Backup verification failed"
  exit 1
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "translation-*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "translation-*.custom" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "schema-*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "translation-data-*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Database backup completed: $(ls -lh $BACKUP_FILE.gz)"

# Upload to cloud storage (optional)
if [ -n "$AWS_S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_FILE.custom" s3://$AWS_S3_BUCKET/backups/$(basename "$BACKUP_FILE.custom")
  echo "Backup uploaded to S3"
fi
```

---

## Performance Monitoring

### Key Performance Indicators

#### Application Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|-----------|
| **Response Time** | <100ms | >500ms | >1000ms |
| **Throughput** | >1000 req/min | <500 req/min | <100 req/min |
| **Error Rate** | <0.1% | >1% | >5% |
| **Cache Hit Rate** | >95% | <90% | <80% |
| **Database Connections** | <50 | >80 | >95 |
| **Memory Usage** | <70% | >85% | >95% |
| **CPU Usage** | <60% | >80% | >90% |
| **Disk Space** | <70% | >80% | >90% |

#### Database Metrics

```sql
-- Create monitoring views
CREATE OR REPLACE VIEW translation_performance_summary AS
SELECT 
  'Response Time (avg)' as metric,
  ROUND(AVG(avg_load_time_ms), 2) || 'ms' as value,
  CASE 
    WHEN AVG(avg_load_time_ms) > 1000 THEN 'critical'
    WHEN AVG(avg_load_time_ms) > 500 THEN 'warning'
    ELSE 'ok'
  END as status
FROM translation_analytics
WHERE recorded_date >= CURRENT_DATE - INTERVAL '1 day'

UNION ALL

SELECT 
  'Cache Hit Rate' as metric,
  ROUND(
    100.0 * SUM(CASE WHEN cache_hits > 0 THEN cache_hits ELSE 0 END) / 
    NULLIF(SUM(total_requests), 0), 2
  ) || '%' as value,
  CASE 
    WHEN 100.0 * SUM(cache_hits) / NULLIF(SUM(total_requests), 0) < 80 THEN 'critical'
    WHEN 100.0 * SUM(cache_hits) / NULLIF(SUM(total_requests), 0) < 90 THEN 'warning'
    ELSE 'ok'
  END as status
FROM translation_analytics
WHERE recorded_date >= CURRENT_DATE - INTERVAL '1 day'

UNION ALL

SELECT 
  'Translation Requests (24h)' as metric,
  SUM(total_requests)::text as value,
  CASE 
    WHEN SUM(total_requests) < 100 THEN 'warning'
    WHEN SUM(total_requests) < 10 THEN 'critical'
    ELSE 'ok'
  END as status
FROM translation_analytics
WHERE recorded_date >= CURRENT_DATE - INTERVAL '1 day'

UNION ALL

SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value,
  CASE 
    WHEN pg_database_size(current_database()) > 10737418240 THEN 'warning'  -- 10GB
    WHEN pg_database_size(current_database()) > 21474836480 THEN 'critical' -- 20GB
    ELSE 'ok'
  END as status;
```

### Monitoring Dashboard

#### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Translation System Monitoring",
    "panels": [
      {
        "title": "Response Times",
        "type": "stat",
        "targets": [
          {
            "expr": "avg(translation_response_time_ms)",
            "legendFormat": "Avg Response Time"
          }
        ],
        "thresholds": [
          {"color": "green", "value": 0},
          {"color": "yellow", "value": 500},
          {"color": "red", "value": 1000}
        ]
      },
      {
        "title": "Translation Requests",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(translation_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Cache Performance",
        "type": "singlestat",
        "targets": [
          {
            "expr": "translation_cache_hit_rate * 100",
            "legendFormat": "Cache Hit Rate %"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "postgresql_connections_active",
            "legendFormat": "Active Connections"
          }
        ]
      }
    ]
  }
}
```

#### Custom Monitoring Script

```javascript
// scripts/monitor-system.js
const { Pool } = require('pg');
const fs = require('fs');

class SystemMonitor {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.metrics = {};
  }
  
  async collectMetrics() {
    // Database metrics
    const dbMetrics = await this.collectDatabaseMetrics();
    
    // Application metrics
    const appMetrics = await this.collectApplicationMetrics();
    
    // System metrics
    const sysMetrics = await this.collectSystemMetrics();
    
    this.metrics = {
      timestamp: new Date().toISOString(),
      database: dbMetrics,
      application: appMetrics,
      system: sysMetrics
    };
    
    return this.metrics;
  }
  
  async collectDatabaseMetrics() {
    const queries = {
      connectionCount: 'SELECT count(*) FROM pg_stat_activity',
      
      dbSize: `
        SELECT pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database()) as bytes
      `,
      
      cacheHitRatio: `
        SELECT 
          round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2) as hit_ratio
        FROM pg_statio_user_tables
      `,
      
      translationCounts: `
        SELECT 
          COUNT(*) as total_keys,
          (SELECT COUNT(*) FROM translations WHERE status = 'published') as published_translations,
          (SELECT COUNT(*) FROM translation_cache WHERE is_valid = true) as valid_cache_entries
        FROM translation_keys
      `,
      
      recentActivity: `
        SELECT 
          COUNT(*) as changes_last_hour
        FROM translation_history 
        WHERE changed_at > NOW() - INTERVAL '1 hour'
      `
    };
    
    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      try {
        const result = await this.pool.query(query);
        results[key] = result.rows[0];
      } catch (error) {
        results[key] = { error: error.message };
      }
    }
    
    return results;
  }
  
  async collectApplicationMetrics() {
    // Memory usage
    const memUsage = process.memoryUsage();
    
    // API health check
    let apiHealth = 'unknown';
    try {
      const response = await fetch('http://localhost:3000/api/health');
      apiHealth = response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      apiHealth = 'error';
    }
    
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      apiHealth,
      nodeVersion: process.version,
      uptime: Math.round(process.uptime())
    };
  }
  
  async collectSystemMetrics() {
    const os = require('os');
    
    return {
      loadAverage: os.loadavg(),
      cpuCount: os.cpus().length,
      freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
      totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
      uptime: Math.round(os.uptime()),
      platform: os.platform(),
      arch: os.arch()
    };
  }
  
  async generateReport() {
    const metrics = await this.collectMetrics();
    
    // Check for alerts
    const alerts = this.checkAlerts(metrics);
    
    const report = {
      ...metrics,
      alerts,
      summary: this.generateSummary(metrics, alerts)
    };
    
    // Save report
    const reportPath = `/var/log/translation-system/monitoring-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }
  
  checkAlerts(metrics) {
    const alerts = [];
    
    // Database connection alerts
    if (metrics.database.connectionCount?.count > 80) {
      alerts.push({
        type: 'warning',
        message: `High database connections: ${metrics.database.connectionCount.count}`,
        metric: 'database.connections'
      });
    }
    
    // Memory alerts
    if (metrics.application.memory.heapUsed > 1024) { // 1GB
      alerts.push({
        type: 'warning',
        message: `High memory usage: ${metrics.application.memory.heapUsed}MB`,
        metric: 'application.memory'
      });
    }
    
    // Cache hit ratio alerts
    if (metrics.database.cacheHitRatio?.hit_ratio < 90) {
      alerts.push({
        type: 'warning',
        message: `Low cache hit ratio: ${metrics.database.cacheHitRatio.hit_ratio}%`,
        metric: 'database.cache'
      });
    }
    
    // API health alerts
    if (metrics.application.apiHealth !== 'healthy') {
      alerts.push({
        type: 'critical',
        message: `API health check failed: ${metrics.application.apiHealth}`,
        metric: 'application.health'
      });
    }
    
    return alerts;
  }
  
  generateSummary(metrics, alerts) {
    const criticalAlerts = alerts.filter(a => a.type === 'critical').length;
    const warningAlerts = alerts.filter(a => a.type === 'warning').length;
    
    let status = 'healthy';
    if (criticalAlerts > 0) status = 'critical';
    else if (warningAlerts > 0) status = 'warning';
    
    return {
      status,
      criticalAlerts,
      warningAlerts,
      totalTranslations: metrics.database.translationCounts?.published_translations || 0,
      dbSize: metrics.database.dbSize?.size || 'unknown',
      memoryUsage: `${metrics.application.memory.heapUsed}MB`,
      uptime: `${Math.round(metrics.application.uptime / 3600)}h`
    };
  }
  
  async close() {
    await this.pool.end();
  }
}

// Run monitoring
async function runMonitoring() {
  const monitor = new SystemMonitor();
  
  try {
    const report = await monitor.generateReport();
    
    console.log('System Monitoring Report:');
    console.log(`Status: ${report.summary.status}`);
    console.log(`Alerts: ${report.alerts.length}`);
    console.log(`Database Size: ${report.summary.dbSize}`);
    console.log(`Memory Usage: ${report.summary.memoryUsage}`);
    
    if (report.alerts.length > 0) {
      console.log('\nAlerts:');
      report.alerts.forEach(alert => {
        console.log(`  ${alert.type.toUpperCase()}: ${alert.message}`);
      });
    }
    
    // Exit with error code if critical alerts
    const criticalAlerts = report.alerts.filter(a => a.type === 'critical');
    process.exit(criticalAlerts.length > 0 ? 1 : 0);
    
  } finally {
    await monitor.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMonitoring();
}

module.exports = SystemMonitor;
```

---

## Security Management

### Security Policies

#### Row Level Security (RLS)

```sql
-- Enable RLS on all translation tables
ALTER TABLE translation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;

-- Policy for translation_keys
CREATE POLICY translation_keys_policy ON translation_keys
FOR ALL USING (
  -- System admins can access everything
  auth.jwt() ->> 'role' = 'system_admin'
  OR
  -- Content managers can access everything
  auth.jwt() ->> 'role' = 'content_manager'
  OR
  -- Restaurant managers can access their restaurant's content
  (
    auth.jwt() ->> 'role' = 'restaurant_manager'
    AND (
      restaurant_id IS NULL 
      OR restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
    )
  )
  OR
  -- Translators can access based on category permissions
  EXISTS (
    SELECT 1 FROM translation_access_control tac
    WHERE tac.user_id = auth.uid()
    AND tac.category = translation_keys.category
    AND tac.access_level IN ('read', 'write', 'admin')
  )
);

-- Policy for translations
CREATE POLICY translations_policy ON translations
FOR ALL USING (
  -- Check access to the translation key
  EXISTS (
    SELECT 1 FROM translation_keys tk
    WHERE tk.id = translations.translation_key_id
    -- Use the translation_keys policy
  )
  AND
  (
    -- Published translations are readable by everyone
    (status = 'published' AND TG_OP = 'SELECT')
    OR
    -- Own translations are editable
    created_by = auth.uid()
    OR
    -- Admins and managers can edit all
    auth.jwt() ->> 'role' IN ('system_admin', 'content_manager', 'restaurant_manager')
    OR
    -- Reviewers can approve
    (
      auth.jwt() ->> 'role' IN ('reviewer')
      AND status IN ('review', 'approved')
    )
  )
);
```

#### Security Auditing

```sql
-- Create security audit log
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  risk_level VARCHAR(20) DEFAULT 'low',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Security audit trigger
CREATE OR REPLACE FUNCTION log_security_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    risk_level
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old_data', to_jsonb(OLD),
      'new_data', to_jsonb(NEW)
    ),
    CASE 
      WHEN TG_TABLE_NAME = 'auth_users' THEN 'high'
      WHEN TG_OP = 'DELETE' THEN 'medium'
      ELSE 'low'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to sensitive tables
CREATE TRIGGER security_audit_auth_users
  AFTER INSERT OR UPDATE OR DELETE ON auth_users
  FOR EACH ROW EXECUTE FUNCTION log_security_event();

CREATE TRIGGER security_audit_translation_keys
  AFTER INSERT OR UPDATE OR DELETE ON translation_keys
  FOR EACH ROW EXECUTE FUNCTION log_security_event();
```

### SSL/TLS Management

#### Certificate Management

```bash
#!/bin/bash
# scripts/manage-certificates.sh

# Check certificate expiration
check_cert_expiry() {
  local domain=$1
  local days_warning=30
  
  expiry_date=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
    openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
  
  expiry_epoch=$(date -d "$expiry_date" +%s)
  current_epoch=$(date +%s)
  days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
  
  if [ $days_until_expiry -lt $days_warning ]; then
    echo "⚠️  Certificate for $domain expires in $days_until_expiry days"
    return 1
  else
    echo "✅ Certificate for $domain is valid for $days_until_expiry days"
    return 0
  fi
}

# Renew certificates
renew_certificates() {
  echo "Checking certificate renewals..."
  
  # Test renewal (dry run)
  certbot renew --dry-run
  
  if [ $? -eq 0 ]; then
    echo "Dry run successful, proceeding with renewal..."
    certbot renew
    
    # Reload nginx if renewal occurred
    if [ $? -eq 0 ]; then
      systemctl reload nginx
      echo "Certificates renewed and nginx reloaded"
    fi
  else
    echo "Certificate renewal dry run failed"
    exit 1
  fi
}

# Check and renew
check_cert_expiry "your-domain.com" || renew_certificates
```

### Security Scanning

#### Vulnerability Assessment

```bash
#!/bin/bash
# scripts/security-scan.sh

echo "=== Security Scan Started: $(date) ==="

# 1. Check for outdated packages
echo "Checking for package vulnerabilities..."
npm audit --audit-level moderate

# 2. Check database security
echo "Checking database security..."
psql $DATABASE_URL -c "
  -- Check for weak passwords (if stored)
  SELECT email, created_at 
  FROM auth_users 
  WHERE created_at > NOW() - INTERVAL '24 hours'
  AND email NOT LIKE '%@krongthai.com';
  
  -- Check for excessive permissions
  SELECT email, role, permissions
  FROM auth_users 
  WHERE role = 'system_admin' 
  OR array_length(string_to_array(permissions::text, ','), 1) > 5;
  
  -- Check for inactive admin accounts
  SELECT email, role, last_login_at
  FROM auth_users 
  WHERE role IN ('system_admin', 'content_manager')
  AND (last_login_at IS NULL OR last_login_at < NOW() - INTERVAL '30 days');
"

# 3. Check file permissions
echo "Checking file permissions..."
find . -name "*.env*" -exec ls -la {} \;
find . -name "*.key" -exec ls -la {} \;
find . -name "*.pem" -exec ls -la {} \;

# 4. Check for exposed secrets
echo "Checking for exposed secrets..."
if command -v git-secrets &> /dev/null; then
  git secrets --scan
fi

# 5. Network security check
echo "Checking network security..."
nmap -sS -O localhost

echo "=== Security Scan Completed: $(date) ==="
```

---

## Backup & Recovery

### Backup Strategy

#### 3-2-1 Backup Rule Implementation
- **3 copies** of data (original + 2 backups)
- **2 different storage media** (local + cloud)
- **1 offsite backup** (cloud storage)

#### Backup Schedule

```bash
# /etc/crontab entries

# Daily full backup at 2 AM
0 2 * * * root /opt/translation-system/scripts/backup-database.sh

# Hourly incremental backups during business hours
0 9-17 * * 1-5 root /opt/translation-system/scripts/backup-incremental.sh

# Weekly full system backup on Sunday at 1 AM
0 1 * * 0 root /opt/translation-system/scripts/backup-full-system.sh

# Monthly archive backup (1st of month at 3 AM)
0 3 1 * * root /opt/translation-system/scripts/backup-archive.sh
```

#### Incremental Backup Script

```bash
#!/bin/bash
# scripts/backup-incremental.sh

BACKUP_DIR="/backups/incremental"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
WAL_ARCHIVE="/backups/wal"

mkdir -p "$BACKUP_DIR" "$WAL_ARCHIVE"

# Create incremental backup using WAL files
pg_basebackup -D "$BACKUP_DIR/base-$TIMESTAMP" \
  -Ft -z -P \
  -h localhost \
  -U postgres \
  --wal-method=stream

# Archive WAL files
rsync -av /var/lib/postgresql/15/main/pg_wal/ "$WAL_ARCHIVE/"

# Verify backup
if [ -f "$BACKUP_DIR/base-$TIMESTAMP/base.tar.gz" ]; then
  echo "✅ Incremental backup completed: $BACKUP_DIR/base-$TIMESTAMP"
else
  echo "❌ Incremental backup failed"
  exit 1
fi

# Cleanup old incremental backups (keep 7 days)
find "$BACKUP_DIR" -name "base-*" -mtime +7 -exec rm -rf {} \;
```

### Disaster Recovery

#### Recovery Time Objectives (RTO)
- **Critical Systems**: 1 hour
- **Translation Data**: 4 hours
- **Full System**: 8 hours

#### Recovery Point Objectives (RPO)
- **Translation Data**: 15 minutes (transaction log backup)
- **User Data**: 1 hour (hourly backups)
- **System Configuration**: 24 hours (daily backups)

#### Point-in-Time Recovery

```bash
#!/bin/bash
# scripts/point-in-time-recovery.sh

RECOVERY_TARGET_TIME=$1
BACKUP_DIR="/backups"
RECOVERY_DIR="/tmp/recovery"

if [ -z "$RECOVERY_TARGET_TIME" ]; then
  echo "Usage: $0 'YYYY-MM-DD HH:MM:SS'"
  exit 1
fi

echo "=== Point-in-Time Recovery ==="
echo "Target time: $RECOVERY_TARGET_TIME"

# 1. Stop PostgreSQL
systemctl stop postgresql

# 2. Backup current data (safety)
mv /var/lib/postgresql/15/main /var/lib/postgresql/15/main.backup-$(date +%Y%m%d_%H%M%S)

# 3. Find appropriate base backup
BASE_BACKUP=$(find $BACKUP_DIR -name "translation-*.custom" -newer $RECOVERY_TARGET_TIME | tail -1)

if [ -z "$BASE_BACKUP" ]; then
  echo "❌ No suitable base backup found"
  exit 1
fi

echo "Using base backup: $BASE_BACKUP"

# 4. Restore base backup
mkdir -p /var/lib/postgresql/15/main
pg_restore -d template1 -C --if-exists --clean "$BASE_BACKUP"

# 5. Configure recovery
cat > /var/lib/postgresql/15/main/recovery.conf << EOF
restore_command = 'cp /backups/wal/%f %p'
recovery_target_time = '$RECOVERY_TARGET_TIME'
recovery_target_action = 'promote'
EOF

# 6. Set permissions
chown -R postgres:postgres /var/lib/postgresql/15/main

# 7. Start PostgreSQL for recovery
systemctl start postgresql

echo "✅ Point-in-time recovery initiated"
echo "Monitor logs: tail -f /var/log/postgresql/postgresql-15-main.log"
```

#### Disaster Recovery Runbook

```markdown
# Disaster Recovery Runbook

## Scenario 1: Database Corruption

**Detection**: Database connection errors, data inconsistency
**Impact**: High - Translation system unavailable

**Recovery Steps**:
1. Verify corruption: `pg_dump --schema-only translation_db > /dev/null`
2. Stop application: `systemctl stop translation-app`
3. Stop database: `systemctl stop postgresql`
4. Restore from latest backup: `./scripts/restore-latest-backup.sh`
5. Verify data integrity: `./scripts/verify-database-integrity.sh`
6. Start services: `systemctl start postgresql && systemctl start translation-app`

**Estimated Recovery Time**: 2-4 hours

## Scenario 2: Complete Server Failure

**Detection**: Server unreachable, hardware failure
**Impact**: Critical - Complete system outage

**Recovery Steps**:
1. Provision new server with same specifications
2. Install base system: `./scripts/install-base-system.sh`
3. Restore application code: `git clone && ./scripts/deploy.sh`
4. Restore database: `./scripts/restore-full-backup.sh`
5. Update DNS records to point to new server
6. Verify all services: `./scripts/health-check.sh`

**Estimated Recovery Time**: 4-8 hours

## Scenario 3: Data Center Outage

**Detection**: Network connectivity loss, data center alerts
**Impact**: Critical - Complete regional outage

**Recovery Steps**:
1. Activate secondary data center
2. Restore from cloud backups: `./scripts/restore-from-cloud.sh`
3. Update load balancer configuration
4. Test all functionality: `./scripts/integration-test.sh`
5. Communicate status to stakeholders

**Estimated Recovery Time**: 6-12 hours
```

---

## Maintenance Procedures

### Routine Maintenance

#### Monthly Maintenance Checklist

```markdown
# Monthly Maintenance Checklist

## Database Maintenance
- [ ] Run VACUUM FULL on large tables
- [ ] Rebuild indexes with high bloat
- [ ] Update table statistics
- [ ] Review slow query log
- [ ] Check for unused indexes
- [ ] Verify backup integrity

## Security Maintenance
- [ ] Review user accounts and permissions
- [ ] Check security audit logs
- [ ] Update SSL certificates if needed
- [ ] Run vulnerability scans
- [ ] Review failed login attempts
- [ ] Update security policies

## Performance Maintenance
- [ ] Analyze performance metrics
- [ ] Review cache hit rates
- [ ] Check memory and CPU usage trends
- [ ] Optimize slow queries
- [ ] Review application logs
- [ ] Test response times

## System Maintenance
- [ ] Apply security updates
- [ ] Update dependencies
- [ ] Check disk space usage
- [ ] Review system logs
- [ ] Test backup restoration
- [ ] Update documentation
```

#### Automated Maintenance

```bash
#!/bin/bash
# scripts/monthly-maintenance.sh

LOG_FILE="/var/log/translation-system/monthly-maintenance-$(date +%Y%m).log"

exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo "=== Monthly Maintenance Started: $(date) ==="

# 1. Database optimization
echo "Starting database optimization..."
psql $DATABASE_URL << EOF
-- Full vacuum on large tables
VACUUM FULL translation_history;
VACUUM FULL translation_analytics;

-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_translation_history_changed_at;
REINDEX INDEX CONCURRENTLY idx_translation_analytics_date;

-- Update statistics
ANALYZE;

-- Check for bloat
SELECT 
  schemaname, 
  tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF

# 2. Security review
echo "Performing security review..."
psql $DATABASE_URL << EOF
-- Review admin accounts
SELECT email, role, last_login_at, created_at
FROM auth_users 
WHERE role IN ('system_admin', 'content_manager')
ORDER BY last_login_at DESC;

-- Check for suspicious activity
SELECT 
  action,
  COUNT(*) as count,
  array_agg(DISTINCT user_id) as users
FROM security_audit_log 
WHERE timestamp > NOW() - INTERVAL '30 days'
  AND risk_level IN ('medium', 'high')
GROUP BY action
ORDER BY count DESC;
EOF

# 3. Performance analysis
echo "Analyzing performance..."
node scripts/generate-performance-report.js > "/var/log/translation-system/performance-$(date +%Y%m).json"

# 4. Backup verification
echo "Verifying recent backups..."
./scripts/verify-backup-integrity.sh

# 5. Update system packages
echo "Updating system packages..."
apt update && apt list --upgradable

# 6. Generate maintenance report
echo "Generating maintenance report..."
cat > "/var/log/translation-system/maintenance-summary-$(date +%Y%m).txt" << EOF
Monthly Maintenance Summary - $(date)

Database Size: $(psql $DATABASE_URL -t -c "SELECT pg_size_pretty(pg_database_size(current_database()))")
Translation Count: $(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM translations WHERE status = 'published'")
Active Users: $(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM auth_users WHERE is_active = true")

Maintenance Actions Completed:
- Database optimization
- Security review
- Performance analysis
- Backup verification
- System updates check

Next Maintenance: $(date -d "+1 month")
EOF

echo "=== Monthly Maintenance Completed: $(date) ==="
```

### Update Procedures

#### Application Updates

```bash
#!/bin/bash
# scripts/update-application.sh

VERSION=$1
BACKUP_DIR="/backups/pre-update-$(date +%Y%m%d_%H%M%S)"

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "=== Application Update to Version $VERSION ==="

# 1. Create backup
echo "Creating pre-update backup..."
mkdir -p "$BACKUP_DIR"
pg_dump $DATABASE_URL > "$BACKUP_DIR/database-backup.sql"
tar -czf "$BACKUP_DIR/application-backup.tar.gz" /opt/translation-system

# 2. Download new version
echo "Downloading version $VERSION..."
cd /tmp
wget "https://github.com/krongthai/sop-system/archive/v$VERSION.tar.gz"
tar -xzf "v$VERSION.tar.gz"

# 3. Stop services
echo "Stopping services..."
systemctl stop translation-app
systemctl stop nginx

# 4. Update application
echo "Updating application..."
rsync -av --exclude node_modules --exclude .env.local \
  "/tmp/sop-system-$VERSION/" /opt/translation-system/

cd /opt/translation-system
npm install --production

# 5. Run migrations
echo "Running database migrations..."
npm run db:migrate

# 6. Update configuration
echo "Updating configuration..."
# Compare and update configuration files
diff .env.example .env.local || echo "Manual configuration review needed"

# 7. Build application
echo "Building application..."
npm run build

# 8. Start services
echo "Starting services..."
systemctl start translation-app
systemctl start nginx

# 9. Verify deployment
echo "Verifying deployment..."
sleep 10
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Application update successful"
  echo "Version $VERSION deployed successfully" >> /var/log/translation-system/updates.log
else
  echo "❌ Application update failed, rolling back..."
  
  # Rollback procedure
  systemctl stop translation-app
  systemctl stop nginx
  
  rsync -av "$BACKUP_DIR/application-backup/" /opt/translation-system/
  psql $DATABASE_URL < "$BACKUP_DIR/database-backup.sql"
  
  systemctl start translation-app
  systemctl start nginx
  
  echo "Rollback completed"
  exit 1
fi

echo "=== Update Completed Successfully ==="
```

---

## Troubleshooting

### Common Issues

#### Database Connection Issues

**Symptoms**: "Connection refused", "Too many connections"

**Diagnosis**:
```bash
# Check PostgreSQL status
systemctl status postgresql

# Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check configuration
psql $DATABASE_URL -c "SHOW max_connections;"
psql $DATABASE_URL -c "SHOW shared_buffers;"
```

**Solutions**:
```bash
# Increase connection limit
sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 200;"
sudo systemctl restart postgresql

# Kill long-running connections
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE state = 'idle in transaction' 
  AND state_change < NOW() - INTERVAL '30 minutes';
"

# Check for connection leaks
psql $DATABASE_URL -c "
  SELECT application_name, state, count(*) 
  FROM pg_stat_activity 
  GROUP BY application_name, state 
  ORDER BY count DESC;
"
```

#### Translation Cache Issues

**Symptoms**: Outdated translations displayed, cache misses

**Diagnosis**:
```sql
-- Check cache status
SELECT 
  locale,
  namespace,
  is_valid,
  generated_at,
  expires_at
FROM translation_cache 
ORDER BY generated_at DESC;

-- Check cache hit rates
SELECT 
  SUM(cache_hits) as total_hits,
  SUM(total_requests) as total_requests,
  ROUND(100.0 * SUM(cache_hits) / SUM(total_requests), 2) as hit_rate
FROM translation_analytics 
WHERE recorded_date >= CURRENT_DATE - INTERVAL '7 days';
```

**Solutions**:
```bash
# Rebuild cache
psql $DATABASE_URL -c "SELECT rebuild_translation_cache('en');"
psql $DATABASE_URL -c "SELECT rebuild_translation_cache('th');"
psql $DATABASE_URL -c "SELECT rebuild_translation_cache('fr');"

# Clear invalid cache entries
psql $DATABASE_URL -c "
  UPDATE translation_cache 
  SET is_valid = false 
  WHERE expires_at < NOW();
"

# Restart application to clear memory cache
systemctl restart translation-app
```

#### Performance Issues

**Symptoms**: Slow response times, high CPU usage

**Diagnosis**:
```sql
-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 1000
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY bytes DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

**Solutions**:
```bash
# Analyze and vacuum tables
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check for missing indexes
psql $DATABASE_URL -c "
  SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    seq_scan / NULLIF(seq_tup_read, 0) as ratio
  FROM pg_stat_user_tables 
  WHERE seq_scan > 1000
  ORDER BY seq_scan DESC;
"

# Restart application with performance monitoring
NODE_OPTIONS="--max-old-space-size=4096" systemctl restart translation-app
```

### Diagnostic Tools

#### System Health Check

```bash
#!/bin/bash
# scripts/health-check.sh

echo "=== System Health Check ==="
echo "Timestamp: $(date)"

# 1. Service Status
echo -e "\n1. Service Status:"
services=("postgresql" "nginx" "translation-app")
for service in "${services[@]}"; do
  if systemctl is-active --quiet "$service"; then
    echo "✅ $service is running"
  else
    echo "❌ $service is not running"
  fi
done

# 2. Database Health
echo -e "\n2. Database Health:"
if psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ Database connection successful"
  
  # Check critical tables
  tables=("translation_keys" "translations" "auth_users")
  for table in "${tables[@]}"; do
    count=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM $table" 2>/dev/null | xargs)
    if [ "$count" -gt 0 ]; then
      echo "✅ $table: $count records"
    else
      echo "❌ $table: No records or error"
    fi
  done
else
  echo "❌ Database connection failed"
fi

# 3. API Health
echo -e "\n3. API Health:"
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ API health check passed"
else
  echo "❌ API health check failed"
fi

# 4. Translation API
echo -e "\n4. Translation API:"
if curl -f http://localhost:3000/api/translations/en > /dev/null 2>&1; then
  echo "✅ Translation API responding"
else
  echo "❌ Translation API not responding"
fi

# 5. Disk Space
echo -e "\n5. Disk Space:"
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
  echo "✅ Disk usage: ${disk_usage}%"
else
  echo "⚠️  Disk usage high: ${disk_usage}%"
fi

# 6. Memory Usage
echo -e "\n6. Memory Usage:"
mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100}')
if (( $(echo "$mem_usage < 90" | bc -l) )); then
  echo "✅ Memory usage: ${mem_usage}%"
else
  echo "⚠️  Memory usage high: ${mem_usage}%"
fi

# 7. Load Average
echo -e "\n7. Load Average:"
load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
cpu_count=$(nproc)
if (( $(echo "$load_avg < $cpu_count" | bc -l) )); then
  echo "✅ Load average: $load_avg (CPUs: $cpu_count)"
else
  echo "⚠️  Load average high: $load_avg (CPUs: $cpu_count)"
fi

echo -e "\n=== Health Check Complete ==="
```

#### Log Analysis Tool

```bash
#!/bin/bash
# scripts/analyze-logs.sh

LOG_DIR="/var/log/translation-system"
TIME_RANGE=${1:-"1 hour"}

echo "=== Log Analysis for last $TIME_RANGE ==="

# 1. Error analysis
echo -e "\n1. Recent Errors:"
find "$LOG_DIR" -name "*.log" -newer "/tmp/timestamp-$(date -d "$TIME_RANGE ago" +%Y%m%d%H%M%S)" 2>/dev/null | \
xargs grep -i "error\|exception\|fail" | tail -10

# 2. Performance issues
echo -e "\n2. Slow Queries:"
grep "slow query" "$LOG_DIR"/*.log 2>/dev/null | tail -5

# 3. Authentication failures
echo -e "\n3. Authentication Failures:"
grep "authentication\|unauthorized\|forbidden" "$LOG_DIR"/*.log 2>/dev/null | tail -5

# 4. Database issues
echo -e "\n4. Database Issues:"
grep -i "database\|connection\|timeout" "$LOG_DIR"/*.log 2>/dev/null | tail -5

# 5. Cache issues
echo -e "\n5. Cache Issues:"
grep -i "cache\|redis" "$LOG_DIR"/*.log 2>/dev/null | tail -5

echo -e "\n=== Log Analysis Complete ==="
```

### Recovery Procedures

#### Emergency Recovery Steps

```markdown
# Emergency Recovery Procedures

## Immediate Response (0-15 minutes)

1. **Assess Situation**
   - Check system status: `./scripts/health-check.sh`
   - Review recent logs: `./scripts/analyze-logs.sh "15 minutes"`
   - Identify error patterns

2. **Contain Impact**
   - Enable maintenance mode: `touch /opt/translation-system/maintenance.flag`
   - Stop affected services: `systemctl stop translation-app`
   - Preserve logs: `cp /var/log/translation-system/* /tmp/emergency-logs/`

3. **Initial Communication**
   - Notify stakeholders of issue
   - Estimate resolution time
   - Activate incident response team

## Short-term Recovery (15-60 minutes)

1. **Quick Fixes**
   - Restart services: `systemctl restart postgresql translation-app nginx`
   - Clear caches: `redis-cli FLUSHALL` (if applicable)
   - Free disk space: `./scripts/cleanup-temp-files.sh`

2. **Database Recovery**
   - Check database integrity: `psql $DATABASE_URL -c "SELECT pg_database_size(current_database())"`
   - Repair minor corruption: `VACUUM FULL; REINDEX DATABASE;`
   - Restore from backup if needed: `./scripts/restore-latest-backup.sh`

3. **Verification**
   - Run health checks: `./scripts/health-check.sh`
   - Test critical functions: `curl http://localhost:3000/api/translations/en`
   - Monitor performance: `./scripts/monitor-system.js`

## Long-term Recovery (1+ hours)

1. **Full System Restore**
   - Provision new environment if needed
   - Restore from point-in-time backup: `./scripts/point-in-time-recovery.sh`
   - Migrate users and sessions: `./scripts/migrate-user-sessions.sh`

2. **Post-Recovery Tasks**
   - Update monitoring alerts
   - Review and improve procedures
   - Conduct post-mortem analysis
   - Update documentation
```

---

## Summary / สรุป

This comprehensive Administration Manual provides complete guidance for managing the Translation System infrastructure. Key administrative areas covered include:

### System Management
- **Installation & Setup**: Complete deployment procedures with security hardening
- **Configuration Management**: Environment variables, database tuning, and application optimization
- **User Management**: Role-based access control with comprehensive permission matrices
- **Performance Monitoring**: Real-time metrics, alerting, and performance optimization

### Operational Excellence
- **Database Administration**: Daily maintenance, backup strategies, and performance tuning
- **Security Management**: RLS policies, SSL/TLS management, and vulnerability scanning
- **Backup & Recovery**: Comprehensive disaster recovery with automated backup procedures
- **Maintenance Procedures**: Routine maintenance schedules and update procedures

### Emergency Response
- **Troubleshooting**: Common issue diagnosis and resolution procedures
- **Monitoring Tools**: Automated health checks and log analysis utilities
- **Recovery Procedures**: Step-by-step emergency response and recovery protocols
- **Documentation**: Comprehensive runbooks and checklists for operational staff

This manual ensures restaurant administrators can maintain a robust, secure, and high-performance translation system that supports international operations while meeting enterprise-grade reliability and security standards.

---

**Document Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**Platform**: Krong Thai SOP Management System  
**Scope**: Complete system administration and operations