-- Restaurant Krong Thai Task Management System
-- Comprehensive Database Schema Migration
-- Created: 2025-07-28
-- Task Management Backend Implementation

-- ===========================================
-- TASK MANAGEMENT ENUMS
-- ===========================================

-- Task status enum
CREATE TYPE task_status AS ENUM (
    'pending', 'assigned', 'in_progress', 'blocked', 
    'completed', 'cancelled', 'overdue', 'escalated'
);

-- Task priority enum
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical', 'urgent');

-- Task type enum
CREATE TYPE task_type AS ENUM (
    'sop_execution', 'cleaning', 'maintenance', 'training', 
    'audit', 'inventory', 'customer_service', 'admin', 'custom'
);

-- Assignment status enum
CREATE TYPE assignment_status AS ENUM ('assigned', 'accepted', 'declined', 'completed');

-- Notification type enum
CREATE TYPE notification_type AS ENUM (
    'task_assigned', 'task_due', 'task_overdue', 'task_completed',
    'escalation', 'reminder', 'dependency_ready', 'workflow_trigger'
);

-- Notification channel enum
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'sms', 'in_app');

-- Workflow trigger type enum
CREATE TYPE workflow_trigger_type AS ENUM (
    'time_based', 'event_based', 'completion_based', 'manual', 'conditional'
);

-- ===========================================
-- CORE TASK MANAGEMENT TABLES
-- ===========================================

-- 1. Task Templates (Reusable task definitions)
CREATE TABLE task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255) NOT NULL,
    description TEXT,
    description_fr TEXT,
    category VARCHAR(100),
    task_type task_type NOT NULL DEFAULT 'custom',
    estimated_duration_minutes INTEGER,
    priority task_priority DEFAULT 'medium',
    required_skills JSONB DEFAULT '[]', -- Array of skill IDs/names
    equipment_needed JSONB DEFAULT '[]', -- Array of equipment/tools
    location_specific BOOLEAN DEFAULT false,
    locations JSONB DEFAULT '[]', -- Specific locations where task applies
    checklist_items JSONB DEFAULT '[]', -- Step-by-step checklist
    checklist_items_fr JSONB DEFAULT '[]',
    sop_document_id UUID, -- Link to related SOP
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- Cron-like or structured recurrence
    dependencies JSONB DEFAULT '[]', -- Array of prerequisite task template IDs
    auto_assign_rules JSONB DEFAULT '{}', -- Assignment algorithm parameters
    approval_required BOOLEAN DEFAULT false,
    tags VARCHAR(255)[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_task_template_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_template_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_task_template_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_task_template_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id)
);

-- 2. Tasks (Individual task instances)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    template_id UUID, -- NULL if ad-hoc task
    title VARCHAR(500) NOT NULL,
    title_fr VARCHAR(500) NOT NULL,
    description TEXT,
    description_fr TEXT,
    task_type task_type NOT NULL DEFAULT 'custom',
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    
    -- Location and requirements
    location VARCHAR(255),
    location_details JSONB DEFAULT '{}',
    required_skills JSONB DEFAULT '[]',
    equipment_needed JSONB DEFAULT '[]',
    
    -- Task execution
    checklist_items JSONB DEFAULT '[]',
    checklist_items_fr JSONB DEFAULT '[]',
    checklist_progress JSONB DEFAULT '{}', -- Completion status of each item
    attachments JSONB DEFAULT '[]',
    notes TEXT,
    notes_fr TEXT,
    
    -- Assignment and workflow
    assigned_to UUID,
    assigned_by UUID,
    assigned_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Dependencies and workflow
    parent_task_id UUID, -- For subtasks
    workflow_id UUID, -- Part of larger workflow
    dependencies JSONB DEFAULT '[]', -- Array of task IDs this depends on
    dependent_tasks JSONB DEFAULT '[]', -- Tasks that depend on this one
    
    -- Quality and approval
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
    feedback TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags VARCHAR(255)[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    is_recurring_instance BOOLEAN DEFAULT false,
    recurrence_id UUID, -- Links to recurrence schedule
    
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_task_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_template FOREIGN KEY (template_id) REFERENCES task_templates(id),
    CONSTRAINT fk_task_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth_users(id),
    CONSTRAINT fk_task_assigned_by FOREIGN KEY (assigned_by) REFERENCES auth_users(id),
    CONSTRAINT fk_task_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_task_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_task_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_task_parent FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
);

-- 3. Staff Skills (For intelligent assignment)
CREATE TABLE staff_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
    certified BOOLEAN DEFAULT false,
    certification_date DATE,
    certification_expires DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_staff_skill_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_skill UNIQUE (user_id, skill_name)
);

-- 4. Staff Availability (For intelligent scheduling)
CREATE TABLE staff_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    date DATE NOT NULL,
    shift_start TIME,
    shift_end TIME,
    break_start TIME,
    break_end TIME,
    is_available BOOLEAN DEFAULT true,
    max_concurrent_tasks INTEGER DEFAULT 3,
    current_workload_percentage INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_availability_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_availability_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- 5. Task Assignments (Assignment tracking and history)
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    assigned_by UUID NOT NULL,
    assignment_status assignment_status DEFAULT 'assigned',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    decline_reason TEXT,
    auto_assigned BOOLEAN DEFAULT false,
    assignment_score DECIMAL(5,2), -- Algorithm confidence score
    notes TEXT,
    
    CONSTRAINT fk_assignment_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_assigner FOREIGN KEY (assigned_by) REFERENCES auth_users(id)
);

-- 6. Task Workflows (Complex multi-task processes)
CREATE TABLE task_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255) NOT NULL,
    description TEXT,
    description_fr TEXT,
    category VARCHAR(100),
    workflow_definition JSONB NOT NULL, -- DAG structure of tasks
    trigger_conditions JSONB DEFAULT '{}',
    trigger_type workflow_trigger_type DEFAULT 'manual',
    is_active BOOLEAN DEFAULT true,
    success_criteria JSONB DEFAULT '{}',
    failure_handling JSONB DEFAULT '{}',
    estimated_total_duration INTEGER,
    tags VARCHAR(255)[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_workflow_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_workflow_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id)
);

-- 7. Workflow Executions (Running workflow instances)
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'running',
    triggered_by UUID,
    trigger_event JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER,
    execution_context JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    
    CONSTRAINT fk_execution_workflow FOREIGN KEY (workflow_id) REFERENCES task_workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_execution_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_execution_triggered_by FOREIGN KEY (triggered_by) REFERENCES auth_users(id)
);

-- 8. Task Recurrence (Recurring task schedules)
CREATE TABLE task_recurrence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    recurrence_pattern JSONB NOT NULL, -- Cron or structured pattern
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    is_active BOOLEAN DEFAULT true,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    total_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    end_date DATE,
    max_runs INTEGER,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_recurrence_template FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_recurrence_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_recurrence_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- 9. Task Notifications (Notification delivery tracking)
CREATE TABLE task_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    workflow_id UUID,
    user_id UUID NOT NULL,
    notification_type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_fr VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    message_fr TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT fk_notification_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_workflow FOREIGN KEY (workflow_id) REFERENCES task_workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

-- 10. Task Performance Metrics (Analytics and KPIs)
CREATE TABLE task_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    task_id UUID,
    template_id UUID,
    user_id UUID,
    workflow_id UUID,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Timing metrics
    avg_completion_time_minutes DECIMAL(10,2),
    min_completion_time_minutes DECIMAL(10,2),
    max_completion_time_minutes DECIMAL(10,2),
    on_time_completion_rate DECIMAL(5,2),
    
    -- Quality metrics
    avg_quality_score DECIMAL(3,2),
    approval_rate DECIMAL(5,2),
    rework_rate DECIMAL(5,2),
    
    -- Volume metrics
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    cancelled_tasks INTEGER DEFAULT 0,
    overdue_tasks INTEGER DEFAULT 0,
    
    -- Efficiency metrics
    utilization_rate DECIMAL(5,2),
    productivity_score DECIMAL(5,2),
    efficiency_trend DECIMAL(5,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_metrics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_metrics_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_metrics_template FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_metrics_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_metrics_workflow FOREIGN KEY (workflow_id) REFERENCES task_workflows(id) ON DELETE CASCADE
);

-- ===========================================
-- PERFORMANCE INDEXES
-- ===========================================

-- Task Templates indexes
CREATE INDEX idx_task_templates_restaurant ON task_templates(restaurant_id);
CREATE INDEX idx_task_templates_type ON task_templates(task_type);
CREATE INDEX idx_task_templates_active ON task_templates(is_active);
CREATE INDEX idx_task_templates_recurring ON task_templates(is_recurring);
CREATE INDEX idx_task_templates_sop ON task_templates(sop_document_id);
CREATE INDEX idx_task_templates_skills ON task_templates USING GIN(required_skills);
CREATE INDEX idx_task_templates_tags ON task_templates USING GIN(tags);

-- Tasks indexes
CREATE INDEX idx_tasks_restaurant ON tasks(restaurant_id);
CREATE INDEX idx_tasks_template ON tasks(template_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_scheduled_for ON tasks(scheduled_for);
CREATE INDEX idx_tasks_workflow ON tasks(workflow_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status_restaurant ON tasks(status, restaurant_id);
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_due_pending ON tasks(due_date, status) WHERE status IN ('pending', 'assigned', 'in_progress');
CREATE INDEX idx_tasks_overdue ON tasks(due_date, status) WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled');

-- Advanced JSONB indexes
CREATE INDEX idx_tasks_dependencies ON tasks USING GIN(dependencies);
CREATE INDEX idx_tasks_checklist_progress ON tasks USING GIN(checklist_progress);
CREATE INDEX idx_tasks_metadata ON tasks USING GIN(metadata);
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);

-- Staff Skills indexes
CREATE INDEX idx_staff_skills_user ON staff_skills(user_id);
CREATE INDEX idx_staff_skills_skill ON staff_skills(skill_name);
CREATE INDEX idx_staff_skills_category ON staff_skills(skill_category);
CREATE INDEX idx_staff_skills_proficiency ON staff_skills(proficiency_level);
CREATE INDEX idx_staff_skills_certified ON staff_skills(certified);

-- Staff Availability indexes
CREATE INDEX idx_availability_user ON staff_availability(user_id);
CREATE INDEX idx_availability_restaurant ON staff_availability(restaurant_id);
CREATE INDEX idx_availability_date ON staff_availability(date);
CREATE INDEX idx_availability_user_date ON staff_availability(user_id, date);
CREATE INDEX idx_availability_available ON staff_availability(is_available, date);

-- Task Assignments indexes
CREATE INDEX idx_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_assignments_user ON task_assignments(user_id);
CREATE INDEX idx_assignments_status ON task_assignments(assignment_status);
CREATE INDEX idx_assignments_auto ON task_assignments(auto_assigned);
CREATE INDEX idx_assignments_user_status ON task_assignments(user_id, assignment_status);

-- Workflow indexes
CREATE INDEX idx_workflows_restaurant ON task_workflows(restaurant_id);
CREATE INDEX idx_workflows_active ON task_workflows(is_active);
CREATE INDEX idx_workflows_trigger_type ON task_workflows(trigger_type);
CREATE INDEX idx_workflows_category ON task_workflows(category);

-- Workflow Executions indexes
CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_restaurant ON workflow_executions(restaurant_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);
CREATE INDEX idx_executions_started ON workflow_executions(started_at);

-- Task Recurrence indexes
CREATE INDEX idx_recurrence_template ON task_recurrence(template_id);
CREATE INDEX idx_recurrence_restaurant ON task_recurrence(restaurant_id);
CREATE INDEX idx_recurrence_active ON task_recurrence(is_active);
CREATE INDEX idx_recurrence_next_run ON task_recurrence(next_run_at) WHERE is_active = true;

-- Notifications indexes
CREATE INDEX idx_notifications_task ON task_notifications(task_id);
CREATE INDEX idx_notifications_user ON task_notifications(user_id);
CREATE INDEX idx_notifications_type ON task_notifications(notification_type);
CREATE INDEX idx_notifications_channel ON task_notifications(channel);
CREATE INDEX idx_notifications_scheduled ON task_notifications(scheduled_for);
CREATE INDEX idx_notifications_sent ON task_notifications(sent_at);
CREATE INDEX idx_notifications_user_unread ON task_notifications(user_id, read_at) WHERE read_at IS NULL;

-- Performance Metrics indexes
CREATE INDEX idx_metrics_restaurant ON task_performance_metrics(restaurant_id);
CREATE INDEX idx_metrics_date ON task_performance_metrics(metric_date);
CREATE INDEX idx_metrics_task ON task_performance_metrics(task_id);
CREATE INDEX idx_metrics_template ON task_performance_metrics(template_id);
CREATE INDEX idx_metrics_user ON task_performance_metrics(user_id);
CREATE INDEX idx_metrics_workflow ON task_performance_metrics(workflow_id);
CREATE INDEX idx_metrics_restaurant_date ON task_performance_metrics(restaurant_id, metric_date);

-- Full-text search indexes
CREATE INDEX idx_tasks_search_en ON tasks USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_tasks_search_fr ON tasks USING GIN(to_tsvector('french', title_fr || ' ' || COALESCE(description_fr, '')));
CREATE INDEX idx_templates_search_en ON task_templates USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_templates_search_fr ON task_templates USING GIN(to_tsvector('french', name_fr || ' ' || COALESCE(description_fr, '')));

-- ===========================================
-- DATABASE FUNCTIONS
-- ===========================================

-- Apply updated_at trigger to all new tables
CREATE TRIGGER update_task_templates_updated_at 
    BEFORE UPDATE ON task_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_skills_updated_at 
    BEFORE UPDATE ON staff_skills 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_availability_updated_at 
    BEFORE UPDATE ON staff_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_workflows_updated_at 
    BEFORE UPDATE ON task_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_recurrence_updated_at 
    BEFORE UPDATE ON task_recurrence 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate task assignment score
CREATE OR REPLACE FUNCTION calculate_assignment_score(
    p_user_id UUID,
    p_required_skills JSONB,
    p_location VARCHAR,
    p_scheduled_for TIMESTAMPTZ
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    skill_score DECIMAL(5,2) := 0;
    availability_score DECIMAL(5,2) := 0;
    workload_score DECIMAL(5,2) := 0;
    location_score DECIMAL(5,2) := 0;
    final_score DECIMAL(5,2);
BEGIN
    -- Calculate skill match score (40% weight)
    IF p_required_skills IS NOT NULL AND jsonb_array_length(p_required_skills) > 0 THEN
        SELECT COALESCE(AVG(proficiency_level), 0) * 20
        INTO skill_score
        FROM staff_skills
        WHERE user_id = p_user_id
        AND skill_name = ANY(
            SELECT jsonb_array_elements_text(p_required_skills)
        );
    ELSE
        skill_score := 80; -- No specific skills required
    END IF;
    
    -- Calculate availability score (30% weight)
    SELECT CASE 
        WHEN is_available AND current_workload_percentage < 80 THEN 100
        WHEN is_available AND current_workload_percentage < 100 THEN 60
        ELSE 0
    END INTO availability_score
    FROM staff_availability
    WHERE user_id = p_user_id
    AND date = p_scheduled_for::DATE;
    
    -- If no availability record, assume moderate availability
    availability_score := COALESCE(availability_score, 60);
    
    -- Calculate workload score (20% weight)
    SELECT CASE
        WHEN COUNT(*) = 0 THEN 100
        WHEN COUNT(*) <= 2 THEN 80
        WHEN COUNT(*) <= 4 THEN 60
        ELSE 30
    END INTO workload_score
    FROM tasks
    WHERE assigned_to = p_user_id
    AND status IN ('assigned', 'in_progress')
    AND due_date BETWEEN p_scheduled_for - INTERVAL '4 hours' 
                     AND p_scheduled_for + INTERVAL '4 hours';
    
    -- Calculate location score (10% weight)
    location_score := 100; -- Simplified for now
    
    -- Weighted final score
    final_score := (skill_score * 0.4) + (availability_score * 0.3) + 
                   (workload_score * 0.2) + (location_score * 0.1);
    
    RETURN LEAST(final_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to find best assignee for a task
CREATE OR REPLACE FUNCTION find_best_assignee(
    p_restaurant_id UUID,
    p_required_skills JSONB DEFAULT '[]',
    p_location VARCHAR DEFAULT NULL,
    p_scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    p_required_role user_role DEFAULT 'staff'
)
RETURNS TABLE(
    user_id UUID,
    assignment_score DECIMAL(5,2),
    user_name VARCHAR,
    user_role user_role
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        calculate_assignment_score(u.id, p_required_skills, p_location, p_scheduled_for) as score,
        u.full_name,
        u.role
    FROM auth_users u
    WHERE u.restaurant_id = p_restaurant_id
    AND u.is_active = true
    AND u.role >= p_required_role
    ORDER BY score DESC, u.full_name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign task
CREATE OR REPLACE FUNCTION auto_assign_task(
    p_task_id UUID,
    p_assigned_by UUID
)
RETURNS UUID AS $$
DECLARE
    task_record RECORD;
    best_assignee RECORD;
    assignment_id UUID;
BEGIN
    -- Get task details
    SELECT * INTO task_record FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found: %', p_task_id;
    END IF;
    
    -- Find best assignee
    SELECT * INTO best_assignee
    FROM find_best_assignee(
        task_record.restaurant_id,
        task_record.required_skills,
        task_record.location,
        task_record.scheduled_for
    )
    LIMIT 1;
    
    IF best_assignee.user_id IS NOT NULL THEN
        -- Update task assignment
        UPDATE tasks SET 
            assigned_to = best_assignee.user_id,
            assigned_by = p_assigned_by,
            assigned_at = NOW(),
            status = 'assigned'
        WHERE id = p_task_id;
        
        -- Create assignment record
        INSERT INTO task_assignments (
            task_id, user_id, assigned_by, auto_assigned, assignment_score
        ) VALUES (
            p_task_id, best_assignee.user_id, p_assigned_by, true, best_assignee.assignment_score
        ) RETURNING id INTO assignment_id;
        
        RETURN best_assignee.user_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check and resolve task dependencies
CREATE OR REPLACE FUNCTION check_task_dependencies(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    dependency_id UUID;
    all_completed BOOLEAN := true;
BEGIN
    -- Check if all dependencies are completed
    FOR dependency_id IN 
        SELECT jsonb_array_elements_text(dependencies)::UUID
        FROM tasks 
        WHERE id = p_task_id AND dependencies IS NOT NULL
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM tasks 
            WHERE id = dependency_id AND status = 'completed'
        ) THEN
            all_completed := false;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN all_completed;
END;
$$ LANGUAGE plpgsql;

-- Function to create task from template
CREATE OR REPLACE FUNCTION create_task_from_template(
    p_template_id UUID,
    p_scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    p_assigned_to UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    template_record RECORD;
    new_task_id UUID;
BEGIN
    SELECT * INTO template_record FROM task_templates WHERE id = p_template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found: %', p_template_id;
    END IF;
    
    INSERT INTO tasks (
        restaurant_id, template_id, title, title_fr, description, description_fr,
        task_type, priority, scheduled_for, estimated_duration_minutes,
        location, required_skills, equipment_needed, checklist_items, checklist_items_fr,
        requires_approval, created_by
    ) VALUES (
        template_record.restaurant_id, p_template_id, template_record.name, template_record.name_fr,
        template_record.description, template_record.description_fr, template_record.task_type,
        template_record.priority, p_scheduled_for, template_record.estimated_duration_minutes,
        CASE WHEN template_record.location_specific THEN template_record.locations->0 ELSE NULL END,
        template_record.required_skills, template_record.equipment_needed,
        template_record.checklist_items, template_record.checklist_items_fr,
        template_record.approval_required, COALESCE(p_created_by, template_record.created_by)
    ) RETURNING id INTO new_task_id;
    
    -- Auto-assign if specified or if template has auto-assignment rules
    IF p_assigned_to IS NOT NULL THEN
        UPDATE tasks SET assigned_to = p_assigned_to, status = 'assigned' WHERE id = new_task_id;
    ELSIF template_record.auto_assign_rules IS NOT NULL AND template_record.auto_assign_rules != '{}' THEN
        PERFORM auto_assign_task(new_task_id, COALESCE(p_created_by, template_record.created_by));
    END IF;
    
    RETURN new_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update task performance metrics
CREATE OR REPLACE FUNCTION update_task_performance_metrics()
RETURNS VOID AS $$
BEGIN
    -- Daily aggregation of task performance metrics
    INSERT INTO task_performance_metrics (
        restaurant_id, metric_date, total_tasks, completed_tasks, 
        cancelled_tasks, overdue_tasks, avg_completion_time_minutes,
        on_time_completion_rate
    )
    SELECT 
        restaurant_id,
        CURRENT_DATE,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_tasks,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_tasks,
        AVG(actual_duration_minutes) FILTER (WHERE status = 'completed') as avg_completion_time,
        (COUNT(*) FILTER (WHERE status = 'completed' AND completed_at <= due_date)::DECIMAL / 
         NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0) * 100) as on_time_rate
    FROM tasks
    WHERE DATE(created_at) = CURRENT_DATE
    GROUP BY restaurant_id
    ON CONFLICT (restaurant_id, metric_date) 
    DO UPDATE SET
        total_tasks = EXCLUDED.total_tasks,
        completed_tasks = EXCLUDED.completed_tasks,
        cancelled_tasks = EXCLUDED.cancelled_tasks,
        overdue_tasks = EXCLUDED.overdue_tasks,
        avg_completion_time_minutes = EXCLUDED.avg_completion_time_minutes,
        on_time_completion_rate = EXCLUDED.on_time_completion_rate;
END;
$$ LANGUAGE plpgsql;

COMMENT ON DATABASE postgres IS 'Restaurant Krong Thai SOP Management System - Enhanced with comprehensive task management, workflow automation, and intelligent assignment capabilities';