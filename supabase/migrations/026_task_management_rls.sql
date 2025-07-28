-- Restaurant Krong Thai Task Management System
-- Row Level Security (RLS) Policies
-- Created: 2025-07-28
-- Comprehensive security for task management tables

-- ===========================================
-- ENABLE RLS ON ALL TASK MANAGEMENT TABLES
-- ===========================================

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_recurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_performance_metrics ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TASK TEMPLATES POLICIES
-- ===========================================

-- Task templates: Restaurant isolation with role-based management
CREATE POLICY "Task templates restaurant isolation"
ON task_templates FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- Only admins and managers can create/update templates
CREATE POLICY "Task templates admin manage"
ON task_templates FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = task_templates.restaurant_id
        AND role IN ('admin', 'manager')
    )
);

-- ===========================================
-- TASKS POLICIES
-- ===========================================

-- Tasks: Restaurant isolation
CREATE POLICY "Tasks restaurant isolation"
ON tasks FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- Staff can only view tasks assigned to them or created by them
CREATE POLICY "Tasks staff view restriction"
ON tasks FOR SELECT
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
    AND (
        -- Admins and managers see all tasks in their restaurant
        auth.uid() IN (
            SELECT id FROM auth_users 
            WHERE restaurant_id = tasks.restaurant_id 
            AND role IN ('admin', 'manager')
        )
        -- Staff see tasks assigned to them or created by them
        OR assigned_to = auth.uid()
        OR created_by = auth.uid()
        -- Or tasks that are unassigned (pending)
        OR (assigned_to IS NULL AND status = 'pending')
    )
);

-- Task creation permissions
CREATE POLICY "Tasks creation permissions"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
    AND created_by = auth.uid()
);

-- Task update permissions
CREATE POLICY "Tasks update permissions"
ON tasks FOR UPDATE
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
    AND (
        -- Admins and managers can update any task
        auth.uid() IN (
            SELECT id FROM auth_users 
            WHERE restaurant_id = tasks.restaurant_id 
            AND role IN ('admin', 'manager')
        )
        -- Assigned users can update their tasks (limited fields)
        OR assigned_to = auth.uid()
        -- Creators can update their own tasks
        OR created_by = auth.uid()
    )
);

-- Task deletion: Only admins and managers
CREATE POLICY "Tasks deletion restriction"
ON tasks FOR DELETE
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = tasks.restaurant_id 
        AND role IN ('admin', 'manager')
    )
);

-- ===========================================
-- STAFF SKILLS POLICIES
-- ===========================================

-- Staff can view all skills in their restaurant, manage their own
CREATE POLICY "Staff skills restaurant access"
ON staff_skills FOR SELECT
TO authenticated
USING (
    user_id IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = (
            SELECT restaurant_id FROM auth_users 
            WHERE auth_users.id = auth.uid()
        )
    )
);

-- Users can manage their own skills, admins/managers can manage all
CREATE POLICY "Staff skills management"
ON staff_skills FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR auth.uid() IN (
        SELECT u1.id FROM auth_users u1
        JOIN auth_users u2 ON u1.restaurant_id = u2.restaurant_id
        WHERE u2.id = staff_skills.user_id
        AND u1.id = auth.uid()
        AND u1.role IN ('admin', 'manager')
    )
);

-- ===========================================
-- STAFF AVAILABILITY POLICIES
-- ===========================================

-- Availability: Restaurant isolation
CREATE POLICY "Staff availability restaurant isolation"
ON staff_availability FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- Users can manage their own availability, admins/managers can manage all
CREATE POLICY "Staff availability management"
ON staff_availability FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = staff_availability.restaurant_id
        AND role IN ('admin', 'manager')
    )
);

-- ===========================================
-- TASK ASSIGNMENTS POLICIES
-- ===========================================

-- Task assignments: Users can see assignments related to them
CREATE POLICY "Task assignments visibility"
ON task_assignments FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR assigned_by = auth.uid()
    OR auth.uid() IN (
        SELECT u.id FROM auth_users u
        JOIN tasks t ON t.restaurant_id = u.restaurant_id
        WHERE t.id = task_assignments.task_id
        AND u.id = auth.uid()
        AND u.role IN ('admin', 'manager')
    )
);

-- Assignment creation: Only by admins, managers, or auto-assignment
CREATE POLICY "Task assignments creation"
ON task_assignments FOR INSERT
TO authenticated
WITH CHECK (
    assigned_by = auth.uid()
    AND auth.uid() IN (
        SELECT u.id FROM auth_users u
        JOIN tasks t ON t.restaurant_id = u.restaurant_id
        WHERE t.id = task_assignments.task_id
        AND u.id = auth.uid()
        AND (u.role IN ('admin', 'manager') OR auto_assigned = true)
    )
);

-- Assignment updates: By assignee (accept/decline) or assigners
CREATE POLICY "Task assignments updates"
ON task_assignments FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid() -- Assignee can accept/decline
    OR assigned_by = auth.uid() -- Assigner can modify
    OR auth.uid() IN (
        SELECT u.id FROM auth_users u
        JOIN tasks t ON t.restaurant_id = u.restaurant_id
        WHERE t.id = task_assignments.task_id
        AND u.id = auth.uid()
        AND u.role IN ('admin', 'manager')
    )
);

-- ===========================================
-- WORKFLOW POLICIES
-- ===========================================

-- Workflows: Restaurant isolation with role-based management
CREATE POLICY "Workflows restaurant isolation"
ON task_workflows FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- Only admins and managers can create/modify workflows
CREATE POLICY "Workflows admin manage"
ON task_workflows FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = task_workflows.restaurant_id
        AND role IN ('admin', 'manager')
    )
);

-- ===========================================
-- WORKFLOW EXECUTIONS POLICIES
-- ===========================================

-- Workflow executions: Restaurant isolation
CREATE POLICY "Workflow executions restaurant isolation"
ON workflow_executions FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- Execution creation: Admins, managers, or automated triggers
CREATE POLICY "Workflow executions creation"
ON workflow_executions FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
    AND (
        triggered_by = auth.uid()
        OR auth.uid() IN (
            SELECT id FROM auth_users 
            WHERE restaurant_id = workflow_executions.restaurant_id
            AND role IN ('admin', 'manager')
        )
    )
);

-- ===========================================
-- TASK RECURRENCE POLICIES
-- ===========================================

-- Recurrence: Restaurant isolation
CREATE POLICY "Task recurrence restaurant isolation"
ON task_recurrence FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- Only admins and managers can manage recurrence
CREATE POLICY "Task recurrence admin manage"
ON task_recurrence FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = task_recurrence.restaurant_id
        AND role IN ('admin', 'manager')
    )
);

-- ===========================================
-- NOTIFICATIONS POLICIES
-- ===========================================

-- Users can only see their own notifications
CREATE POLICY "Notifications user isolation"
ON task_notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Notification creation: System or authorized users
CREATE POLICY "Notifications creation"
ON task_notifications FOR INSERT
TO authenticated
WITH CHECK (
    -- System can create notifications for any user in the same restaurant
    user_id IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = (
            SELECT restaurant_id FROM auth_users 
            WHERE auth_users.id = auth.uid()
        )
    )
);

-- Users can update their own notifications (mark as read, etc.)
CREATE POLICY "Notifications user updates"
ON task_notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ===========================================
-- PERFORMANCE METRICS POLICIES
-- ===========================================

-- Performance metrics: Restaurant isolation with role-based access
CREATE POLICY "Performance metrics restaurant access"
ON task_performance_metrics FOR SELECT
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
    AND (
        -- Admins and managers see all metrics
        auth.uid() IN (
            SELECT id FROM auth_users 
            WHERE restaurant_id = task_performance_metrics.restaurant_id
            AND role IN ('admin', 'manager')
        )
        -- Staff can see their own metrics
        OR user_id = auth.uid()
    )
);

-- Only system or admins can insert/update metrics
CREATE POLICY "Performance metrics system manage"
ON task_performance_metrics FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = task_performance_metrics.restaurant_id
        AND role = 'admin'
    )
);

-- ===========================================
-- SPECIALIZED HELPER FUNCTIONS FOR RLS
-- ===========================================

-- Function to check if user can assign tasks
CREATE OR REPLACE FUNCTION can_assign_tasks(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth_users 
        WHERE id = p_user_id 
        AND role IN ('admin', 'manager')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage workflows
CREATE OR REPLACE FUNCTION can_manage_workflows(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth_users 
        WHERE id = p_user_id 
        AND role IN ('admin', 'manager')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's restaurant context
CREATE OR REPLACE FUNCTION get_user_restaurant_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    restaurant_id UUID;
BEGIN
    SELECT auth_users.restaurant_id INTO restaurant_id
    FROM auth_users 
    WHERE id = p_user_id;
    
    RETURN restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- ADDITIONAL SECURITY CONSTRAINTS
-- ===========================================

-- Ensure tasks can only be assigned to users in the same restaurant
ALTER TABLE tasks ADD CONSTRAINT check_assignee_restaurant 
CHECK (
    assigned_to IS NULL OR 
    assigned_to IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = tasks.restaurant_id
    )
);

-- Ensure task assignments are within the same restaurant
ALTER TABLE task_assignments ADD CONSTRAINT check_assignment_restaurant
CHECK (
    EXISTS (
        SELECT 1 FROM tasks t
        JOIN auth_users u ON u.id = task_assignments.user_id
        WHERE t.id = task_assignments.task_id
        AND t.restaurant_id = u.restaurant_id
    )
);

-- Ensure staff skills belong to restaurant users
ALTER TABLE staff_skills ADD CONSTRAINT check_skill_user_restaurant
CHECK (
    EXISTS (
        SELECT 1 FROM auth_users 
        WHERE id = staff_skills.user_id 
        AND is_active = true
    )
);

-- ===========================================
-- AUDIT TRIGGERS FOR TASK OPERATIONS
-- ===========================================

-- Function to audit task changes
CREATE OR REPLACE FUNCTION audit_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log task creation
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(
            NEW.restaurant_id,
            NEW.created_by,
            'CREATE',
            'tasks',
            NEW.id,
            NULL,
            to_jsonb(NEW),
            jsonb_build_object('operation', 'task_created')
        );
        RETURN NEW;
    END IF;
    
    -- Log task updates
    IF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            PERFORM log_audit_event(
                NEW.restaurant_id,
                COALESCE(NEW.updated_by, auth.uid()),
                'UPDATE',
                'tasks',
                NEW.id,
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status),
                jsonb_build_object('operation', 'status_change', 'from', OLD.status, 'to', NEW.status)
            );
        END IF;
        
        -- Log assignment changes
        IF COALESCE(OLD.assigned_to, '00000000-0000-0000-0000-000000000000'::UUID) != 
           COALESCE(NEW.assigned_to, '00000000-0000-0000-0000-000000000000'::UUID) THEN
            PERFORM log_audit_event(
                NEW.restaurant_id,
                COALESCE(NEW.assigned_by, auth.uid()),
                'UPDATE',
                'tasks',
                NEW.id,
                jsonb_build_object('assigned_to', OLD.assigned_to),
                jsonb_build_object('assigned_to', NEW.assigned_to),
                jsonb_build_object('operation', 'assignment_change')
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Log task deletion
    IF TG_OP = 'DELETE' THEN
        PERFORM log_audit_event(
            OLD.restaurant_id,
            auth.uid(),
            'DELETE',
            'tasks',
            OLD.id,
            to_jsonb(OLD),
            NULL,
            jsonb_build_object('operation', 'task_deleted')
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to tasks table
CREATE TRIGGER task_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION audit_task_changes();

-- Function to audit workflow executions
CREATE OR REPLACE FUNCTION audit_workflow_executions()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(
            NEW.restaurant_id,
            NEW.triggered_by,
            'CREATE',
            'workflow_executions',
            NEW.id,
            NULL,
            to_jsonb(NEW),
            jsonb_build_object('operation', 'workflow_started', 'workflow_id', NEW.workflow_id)
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        PERFORM log_audit_event(
            NEW.restaurant_id,
            NEW.triggered_by,
            'UPDATE',
            'workflow_executions',
            NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            jsonb_build_object('operation', 'workflow_status_change', 'from', OLD.status, 'to', NEW.status)
        );
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to workflow executions
CREATE TRIGGER workflow_execution_audit_trigger
    AFTER INSERT OR UPDATE ON workflow_executions
    FOR EACH ROW EXECUTE FUNCTION audit_workflow_executions();

COMMENT ON SCHEMA public IS 'Task Management RLS Policies - Comprehensive security with restaurant isolation, role-based access, and automated auditing';