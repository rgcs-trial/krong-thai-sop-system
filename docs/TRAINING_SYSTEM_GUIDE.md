# Training System Guide
**Restaurant Krong Thai SOP Management System**  
**Version**: 0.2.0 | **Updated**: 2025-07-28  
**Status**: Production Ready with Advanced Analytics

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Database Schema](#architecture--database-schema)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Features](#core-features)
5. [API Reference](#api-reference)
6. [Database Operations](#database-operations)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Security & Compliance](#security--compliance)
9. [Disaster Recovery](#disaster-recovery)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)
12. [Migration Guide](#migration-guide)

---

## System Overview

The Training System is a comprehensive, enterprise-grade solution for restaurant staff training management, featuring bilingual support (EN/FR), PIN-based authentication, and advanced analytics. The system is optimized for tablet deployment and supports offline capabilities.

### Key Features
- ✅ **Interactive Training Modules**: Multi-section training with rich content support
- ✅ **Assessment System**: Comprehensive testing with scoring and certification
- ✅ **Digital Certificates**: Automated certificate generation with verification
- ✅ **Analytics Dashboard**: Real-time performance monitoring and reporting
- ✅ **Disaster Recovery**: Automated backup and recovery procedures
- ✅ **Monitoring & Alerting**: Proactive system health monitoring
- ✅ **Bilingual Support**: Database-driven EN/FR translation system
- ✅ **Offline Capability**: Critical training data synchronization

### Technology Stack
- **Frontend**: Next.js 15.4.4, React 19.1.0, TypeScript 5.8.3
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Custom PIN-based system with 8-hour sessions
- **Real-time**: WebSocket subscriptions for live updates
- **Analytics**: Advanced client-side optimization with Recharts

---

## Architecture & Database Schema

### Core Database Tables

#### Training Content Tables
```sql
-- Primary training structure
training_modules          -- Training modules with metadata
training_sections         -- Sections within modules
training_questions        -- Assessment questions
training_reminders        -- Scheduled training reminders

-- User progress tracking
user_training_progress    -- Overall module progress
user_section_progress     -- Detailed section completion
training_assessments      -- Assessment attempts and results
training_question_responses -- Individual question responses
training_certificates     -- Generated certificates
```

#### Analytics & Reporting Tables
```sql
-- Performance metrics
training_analytics        -- Aggregated analytics data
training_session_logs     -- Detailed session tracking
training_performance_metrics -- Real-time performance data
training_content_analytics -- Content engagement metrics
```

#### System Management Tables
```sql
-- Backup and recovery
training_backup_jobs      -- Automated backup configuration
training_recovery_points  -- Point-in-time recovery markers
training_disaster_recovery_plans -- DR procedures and plans

-- Monitoring and alerting
training_system_monitors  -- System health monitors
training_system_metrics   -- Time-series metric data
training_system_alerts    -- Alert management
training_performance_dashboards -- Custom dashboards
```

### Database Schema Details

#### Training Modules Structure
```sql
CREATE TABLE training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id VARCHAR(100) NOT NULL UNIQUE,
    title JSONB NOT NULL, -- {"en": "English Title", "fr": "French Title"}
    description JSONB,
    content JSONB,
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    estimated_duration_minutes INTEGER,
    prerequisites UUID[] DEFAULT '{}',
    learning_objectives JSONB DEFAULT '{}',
    resources JSONB DEFAULT '{}',
    restaurant_id UUID,
    category_id UUID,
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### User Progress Tracking
```sql
CREATE TABLE user_training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    status training_status DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0,
    score DECIMAL(5,2),
    time_spent_minutes INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    current_section_id UUID,
    bookmark_data JSONB DEFAULT '{}',
    notes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

All training tables implement comprehensive RLS policies:

```sql
-- Restaurant isolation policy example
CREATE POLICY "Training modules restaurant isolation"
ON training_modules FOR ALL TO authenticated
USING (
    restaurant_id IS NULL OR 
    restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid())
);

-- Role-based access policy example
CREATE POLICY "Training analytics admin access"
ON training_analytics FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);
```

---

## User Roles & Permissions

### Role Hierarchy

1. **Admin** - Full system access
   - Create/edit training modules
   - Access all analytics and reports
   - Configure system settings
   - Manage disaster recovery

2. **Manager** - Operational management
   - View analytics and progress reports
   - Assign training modules
   - Generate certificates
   - Monitor team performance

3. **Chef/Staff** - Training participants
   - Access assigned training modules
   - Take assessments
   - View personal progress
   - Download certificates

### Permission Matrix

| Feature | Admin | Manager | Chef | Staff |
|---------|-------|---------|------|-------|
| View Training Modules | ✅ | ✅ | ✅ | ✅ |
| Create/Edit Modules | ✅ | ❌ | ❌ | ❌ |
| Take Assessments | ✅ | ✅ | ✅ | ✅ |
| View Personal Analytics | ✅ | ✅ | ✅ | ✅ |
| View Team Analytics | ✅ | ✅ | ❌ | ❌ |
| Generate Reports | ✅ | ✅ | ❌ | ❌ |
| System Configuration | ✅ | ❌ | ❌ | ❌ |
| Disaster Recovery | ✅ | ❌ | ❌ | ❌ |

---

## Core Features

### 1. Training Module Management

#### Creating Training Modules
```typescript
// API endpoint: POST /api/training/modules
const createModule = async (moduleData: TrainingModuleInput) => {
  const response = await fetch('/api/training/modules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: { en: "English Title", fr: "French Title" },
      description: { en: "Description...", fr: "Description..." },
      difficulty_level: 3,
      estimated_duration_minutes: 60,
      restaurant_id: "uuid-here",
      category_id: "uuid-here",
      learning_objectives: {
        en: ["Objective 1", "Objective 2"],
        fr: ["Objectif 1", "Objectif 2"]
      }
    })
  });
  return response.json();
};
```

#### Training Module Structure
- **Modules**: Top-level training units
- **Sections**: Individual learning components within modules
- **Content**: Rich media content (text, images, videos)
- **Assessments**: Knowledge verification tests
- **Resources**: Additional learning materials

### 2. Assessment System

#### Assessment Types
- **Quiz**: Multiple choice questions
- **Practical**: Hands-on demonstrations
- **Scenario**: Situation-based problem solving
- **Mixed**: Combination of question types

#### Scoring System
```sql
-- Scoring algorithm in database
CREATE OR REPLACE FUNCTION calculate_assessment_score(
    assessment_id UUID
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_questions INTEGER;
    correct_answers INTEGER;
    weighted_score DECIMAL(5,2);
BEGIN
    -- Calculate weighted score based on question difficulty
    SELECT 
        COUNT(*),
        SUM(CASE WHEN tqr.is_correct THEN tq.weight ELSE 0 END) / 
        SUM(tq.weight) * 100
    INTO total_questions, weighted_score
    FROM training_question_responses tqr
    JOIN training_questions tq ON tqr.question_id = tq.id
    WHERE tqr.assessment_id = assessment_id;
    
    RETURN COALESCE(weighted_score, 0);
END;
$$ LANGUAGE plpgsql;
```

### 3. Certificate Generation

#### Automatic Certificate Creation
```typescript
// Triggered after successful assessment completion
const generateCertificate = async (userId: string, moduleId: string) => {
  const certificate = await supabase
    .from('training_certificates')
    .insert({
      user_id: userId,
      module_id: moduleId,
      certificate_number: generateCertificateNumber(),
      issue_date: new Date().toISOString(),
      expiry_date: calculateExpiryDate(moduleId),
      verification_code: generateVerificationCode(),
      certificate_data: await generateCertificateContent(userId, moduleId)
    });
  
  return certificate;
};
```

#### Certificate Verification
```sql
-- Certificate verification function
CREATE OR REPLACE FUNCTION verify_certificate(
    p_certificate_number VARCHAR(50),
    p_verification_code VARCHAR(20)
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM training_certificates
        WHERE certificate_number = p_certificate_number
        AND verification_code = p_verification_code
        AND status = 'valid'
        AND (expiry_date IS NULL OR expiry_date > NOW())
    );
END;
$$ LANGUAGE plpgsql;
```

### 4. Progress Tracking

#### Real-time Progress Updates
```typescript
// WebSocket subscription for progress updates
const subscribeToProgress = (userId: string) => {
  return supabase
    .channel('training_progress')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_training_progress',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      updateProgressUI(payload.new);
    })
    .subscribe();
};
```

#### Progress Calculation
```sql
-- Automated progress calculation trigger
CREATE OR REPLACE FUNCTION update_module_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update overall module progress based on section completion
    UPDATE user_training_progress utp
    SET 
        progress_percentage = (
            SELECT COALESCE(AVG(
                CASE WHEN usp.status = 'completed' THEN 100 ELSE 0 END
            ), 0)::INTEGER
            FROM user_section_progress usp
            WHERE usp.user_id = NEW.user_id
            AND usp.module_id = (
                SELECT module_id FROM training_sections 
                WHERE id = NEW.section_id
            )
        ),
        updated_at = NOW()
    WHERE utp.user_id = NEW.user_id
    AND utp.module_id = (
        SELECT module_id FROM training_sections 
        WHERE id = NEW.section_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## API Reference

### Training Modules API

#### GET /api/training/modules
Retrieve training modules with filtering and pagination.

**Parameters:**
- `restaurant_id` (UUID): Filter by restaurant
- `category_id` (UUID): Filter by category
- `difficulty_level` (1-5): Filter by difficulty
- `page` (number): Page number for pagination
- `limit` (number): Items per page (max 100)
- `search` (string): Search in titles and descriptions

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "module_id": "FOOD_SAFETY_101",
      "title": {"en": "Food Safety Basics", "fr": "Sécurité Alimentaire"},
      "description": {"en": "Learn food safety...", "fr": "Apprenez la sécurité..."},
      "difficulty_level": 2,
      "estimated_duration_minutes": 45,
      "progress": {
        "status": "in_progress",
        "progress_percentage": 60,
        "last_accessed": "2025-07-28T10:30:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

#### POST /api/training/modules
Create a new training module.

**Request Body:**
```json
{
  "title": {"en": "Module Title", "fr": "Titre du Module"},
  "description": {"en": "Description", "fr": "Description"},
  "content": {"en": {...}, "fr": {...}},
  "difficulty_level": 3,
  "estimated_duration_minutes": 60,
  "prerequisites": ["uuid1", "uuid2"],
  "learning_objectives": {
    "en": ["Objective 1", "Objective 2"],
    "fr": ["Objectif 1", "Objectif 2"]
  },
  "restaurant_id": "uuid",
  "category_id": "uuid"
}
```

### Progress Tracking API

#### GET /api/training/progress/user/{userId}
Get user's training progress across all modules.

#### POST /api/training/progress/update
Update progress for a specific section or module.

```json
{
  "user_id": "uuid",
  "section_id": "uuid",
  "status": "completed",
  "time_spent_minutes": 15,
  "score": 85.5,
  "notes": {"key": "value"}
}
```

### Assessment API

#### POST /api/training/assessments/start
Start a new assessment attempt.

#### POST /api/training/assessments/submit
Submit assessment responses.

```json
{
  "assessment_id": "uuid",
  "responses": [
    {
      "question_id": "uuid",
      "selected_option": "A",
      "response_time_seconds": 30,
      "confidence_level": 4
    }
  ]
}
```

### Analytics API

#### GET /api/training/analytics/overview
Get training analytics overview.

**Response:**
```json
{
  "overall_completion_rate": 78.5,
  "active_users_24h": 45,
  "total_certificates_issued": 234,
  "average_assessment_score": 82.3,
  "modules_by_status": {
    "completed": 156,
    "in_progress": 89,
    "not_started": 23
  },
  "performance_trends": {
    "daily": [...],
    "weekly": [...],
    "monthly": [...]
  }
}
```

---

## Database Operations

### Common Queries

#### Get User's Training Dashboard
```sql
SELECT 
    tm.id,
    tm.title,
    tm.difficulty_level,
    tm.estimated_duration_minutes,
    utp.status,
    utp.progress_percentage,
    utp.score,
    utp.last_accessed_at,
    tc.certificate_number,
    tc.issue_date
FROM training_modules tm
LEFT JOIN user_training_progress utp ON tm.id = utp.module_id AND utp.user_id = $1
LEFT JOIN training_certificates tc ON tm.id = tc.module_id AND tc.user_id = $1
WHERE tm.restaurant_id = $2 OR tm.restaurant_id IS NULL
ORDER BY 
    CASE utp.status 
        WHEN 'in_progress' THEN 1
        WHEN 'not_started' THEN 2
        WHEN 'completed' THEN 3
        ELSE 4
    END,
    utp.last_accessed_at DESC NULLS LAST;
```

#### Training Performance Report
```sql
WITH module_stats AS (
    SELECT 
        tm.id,
        tm.title,
        COUNT(utp.id) as total_enrollments,
        COUNT(CASE WHEN utp.status = 'completed' THEN 1 END) as completions,
        AVG(utp.score) as avg_score,
        AVG(utp.time_spent_minutes) as avg_time_spent,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY utp.score) as median_score
    FROM training_modules tm
    LEFT JOIN user_training_progress utp ON tm.id = utp.module_id
    WHERE tm.restaurant_id = $1
    GROUP BY tm.id, tm.title
)
SELECT 
    *,
    CASE 
        WHEN total_enrollments > 0 THEN 
            (completions::DECIMAL / total_enrollments * 100)
        ELSE 0 
    END as completion_rate
FROM module_stats
ORDER BY completion_rate DESC, total_enrollments DESC;
```

### Maintenance Queries

#### Clean Up Expired Data
```sql
-- Archive old assessment attempts (older than 1 year)
UPDATE training_assessments 
SET archived = true, archived_at = NOW()
WHERE created_at < NOW() - INTERVAL '1 year'
AND archived = false;

-- Clean up temporary session data
DELETE FROM training_session_logs 
WHERE created_at < NOW() - INTERVAL '30 days'
AND session_type = 'temporary';

-- Update certificate expiry status
UPDATE training_certificates 
SET status = 'expired'
WHERE expiry_date < NOW()
AND status = 'valid';
```

#### Performance Optimization
```sql
-- Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY training_analytics_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY training_performance_metrics_hourly;

-- Update table statistics
ANALYZE training_modules;
ANALYZE user_training_progress;
ANALYZE training_assessments;
ANALYZE training_certificates;

-- Reindex heavily used tables
REINDEX INDEX CONCURRENTLY idx_progress_user_module;
REINDEX INDEX CONCURRENTLY idx_assessments_user_created;
REINDEX INDEX CONCURRENTLY idx_certificates_user_module;
```

---

## Monitoring & Analytics

### System Health Monitoring

#### Key Performance Indicators (KPIs)
- **System Availability**: Target 99.9% uptime
- **Response Time**: < 200ms for API calls
- **Training Completion Rate**: Target 85%
- **Assessment Pass Rate**: Target 80%
- **User Engagement**: Daily active users

#### Automated Monitoring
```sql
-- System health check function (runs every 5 minutes)
CREATE OR REPLACE FUNCTION perform_system_health_check()
RETURNS JSONB AS $$
DECLARE
    health_status JSONB := '{}';
    db_connections INTEGER;
    active_users INTEGER;
    error_rate DECIMAL(5,2);
    avg_response_time DECIMAL(10,2);
BEGIN
    -- Database connection health
    SELECT COUNT(*) INTO db_connections
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    -- Active users in last hour
    SELECT COUNT(DISTINCT user_id) INTO active_users
    FROM user_training_progress
    WHERE last_accessed_at >= NOW() - INTERVAL '1 hour';
    
    -- Calculate error rate from recent logs
    SELECT 
        COALESCE(
            COUNT(CASE WHEN success = false THEN 1 END) * 100.0 / 
            NULLIF(COUNT(*), 0), 
            0
        ) INTO error_rate
    FROM training_session_logs
    WHERE created_at >= NOW() - INTERVAL '1 hour';
    
    -- Build health status
    health_status := jsonb_build_object(
        'timestamp', NOW(),
        'overall_status', CASE 
            WHEN db_connections > 100 OR error_rate > 5 THEN 'unhealthy'
            WHEN db_connections > 50 OR error_rate > 2 THEN 'degraded'
            ELSE 'healthy'
        END,
        'metrics', jsonb_build_object(
            'database_connections', db_connections,
            'active_users_1h', active_users,
            'error_rate_percent', error_rate,
            'avg_response_time_ms', avg_response_time
        )
    );
    
    -- Insert health check record
    INSERT INTO training_system_health_reports (
        report_id,
        report_name,
        report_type,
        report_period_start,
        report_period_end,
        overall_health_score,
        health_status,
        system_availability_percentage,
        error_rate_percentage,
        generated_by
    ) VALUES (
        'health_check_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        'Automated Health Check',
        'system_health',
        NOW() - INTERVAL '5 minutes',
        NOW(),
        CASE 
            WHEN health_status->>'overall_status' = 'healthy' THEN 95
            WHEN health_status->>'overall_status' = 'degraded' THEN 75
            ELSE 50
        END,
        health_status->>'overall_status',
        CASE WHEN error_rate < 1 THEN 99.9 ELSE 99.9 - error_rate END,
        error_rate,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
    
    RETURN health_status;
END;
$$ LANGUAGE plpgsql;
```

### Alert Configuration

#### Critical Alerts
- Training completion rate drops below 50%
- Assessment pass rate drops below 60%
- System response time > 2 seconds
- Database connection count > 100
- Error rate > 5%

#### Warning Alerts
- Training completion rate drops below 70%
- Assessment pass rate drops below 75%
- System response time > 500ms
- Less than 5 active users in 24 hours

### Performance Dashboards

#### Executive Dashboard
- Overall training completion rates
- Certificate generation trends
- User engagement metrics
- Business impact analysis

#### Operational Dashboard
- Real-time system health
- Active training sessions
- Assessment performance
- User progress tracking

#### Technical Dashboard
- Database performance metrics
- API response times
- Error rates and logs
- System resource utilization

---

## Security & Compliance

### Data Protection

#### Personal Data Handling
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Access Control**: Role-based access with RLS policies
- **Audit Logging**: Comprehensive audit trail for all operations
- **Data Retention**: Automated cleanup of expired data

#### Privacy Compliance
```sql
-- GDPR compliance functions
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Anonymize training progress data
    UPDATE user_training_progress
    SET notes = '{}', bookmark_data = '{}'
    WHERE user_id = p_user_id;
    
    -- Anonymize assessment responses
    UPDATE training_question_responses
    SET response_metadata = '{}'
    WHERE assessment_id IN (
        SELECT id FROM training_assessments WHERE user_id = p_user_id
    );
    
    -- Mark certificates as anonymized
    UPDATE training_certificates
    SET personal_data_anonymized = true,
        certificate_data = certificate_data || '{"anonymized": true}'::jsonb
    WHERE user_id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;
```

### Authentication & Authorization

#### PIN-Based Authentication
```typescript
// PIN validation with rate limiting
const validatePIN = async (email: string, pin: string): Promise<AuthResult> => {
  // Check rate limiting
  const attempts = await redis.get(`pin_attempts:${email}`);
  if (attempts && parseInt(attempts) >= 5) {
    throw new Error('Too many attempts. Please try again later.');
  }
  
  // Validate PIN
  const user = await supabase
    .from('auth_users')
    .select('*')
    .eq('email', email)
    .eq('pin_hash', hashPIN(pin))
    .single();
  
  if (!user.data) {
    // Increment attempt counter
    await redis.incr(`pin_attempts:${email}`);
    await redis.expire(`pin_attempts:${email}`, 900); // 15 minutes
    throw new Error('Invalid credentials');
  }
  
  // Clear attempts on success
  await redis.del(`pin_attempts:${email}`);
  
  return {
    user: user.data,
    token: generateJWT(user.data),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
  };
};
```

#### Session Management
```sql
-- Session cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Mark expired sessions as inactive
    UPDATE auth_sessions
    SET 
        is_active = false,
        ended_at = NOW()
    WHERE expires_at < NOW()
    AND is_active = true;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Delete old inactive sessions (older than 30 days)
    DELETE FROM auth_sessions
    WHERE is_active = false
    AND ended_at < NOW() - INTERVAL '30 days';
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Disaster Recovery

### Backup Strategy

#### Automated Backups
- **Full Backup**: Weekly full database backup
- **Incremental Backup**: Daily incremental backups
- **Transaction Log Backup**: Every 15 minutes
- **Point-in-Time Recovery**: Available for last 30 days

#### Backup Configuration
```sql
-- Default backup job for training data
INSERT INTO training_backup_jobs (
    backup_id,
    job_name,
    description,
    backup_type,
    storage_type,
    backup_scope,
    include_tables,
    schedule_enabled,
    schedule_expression,
    storage_location,
    retention_days,
    compression_enabled,
    encryption_enabled
) VALUES (
    'training_daily_backup',
    'Daily Training Data Backup',
    'Automated daily backup of all training data',
    'incremental',
    'cloud',
    jsonb_build_object(
        'scope', 'training_system',
        'include_user_data', true,
        'include_progress', true,
        'include_certificates', true
    ),
    ARRAY[
        'training_modules', 'training_sections', 'user_training_progress',
        'training_assessments', 'training_certificates'
    ],
    true,
    '0 2 * * *', -- Daily at 2 AM
    '/backups/training/',
    90, -- 90 days retention
    true,
    true
);
```

### Recovery Procedures

#### Emergency Recovery Plan
1. **Assessment Phase** (0-15 minutes)
   - Identify scope and impact
   - Activate incident response team
   - Notify stakeholders

2. **Preparation Phase** (15-30 minutes)
   - Isolate affected systems
   - Prepare recovery environment
   - Verify backup integrity

3. **Recovery Execution** (30-240 minutes)
   - Restore from latest backup
   - Apply transaction logs
   - Verify data integrity
   - Test system functionality

4. **Validation Phase** (240-270 minutes)
   - Comprehensive system testing
   - User acceptance testing
   - Performance validation
   - Security verification

#### Recovery Testing
```sql
-- Monthly disaster recovery test
CREATE OR REPLACE FUNCTION schedule_dr_test(
    p_restaurant_id UUID,
    p_test_type VARCHAR(50) DEFAULT 'tabletop'
)
RETURNS UUID AS $$
DECLARE
    test_uuid UUID;
    recovery_plan_uuid UUID;
BEGIN
    -- Find appropriate DR plan
    SELECT id INTO recovery_plan_uuid
    FROM training_disaster_recovery_plans
    WHERE restaurant_id = p_restaurant_id
    OR restaurant_id IS NULL
    ORDER BY 
        CASE WHEN restaurant_id = p_restaurant_id THEN 1 ELSE 2 END,
        recovery_tier
    LIMIT 1;
    
    -- Schedule DR test
    INSERT INTO training_disaster_recovery_tests (
        test_id,
        test_name,
        test_type,
        description,
        recovery_plan_id,
        restaurant_id,
        test_scenario,
        test_objectives,
        success_criteria,
        scheduled_date,
        test_coordinator
    ) VALUES (
        'DR_TEST_' || TO_CHAR(NOW(), 'YYYYMMDD') || '_' || encode(gen_random_bytes(4), 'hex'),
        'Monthly DR Test - ' || p_test_type,
        p_test_type,
        'Scheduled disaster recovery test to validate procedures',
        recovery_plan_uuid,
        p_restaurant_id,
        jsonb_build_object(
            'scenario_type', 'planned_test',
            'simulated_failure', 'database_corruption',
            'expected_downtime', '4 hours'
        ),
        ARRAY[
            'Validate backup restoration process',
            'Test system functionality',
            'Verify data integrity',
            'Confirm user access'
        ],
        jsonb_build_object(
            'recovery_time', '< 4 hours',
            'data_loss', '< 15 minutes',
            'functionality', '100% operational',
            'user_access', 'All users can authenticate'
        ),
        CURRENT_DATE + INTERVAL '7 days',
        (SELECT id FROM auth_users WHERE restaurant_id = p_restaurant_id AND role = 'admin' LIMIT 1)
    ) RETURNING id INTO test_uuid;
    
    RETURN test_uuid;
END;
$$ LANGUAGE plpgsql;
```

---

## Troubleshooting

### Common Issues

#### 1. Training Module Not Loading
**Symptoms**: Module content fails to load, blank screen
**Causes**: 
- Database connection issues
- RLS policy blocking access
- Corrupted module content

**Solutions**:
```sql
-- Check module accessibility
SELECT 
    tm.*,
    au.role,
    au.restaurant_id
FROM training_modules tm
CROSS JOIN auth_users au
WHERE au.id = auth.uid()
AND tm.id = 'module-uuid-here';

-- Verify RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'training_modules';
```

#### 2. Assessment Scores Not Calculating
**Symptoms**: Scores show as 0 or NULL after completion
**Causes**:
- Missing question responses
- Trigger function errors
- Calculation logic issues

**Solutions**:
```sql
-- Manual score recalculation
SELECT calculate_assessment_score('assessment-uuid-here');

-- Check for missing responses
SELECT 
    ta.id,
    COUNT(tqr.id) as response_count,
    COUNT(tq.id) as question_count
FROM training_assessments ta
JOIN training_questions tq ON tq.module_id = ta.module_id
LEFT JOIN training_question_responses tqr ON tqr.assessment_id = ta.id
WHERE ta.id = 'assessment-uuid-here'
GROUP BY ta.id;
```

#### 3. Certificate Generation Failures
**Symptoms**: Certificates not generated after successful completion
**Causes**:
- Missing required data
- Template rendering issues
- Permission problems

**Solutions**:
```sql
-- Check certificate eligibility
SELECT 
    utp.*,
    ta.status as assessment_status,
    ta.score as assessment_score
FROM user_training_progress utp
LEFT JOIN training_assessments ta ON ta.user_id = utp.user_id AND ta.module_id = utp.module_id
WHERE utp.user_id = 'user-uuid-here'
AND utp.module_id = 'module-uuid-here';

-- Manual certificate generation
SELECT generate_training_certificate('user-uuid-here', 'module-uuid-here');
```

### Performance Issues

#### Slow Query Identification
```sql
-- Find slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%training_%'
ORDER BY mean_time DESC
LIMIT 10;
```

#### Database Optimization
```sql
-- Update table statistics
ANALYZE training_modules;
ANALYZE user_training_progress;
ANALYZE training_assessments;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'training_%'
ORDER BY idx_tup_read DESC;
```

### Error Logging and Monitoring

#### Application Error Tracking
```typescript
// Comprehensive error logging
const logTrainingError = async (error: Error, context: any) => {
  await supabase.from('training_error_logs').insert({
    error_type: error.name,
    error_message: error.message,
    stack_trace: error.stack,
    context: context,
    user_id: context.userId,
    restaurant_id: context.restaurantId,
    severity: determineSeverity(error),
    created_at: new Date().toISOString()
  });
  
  // Send alert for critical errors
  if (determineSeverity(error) === 'critical') {
    await sendCriticalAlert(error, context);
  }
};
```

---

## Best Practices

### Development Guidelines

#### 1. Database Design
- Always use UUID primary keys
- Implement comprehensive RLS policies
- Include audit timestamps (created_at, updated_at)
- Use JSONB for flexible data structures
- Create appropriate indexes for query patterns

#### 2. API Development
- Implement proper error handling
- Use TypeScript for type safety
- Validate all input data
- Implement rate limiting
- Log all API calls

#### 3. Frontend Development
- Optimize for tablet usage (touch-friendly UI)
- Implement offline capabilities
- Use React Query for data caching
- Follow accessibility guidelines
- Implement proper loading states

### Security Best Practices

#### 1. Authentication
- Enforce strong PIN requirements
- Implement session timeout
- Use rate limiting for authentication attempts
- Log all authentication events

#### 2. Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper input validation
- Follow GDPR compliance requirements

#### 3. Access Control
- Use principle of least privilege
- Implement role-based access control
- Regular audit of user permissions
- Monitor for unusual access patterns

### Performance Optimization

#### 1. Database Performance
```sql
-- Regular maintenance tasks
-- Run weekly
VACUUM ANALYZE training_modules;
VACUUM ANALYZE user_training_progress;
VACUUM ANALYZE training_assessments;

-- Update statistics
-- Run daily
ANALYZE training_modules;
ANALYZE user_training_progress;
ANALYZE training_assessments;

-- Monitor query performance
-- Run as needed
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%training_%'
ORDER BY total_time DESC;
```

#### 2. Application Performance
- Use connection pooling
- Implement query result caching
- Optimize image and media delivery
- Use CDN for static assets
- Implement lazy loading

#### 3. Monitoring and Alerting
- Set up comprehensive health checks
- Monitor key performance metrics
- Implement automated alerting
- Regular performance reviews

---

## Migration Guide

### Database Migrations

#### Migration Process
1. **Backup Current Database**
   ```bash
   pg_dump -h localhost -U postgres training_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run Migration Scripts**
   ```bash
   # Run migrations in order
   psql -h localhost -U postgres -d training_db -f 001_initial_schema.sql
   psql -h localhost -U postgres -d training_db -f 002_training_modules.sql
   # ... continue with all migration files
   ```

3. **Verify Migration**
   ```sql
   -- Check migration status
   SELECT * FROM schema_migrations ORDER BY version;
   
   -- Verify table structure
   \d training_modules
   \d user_training_progress
   \d training_assessments
   ```

#### Data Migration Scripts

##### Migrate Existing Training Data
```sql
-- Example: Migrate from old schema to new schema
INSERT INTO training_modules (
    module_id,
    title,
    description,
    difficulty_level,
    estimated_duration_minutes,
    restaurant_id,
    created_by
)
SELECT 
    old_id,
    jsonb_build_object('en', title_en, 'fr', title_fr),
    jsonb_build_object('en', description_en, 'fr', description_fr),
    COALESCE(difficulty, 3),
    COALESCE(duration, 60),
    restaurant_uuid,
    creator_id
FROM legacy_training_modules
WHERE active = true;
```

##### Update Progress Records
```sql
-- Migrate user progress data
INSERT INTO user_training_progress (
    user_id,
    module_id,
    status,
    progress_percentage,
    score,
    time_spent_minutes,
    started_at,
    completed_at
)
SELECT 
    user_uuid,
    (SELECT id FROM training_modules WHERE module_id = lup.module_code),
    CASE lup.status
        WHEN 'complete' THEN 'completed'
        WHEN 'active' THEN 'in_progress'
        ELSE 'not_started'
    END,
    COALESCE(lup.progress, 0),
    lup.final_score,
    lup.time_spent,
    lup.start_date,
    lup.completion_date
FROM legacy_user_progress lup
WHERE EXISTS (
    SELECT 1 FROM training_modules 
    WHERE module_id = lup.module_code
);
```

### Application Updates

#### Version Compatibility
- **v0.1.x → v0.2.x**: Database schema updates required
- **v0.2.x → v0.3.x**: No breaking changes expected
- **v1.x.x → v2.x.x**: Major version upgrade procedures

#### Deployment Checklist
- [ ] Database backup completed
- [ ] Migration scripts tested in staging
- [ ] Application dependencies updated
- [ ] Configuration files updated
- [ ] Security policies reviewed
- [ ] Performance benchmarks established
- [ ] Rollback plan prepared
- [ ] User notification sent
- [ ] Post-deployment verification completed

---

## Support and Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor system health metrics
- Review error logs
- Check backup completion
- Verify certificate generation

#### Weekly
- Performance optimization review
- Database maintenance (VACUUM, ANALYZE)
- Security audit review
- User feedback analysis

#### Monthly
- Disaster recovery test
- Capacity planning review
- Security patch updates
- Feature usage analysis

### Getting Help

#### Support Channels
- **Documentation**: This guide and inline code comments
- **Issue Tracking**: GitHub Issues for bug reports
- **Feature Requests**: Product roadmap discussions
- **Emergency Support**: On-call support for critical issues

#### Troubleshooting Resources
- System health dashboard
- Error log analysis tools
- Performance monitoring
- Database query analysis

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-28  
**Next Review**: 2025-10-28  
**Maintained By**: Restaurant Krong Thai Development Team