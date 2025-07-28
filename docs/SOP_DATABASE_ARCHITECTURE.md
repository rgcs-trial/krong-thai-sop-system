# SOP Database Architecture Documentation

## Restaurant Krong Thai SOP Management System
**Database Architecture & Implementation Guide**

**Created**: 2025-07-28  
**Version**: 1.0  
**Database**: Supabase PostgreSQL with RLS  
**Target Environment**: Tablet-optimized restaurant operations  

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Table Relationships](#table-relationships)
4. [Security Implementation](#security-implementation)
5. [Performance Optimization](#performance-optimization)
6. [Real-time Features](#real-time-features)
7. [Analytics & Reporting](#analytics--reporting)
8. [Migration Files](#migration-files)
9. [API Integration](#api-integration)
10. [Best Practices](#best-practices)

---

## Overview

The SOP (Standard Operating Procedures) database system is designed to support comprehensive restaurant workflow management with the following key requirements:

- **Multi-tenant architecture** supporting multiple restaurant locations
- **Bilingual content** (English/Thai) with full translation support
- **Role-based access control** (admin, manager, staff)
- **Real-time notifications** for workflow updates
- **Comprehensive audit trails** for compliance
- **Tablet-optimized performance** for concurrent access
- **Advanced analytics** for operational insights

### Core Capabilities

- ✅ **Workflow Management**: Complete SOP lifecycle from creation to execution
- ✅ **Task Assignment**: Automated and manual assignment with scheduling
- ✅ **Photo Verification**: Image-based compliance verification
- ✅ **Manager Approvals**: Multi-level approval workflows
- ✅ **Equipment Tracking**: Equipment utilization and maintenance
- ✅ **Performance Analytics**: Real-time dashboards and reporting
- ✅ **Compliance Monitoring**: Automated alerts and escalations

---

## Database Schema

### Core Tables (9 Tables)

#### 1. `sop_documents` 
**Purpose**: Master SOP documents with bilingual content
```sql
Key Fields:
- id (UUID) - Primary key
- category_id (UUID) - Links to sop_categories
- restaurant_id (UUID) - Multi-tenant isolation
- title/title_th (VARCHAR) - Bilingual titles
- content/content_th (TEXT) - Bilingual content
- steps/steps_th (JSONB) - Structured procedures
- status (ENUM) - draft, review, approved, archived
- priority (ENUM) - low, medium, high, critical
- version (INTEGER) - Version control
```

#### 2. `sop_steps`
**Purpose**: Detailed step-by-step procedures
```sql
Key Fields:
- sop_document_id (UUID) - Parent SOP reference
- step_number (INTEGER) - Sequence order
- title/title_th (VARCHAR) - Bilingual step titles
- description/description_th (TEXT) - Detailed instructions
- estimated_duration_minutes (INTEGER) - Time estimates
- requires_photo (BOOLEAN) - Photo verification flag
- critical_control_point (BOOLEAN) - HACCP compliance
- equipment_required (UUID[]) - Required equipment array
```

#### 3. `sop_completions`
**Purpose**: Track SOP execution and results
```sql
Key Fields:
- sop_document_id/sop_step_id (UUID) - Reference links
- completed_by/assigned_to (UUID) - User references
- status (ENUM) - pending, in_progress, completed, verified, failed
- duration_minutes (INTEGER) - Actual completion time
- compliance_score (DECIMAL) - 0.00 to 1.00 score
- quality_rating (INTEGER) - 1-5 star rating
- verification_photos (JSONB) - Photo metadata array
- temperature_reading (DECIMAL) - For food safety SOPs
```

#### 4. `sop_assignments`
**Purpose**: Staff task assignment and scheduling
```sql
Key Fields:
- assigned_to/assigned_by (UUID) - User relationships
- status (ENUM) - assigned, acknowledged, in_progress, completed, overdue
- priority (ENUM) - Task priority level
- due_date/scheduled_start (TIMESTAMPTZ) - Timing constraints
- recurring_schedule_id (UUID) - Links to schedules
- escalation_level (INTEGER) - Auto-escalation tracking
```

#### 5. `sop_photos`
**Purpose**: Verification images with approval workflow
```sql
Key Fields:
- sop_completion_id (UUID) - Links to completion
- file_path (TEXT) - Storage location
- verification_status (ENUM) - pending, approved, rejected, flagged
- quality_score (DECIMAL) - Image quality assessment
- metadata (JSONB) - EXIF data, GPS coordinates
```

#### 6. `sop_schedules`
**Purpose**: Recurring task automation
```sql
Key Fields:
- frequency (ENUM) - once, daily, weekly, monthly, quarterly, yearly
- frequency_details (JSONB) - Custom schedule parameters
- days_of_week/days_of_month (INTEGER[]) - Schedule constraints
- next_generation_at (TIMESTAMPTZ) - Next assignment creation
- auto_assign (BOOLEAN) - Automatic assignment flag
```

#### 7. `sop_approvals`
**Purpose**: Manager oversight and approval workflow
```sql
Key Fields:
- sop_completion_id (UUID) - Completion reference
- approver_id (UUID) - Assigned approver
- approval_type (VARCHAR) - Type of approval required
- approval_criteria (JSONB) - Specific requirements
- escalated_to (UUID) - Escalation chain
```

#### 8. `sop_versions`
**Purpose**: Change tracking and version control
```sql
Key Fields:
- sop_document_id (UUID) - Parent document
- version_number (INTEGER) - Sequential versioning
- change_summary/change_summary_th (TEXT) - Bilingual change notes
- breaking_changes (BOOLEAN) - Impact flag
- is_current (BOOLEAN) - Current version marker
```

#### 9. `sop_analytics`
**Purpose**: Performance metrics and KPIs
```sql
Key Fields:
- date_recorded (DATE) - Analytics date
- completion_rate/on_time_completion_rate (DECIMAL) - Performance %
- avg_compliance_score/avg_quality_rating (DECIMAL) - Quality metrics
- critical_failures/escalations (INTEGER) - Risk indicators
- unique_completers (INTEGER) - Staff engagement
```

#### 10. `sop_equipment`
**Purpose**: Equipment tracking and maintenance
```sql
Key Fields:
- name/name_th (VARCHAR) - Bilingual equipment names
- status (ENUM) - available, in_use, maintenance, out_of_order
- next_maintenance_date (DATE) - Maintenance scheduling
- maintenance_schedule (JSONB) - Maintenance requirements
- is_critical (BOOLEAN) - Operational criticality
```

### Existing Core Tables (From Initial Schema)
- `restaurants` - Multi-tenant restaurant management
- `auth_users` - Authentication with PIN system
- `sop_categories` - 16 standard restaurant categories
- `audit_logs` - Comprehensive audit trail
- `form_templates` & `form_submissions` - Dynamic forms

---

## Table Relationships

### Primary Relationships
```
restaurants (1) ──→ (∞) sop_documents
sop_categories (1) ──→ (∞) sop_documents  
sop_documents (1) ──→ (∞) sop_steps
sop_documents (1) ──→ (∞) sop_assignments
sop_assignments (1) ──→ (1) sop_completions
sop_completions (1) ──→ (∞) sop_photos
sop_completions (1) ──→ (∞) sop_approvals
sop_documents (1) ──→ (∞) sop_schedules
sop_documents (1) ──→ (∞) sop_versions
restaurants (1) ──→ (∞) sop_equipment
```

### Key Foreign Key Constraints
- All tables enforce restaurant-level isolation
- Cascade deletes protect data integrity
- User references ensure audit trail preservation
- Equipment arrays in steps maintain referential integrity

---

## Security Implementation

### Row Level Security (RLS) Policies

#### Restaurant Isolation
- All SOP tables enforce restaurant-based access control
- Users can only access data from their assigned restaurant
- Admins have cross-restaurant access for system management

#### Role-Based Access Control

**Staff (role='staff')**
- Read: Own assignments, approved SOPs, own completions
- Write: Own completions, photos, assignment status updates
- Restrictions: Cannot create/modify SOPs or schedules

**Manager (role='manager')**  
- Read: All restaurant data, analytics, audit logs
- Write: SOPs, assignments, approvals, schedules, equipment
- Special: Can verify completions and approve workflows

**Admin (role='admin')**
- Read: All data across restaurants  
- Write: System-wide configuration and management
- Special: Cross-restaurant analytics and reporting

#### Specific Policy Examples
```sql
-- Staff can only see their own assignments
CREATE POLICY "sop_assignments_select_policy" ON sop_assignments
FOR SELECT TO authenticated
USING (assigned_to = auth.uid() OR user_is_manager_or_admin());

-- Managers can approve completions in their restaurant
CREATE POLICY "sop_approvals_update_policy" ON sop_approvals  
FOR UPDATE TO authenticated
USING (restaurant_id = get_current_user_restaurant_id() 
       AND user_is_manager_or_admin());
```

### Helper Functions
- `get_current_user_restaurant_id()` - Returns user's restaurant context
- `user_has_role(roles[])` - Role validation
- `user_is_manager_or_admin()` - Elevated permission check
- `can_access_sop_document(uuid)` - Document access validation

---

## Performance Optimization

### Indexing Strategy

#### Full-Text Search Indexes
- **English**: `idx_sop_documents_fulltext_en` - GIN index on title + content + tags
- **Thai**: `idx_sop_documents_fulltext_th` - GIN index on Thai content  
- **Trigram**: `idx_sop_documents_title_trigram` - Fuzzy search with typo tolerance

#### Composite Indexes for Common Queries
- `idx_sop_documents_restaurant_status_priority` - Dashboard queries
- `idx_sop_assignments_user_status_due` - User assignment lists
- `idx_sop_completions_performance` - Analytics calculations
- `idx_sop_analytics_daily_report` - Dashboard metrics

#### Covering Indexes
- `idx_sop_assignments_covering` - Include frequently accessed columns
- `idx_sop_completions_covering` - Avoid table lookups for dashboards

#### Specialized Indexes
- `idx_sop_assignments_overdue` - Critical for alert system
- `idx_sop_photos_verification_workflow` - Photo approval process
- `idx_sop_equipment_critical_status` - Equipment monitoring

### Query Optimization Functions
```sql
-- Optimized SOP search with ranking
search_sop_documents(query, restaurant_id, category_id, status, limit)

-- Maintenance function for index optimization  
reindex_sop_tables() -- Reindex high-traffic tables
```

### Performance Targets
- **Sub-100ms search** responses with full-text search
- **Concurrent 100+ tablets** support with proper indexing
- **Real-time updates** under 500ms latency
- **Analytics queries** under 2 seconds for 30-day periods

---

## Real-time Features

### Real-time Subscriptions
All SOP tables are enabled for real-time replication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sop_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_assignments; 
-- ... all SOP tables
```

### Notification Channels
- `sop_assignments_{restaurant_id}` - Assignment updates
- `sop_completions_{restaurant_id}` - Completion notifications  
- `sop_approvals_{restaurant_id}` - Approval workflow
- `dashboard_{restaurant_id}` - Dashboard updates
- `user_{user_id}` - Personal notifications

### Notification Triggers
- **Assignment changes** → Real-time notifications to assigned users
- **Completion updates** → Manager notifications for approvals
- **Overdue tasks** → Escalation notifications with reminder counts
- **Equipment issues** → Maintenance alerts for critical equipment

### Scheduled Functions
```sql
process_scheduled_notifications() -- Run every 15 minutes
send_overdue_reminders() -- Run every hour  
```

---

## Analytics & Reporting

### Core Analytics Functions

#### SOP Performance Metrics
```sql
calculate_sop_performance_metrics(restaurant_id, sop_id, start_date, end_date)
```
Returns:
- Completion rates, on-time performance
- Quality ratings, compliance scores  
- Photo compliance, critical failures
- Performance scores, risk assessment

#### Staff Performance Analysis
```sql
calculate_staff_sop_performance(restaurant_id, user_id, start_date, end_date)
```
Returns:
- Individual completion rates
- Quality consistency scores
- Improvement trends over time
- Performance ranking metrics

#### Dashboard Metrics
```sql
calculate_restaurant_dashboard_metrics(restaurant_id, period_days)
```
Returns:
- Current vs previous period comparison
- Trend analysis (UP/DOWN indicators)
- Status indicators (SUCCESS/WARNING/ERROR)
- Key performance indicators

#### Compliance Monitoring
```sql
generate_compliance_alerts(restaurant_id, severity_threshold)
```
Returns:
- Overdue assignment alerts
- Low compliance score warnings
- Critical control point failures
- Missing photo verification alerts

#### Equipment Analytics
```sql
calculate_equipment_analytics(restaurant_id)
```
Returns:
- Equipment utilization rates
- Maintenance scheduling alerts
- Usage patterns and efficiency scores
- Cost tracking and ROI metrics

### Automated Analytics Updates
- **Real-time triggers** update analytics on each completion
- **Daily aggregation** creates summary records
- **Alert generation** monitors thresholds and escalations

---

## Migration Files

### Database Migration Sequence

1. **001_initial_schema.sql** - Core restaurant and user tables
2. **002-017** - Translation system and existing features  
3. **018_sop_workflow_tables.sql** - All SOP tables and enums
4. **019_sop_rls_policies.sql** - Comprehensive security policies
5. **020_sop_advanced_indexes.sql** - Performance optimization  
6. **021_sop_audit_triggers.sql** - Audit logging system
7. **022_sop_analytics_functions.sql** - Analytics calculations
8. **023_sop_realtime_subscriptions.sql** - Real-time notifications
9. **024_sop_seed_data.sql** - Sample data and testing

### Migration Safety
- **Reversible migrations** with proper rollback procedures
- **Non-blocking deployment** using blue-green strategies  
- **Data integrity checks** before and after migrations
- **Performance impact assessment** for each migration

---

## API Integration

### Supabase Integration Patterns

#### Real-time Subscriptions
```typescript
// Subscribe to assignment updates
const subscription = supabase
  .channel('sop_assignments')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'sop_assignments' },
    handleAssignmentUpdate
  )
  .subscribe();
```

#### Analytics API Calls
```typescript
// Get restaurant dashboard metrics
const { data } = await supabase.rpc('calculate_restaurant_dashboard_metrics', {
  restaurant_id_param: restaurantId,
  period_days: 30
});
```

#### Optimized Search
```typescript
// Full-text SOP search with ranking
const { data } = await supabase.rpc('search_sop_documents', {
  search_query: query,
  restaurant_id_param: restaurantId,
  limit_results: 20
});
```

### Frontend Integration Points
- **React hooks** for real-time data synchronization
- **Optimistic updates** for immediate UI feedback
- **Offline-first** strategies with intelligent sync
- **Tablet optimization** for touch interfaces

---

## Best Practices

### Database Design
- **Consistent naming** with restaurant domain terminology
- **Bilingual support** throughout all user-facing content
- **Audit trail** for all critical business operations
- **Soft deletes** where data retention is required
- **Performance monitoring** with query optimization

### Security Best Practices  
- **Principle of least privilege** in RLS policies
- **Input validation** at database function level
- **Audit logging** for all sensitive operations
- **Regular security reviews** of policy effectiveness

### Performance Guidelines
- **Index monitoring** and maintenance schedules
- **Query optimization** for tablet response times
- **Real-time efficiency** to minimize network overhead
- **Analytics caching** for dashboard responsiveness

### Compliance Requirements
- **Data retention** policies for audit trails
- **Change tracking** for regulatory compliance
- **Photo verification** for critical control points
- **Manager approval** workflows for high-risk operations

### Operational Excellence
- **Monitoring and alerting** for system health
- **Backup and recovery** procedures
- **Capacity planning** for restaurant growth
- **Documentation maintenance** for operational teams

---

## Summary

The SOP database architecture provides a comprehensive foundation for restaurant workflow management with:

- **10 specialized tables** for complete SOP lifecycle management
- **Comprehensive security** with role-based access control
- **High-performance indexing** for tablet-optimized operations  
- **Real-time notifications** for immediate workflow updates
- **Advanced analytics** for operational insights and compliance
- **Bilingual support** for English/Thai operations
- **Audit compliance** with comprehensive logging
- **Scalable design** supporting multiple restaurant locations

The system is production-ready and optimized for tablet-based restaurant operations with concurrent user support and real-time workflow management.

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-28  
**Total Tables**: 19 (10 new SOP tables + 9 existing)  
**Total Migrations**: 24 files  
**Performance Target**: Sub-100ms tablet response times  
**Concurrency Support**: 100+ concurrent tablet users  
**Compliance Level**: Enterprise-grade audit trails