# Database Schema Documentation - Restaurant Krong Thai SOP System

This document provides a comprehensive overview of the PostgreSQL database schema for the Restaurant Krong Thai Standard Operating Procedures (SOP) management system, deployed on Supabase.

## ✅ SCHEMA STATUS - Production Ready

**Status**: Database schema fully implemented and operational  
**Migration State**: 4 migrations completed successfully  
**Type Safety**: TypeScript types aligned with database schema  
**Last Updated**: July 27, 2025

## Overview

The database supports a comprehensive bilingual (English/Thai) restaurant SOP system with role-based access control, training modules, progress tracking, and comprehensive audit logging. The system is designed for multi-tenant restaurant operations with full security and scalability.

### Key Features

- **Bilingual Support**: Complete English and Thai content storage
- **Multi-tenant Architecture**: Restaurant isolation with Row Level Security
- **PIN Authentication**: bcrypt-hashed 4-digit PIN system for restaurant staff
- **16 SOP Categories**: Complete coverage of restaurant operations
- **Training System**: Interactive modules with assessments and certificates
- **Progress Tracking**: Detailed user progress and bookmark management
- **Session Management**: Location-bound tablet sessions with device binding
- **Audit Logging**: Comprehensive audit trail for all operations
- **File Management**: Attachment storage and management system

### Schema Implementation Status

#### ✅ Completed Components
1. **Core Schema**: All 12 main tables implemented with relationships
2. **Migration System**: 4 progressive migrations for incremental builds
3. **Bilingual Structure**: Thai and English content fields throughout
4. **Security Layer**: Row Level Security policies for multi-tenant isolation
5. **Performance Optimization**: Strategic indexing and full-text search
6. **Training Infrastructure**: Complete training and assessment system

#### ✅ Database Health
- **Migrations**: 4/4 completed successfully
- **Sample Data**: Restaurant, users, and 16 SOP categories seeded
- **Indexes**: Performance-optimized with GIN indexes for search
- **Functions**: Custom database functions for business logic
- **Triggers**: Automated timestamp updates and analytics

## Database Migration Architecture

The database schema is built using a 4-migration progressive approach:

### Migration 001: Core Foundation
- **Tables**: restaurants, auth_users, sop_categories, sop_documents, form_templates, form_submissions, audit_logs
- **Features**: Basic multi-tenant structure, PIN authentication, SOP management, audit logging
- **Enums**: user_role, sop_status, sop_priority, submission_status, audit_action

### Migration 002: Device Management
- **Tables**: user_devices
- **Features**: Device fingerprinting, device binding, trusted device management
- **Security**: Enhanced authentication with device tracking

### Migration 003: Training System
- **Tables**: training_modules, training_sections, training_questions, user_training_progress, user_section_progress, training_assessments, training_question_responses, training_certificates, training_reminders, training_analytics
- **Features**: Complete training infrastructure with assessments and certification
- **Enums**: training_status, assessment_status, certificate_status

### Migration 004: Session & Progress Management
- **Tables**: location_sessions, user_bookmarks, user_progress, user_progress_summary, uploaded_files
- **Features**: Location-bound sessions, progress tracking, file management
- **Enhancement**: Extended user_sessions table for location binding

## Database Tables

### 1. Core Authentication & Multi-tenancy

#### `restaurants` - Multi-tenant Support
```sql
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255),                    -- Thai restaurant name
    address TEXT,
    address_th TEXT,                         -- Thai address
    phone VARCHAR(20),
    email VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    settings JSONB DEFAULT '{}',             -- Restaurant configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `auth_users` - Staff Authentication
```sql
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    pin_hash VARCHAR(255),                   -- bcrypt hashed 4-digit PIN
    role user_role NOT NULL DEFAULT 'staff', -- admin, manager, staff
    full_name VARCHAR(255) NOT NULL,
    full_name_th VARCHAR(255),               -- Thai name
    phone VARCHAR(20),
    position VARCHAR(100),
    position_th VARCHAR(100),                -- Thai position
    restaurant_id UUID NOT NULL,            -- Multi-tenant isolation
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    pin_changed_at TIMESTAMPTZ,
    pin_attempts INTEGER DEFAULT 0,          -- Rate limiting
    locked_until TIMESTAMPTZ,               -- Progressive lockout
    device_fingerprint TEXT,                -- Device binding
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
```

#### `user_devices` - Device Management
```sql
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    fingerprint_hash VARCHAR(255) NOT NULL, -- SHA-256 device fingerprint
    name VARCHAR(255) NOT NULL,             -- "Kitchen Tablet #1"
    type device_type NOT NULL DEFAULT 'tablet', -- tablet, desktop, mobile
    location VARCHAR(255),                   -- Physical location
    user_agent TEXT,
    ip_address INET,
    is_active BOOLEAN DEFAULT true,
    is_trusted BOOLEAN DEFAULT false,        -- Admin-approved device
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    trusted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',             -- Device capabilities, screen size, etc.
    
    CONSTRAINT fk_user_devices_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);
```

### 2. SOP Management System

#### `sop_categories` - 16 Standard Restaurant Categories
```sql
CREATE TABLE sop_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,        -- 'FOOD_SAFETY', 'CLEANING', etc.
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255) NOT NULL,           -- Thai category name
    description TEXT,
    description_th TEXT,                     -- Thai description
    icon VARCHAR(50),                        -- Icon identifier (shield-check, spray-can, etc.)
    color VARCHAR(7),                        -- Hex color code for UI theming
    sort_order INTEGER NOT NULL DEFAULT 0,  -- Display order
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Standard 16 categories include:
-- FOOD_SAFETY, CLEANING, CUSTOMER_SERVICE, KITCHEN_OPS, INVENTORY, CASH_HANDLING,
-- STAFF_TRAINING, SAFETY_SECURITY, MAINTENANCE, QUALITY_CONTROL, OPENING_CLOSING,
-- DELIVERY_TAKEOUT, WASTE_MANAGEMENT, COMPLIANCE, MARKETING_PROMO, EMERGENCY
```

#### `sop_documents` - Bilingual SOP Content
```sql
CREATE TABLE sop_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,            -- Multi-tenant isolation
    title VARCHAR(500) NOT NULL,
    title_th VARCHAR(500) NOT NULL,         -- Thai title
    content TEXT NOT NULL,
    content_th TEXT NOT NULL,               -- Thai content
    steps JSONB,                            -- Structured step-by-step procedures
    steps_th JSONB,                         -- Thai structured steps
    attachments JSONB DEFAULT '[]',         -- File attachment references
    tags VARCHAR(255)[],                    -- Searchable tags (English)
    tags_th VARCHAR(255)[],                 -- Thai searchable tags
    version INTEGER DEFAULT 1,
    status sop_status DEFAULT 'draft',      -- draft, review, approved, archived
    priority sop_priority DEFAULT 'medium', -- low, medium, high, critical
    effective_date DATE,
    review_date DATE,
    created_by UUID NOT NULL,
    updated_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_category FOREIGN KEY (category_id) REFERENCES sop_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- Performance indexes for SOP search and filtering
CREATE INDEX idx_sop_documents_category ON sop_documents(category_id);
CREATE INDEX idx_sop_documents_restaurant ON sop_documents(restaurant_id);
CREATE INDEX idx_sop_documents_status ON sop_documents(status);
CREATE INDEX idx_sop_documents_tags ON sop_documents USING GIN(tags);
CREATE INDEX idx_sop_documents_tags_th ON sop_documents USING GIN(tags_th);

-- Full-text search indexes for bilingual content
CREATE INDEX idx_sop_documents_search_en ON sop_documents 
    USING GIN(to_tsvector('english', title || ' ' || content));
CREATE INDEX idx_sop_documents_search_th ON sop_documents 
    USING GIN(to_tsvector('simple', title_th || ' ' || content_th));
```

### 3. Training System

#### `training_modules` - Interactive Training
```sql
CREATE TABLE training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,          -- Links training to specific SOP
    title VARCHAR(500) NOT NULL,
    title_th VARCHAR(500) NOT NULL,         -- Thai title
    description TEXT,
    description_th TEXT,                    -- Thai description
    duration_minutes INTEGER DEFAULT 30,    -- Expected completion time
    passing_score INTEGER DEFAULT 80,       -- Minimum score to pass (0-100)
    max_attempts INTEGER DEFAULT 3,         -- Maximum assessment attempts
    validity_days INTEGER DEFAULT 365,      -- Certificate validity period
    is_mandatory BOOLEAN DEFAULT false,     -- Required for all staff
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_training_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_training_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_training_created FOREIGN KEY (created_by) REFERENCES auth_users(id)
);
```

#### `training_sections` - Module Content Breakdown
```sql
CREATE TABLE training_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL,
    section_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_th VARCHAR(500) NOT NULL,         -- Thai title
    content TEXT NOT NULL,
    content_th TEXT NOT NULL,               -- Thai content
    media_urls JSONB DEFAULT '[]',          -- Images, videos, documents
    estimated_minutes INTEGER DEFAULT 5,    -- Time for this section
    is_required BOOLEAN DEFAULT true,       -- Must complete to progress
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_section_module FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE,
    CONSTRAINT unique_section_number UNIQUE (module_id, section_number)
);
```

#### `training_certificates` - Digital Certification
```sql
CREATE TABLE training_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    assessment_id UUID NOT NULL,
    certificate_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'KT-FS-001-2024-001'
    status certificate_status DEFAULT 'active',     -- active, expired, revoked
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,                         -- Based on module validity_days
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    revoked_reason TEXT,
    certificate_data JSONB NOT NULL,               -- PDF metadata, template info
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_certificate_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_certificate_module FOREIGN KEY (module_id) REFERENCES training_modules(id),
    CONSTRAINT fk_certificate_revoker FOREIGN KEY (revoked_by) REFERENCES auth_users(id)
);
```

#### `user_training_progress` - Progress Tracking
```sql
CREATE TABLE user_training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    status training_status DEFAULT 'not_started', -- not_started, in_progress, completed, failed, expired
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_section_id UUID,                      -- Current position in training
    started_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent_minutes INTEGER DEFAULT 0,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_progress_module FOREIGN KEY (module_id) REFERENCES training_modules(id),
    CONSTRAINT unique_user_module_attempt UNIQUE (user_id, module_id, attempt_number)
);
```

### 4. Session Management & Progress Tracking

#### `location_sessions` - Tablet Location Binding
```sql
CREATE TABLE location_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    tablet_device_id VARCHAR(255) NOT NULL,     -- Device fingerprint
    session_token VARCHAR(255) NOT NULL,        -- Secure session identifier
    name VARCHAR(255) NOT NULL,                 -- "Kitchen Station #1", "Front Counter"
    location VARCHAR(255),                      -- Physical location description
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,            -- 24-hour expiry
    last_staff_login_at TIMESTAMPTZ,            -- Last successful staff login
    last_staff_user_id UUID,                    -- Last staff member to use
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_location_session_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_location_session_last_user FOREIGN KEY (last_staff_user_id) REFERENCES auth_users(id)
);

-- Ensure only one active session per device
CREATE UNIQUE INDEX idx_location_sessions_active_device 
    ON location_sessions(tablet_device_id) WHERE is_active = true;
```

#### `user_bookmarks` - SOP Bookmarks & Favorites
```sql
CREATE TABLE user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sop_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,            -- Multi-tenant isolation
    notes TEXT,                             -- User notes for bookmark
    notes_th TEXT,                          -- Thai notes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bookmark_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookmark_sop FOREIGN KEY (sop_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookmark_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_sop_bookmark UNIQUE (user_id, sop_id)
);
```

#### `user_progress_summary` - User Activity Tracking
```sql
CREATE TABLE user_progress_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sop_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,            -- Multi-tenant isolation
    viewed_at TIMESTAMPTZ,                  -- When SOP was first viewed
    completed_at TIMESTAMPTZ,               -- When marked as completed
    downloaded_at TIMESTAMPTZ,              -- When downloaded for offline
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_progress_summary_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_summary_sop FOREIGN KEY (sop_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_summary_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_sop_summary UNIQUE (user_id, sop_id)
);
```

#### `uploaded_files` - File Attachment Management
```sql
CREATE TABLE uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,          -- Generated filename
    original_name VARCHAR(255) NOT NULL,     -- User's original filename
    mime_type VARCHAR(100) NOT NULL,         -- File MIME type
    size BIGINT NOT NULL,                    -- File size in bytes
    url TEXT NOT NULL,                       -- Supabase Storage URL
    thumbnail_url TEXT,                      -- Thumbnail for images/videos
    bucket VARCHAR(100) NOT NULL,            -- Storage bucket name
    path TEXT NOT NULL,                      -- Storage path
    category VARCHAR(100) NOT NULL,          -- File category (sop_attachment, training_media, etc.)
    sop_id UUID,                            -- Associated SOP document
    restaurant_id UUID NOT NULL,            -- Multi-tenant isolation
    uploaded_by UUID NOT NULL,              -- Uploader
    metadata JSONB DEFAULT '{}',             -- Additional file metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_file_sop FOREIGN KEY (sop_id) REFERENCES sop_documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_file_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_uploader FOREIGN KEY (uploaded_by) REFERENCES auth_users(id)
);
```

### 5. Form Management

#### `form_templates`
Template definitions for data collection forms.

```sql
CREATE TABLE form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255) NOT NULL, -- Thai name
    description TEXT,
    description_th TEXT, -- Thai description
    category VARCHAR(100),
    schema JSONB NOT NULL, -- Form field definitions
    schema_th JSONB, -- Thai form schema
    validation_rules JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_form_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_form_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Indexes
CREATE INDEX idx_form_templates_restaurant ON form_templates(restaurant_id);
CREATE INDEX idx_form_templates_category ON form_templates(category);
CREATE INDEX idx_form_templates_active ON form_templates(is_active);
```

#### `form_submissions`
Captured form data from staff submissions.

```sql
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    submitted_by UUID NOT NULL,
    data JSONB NOT NULL, -- Form field values
    attachments JSONB DEFAULT '[]', -- File attachments
    location VARCHAR(255), -- Where form was submitted
    ip_address INET,
    user_agent TEXT,
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status submission_status DEFAULT 'submitted',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    notes_th TEXT, -- Thai notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_submission_template FOREIGN KEY (template_id) REFERENCES form_templates(id),
    CONSTRAINT fk_submission_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_submission_user FOREIGN KEY (submitted_by) REFERENCES auth_users(id),
    CONSTRAINT fk_submission_reviewer FOREIGN KEY (reviewed_by) REFERENCES auth_users(id)
);

-- Indexes
CREATE INDEX idx_form_submissions_template ON form_submissions(template_id);
CREATE INDEX idx_form_submissions_restaurant ON form_submissions(restaurant_id);
CREATE INDEX idx_form_submissions_user ON form_submissions(submitted_by);
CREATE INDEX idx_form_submissions_date ON form_submissions(submission_date);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_data ON form_submissions USING GIN(data);
```

#### Submission Status Enum
```sql
CREATE TYPE submission_status AS ENUM ('submitted', 'reviewed', 'approved', 'rejected');
```

### 6. Audit & Logging

#### `audit_logs`
Comprehensive audit trail for all system operations.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID,
    action audit_action NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- Table name
    resource_id UUID, -- Record ID
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}', -- Additional context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_audit_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- Indexes
CREATE INDEX idx_audit_logs_restaurant ON audit_logs(restaurant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Partition by month for performance
CREATE INDEX idx_audit_logs_created_month ON audit_logs(date_trunc('month', created_at));
```

#### Audit Action Enum
```sql
CREATE TYPE audit_action AS ENUM (
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
    'VIEW', 'DOWNLOAD', 'UPLOAD', 'APPROVE', 'REJECT'
);
```

## Row Level Security (RLS) Policies

### Enable RLS on all tables
```sql
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### Restaurant-based isolation policies
```sql
-- Restaurant SOP isolation
CREATE POLICY "Restaurant SOP isolation"
ON sop_documents FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- Form Submissions: Restaurant isolation
CREATE POLICY "Restaurant form submission isolation"
ON form_submissions FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);
```

## Sample Data

### 1. Restaurant
```sql
INSERT INTO restaurants (id, name, name_th, address, address_th, phone, email) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Krong Thai Restaurant', 'ร้านกรองไทย', '123 Main Street, Bangkok', '123 ถนนใหญ่ กรุงเทพฯ', '+66-2-123-4567', 'info@krongthai.com');
```

### 2. SOP Categories (16 Standard Categories)
```sql
INSERT INTO sop_categories (code, name, name_th, description, description_th, icon, color, sort_order) VALUES
('FOOD_SAFETY', 'Food Safety & Hygiene', 'ความปลอดภัยและสุขอนามัยอาหาร', 'Food handling, storage, and safety procedures', 'ขั้นตอนการจัดการ เก็บรักษา และความปลอดภัยของอาหาร', 'shield-check', '#e74c3c', 1),
('CLEANING', 'Cleaning & Sanitation', 'การทำความสะอาดและสุขาภิบาล', 'Cleaning schedules, sanitization procedures', 'ตารางการทำความสะอาด ขั้นตอนการฆ่าเชื้อ', 'spray-can', '#3498db', 2),
('CUSTOMER_SERVICE', 'Customer Service', 'การบริการลูกค้า', 'Guest interaction, complaint handling, service standards', 'การปฏิสัมพันธ์กับแขก การจัดการข้อร้องเรียน มาตรฐานการบริการ', 'users', '#2ecc71', 3);
```

### 3. Sample Users
```sql
INSERT INTO auth_users (id, email, pin_hash, role, full_name, full_name_th, position, position_th, restaurant_id) VALUES
('660e8400-e29b-41d4-a716-446655440000', 'manager@krongthai.com', crypt('1234', gen_salt('bf')), 'manager', 'Somchai Jaidee', 'สมชาย ใจดี', 'Restaurant Manager', 'ผู้จัดการร้านอาหาร', '550e8400-e29b-41d4-a716-446655440000');
```

## Database Functions & Triggers

### 1. Updated At Trigger Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_restaurants_updated_at 
    BEFORE UPDATE ON restaurants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_users_updated_at 
    BEFORE UPDATE ON auth_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. PIN Validation Function
```sql
CREATE OR REPLACE FUNCTION validate_pin(user_email TEXT, pin_input TEXT)
RETURNS TABLE(
    user_id UUID,
    is_valid BOOLEAN,
    role user_role,
    restaurant_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        (u.pin_hash = crypt(pin_input, u.pin_hash)) as is_valid,
        u.role,
        u.restaurant_id
    FROM auth_users u
    WHERE u.email = user_email 
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This comprehensive schema supports the full functionality of the Krong Thai Restaurant SOP system with proper bilingual support, security, and scalability for multi-tenant restaurant operations.