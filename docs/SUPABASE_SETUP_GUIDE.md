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

The comprehensive database schema is ready in `/supabase/migrations/001_initial_schema.sql`. 

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

1. **restaurants** - Multi-tenant restaurant information
2. **auth_users** - PIN-based authentication system  
3. **sop_categories** - 16 standard SOP categories
4. **sop_documents** - Bilingual SOP content with full-text search
5. **form_templates** - Dynamic form definitions
6. **form_submissions** - User form submissions with audit trail
7. **audit_logs** - Comprehensive system audit logging

### Key Features:

- **Row Level Security (RLS)** enabled on all tables
- **Bilingual support** (English/Thai) throughout
- **Advanced indexing** including GIN indexes for JSONB and full-text search
- **Audit logging** for all operations
- **PIN authentication** with bcrypt hashing
- **File storage buckets** for attachments

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

### Key Functions Created:

1. **validate_pin(email, pin)** - Secure PIN authentication
2. **log_audit_event(...)** - Audit logging helper
3. **update_updated_at_column()** - Auto-update timestamp trigger

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

- **Comprehensive indexing** on frequently queried columns
- **GIN indexes** for JSONB fields and arrays
- **Full-text search** indexes for English and Thai content
- **Composite indexes** for common query patterns
- **Statistics targets** set for better query planning

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