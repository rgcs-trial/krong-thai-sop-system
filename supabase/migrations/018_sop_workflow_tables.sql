-- SOP Workflow Tables and Enhanced Management System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive SOP workflow, task management, and tracking system

-- ===========================================
-- ADDITIONAL ENUMS FOR SOP SYSTEM
-- ===========================================

-- SOP task completion status
CREATE TYPE sop_completion_status AS ENUM ('pending', 'in_progress', 'completed', 'verified', 'failed', 'skipped');

-- SOP assignment status
CREATE TYPE sop_assignment_status AS ENUM ('assigned', 'acknowledged', 'in_progress', 'completed', 'overdue', 'cancelled');

-- SOP schedule frequency
CREATE TYPE sop_schedule_frequency AS ENUM ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom');

-- Photo verification status
CREATE TYPE photo_verification_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');

-- Equipment status
CREATE TYPE equipment_status AS ENUM ('available', 'in_use', 'maintenance', 'out_of_order', 'retired');

-- ===========================================
-- SOP WORKFLOW CORE TABLES
-- ===========================================

-- 1. SOP Steps table (detailed step-by-step procedures)
CREATE TABLE sop_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_document_id UUID NOT NULL,
    step_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_th VARCHAR(500) NOT NULL, -- Thai title
    description TEXT NOT NULL,
    description_th TEXT NOT NULL, -- Thai description
    instructions JSONB, -- Detailed step instructions with formatting
    instructions_th JSONB, -- Thai instructions
    estimated_duration_minutes INTEGER DEFAULT 5, -- Time to complete step
    requires_photo BOOLEAN DEFAULT false,
    requires_manager_approval BOOLEAN DEFAULT false,
    critical_control_point BOOLEAN DEFAULT false, -- HACCP compliance
    safety_warnings TEXT,
    safety_warnings_th TEXT, -- Thai safety warnings
    equipment_required UUID[], -- Array of equipment IDs
    prerequisites TEXT[], -- Steps that must be completed first
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_steps_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT uk_sop_steps_document_number UNIQUE (sop_document_id, step_number)
);

-- 2. SOP Completions table (tracking task execution)
CREATE TABLE sop_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_document_id UUID NOT NULL,
    sop_step_id UUID, -- Specific step completion (NULL for document-level completion)
    restaurant_id UUID NOT NULL,
    completed_by UUID NOT NULL,
    assigned_to UUID, -- If different from completed_by
    status sop_completion_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_minutes INTEGER, -- Actual completion time
    notes TEXT,
    notes_th TEXT, -- Thai notes
    verification_photos JSONB DEFAULT '[]', -- Array of photo URLs/metadata
    verification_data JSONB DEFAULT '{}', -- Custom verification data
    compliance_score DECIMAL(3,2), -- 0.00 to 1.00
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    verified_by UUID, -- Manager who verified the completion
    verified_at TIMESTAMPTZ,
    location VARCHAR(255), -- Where the task was completed
    temperature_reading DECIMAL(5,2), -- For food safety SOPs
    issues_encountered TEXT,
    issues_encountered_th TEXT, -- Thai issues
    corrective_actions TEXT,
    corrective_actions_th TEXT, -- Thai corrective actions
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_completions_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_completions_step FOREIGN KEY (sop_step_id) REFERENCES sop_steps(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_completions_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_completions_completed_by FOREIGN KEY (completed_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_completions_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_completions_verified_by FOREIGN KEY (verified_by) REFERENCES auth_users(id)
);

-- 3. SOP Assignments table (staff task assignment)
CREATE TABLE sop_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_document_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    assigned_to UUID NOT NULL,
    assigned_by UUID NOT NULL,
    status sop_assignment_status DEFAULT 'assigned',
    priority sop_priority DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    scheduled_start TIMESTAMPTZ,
    estimated_duration_minutes INTEGER DEFAULT 30,
    recurring_schedule_id UUID, -- Link to sop_schedules for recurring tasks
    assignment_notes TEXT,
    assignment_notes_th TEXT, -- Thai assignment notes
    special_instructions TEXT,
    special_instructions_th TEXT, -- Thai special instructions
    acknowledged_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completion_id UUID, -- Link to sop_completions when finished
    reminder_sent BOOLEAN DEFAULT false,
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_assignments_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_assignments_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_assignments_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_assignments_completion FOREIGN KEY (completion_id) REFERENCES sop_completions(id)
);

-- 4. SOP Photos table (verification images)
CREATE TABLE sop_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_completion_id UUID NOT NULL,
    sop_step_id UUID, -- Specific step photo (optional)
    restaurant_id UUID NOT NULL,
    uploaded_by UUID NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL, -- Storage path/URL
    file_size_kb INTEGER,
    mime_type VARCHAR(100),
    width_px INTEGER,
    height_px INTEGER,
    caption TEXT,
    caption_th TEXT, -- Thai caption
    verification_status photo_verification_status DEFAULT 'pending',
    verification_notes TEXT,
    verification_notes_th TEXT, -- Thai verification notes
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}', -- EXIF data, GPS coordinates, etc.
    quality_score DECIMAL(3,2), -- Image quality assessment
    compliance_flags TEXT[], -- Any compliance issues detected
    is_primary BOOLEAN DEFAULT false, -- Main photo for this completion
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_photos_completion FOREIGN KEY (sop_completion_id) REFERENCES sop_completions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_photos_step FOREIGN KEY (sop_step_id) REFERENCES sop_steps(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_photos_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_photos_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_photos_verified_by FOREIGN KEY (verified_by) REFERENCES auth_users(id)
);

-- 5. SOP Schedules table (recurring tasks)
CREATE TABLE sop_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_document_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    name VARCHAR(500) NOT NULL,
    name_th VARCHAR(500) NOT NULL, -- Thai name
    description TEXT,
    description_th TEXT, -- Thai description
    frequency sop_schedule_frequency NOT NULL,
    frequency_details JSONB DEFAULT '{}', -- Custom schedule parameters
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for indefinite schedules
    time_of_day TIME, -- Preferred execution time
    days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc.
    days_of_month INTEGER[], -- 1-31 for monthly schedules
    auto_assign BOOLEAN DEFAULT true,
    default_assigned_to UUID, -- Default assignee
    estimated_duration_minutes INTEGER DEFAULT 30,
    priority sop_priority DEFAULT 'medium',
    requires_manager_approval BOOLEAN DEFAULT false,
    notification_settings JSONB DEFAULT '{}', -- Reminder preferences
    last_generated_at TIMESTAMPTZ,
    next_generation_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_schedules_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_schedules_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_schedules_assigned_to FOREIGN KEY (default_assigned_to) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_schedules_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- 6. SOP Approvals table (manager oversight)
CREATE TABLE sop_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_completion_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    approver_id UUID,
    approval_type VARCHAR(100) NOT NULL, -- 'completion', 'quality', 'compliance', etc.
    status sop_completion_status DEFAULT 'pending',
    approval_criteria JSONB DEFAULT '{}', -- What needs to be checked
    approval_notes TEXT,
    approval_notes_th TEXT, -- Thai approval notes
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    rejection_reason_th TEXT, -- Thai rejection reason
    escalation_required BOOLEAN DEFAULT false,
    escalated_to UUID,
    escalated_at TIMESTAMPTZ,
    priority sop_priority DEFAULT 'medium',
    due_by TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_approvals_completion FOREIGN KEY (sop_completion_id) REFERENCES sop_completions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_approvals_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_approvals_requested_by FOREIGN KEY (requested_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_approvals_approver FOREIGN KEY (approver_id) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_approvals_escalated_to FOREIGN KEY (escalated_to) REFERENCES auth_users(id)
);

-- 7. SOP Versions table (change tracking)
CREATE TABLE sop_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_document_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_th VARCHAR(500) NOT NULL, -- Thai title
    content TEXT NOT NULL,
    content_th TEXT NOT NULL, -- Thai content
    steps JSONB, -- Snapshot of steps at this version
    steps_th JSONB, -- Thai steps snapshot
    change_summary TEXT,
    change_summary_th TEXT, -- Thai change summary
    breaking_changes BOOLEAN DEFAULT false,
    migration_notes TEXT,
    migration_notes_th TEXT, -- Thai migration notes
    effective_date DATE,
    deprecated_date DATE,
    created_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    archived BOOLEAN DEFAULT false,
    archive_reason TEXT,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_versions_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_versions_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_sop_versions_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT uk_sop_versions_document_version UNIQUE (sop_document_id, version_number)
);

-- 8. SOP Analytics table (performance metrics)
CREATE TABLE sop_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_document_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    total_assignments INTEGER DEFAULT 0,
    completed_assignments INTEGER DEFAULT 0,
    overdue_assignments INTEGER DEFAULT 0,
    avg_completion_time_minutes DECIMAL(8,2),
    avg_quality_rating DECIMAL(3,2),
    avg_compliance_score DECIMAL(3,2),
    total_photos_uploaded INTEGER DEFAULT 0,
    photos_approved INTEGER DEFAULT 0,
    photos_rejected INTEGER DEFAULT 0,
    critical_failures INTEGER DEFAULT 0,
    escalations INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2), -- Percentage
    on_time_completion_rate DECIMAL(5,2), -- Percentage
    staff_engagement_score DECIMAL(3,2), -- 0.00 to 1.00
    manager_approval_time_avg_hours DECIMAL(8,2),
    total_duration_minutes INTEGER DEFAULT 0,
    unique_completers INTEGER DEFAULT 0,
    repeat_violations INTEGER DEFAULT 0,
    training_requests INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}', -- Additional metrics
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_analytics_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_analytics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT uk_sop_analytics_document_date UNIQUE (sop_document_id, restaurant_id, date_recorded)
);

-- 9. SOP Equipment table (required tools/equipment)
CREATE TABLE sop_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name VARCHAR(500) NOT NULL,
    name_th VARCHAR(500) NOT NULL, -- Thai name
    description TEXT,
    description_th TEXT, -- Thai description
    category VARCHAR(100), -- 'cleaning', 'cooking', 'safety', etc.
    manufacturer VARCHAR(255),
    model_number VARCHAR(255),
    serial_number VARCHAR(255),
    purchase_date DATE,
    warranty_expiry DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    status equipment_status DEFAULT 'available',
    location VARCHAR(255),
    responsible_person UUID,
    maintenance_schedule JSONB DEFAULT '{}', -- Maintenance requirements
    operating_instructions TEXT,
    operating_instructions_th TEXT, -- Thai operating instructions
    safety_notes TEXT,
    safety_notes_th TEXT, -- Thai safety notes
    calibration_due_date DATE,
    calibration_certificate_path TEXT,
    cost_center VARCHAR(100),
    replacement_cost DECIMAL(10,2),
    is_critical BOOLEAN DEFAULT false, -- Critical for operations
    requires_training BOOLEAN DEFAULT false,
    training_required TEXT,
    training_required_th TEXT, -- Thai training requirements
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_equipment_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_equipment_responsible FOREIGN KEY (responsible_person) REFERENCES auth_users(id)
);

-- ===========================================
-- PERFORMANCE INDEXES
-- ===========================================

-- SOP Steps indexes
CREATE INDEX idx_sop_steps_document ON sop_steps(sop_document_id);
CREATE INDEX idx_sop_steps_active ON sop_steps(is_active);
CREATE INDEX idx_sop_steps_critical ON sop_steps(critical_control_point);
CREATE INDEX idx_sop_steps_sort ON sop_steps(sop_document_id, sort_order);
CREATE INDEX idx_sop_steps_equipment ON sop_steps USING GIN(equipment_required);

-- SOP Completions indexes
CREATE INDEX idx_sop_completions_document ON sop_completions(sop_document_id);
CREATE INDEX idx_sop_completions_restaurant ON sop_completions(restaurant_id);
CREATE INDEX idx_sop_completions_completed_by ON sop_completions(completed_by);
CREATE INDEX idx_sop_completions_status ON sop_completions(status);
CREATE INDEX idx_sop_completions_date ON sop_completions(completed_at);
CREATE INDEX idx_sop_completions_verification ON sop_completions(verified_by, verified_at);
CREATE INDEX idx_sop_completions_restaurant_status ON sop_completions(restaurant_id, status);
CREATE INDEX idx_sop_completions_restaurant_date ON sop_completions(restaurant_id, completed_at);

-- SOP Assignments indexes
CREATE INDEX idx_sop_assignments_document ON sop_assignments(sop_document_id);
CREATE INDEX idx_sop_assignments_restaurant ON sop_assignments(restaurant_id);
CREATE INDEX idx_sop_assignments_assigned_to ON sop_assignments(assigned_to);
CREATE INDEX idx_sop_assignments_status ON sop_assignments(status);
CREATE INDEX idx_sop_assignments_due_date ON sop_assignments(due_date);
CREATE INDEX idx_sop_assignments_priority ON sop_assignments(priority);
CREATE INDEX idx_sop_assignments_active_status ON sop_assignments(is_active, status);
CREATE INDEX idx_sop_assignments_user_due ON sop_assignments(assigned_to, due_date);

-- SOP Photos indexes
CREATE INDEX idx_sop_photos_completion ON sop_photos(sop_completion_id);
CREATE INDEX idx_sop_photos_restaurant ON sop_photos(restaurant_id);
CREATE INDEX idx_sop_photos_uploaded_by ON sop_photos(uploaded_by);
CREATE INDEX idx_sop_photos_verification_status ON sop_photos(verification_status);
CREATE INDEX idx_sop_photos_primary ON sop_photos(is_primary);
CREATE INDEX idx_sop_photos_valid ON sop_photos(is_valid);

-- SOP Schedules indexes
CREATE INDEX idx_sop_schedules_document ON sop_schedules(sop_document_id);
CREATE INDEX idx_sop_schedules_restaurant ON sop_schedules(restaurant_id);
CREATE INDEX idx_sop_schedules_frequency ON sop_schedules(frequency);
CREATE INDEX idx_sop_schedules_next_generation ON sop_schedules(next_generation_at);
CREATE INDEX idx_sop_schedules_active ON sop_schedules(is_active);
CREATE INDEX idx_sop_schedules_assigned_to ON sop_schedules(default_assigned_to);

-- SOP Approvals indexes
CREATE INDEX idx_sop_approvals_completion ON sop_approvals(sop_completion_id);
CREATE INDEX idx_sop_approvals_restaurant ON sop_approvals(restaurant_id);
CREATE INDEX idx_sop_approvals_approver ON sop_approvals(approver_id);
CREATE INDEX idx_sop_approvals_status ON sop_approvals(status);
CREATE INDEX idx_sop_approvals_due_by ON sop_approvals(due_by);
CREATE INDEX idx_sop_approvals_priority ON sop_approvals(priority);

-- SOP Versions indexes
CREATE INDEX idx_sop_versions_document ON sop_versions(sop_document_id);
CREATE INDEX idx_sop_versions_current ON sop_versions(is_current);
CREATE INDEX idx_sop_versions_version ON sop_versions(version_number);
CREATE INDEX idx_sop_versions_effective ON sop_versions(effective_date);

-- SOP Analytics indexes
CREATE INDEX idx_sop_analytics_document ON sop_analytics(sop_document_id);
CREATE INDEX idx_sop_analytics_restaurant ON sop_analytics(restaurant_id);
CREATE INDEX idx_sop_analytics_date ON sop_analytics(date_recorded);
CREATE INDEX idx_sop_analytics_restaurant_date ON sop_analytics(restaurant_id, date_recorded);

-- SOP Equipment indexes
CREATE INDEX idx_sop_equipment_restaurant ON sop_equipment(restaurant_id);
CREATE INDEX idx_sop_equipment_status ON sop_equipment(status);
CREATE INDEX idx_sop_equipment_category ON sop_equipment(category);
CREATE INDEX idx_sop_equipment_responsible ON sop_equipment(responsible_person);
CREATE INDEX idx_sop_equipment_critical ON sop_equipment(is_critical);
CREATE INDEX idx_sop_equipment_maintenance ON sop_equipment(next_maintenance_date);

-- Advanced JSONB indexes
CREATE INDEX idx_sop_completions_verification_data ON sop_completions USING GIN(verification_data);
CREATE INDEX idx_sop_schedules_frequency_details ON sop_schedules USING GIN(frequency_details);
CREATE INDEX idx_sop_approvals_criteria ON sop_approvals USING GIN(approval_criteria);
CREATE INDEX idx_sop_equipment_maintenance_schedule ON sop_equipment USING GIN(maintenance_schedule);

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_sop_steps_updated_at 
    BEFORE UPDATE ON sop_steps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_completions_updated_at 
    BEFORE UPDATE ON sop_completions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_assignments_updated_at 
    BEFORE UPDATE ON sop_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_photos_updated_at 
    BEFORE UPDATE ON sop_photos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_schedules_updated_at 
    BEFORE UPDATE ON sop_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_approvals_updated_at 
    BEFORE UPDATE ON sop_approvals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_versions_updated_at 
    BEFORE UPDATE ON sop_versions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_analytics_updated_at 
    BEFORE UPDATE ON sop_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_equipment_updated_at 
    BEFORE UPDATE ON sop_equipment 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_steps IS 'Detailed step-by-step procedures for SOP documents with bilingual support';
COMMENT ON TABLE sop_completions IS 'Tracking of SOP task execution with verification and quality metrics';
COMMENT ON TABLE sop_assignments IS 'Staff task assignment and scheduling for SOP compliance';
COMMENT ON TABLE sop_photos IS 'Verification images for SOP compliance with approval workflow';
COMMENT ON TABLE sop_schedules IS 'Recurring task schedules for automated SOP assignment';
COMMENT ON TABLE sop_approvals IS 'Manager oversight and approval workflow for SOP completions';
COMMENT ON TABLE sop_versions IS 'Version control and change tracking for SOP documents';
COMMENT ON TABLE sop_analytics IS 'Performance metrics and analytics for SOP compliance';
COMMENT ON TABLE sop_equipment IS 'Equipment and tools required for SOP execution';

-- Table statistics for better query planning
ANALYZE sop_steps;
ANALYZE sop_completions;
ANALYZE sop_assignments;
ANALYZE sop_photos;
ANALYZE sop_schedules;
ANALYZE sop_approvals;
ANALYZE sop_versions;
ANALYZE sop_analytics;
ANALYZE sop_equipment;