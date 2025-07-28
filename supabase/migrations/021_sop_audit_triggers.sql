-- SOP Audit Triggers and Logging System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive audit trail for all SOP operations and compliance tracking

-- ===========================================
-- ENHANCED AUDIT LOGGING FUNCTIONS
-- ===========================================

-- Enhanced audit logging function with SOP-specific context
CREATE OR REPLACE FUNCTION log_sop_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    restaurant_id_val UUID;
    user_id_val UUID;
    old_data JSONB;
    new_data JSONB;
    action_type audit_action;
    metadata_obj JSONB;
    table_name TEXT;
BEGIN
    -- Determine table name and action type
    table_name := TG_TABLE_NAME;
    
    CASE TG_OP
        WHEN 'INSERT' THEN
            action_type := 'CREATE';
            new_data := to_jsonb(NEW);
            old_data := NULL;
        WHEN 'UPDATE' THEN
            action_type := 'UPDATE';
            old_data := to_jsonb(OLD);
            new_data := to_jsonb(NEW);
        WHEN 'DELETE' THEN
            action_type := 'DELETE';
            old_data := to_jsonb(OLD);
            new_data := NULL;
    END CASE;
    
    -- Get current user ID
    user_id_val := auth.uid();
    
    -- Extract restaurant ID based on table structure
    CASE table_name
        WHEN 'sop_documents' THEN
            restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
        WHEN 'sop_completions' THEN
            restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
        WHEN 'sop_assignments' THEN
            restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
        WHEN 'sop_photos' THEN
            restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
        WHEN 'sop_schedules' THEN
            restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
        WHEN 'sop_approvals' THEN
            restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
        WHEN 'sop_equipment' THEN
            restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
        WHEN 'sop_versions' THEN
            -- Get restaurant ID from linked SOP document
            SELECT restaurant_id INTO restaurant_id_val
            FROM sop_documents
            WHERE id = COALESCE(NEW.sop_document_id, OLD.sop_document_id);
        WHEN 'sop_steps' THEN
            -- Get restaurant ID from linked SOP document
            SELECT restaurant_id INTO restaurant_id_val
            FROM sop_documents
            WHERE id = COALESCE(NEW.sop_document_id, OLD.sop_document_id);
        ELSE
            restaurant_id_val := NULL;
    END CASE;
    
    -- Build metadata object with SOP-specific information
    metadata_obj := jsonb_build_object(
        'table_name', table_name,
        'operation', TG_OP,
        'timestamp', NOW(),
        'session_info', jsonb_build_object(
            'user_agent', current_setting('request.headers', true)::JSON->>'user-agent',
            'ip_address', current_setting('request.headers', true)::JSON->>'x-forwarded-for'
        )
    );
    
    -- Add table-specific metadata
    CASE table_name
        WHEN 'sop_documents' THEN
            metadata_obj := metadata_obj || jsonb_build_object(
                'sop_info', jsonb_build_object(
                    'category_id', COALESCE(NEW.category_id, OLD.category_id),
                    'status', COALESCE(NEW.status, OLD.status),
                    'priority', COALESCE(NEW.priority, OLD.priority),
                    'version', COALESCE(NEW.version, OLD.version)
                )
            );
        WHEN 'sop_completions' THEN
            metadata_obj := metadata_obj || jsonb_build_object(
                'completion_info', jsonb_build_object(
                    'sop_document_id', COALESCE(NEW.sop_document_id, OLD.sop_document_id),
                    'status', COALESCE(NEW.status, OLD.status),
                    'compliance_score', COALESCE(NEW.compliance_score, OLD.compliance_score),
                    'quality_rating', COALESCE(NEW.quality_rating, OLD.quality_rating)
                )
            );
        WHEN 'sop_assignments' THEN
            metadata_obj := metadata_obj || jsonb_build_object(
                'assignment_info', jsonb_build_object(
                    'sop_document_id', COALESCE(NEW.sop_document_id, OLD.sop_document_id),
                    'assigned_to', COALESCE(NEW.assigned_to, OLD.assigned_to),
                    'status', COALESCE(NEW.status, OLD.status),
                    'priority', COALESCE(NEW.priority, OLD.priority),
                    'due_date', COALESCE(NEW.due_date, OLD.due_date)
                )
            );
        WHEN 'sop_photos' THEN
            metadata_obj := metadata_obj || jsonb_build_object(
                'photo_info', jsonb_build_object(
                    'sop_completion_id', COALESCE(NEW.sop_completion_id, OLD.sop_completion_id),
                    'verification_status', COALESCE(NEW.verification_status, OLD.verification_status),
                    'file_name', COALESCE(NEW.file_name, OLD.file_name),
                    'is_primary', COALESCE(NEW.is_primary, OLD.is_primary)
                )
            );
    END CASE;
    
    -- Insert audit record
    INSERT INTO audit_logs (
        restaurant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        metadata
    ) VALUES (
        restaurant_id_val,
        user_id_val,
        action_type,
        table_name,
        COALESCE(
            (new_data->>'id')::UUID,
            (old_data->>'id')::UUID
        ),
        old_data,
        new_data,
        metadata_obj
    );
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ===========================================
-- SOP STATUS CHANGE TRIGGERS
-- ===========================================

-- Function to handle SOP status changes and notifications
CREATE OR REPLACE FUNCTION handle_sop_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_data JSONB;
BEGIN
    -- Only process if status actually changed
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Create notification data
        notification_data := jsonb_build_object(
            'sop_id', NEW.id,
            'title', NEW.title,
            'title_th', NEW.title_th,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'restaurant_id', NEW.restaurant_id,
            'changed_by', auth.uid(),
            'timestamp', NOW()
        );
        
        -- Log specific status change audit event
        INSERT INTO audit_logs (
            restaurant_id,
            user_id,
            action,
            resource_type,
            resource_id,
            old_values,
            new_values,
            metadata
        ) VALUES (
            NEW.restaurant_id,
            auth.uid(),
            'UPDATE'::audit_action,
            'sop_status_change',
            NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            jsonb_build_object(
                'status_change', notification_data,
                'critical', CASE WHEN NEW.priority = 'critical' THEN true ELSE false END
            )
        );
        
        -- If SOP is approved, create version record
        IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
            INSERT INTO sop_versions (
                sop_document_id,
                version_number,
                title,
                title_th,
                content,
                content_th,
                steps,
                steps_th,
                change_summary,
                change_summary_th,
                effective_date,
                created_by,
                approved_by,
                approved_at,
                is_current
            ) VALUES (
                NEW.id,
                NEW.version,
                NEW.title,
                NEW.title_th,
                NEW.content,
                NEW.content_th,
                NEW.steps,
                NEW.steps_th,
                'Approved version ' || NEW.version,
                'เวอร์ชันที่อนุมัติ ' || NEW.version,
                NEW.effective_date,
                NEW.created_by,
                NEW.approved_by,
                NEW.approved_at,
                true
            );
            
            -- Mark previous versions as not current
            UPDATE sop_versions 
            SET is_current = false 
            WHERE sop_document_id = NEW.id 
            AND version_number != NEW.version;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ===========================================
-- ASSIGNMENT STATUS TRIGGERS
-- ===========================================

-- Function to handle assignment status changes and escalations
CREATE OR REPLACE FUNCTION handle_assignment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_data JSONB;
    is_overdue BOOLEAN;
BEGIN
    -- Check if assignment is overdue
    is_overdue := (NEW.due_date < NOW() AND NEW.status NOT IN ('completed', 'cancelled'));
    
    -- Update overdue status if needed
    IF is_overdue AND NEW.status != 'overdue' THEN
        NEW.status := 'overdue';
        NEW.escalation_level := COALESCE(NEW.escalation_level, 0) + 1;
        NEW.escalated_at := NOW();
    END IF;
    
    -- Only process if status actually changed
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Create notification data
        notification_data := jsonb_build_object(
            'assignment_id', NEW.id,
            'sop_document_id', NEW.sop_document_id,
            'assigned_to', NEW.assigned_to,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'restaurant_id', NEW.restaurant_id,
            'due_date', NEW.due_date,
            'is_overdue', is_overdue,
            'escalation_level', NEW.escalation_level,
            'timestamp', NOW()
        );
        
        -- Log assignment status change
        INSERT INTO audit_logs (
            restaurant_id,
            user_id,
            action,
            resource_type,
            resource_id,
            old_values,
            new_values,
            metadata
        ) VALUES (
            NEW.restaurant_id,
            auth.uid(),
            'UPDATE'::audit_action,
            'assignment_status_change',
            NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            jsonb_build_object(
                'assignment_change', notification_data,
                'requires_attention', is_overdue OR NEW.priority = 'critical'
            )
        );
        
        -- Auto-create completion record when assignment is completed
        IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.completion_id IS NULL THEN
            INSERT INTO sop_completions (
                sop_document_id,
                restaurant_id,
                completed_by,
                assigned_to,
                status,
                started_at,
                completed_at,
                notes
            ) VALUES (
                NEW.sop_document_id,
                NEW.restaurant_id,
                NEW.assigned_to, -- Assuming self-completion
                NEW.assigned_to,
                'completed'::sop_completion_status,
                NEW.started_at,
                NEW.completed_at,
                'Auto-created from assignment completion'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ===========================================
-- COMPLETION VERIFICATION TRIGGERS
-- ===========================================

-- Function to handle completion verification and quality control
CREATE OR REPLACE FUNCTION handle_completion_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requires_approval BOOLEAN := false;
    step_info RECORD;
BEGIN
    -- Check if this completion requires manager approval
    IF NEW.sop_step_id IS NOT NULL THEN
        SELECT requires_manager_approval INTO requires_approval
        FROM sop_steps
        WHERE id = NEW.sop_step_id;
    ELSE
        -- Check if any step in the SOP requires approval
        SELECT EXISTS(
            SELECT 1 FROM sop_steps 
            WHERE sop_document_id = NEW.sop_document_id 
            AND requires_manager_approval = true
        ) INTO requires_approval;
    END IF;
    
    -- Auto-create approval request if required
    IF TG_OP = 'INSERT' AND requires_approval THEN
        INSERT INTO sop_approvals (
            sop_completion_id,
            restaurant_id,
            requested_by,
            approval_type,
            status,
            approval_criteria,
            priority,
            due_by
        ) VALUES (
            NEW.id,
            NEW.restaurant_id,
            NEW.completed_by,
            'completion',
            'pending'::sop_completion_status,
            jsonb_build_object(
                'requires_manager_approval', true,
                'critical_control_point', EXISTS(
                    SELECT 1 FROM sop_steps 
                    WHERE sop_document_id = NEW.sop_document_id 
                    AND critical_control_point = true
                )
            ),
            CASE 
                WHEN EXISTS(SELECT 1 FROM sop_steps WHERE sop_document_id = NEW.sop_document_id AND critical_control_point = true) 
                THEN 'critical'::sop_priority 
                ELSE 'medium'::sop_priority 
            END,
            NOW() + INTERVAL '4 hours' -- 4 hour approval window
        );
    END IF;
    
    -- Update assignment status if linked
    IF NEW.status = 'completed' THEN
        UPDATE sop_assignments 
        SET 
            status = 'completed'::sop_assignment_status,
            completed_at = NEW.completed_at,
            completion_id = NEW.id
        WHERE sop_document_id = NEW.sop_document_id
        AND assigned_to = NEW.completed_by
        AND status NOT IN ('completed', 'cancelled');
    END IF;
    
    RETURN NEW;
END;
$$;

-- ===========================================
-- ANALYTICS UPDATE TRIGGERS
-- ===========================================

-- Function to update SOP analytics in real-time
CREATE OR REPLACE FUNCTION update_sop_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    analytics_date DATE := CURRENT_DATE;
    sop_id UUID;
    restaurant_id_val UUID;
BEGIN
    -- Extract relevant IDs based on trigger table
    CASE TG_TABLE_NAME
        WHEN 'sop_completions' THEN
            sop_id := COALESCE(NEW.sop_document_id, OLD.sop_document_id);
            restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
        WHEN 'sop_assignments' THEN
            sop_id := COALESCE(NEW.sop_document_id, OLD.sop_document_id);
            restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
        WHEN 'sop_photos' THEN
            -- Get SOP ID from completion
            SELECT sc.sop_document_id, sc.restaurant_id INTO sop_id, restaurant_id_val
            FROM sop_completions sc
            WHERE sc.id = COALESCE(NEW.sop_completion_id, OLD.sop_completion_id);
        ELSE
            RETURN COALESCE(NEW, OLD);
    END CASE;
    
    -- Update analytics record
    INSERT INTO sop_analytics (
        sop_document_id,
        restaurant_id,
        date_recorded
    ) VALUES (
        sop_id,
        restaurant_id_val,
        analytics_date
    )
    ON CONFLICT (sop_document_id, restaurant_id, date_recorded)
    DO UPDATE SET
        total_assignments = (
            SELECT COUNT(*)
            FROM sop_assignments sa
            WHERE sa.sop_document_id = sop_id
            AND sa.restaurant_id = restaurant_id_val
            AND DATE(sa.created_at) = analytics_date
        ),
        completed_assignments = (
            SELECT COUNT(*)
            FROM sop_assignments sa
            WHERE sa.sop_document_id = sop_id
            AND sa.restaurant_id = restaurant_id_val
            AND sa.status = 'completed'
            AND DATE(sa.completed_at) = analytics_date
        ),
        overdue_assignments = (
            SELECT COUNT(*)
            FROM sop_assignments sa
            WHERE sa.sop_document_id = sop_id
            AND sa.restaurant_id = restaurant_id_val
            AND sa.status = 'overdue'
            AND DATE(sa.created_at) = analytics_date
        ),
        avg_completion_time_minutes = (
            SELECT AVG(duration_minutes)
            FROM sop_completions sc
            WHERE sc.sop_document_id = sop_id
            AND sc.restaurant_id = restaurant_id_val
            AND DATE(sc.completed_at) = analytics_date
            AND sc.status = 'completed'
        ),
        avg_quality_rating = (
            SELECT AVG(quality_rating)
            FROM sop_completions sc
            WHERE sc.sop_document_id = sop_id
            AND sc.restaurant_id = restaurant_id_val
            AND DATE(sc.completed_at) = analytics_date
            AND sc.quality_rating IS NOT NULL
        ),
        avg_compliance_score = (
            SELECT AVG(compliance_score)
            FROM sop_completions sc
            WHERE sc.sop_document_id = sop_id
            AND sc.restaurant_id = restaurant_id_val
            AND DATE(sc.completed_at) = analytics_date
            AND sc.compliance_score IS NOT NULL
        ),
        total_photos_uploaded = (
            SELECT COUNT(*)
            FROM sop_photos sp
            JOIN sop_completions sc ON sp.sop_completion_id = sc.id
            WHERE sc.sop_document_id = sop_id
            AND sp.restaurant_id = restaurant_id_val
            AND DATE(sp.created_at) = analytics_date
        ),
        photos_approved = (
            SELECT COUNT(*)
            FROM sop_photos sp
            JOIN sop_completions sc ON sp.sop_completion_id = sc.id
            WHERE sc.sop_document_id = sop_id
            AND sp.restaurant_id = restaurant_id_val
            AND sp.verification_status = 'approved'
            AND DATE(sp.verified_at) = analytics_date
        ),
        photos_rejected = (
            SELECT COUNT(*)
            FROM sop_photos sp
            JOIN sop_completions sc ON sp.sop_completion_id = sc.id
            WHERE sc.sop_document_id = sop_id
            AND sp.restaurant_id = restaurant_id_val
            AND sp.verification_status = 'rejected'
            AND DATE(sp.verified_at) = analytics_date
        ),
        updated_at = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ===========================================
-- CREATE AUDIT TRIGGERS
-- ===========================================

-- SOP Documents audit triggers
CREATE TRIGGER sop_documents_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_documents
    FOR EACH ROW EXECUTE FUNCTION log_sop_audit_event();

CREATE TRIGGER sop_documents_status_trigger
    AFTER UPDATE ON sop_documents
    FOR EACH ROW EXECUTE FUNCTION handle_sop_status_change();

-- SOP Steps audit triggers
CREATE TRIGGER sop_steps_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_steps
    FOR EACH ROW EXECUTE FUNCTION log_sop_audit_event();

-- SOP Completions audit and business logic triggers
CREATE TRIGGER sop_completions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_completions
    FOR EACH ROW EXECUTE FUNCTION log_sop_audit_event();

CREATE TRIGGER sop_completions_verification_trigger
    AFTER INSERT OR UPDATE ON sop_completions
    FOR EACH ROW EXECUTE FUNCTION handle_completion_verification();

CREATE TRIGGER sop_completions_analytics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_completions
    FOR EACH ROW EXECUTE FUNCTION update_sop_analytics();

-- SOP Assignments audit and business logic triggers
CREATE TRIGGER sop_assignments_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_assignments
    FOR EACH ROW EXECUTE FUNCTION log_sop_audit_event();

CREATE TRIGGER sop_assignments_status_trigger
    BEFORE UPDATE ON sop_assignments
    FOR EACH ROW EXECUTE FUNCTION handle_assignment_status_change();

CREATE TRIGGER sop_assignments_analytics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_assignments
    FOR EACH ROW EXECUTE FUNCTION update_sop_analytics();

-- SOP Photos audit triggers
CREATE TRIGGER sop_photos_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_photos
    FOR EACH ROW EXECUTE FUNCTION log_sop_audit_event();

CREATE TRIGGER sop_photos_analytics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_photos
    FOR EACH ROW EXECUTE FUNCTION update_sop_analytics();

-- SOP Schedules audit triggers
CREATE TRIGGER sop_schedules_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_schedules
    FOR EACH ROW EXECUTE FUNCTION log_sop_audit_event();

-- SOP Approvals audit triggers
CREATE TRIGGER sop_approvals_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_approvals
    FOR EACH ROW EXECUTE FUNCTION log_sop_audit_event();

-- SOP Versions audit triggers
CREATE TRIGGER sop_versions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_versions
    FOR EACH ROW EXECUTE FUNCTION log_sop_audit_event();

-- SOP Equipment audit triggers
CREATE TRIGGER sop_equipment_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_equipment
    FOR EACH ROW EXECUTE FUNCTION log_sop_audit_event();

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON FUNCTION log_sop_audit_event() IS 'Comprehensive audit logging for all SOP table operations with contextual metadata';
COMMENT ON FUNCTION handle_sop_status_change() IS 'Handles SOP status changes, notifications, and version creation';
COMMENT ON FUNCTION handle_assignment_status_change() IS 'Manages assignment status changes, escalations, and auto-completion';
COMMENT ON FUNCTION handle_completion_verification() IS 'Processes completion verification workflow and approval requirements';
COMMENT ON FUNCTION update_sop_analytics() IS 'Real-time analytics updates triggered by SOP workflow events';

-- Performance and compliance notes
COMMENT ON TRIGGER sop_documents_audit_trigger ON sop_documents IS 'Full audit trail for SOP document changes - compliance requirement';
COMMENT ON TRIGGER sop_completions_verification_trigger ON sop_completions IS 'Auto-creates approval requests for critical control points';
COMMENT ON TRIGGER sop_assignments_status_trigger ON sop_assignments IS 'Handles overdue detection and escalation workflow';