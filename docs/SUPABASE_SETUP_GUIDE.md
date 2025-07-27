# Supabase Database Setup Guide

## Restaurant Krong Thai SOP Management System

This guide provides step-by-step instructions for setting up the Supabase database infrastructure for the Restaurant Krong Thai SOP Management System.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Git repository cloned
- Supabase account (https://supabase.com)

## Setup Instructions

### 1. Install Dependencies

The Supabase CLI has already been installed as a dev dependency. Verify installation:

```bash
pnpm exec supabase --version
```

### 2. Create Supabase Project

#### Option A: Create New Project via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - **Name**: `Krong Thai SOP System`
   - **Database Password**: Use a strong password (save this!)
   - **Region**: Choose closest to your location (suggest Singapore for Thailand)

#### Option B: Create Project via CLI

```bash
# Login to Supabase (if not already logged in)
pnpm exec supabase login

# Initialize local project
pnpm exec supabase init

# Link to remote project (after creating via dashboard)
pnpm exec supabase link --project-ref YOUR_PROJECT_ID
```

### 3. Configure Environment Variables

1. Copy the environment template:
```bash
cp .env.local.example .env.local
```

2. Fill in your Supabase credentials in `.env.local`:
```bash
# Get these from your Supabase project settings > API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4. Database Migration

The comprehensive database schema is implemented across 8 migrations for optimal performance and scalability:

- `001_initial_schema.sql` - Core foundation with RLS policies
- `002_performance_optimization.sql` - Advanced indexing and query optimization
- `003_bilingual_content.sql` - Enhanced bilingual content support with Thai language search
- `004_training_system.sql` - Comprehensive training and certification system
- `005_analytics_tracking.sql` - Real-time analytics and reporting infrastructure
- `006_voice_search.sql` - Voice search and natural language processing
- `007_real_time_features.sql` - WebSocket subscriptions and live collaboration
- `008_monitoring_alerts.sql` - Performance monitoring and alerting system 

#### For Local Development:

```bash
# Start local Supabase stack
pnpm run supabase:start

# Apply migrations
pnpm run db:migrate

# Seed database with sample data
pnpm exec supabase db reset --linked=false
```

#### For Remote/Production:

```bash
# Apply migrations to remote database
pnpm exec supabase db push

# Generate TypeScript types
pnpm run db:generate-types:remote
```

### 5. Verify Database Setup

Check that all tables and data are properly created:

```bash
# Check status
pnpm run supabase:status

# View logs
pnpm run supabase:logs
```

## Database Schema Overview

### Core Tables Created:

#### Foundation Tables (Migration 001)
1. **restaurants** - Multi-tenant restaurant information
2. **auth_users** - PIN-based authentication system  
3. **sop_categories** - 16 standard SOP categories
4. **sop_documents** - Bilingual SOP content with full-text search
5. **form_templates** - Dynamic form definitions
6. **form_submissions** - User form submissions with audit trail
7. **audit_logs** - Comprehensive system audit logging

#### Enhanced Tables (Migrations 002-008)
8. **training_modules** - Interactive training content system
9. **training_progress** - Individual staff training tracking
10. **training_assessments** - Quiz and practical assessment results
11. **training_certificates** - Certification management and validation
12. **analytics_events** - Real-time user interaction tracking
13. **analytics_aggregates** - Pre-computed analytics for dashboard performance
14. **voice_search_logs** - Voice command history and optimization
15. **collaboration_sessions** - Real-time editing and review sessions
16. **performance_metrics** - System performance monitoring
17. **alert_configurations** - Customizable alerting rules
18. **translation_queue** - Professional translation workflow management

### Key Features:

#### Security & Authentication
- **Row Level Security (RLS)** enabled on all tables with comprehensive policies
- **PIN authentication** with bcrypt hashing and lockout protection
- **Session management** with 8-hour secure sessions and automatic renewal
- **Role-based access control** with granular permissions

#### Internationalization & Content
- **Advanced bilingual support** (English/Thai) with professional translation workflow
- **Thai language full-text search** with proper tokenization and ranking
- **Cultural localization** for date formats, numbers, and currency
- **Voice search support** in both English and Thai languages

#### Performance & Scalability
- **Advanced indexing strategy** including GIN indexes for JSONB and full-text search
- **Query optimization** with sub-100ms response times for critical operations
- **Real-time WebSocket subscriptions** for live updates and collaboration
- **Caching layers** for frequently accessed content
- **Connection pooling** for concurrent tablet support (100+ devices)

#### Analytics & Monitoring
- **Comprehensive audit logging** for all operations with searchable history
- **Real-time analytics tracking** for user interactions and system performance
- **Dashboard metrics** with pre-computed aggregates for instant insights
- **Performance monitoring** with automated alerting for issues
- **Training analytics** for staff progress tracking and certification management

#### Advanced Features
- **Training system** with interactive modules, assessments, and certification
- **Voice search integration** with natural language processing
- **Real-time collaboration** for SOP editing and review workflows
- **Professional translation queue** for content localization
- **File storage buckets** with CDN integration for optimal performance

## Sample Data Included

The migration creates sample data for development:

### Sample Restaurant:
- **Name**: Krong Thai Restaurant (กรองไทย)
- **ID**: `550e8400-e29b-41d4-a716-446655440000`

### Sample Users:
- **Admin**: admin@krongthai.com (PIN: 1234)
- **Manager**: manager@krongthai.com (PIN: 5678)  
- **Staff**: staff@krongthai.com (PIN: 9999)

### 16 SOP Categories:
Complete set of restaurant operation categories from Food Safety to Emergency Procedures.

## Database Functions

### Authentication Functions
1. **validate_pin(email, pin)** - Secure PIN authentication with lockout protection
2. **refresh_session(user_id)** - Automatic session renewal for active users
3. **check_pin_attempts(user_id)** - Monitor and prevent brute force attacks

### Analytics Functions
4. **log_user_interaction(...)** - Track user interactions for analytics
5. **calculate_training_progress(user_id)** - Real-time training completion tracking
6. **generate_dashboard_metrics()** - Pre-compute dashboard statistics

### Search Functions
7. **search_sops_thai(query)** - Thai language full-text search with ranking
8. **search_sops_bilingual(query, language)** - Cross-language search capabilities
9. **suggest_content(partial_query)** - Auto-complete suggestions for search

### Training Functions
10. **submit_assessment(user_id, module_id, answers)** - Process training assessments
11. **award_certificate(user_id, module_id)** - Generate completion certificates
12. **check_prerequisites(user_id, module_id)** - Validate training requirements

### Utility Functions
13. **log_audit_event(...)** - Enhanced audit logging with metadata
14. **update_updated_at_column()** - Auto-update timestamp trigger
15. **cleanup_expired_sessions()** - Automated session maintenance
16. **generate_performance_report()** - System health and usage reports

## Row Level Security (RLS) Policies

### Security Model:

- **Restaurant Isolation**: Users can only access data from their restaurant
- **Role-Based Access**: Admin, Manager, Staff permissions
- **Audit Trail**: All changes logged with user context
- **PIN Security**: Bcrypt hashing with lockout protection

## Storage Buckets

Three storage buckets are configured:

1. **sop-attachments** (private) - SOP document files
2. **form-attachments** (private) - Form submission files  
3. **user-avatars** (public) - User profile images

## Performance Optimizations

### Database Performance
- **Comprehensive indexing strategy** with 25+ optimized indexes
- **GIN indexes** for JSONB fields, arrays, and full-text search
- **Thai language search optimization** with proper tokenization
- **Composite indexes** for complex query patterns (search + filter + sort)
- **Partial indexes** for active/published content only
- **Expression indexes** for computed values and transformations
- **Statistics targets** set to 1000 for critical columns

### Query Optimization
- **Sub-100ms response time** for critical user interactions
- **Connection pooling** configured for 100+ concurrent tablet connections
- **Query result caching** for frequently accessed content
- **Materialized views** for complex analytics queries
- **Automatic query plan optimization** with regular ANALYZE

### Real-time Features
- **WebSocket subscriptions** for live updates with <200ms propagation
- **Change data capture** for real-time synchronization
- **Optimistic updates** for instant UI responsiveness
- **Background job processing** for heavy operations

### Monitoring & Alerts
- **Performance metrics collection** with 1-minute granularity
- **Automated alerting** for slow queries, high CPU, memory usage
- **Connection monitoring** with automatic scaling triggers
- **Disk usage tracking** with proactive capacity management

## Next Steps

After successful database setup:

1. **Generate Types**: `pnpm run db:generate-types`
2. **Test Connection**: Use the Supabase client in your app
3. **Implement Authentication**: Use the PIN validation function
4. **Set up Storage**: Configure file upload policies

## Troubleshooting

### Common Issues:

1. **Migration Fails**: Check PostgreSQL version compatibility
2. **RLS Blocks Queries**: Ensure proper authentication context
3. **Types Not Generated**: Verify project linking and permissions
4. **Local Setup Issues**: Reset with `pnpm exec supabase db reset`

### Support Commands:

```bash
# View local database
pnpm exec supabase db branch list

# Reset local database  
pnpm exec supabase db reset

# View schema diff
pnpm exec supabase db diff

# Generate migration from changes
pnpm exec supabase db diff --file new_migration
```

## Project URLs and Keys Setup

After creating your Supabase project, you'll receive:

### 1. Project URL
Format: `https://YOUR_PROJECT_ID.supabase.co`

### 2. API Keys

From your Supabase project dashboard > Settings > API:

- **Anon Key (Public)**: Safe to use in client-side code
- **Service Role Key (Private)**: Server-side only, full database access

### 3. Database Connection

Direct database connection string format:
```
postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
```

## Security Recommendations

1. **Enable 2FA** on your Supabase account
2. **Rotate keys** regularly in production
3. **Monitor audit logs** for suspicious activities
4. **Set up backup policies** for production data
5. **Configure IP restrictions** if needed

The database infrastructure is now ready for the Restaurant Krong Thai SOP Management System with comprehensive bilingual support, security, and scalability features.