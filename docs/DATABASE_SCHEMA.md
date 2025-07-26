# Database Schema Documentation - Restaurant Krong Thai SOP System

This document provides a comprehensive overview of the PostgreSQL database schema for the Restaurant Krong Thai Standard Operating Procedures (SOP) management system, deployed on Supabase.

## ⚠️ CRITICAL NOTICE - Schema Inconsistencies Detected

**Status**: Schema misalignment between TypeScript types and actual database implementation  
**Impact**: Type safety compromised, potential runtime errors  
**Required Action**: Immediate schema audit and type regeneration needed  
**Last Updated**: July 26, 2025

## Overview

The database supports a bilingual (English/Thai) restaurant SOP system with role-based access control, audit logging, and form submissions. The system is designed for multi-tenant restaurant operations with comprehensive tracking and reporting capabilities.

### Key Features

- **Bilingual Support**: English and Thai content storage
- **Role-Based Access Control**: Manager, Staff, and Admin roles
- **PIN Authentication**: Simple 4-digit PIN system for restaurant staff
- **16 SOP Categories**: Comprehensive coverage of restaurant operations
- **Audit Logging**: Complete audit trail for all operations
- **Form Submissions**: Digital form capture and management
- **Row Level Security (RLS)**: Tenant isolation and data protection

## Database Tables

### 1. Authentication & Users

#### `auth_users`
Core user authentication and profile management.

```sql
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    pin_hash VARCHAR(255), -- Hashed 4-digit PIN
    role user_role NOT NULL DEFAULT 'staff',
    full_name VARCHAR(255) NOT NULL,
    full_name_th VARCHAR(255), -- Thai name
    phone VARCHAR(20),
    position VARCHAR(100),
    position_th VARCHAR(100), -- Thai position
    restaurant_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    pin_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Indexes
CREATE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_auth_users_restaurant ON auth_users(restaurant_id);
CREATE INDEX idx_auth_users_role ON auth_users(role);
CREATE INDEX idx_auth_users_active ON auth_users(is_active);
```

#### `user_roles` (ENUM)
```sql
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
```

### 2. Restaurant Management

#### `restaurants`
Restaurant/tenant information.

```sql
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255), -- Thai name
    address TEXT,
    address_th TEXT, -- Thai address
    phone VARCHAR(20),
    email VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_restaurants_active ON restaurants(is_active);
```

### 3. SOP Categories

#### `sop_categories`
The 16 standard categories for restaurant operations.

```sql
CREATE TABLE sop_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'FOOD_SAFETY', 'CLEANING'
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255) NOT NULL, -- Thai name
    description TEXT,
    description_th TEXT, -- Thai description
    icon VARCHAR(50), -- Icon identifier
    color VARCHAR(7), -- Hex color code
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sop_categories_code ON sop_categories(code);
CREATE INDEX idx_sop_categories_active ON sop_categories(is_active);
CREATE INDEX idx_sop_categories_sort ON sop_categories(sort_order);
```

### 4. SOP Documents

#### `sop_documents`
Bilingual SOP content and procedures.

```sql
CREATE TABLE sop_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_th VARCHAR(500) NOT NULL, -- Thai title
    content TEXT NOT NULL,
    content_th TEXT NOT NULL, -- Thai content
    steps JSONB, -- Structured step-by-step procedures
    steps_th JSONB, -- Thai structured steps
    attachments JSONB DEFAULT '[]', -- File attachments
    tags VARCHAR(255)[], -- Searchable tags
    tags_th VARCHAR(255)[], -- Thai tags
    version INTEGER DEFAULT 1,
    status sop_status DEFAULT 'draft',
    priority sop_priority DEFAULT 'medium',
    effective_date DATE,
    review_date DATE,
    created_by UUID NOT NULL,
    updated_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_category FOREIGN KEY (category_id) REFERENCES sop_categories(id),
    CONSTRAINT fk_sop_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_sop_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- Indexes
CREATE INDEX idx_sop_documents_category ON sop_documents(category_id);
CREATE INDEX idx_sop_documents_restaurant ON sop_documents(restaurant_id);
CREATE INDEX idx_sop_documents_status ON sop_documents(status);
CREATE INDEX idx_sop_documents_priority ON sop_documents(priority);
CREATE INDEX idx_sop_documents_active ON sop_documents(is_active);
CREATE INDEX idx_sop_documents_created_by ON sop_documents(created_by);
CREATE INDEX idx_sop_documents_tags ON sop_documents USING GIN(tags);
CREATE INDEX idx_sop_documents_tags_th ON sop_documents USING GIN(tags_th);

-- Full-text search indexes
CREATE INDEX idx_sop_documents_search_en ON sop_documents USING GIN(to_tsvector('english', title || ' ' || content));
CREATE INDEX idx_sop_documents_search_th ON sop_documents USING GIN(to_tsvector('thai', title_th || ' ' || content_th));
```

#### SOP Enums
```sql
CREATE TYPE sop_status AS ENUM ('draft', 'review', 'approved', 'archived');
CREATE TYPE sop_priority AS ENUM ('low', 'medium', 'high', 'critical');
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