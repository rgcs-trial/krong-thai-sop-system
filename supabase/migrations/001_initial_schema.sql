-- Restaurant Krong Thai SOP Management System
-- Comprehensive Database Schema Migration
-- Created: 2025-07-26
-- Updated to match DATABASE_SCHEMA.md specifications

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===========================================
-- ENUMS DEFINITION
-- ===========================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');

-- SOP status and priority enums
CREATE TYPE sop_status AS ENUM ('draft', 'review', 'approved', 'archived');
CREATE TYPE sop_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Form submission status enum
CREATE TYPE submission_status AS ENUM ('submitted', 'reviewed', 'approved', 'rejected');

-- Audit action enum
CREATE TYPE audit_action AS ENUM (
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
    'VIEW', 'DOWNLOAD', 'UPLOAD', 'APPROVE', 'REJECT'
);

-- ===========================================
-- CORE TABLES
-- ===========================================

-- 1. Restaurants table (multi-tenant support)
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

-- 2. Authentication users table
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    pin_hash VARCHAR(255), -- Hashed 4-digit PIN using bcrypt
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
    pin_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 3. SOP Categories table (16 standard categories)
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

-- 4. SOP Documents table (bilingual content)
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
    
    CONSTRAINT fk_sop_category FOREIGN KEY (category_id) REFERENCES sop_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- 5. Form Templates table
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
    
    CONSTRAINT fk_form_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_form_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- 6. Form Submissions table
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
    
    CONSTRAINT fk_submission_template FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_user FOREIGN KEY (submitted_by) REFERENCES auth_users(id),
    CONSTRAINT fk_submission_reviewer FOREIGN KEY (reviewed_by) REFERENCES auth_users(id)
);

-- 7. Audit Logs table (comprehensive audit trail)
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
    
    CONSTRAINT fk_audit_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- ===========================================
-- PERFORMANCE INDEXES
-- ===========================================

-- Restaurant indexes
CREATE INDEX idx_restaurants_active ON restaurants(is_active);

-- Auth users indexes
CREATE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_auth_users_restaurant ON auth_users(restaurant_id);
CREATE INDEX idx_auth_users_role ON auth_users(role);
CREATE INDEX idx_auth_users_active ON auth_users(is_active);
CREATE INDEX idx_auth_users_active_restaurant ON auth_users(is_active, restaurant_id);

-- SOP categories indexes
CREATE INDEX idx_sop_categories_code ON sop_categories(code);
CREATE INDEX idx_sop_categories_active ON sop_categories(is_active);
CREATE INDEX idx_sop_categories_sort ON sop_categories(sort_order);
CREATE INDEX idx_sop_categories_active_sort ON sop_categories(is_active, sort_order);

-- SOP documents indexes
CREATE INDEX idx_sop_documents_category ON sop_documents(category_id);
CREATE INDEX idx_sop_documents_restaurant ON sop_documents(restaurant_id);
CREATE INDEX idx_sop_documents_status ON sop_documents(status);
CREATE INDEX idx_sop_documents_priority ON sop_documents(priority);
CREATE INDEX idx_sop_documents_active ON sop_documents(is_active);
CREATE INDEX idx_sop_documents_created_by ON sop_documents(created_by);
CREATE INDEX idx_sop_documents_status_restaurant ON sop_documents(status, restaurant_id);

-- Advanced indexes for JSONB and text search
CREATE INDEX idx_sop_documents_tags ON sop_documents USING GIN(tags);
CREATE INDEX idx_sop_documents_tags_th ON sop_documents USING GIN(tags_th);
CREATE INDEX idx_sop_documents_steps ON sop_documents USING GIN(steps);
CREATE INDEX idx_sop_documents_steps_th ON sop_documents USING GIN(steps_th);

-- Full-text search indexes
CREATE INDEX idx_sop_documents_search_en ON sop_documents USING GIN(to_tsvector('english', title || ' ' || content));
CREATE INDEX idx_sop_documents_search_th ON sop_documents USING GIN(to_tsvector('simple', title_th || ' ' || content_th));

-- Form templates indexes
CREATE INDEX idx_form_templates_restaurant ON form_templates(restaurant_id);
CREATE INDEX idx_form_templates_category ON form_templates(category);
CREATE INDEX idx_form_templates_active ON form_templates(is_active);
CREATE INDEX idx_form_templates_schema ON form_templates USING GIN(schema);

-- Form submissions indexes
CREATE INDEX idx_form_submissions_template ON form_submissions(template_id);
CREATE INDEX idx_form_submissions_restaurant ON form_submissions(restaurant_id);
CREATE INDEX idx_form_submissions_user ON form_submissions(submitted_by);
CREATE INDEX idx_form_submissions_date ON form_submissions(submission_date);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_status_restaurant ON form_submissions(status, restaurant_id);
CREATE INDEX idx_form_submissions_data ON form_submissions USING GIN(data);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_restaurant ON audit_logs(restaurant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_created_month ON audit_logs(date_trunc('month', created_at));

-- ===========================================
-- DATABASE FUNCTIONS
-- ===========================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_restaurants_updated_at 
    BEFORE UPDATE ON restaurants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_users_updated_at 
    BEFORE UPDATE ON auth_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_categories_updated_at 
    BEFORE UPDATE ON sop_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_documents_updated_at 
    BEFORE UPDATE ON sop_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at 
    BEFORE UPDATE ON form_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at 
    BEFORE UPDATE ON form_submissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PIN validation function for secure authentication
CREATE OR REPLACE FUNCTION validate_pin(user_email TEXT, pin_input TEXT)
RETURNS TABLE(
    user_id UUID,
    is_valid BOOLEAN,
    role user_role,
    restaurant_id UUID,
    full_name VARCHAR(255),
    full_name_th VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        (u.pin_hash = crypt(pin_input, u.pin_hash)) as is_valid,
        u.role,
        u.restaurant_id,
        u.full_name,
        u.full_name_th
    FROM auth_users u
    WHERE u.email = user_email 
    AND u.is_active = true
    AND (u.locked_until IS NULL OR u.locked_until < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_restaurant_id UUID,
    p_user_id UUID,
    p_action audit_action,
    p_resource_type VARCHAR(100),
    p_resource_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        restaurant_id, user_id, action, resource_type, resource_id,
        old_values, new_values, metadata
    ) VALUES (
        p_restaurant_id, p_user_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, p_metadata
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Restaurant access policy (admins can see all, others see their own)
CREATE POLICY "Restaurant access policy"
ON restaurants FOR ALL
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = restaurants.id 
        OR role = 'admin'
    )
);

-- Auth users: Users can see others in their restaurant
CREATE POLICY "Auth users restaurant isolation"
ON auth_users FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
    OR auth.uid() IN (
        SELECT id FROM auth_users WHERE role = 'admin'
    )
);

-- SOP categories: Global visibility but restaurant-based management
CREATE POLICY "SOP categories global read"
ON sop_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "SOP categories admin manage"
ON sop_categories FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM auth_users WHERE role IN ('admin', 'manager')
    )
);

-- SOP documents: Restaurant isolation
CREATE POLICY "SOP documents restaurant isolation"
ON sop_documents FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- Form templates: Restaurant isolation
CREATE POLICY "Form templates restaurant isolation"
ON form_templates FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- Form submissions: Restaurant isolation with role-based access
CREATE POLICY "Form submissions access policy"
ON form_submissions FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
    AND (
        submitted_by = auth.uid() -- Users can see their own submissions
        OR auth.uid() IN (
            SELECT id FROM auth_users 
            WHERE restaurant_id = form_submissions.restaurant_id 
            AND role IN ('admin', 'manager') -- Managers can see all in their restaurant
        )
    )
);

-- Audit logs: Restaurant isolation with role-based access
CREATE POLICY "Audit logs access policy"
ON audit_logs FOR SELECT
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
    AND auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = audit_logs.restaurant_id 
        AND role IN ('admin', 'manager') -- Only admins and managers can view audit logs
    )
);

-- Allow audit log creation for all authenticated users
CREATE POLICY "Audit logs insert policy"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- ===========================================
-- SAMPLE DATA / SEED DATA
-- ===========================================

-- Insert sample restaurant
INSERT INTO restaurants (id, name, name_th, address, address_th, phone, email, settings) VALUES
('550e8400-e29b-41d4-a716-446655440000', 
 'Krong Thai Restaurant', 
 'ร้านกรองไทย', 
 '123 Main Street, Bangkok 10110, Thailand', 
 '123 ถนนใหญ่ กรุงเทพฯ 10110', 
 '+66-2-123-4567', 
 'info@krongthai.com',
 '{"language_default": "th", "timezone": "Asia/Bangkok", "currency": "THB"}'::JSONB);

-- Insert 16 standard SOP categories
INSERT INTO sop_categories (code, name, name_th, description, description_th, icon, color, sort_order) VALUES
('FOOD_SAFETY', 'Food Safety & Hygiene', 'ความปลอดภัยและสุขอนามัยอาหาร', 'Food handling, storage, and safety procedures', 'ขั้นตอนการจัดการ เก็บรักษา และความปลอดภัยของอาหาร', 'shield-check', '#e74c3c', 1),
('CLEANING', 'Cleaning & Sanitation', 'การทำความสะอาดและสุขาภิบาล', 'Cleaning schedules, sanitization procedures', 'ตารางการทำความสะอาด ขั้นตอนการฆ่าเชื้อ', 'spray-can', '#3498db', 2),
('CUSTOMER_SERVICE', 'Customer Service', 'การบริการลูกค้า', 'Guest interaction, complaint handling, service standards', 'การปฏิสัมพันธ์กับแขก การจัดการข้อร้องเรียน มาตรฐานการบริการ', 'users', '#2ecc71', 3),
('KITCHEN_OPS', 'Kitchen Operations', 'การดำเนินงานครัว', 'Cooking procedures, equipment operation, kitchen workflow', 'ขั้นตอนการทำอาหาร การใช้เครื่องมือ ขั้นตอนการทำงานในครัว', 'chef-hat', '#f39c12', 4),
('INVENTORY', 'Inventory Management', 'การจัดการสินค้าคงคลัง', 'Stock control, ordering, supplier management', 'การควบคุมสต็อก การสั่งซื้อ การจัดการผู้จัดจำหน่าย', 'package', '#9b59b6', 5),
('CASH_HANDLING', 'Cash Handling & POS', 'การจัดการเงินสดและระบบขาย', 'Payment processing, cash register, financial procedures', 'การประมวลผลการชำระเงิน เครื่องบันทึกเงินสด ขั้นตอนทางการเงิน', 'credit-card', '#1abc9c', 6),
('STAFF_TRAINING', 'Staff Training', 'การฝึกอบรมพนักงาน', 'Employee onboarding, skill development, certification', 'การปฐมนิเทศพนักงาน การพัฒนาทักษะ การรับรอง', 'graduation-cap', '#34495e', 7),
('SAFETY_SECURITY', 'Safety & Security', 'ความปลอดภัยและการรักษาความปลอดภัย', 'Emergency procedures, accident prevention, security protocols', 'ขั้นตอนฉุกเฉิน การป้องกันอุบัติเหตุ โปรโตคอลความปลอดภัย', 'shield', '#e67e22', 8),
('MAINTENANCE', 'Equipment Maintenance', 'การบำรุงรักษาอุปกรณ์', 'Equipment care, preventive maintenance, repair procedures', 'การดูแลอุปกรณ์ การบำรุงรักษาเชิงป้องกัน ขั้นตอนการซ่อมแซม', 'wrench', '#95a5a6', 9),
('QUALITY_CONTROL', 'Quality Control', 'การควบคุมคุณภาพ', 'Food quality standards, taste testing, presentation', 'มาตรฐานคุณภาพอาหาร การทดสอบรสชาติ การจัดเสิร์ฟ', 'star', '#f1c40f', 10),
('OPENING_CLOSING', 'Opening & Closing', 'การเปิดและปิดร้าน', 'Daily startup and shutdown procedures', 'ขั้นตอนการเปิดและปิดร้านประจำวัน', 'clock', '#2c3e50', 11),
('DELIVERY_TAKEOUT', 'Delivery & Takeout', 'การจัดส่งและสั่งกลับบ้าน', 'Order packaging, delivery protocols, pickup procedures', 'การบรรจุออเดอร์ โปรโตคอลการจัดส่ง ขั้นตอนการรับสินค้า', 'truck', '#8e44ad', 12),
('WASTE_MANAGEMENT', 'Waste Management', 'การจัดการขยะ', 'Waste disposal, recycling, environmental compliance', 'การกำจัดขยะ การรีไซเคิล การปฏิบัติตามกฎหมายสิ่งแวดล้อม', 'trash-2', '#27ae60', 13),
('COMPLIANCE', 'Regulatory Compliance', 'การปฏิบัติตามกฎระเบียบ', 'Health permits, inspections, legal requirements', 'ใบอนุญาตด้านสุขภาพ การตรวจสอบ ข้อกำหนดทางกฎหมาย', 'file-text', '#d35400', 14),
('MARKETING_PROMO', 'Marketing & Promotions', 'การตลาดและโปรโมชั่น', 'Promotional campaigns, social media, customer engagement', 'แคมเปญส่งเสริมการขาย โซเชียลมีเดีย การมีส่วนร่วมของลูกค้า', 'megaphone', '#c0392b', 15),
('EMERGENCY', 'Emergency Procedures', 'ขั้นตอนฉุกเฉิน', 'Crisis management, emergency contacts, evacuation plans', 'การจัดการวิกฤต ผู้ติดต่อฉุกเฉิน แผนการอพยพ', 'alert-triangle', '#e74c3c', 16);

-- Insert sample admin user
INSERT INTO auth_users (id, email, pin_hash, role, full_name, full_name_th, position, position_th, restaurant_id, is_active) VALUES
('660e8400-e29b-41d4-a716-446655440000', 
 'admin@krongthai.com', 
 crypt('1234', gen_salt('bf')), 
 'admin', 
 'Admin User', 
 'ผู้ดูแลระบบ', 
 'System Administrator', 
 'ผู้ดูแลระบบ', 
 '550e8400-e29b-41d4-a716-446655440000', 
 true);

-- Insert sample manager user
INSERT INTO auth_users (id, email, pin_hash, role, full_name, full_name_th, position, position_th, restaurant_id, is_active) VALUES
('770e8400-e29b-41d4-a716-446655440000', 
 'manager@krongthai.com', 
 crypt('5678', gen_salt('bf')), 
 'manager', 
 'Somchai Jaidee', 
 'สมชาย ใจดี', 
 'Restaurant Manager', 
 'ผู้จัดการร้านอาหาร', 
 '550e8400-e29b-41d4-a716-446655440000', 
 true);

-- Insert sample staff user
INSERT INTO auth_users (id, email, pin_hash, role, full_name, full_name_th, position, position_th, restaurant_id, is_active) VALUES
('880e8400-e29b-41d4-a716-446655440000', 
 'staff@krongthai.com', 
 crypt('9999', gen_salt('bf')), 
 'staff', 
 'Malee Suksan', 
 'มาลี สุขสาร', 
 'Server', 
 'พนักงานเสิร์ฟ', 
 '550e8400-e29b-41d4-a716-446655440000', 
 true);

-- ===========================================
-- FINAL OPTIMIZATIONS
-- ===========================================

-- Analyze tables for better query planning
ANALYZE restaurants;
ANALYZE auth_users;
ANALYZE sop_categories;
ANALYZE sop_documents;
ANALYZE form_templates;
ANALYZE form_submissions;
ANALYZE audit_logs;

-- Set up table statistics targets for better performance
ALTER TABLE sop_documents ALTER COLUMN content SET STATISTICS 1000;
ALTER TABLE sop_documents ALTER COLUMN content_th SET STATISTICS 1000;
ALTER TABLE form_submissions ALTER COLUMN data SET STATISTICS 500;
ALTER TABLE audit_logs ALTER COLUMN metadata SET STATISTICS 500;

COMMENT ON DATABASE postgres IS 'Restaurant Krong Thai SOP Management System - Comprehensive database schema with bilingual support, RLS, and audit logging';