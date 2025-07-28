-- SOP Real-time Subscriptions and Notifications
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Real-time notifications for SOP workflow events and status updates

-- ===========================================
-- ENABLE REALTIME FOR SOP TABLES
-- ===========================================

-- Enable real-time replication for all SOP tables
ALTER PUBLICATION supabase_realtime ADD TABLE sop_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_equipment;

-- Enable real-time for categories (for dynamic menu updates)
ALTER PUBLICATION supabase_realtime ADD TABLE sop_categories;

-- ===========================================
-- NOTIFICATION CHANNELS AND FUNCTIONS
-- ===========================================

-- Function to send real-time notifications for SOP events
CREATE OR REPLACE FUNCTION notify_sop_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_data JSONB;
    channel_name TEXT;
    restaurant_id_val UUID;
BEGIN
    -- Extract restaurant ID based on table
    CASE TG_TABLE_NAME
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
        ELSE
            -- For tables without direct restaurant_id, get from related records
            SELECT restaurant_id INTO restaurant_id_val
            FROM sop_documents
            WHERE id = COALESCE(NEW.sop_document_id, OLD.sop_document_id);
    END CASE;
    
    -- Build notification payload
    notification_data := jsonb_build_object(
        'event_type', TG_OP,
        'table_name', TG_TABLE_NAME,
        'restaurant_id', restaurant_id_val,
        'timestamp', NOW(),
        'user_id', auth.uid()
    );
    
    -- Add table-specific data
    CASE TG_TABLE_NAME
        WHEN 'sop_documents' THEN
            notification_data := notification_data || jsonb_build_object(
                'document_id', COALESCE(NEW.id, OLD.id),
                'title', COALESCE(NEW.title, OLD.title),
                'status', COALESCE(NEW.status, OLD.status),
                'priority', COALESCE(NEW.priority, OLD.priority),
                'category_id', COALESCE(NEW.category_id, OLD.category_id)
            );
            channel_name := 'sop_documents_' || restaurant_id_val;
            
        WHEN 'sop_assignments' THEN
            notification_data := notification_data || jsonb_build_object(
                'assignment_id', COALESCE(NEW.id, OLD.id),
                'sop_document_id', COALESCE(NEW.sop_document_id, OLD.sop_document_id),
                'assigned_to', COALESCE(NEW.assigned_to, OLD.assigned_to),
                'status', COALESCE(NEW.status, OLD.status),
                'due_date', COALESCE(NEW.due_date, OLD.due_date),
                'priority', COALESCE(NEW.priority, OLD.priority)
            );
            channel_name := 'sop_assignments_' || restaurant_id_val;
            
        WHEN 'sop_completions' THEN
            notification_data := notification_data || jsonb_build_object(
                'completion_id', COALESCE(NEW.id, OLD.id),
                'sop_document_id', COALESCE(NEW.sop_document_id, OLD.sop_document_id),
                'completed_by', COALESCE(NEW.completed_by, OLD.completed_by),
                'status', COALESCE(NEW.status, OLD.status),
                'quality_rating', COALESCE(NEW.quality_rating, OLD.quality_rating),
                'compliance_score', COALESCE(NEW.compliance_score, OLD.compliance_score)
            );
            channel_name := 'sop_completions_' || restaurant_id_val;
            
        WHEN 'sop_photos' THEN
            notification_data := notification_data || jsonb_build_object(
                'photo_id', COALESCE(NEW.id, OLD.id),
                'sop_completion_id', COALESCE(NEW.sop_completion_id, OLD.sop_completion_id),
                'uploaded_by', COALESCE(NEW.uploaded_by, OLD.uploaded_by),
                'verification_status', COALESCE(NEW.verification_status, OLD.verification_status),
                'file_name', COALESCE(NEW.file_name, OLD.file_name)
            );
            channel_name := 'sop_photos_' || restaurant_id_val;
            
        WHEN 'sop_approvals' THEN
            notification_data := notification_data || jsonb_build_object(
                'approval_id', COALESCE(NEW.id, OLD.id),
                'sop_completion_id', COALESCE(NEW.sop_completion_id, OLD.sop_completion_id),
                'approver_id', COALESCE(NEW.approver_id, OLD.approver_id),
                'status', COALESCE(NEW.status, OLD.status),
                'approval_type', COALESCE(NEW.approval_type, OLD.approval_type)
            );
            channel_name := 'sop_approvals_' || restaurant_id_val;
            
        WHEN 'sop_equipment' THEN
            notification_data := notification_data || jsonb_build_object(
                'equipment_id', COALESCE(NEW.id, OLD.id),
                'name', COALESCE(NEW.name, OLD.name),
                'status', COALESCE(NEW.status, OLD.status),
                'next_maintenance_date', COALESCE(NEW.next_maintenance_date, OLD.next_maintenance_date)
            );
            channel_name := 'sop_equipment_' || restaurant_id_val;
            
        ELSE
            channel_name := 'sop_general_' || restaurant_id_val;
    END CASE;
    
    -- Send notification via pg_notify
    PERFORM pg_notify(channel_name, notification_data::TEXT);
    
    -- Also send to general restaurant channel for dashboard updates
    PERFORM pg_notify('restaurant_' || restaurant_id_val, notification_data::TEXT);
    
    -- Send user-specific notifications for assignments
    IF TG_TABLE_NAME = 'sop_assignments' AND NEW.assigned_to IS NOT NULL THEN
        PERFORM pg_notify(
            'user_' || NEW.assigned_to, 
            (notification_data || jsonb_build_object('notification_type', 'assignment'))::TEXT
        );
    END IF;
    
    -- Send manager notifications for approvals
    IF TG_TABLE_NAME = 'sop_approvals' AND NEW.approver_id IS NOT NULL THEN
        PERFORM pg_notify(
            'user_' || NEW.approver_id, 
            (notification_data || jsonb_build_object('notification_type', 'approval_request'))::TEXT
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ===========================================
-- NOTIFICATION TRIGGERS
-- ===========================================

-- Create notification triggers for all SOP tables
CREATE TRIGGER sop_documents_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_documents
    FOR EACH ROW EXECUTE FUNCTION notify_sop_event();

CREATE TRIGGER sop_assignments_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_assignments
    FOR EACH ROW EXECUTE FUNCTION notify_sop_event();

CREATE TRIGGER sop_completions_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_completions
    FOR EACH ROW EXECUTE FUNCTION notify_sop_event();

CREATE TRIGGER sop_photos_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_photos
    FOR EACH ROW EXECUTE FUNCTION notify_sop_event();

CREATE TRIGGER sop_approvals_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_approvals
    FOR EACH ROW EXECUTE FUNCTION notify_sop_event();

CREATE TRIGGER sop_equipment_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_equipment
    FOR EACH ROW EXECUTE FUNCTION notify_sop_event();

-- ===========================================
-- DASHBOARD ANALYTICS NOTIFICATIONS
-- ===========================================

-- Function to notify dashboard updates when analytics change
CREATE OR REPLACE FUNCTION notify_dashboard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_data JSONB;
BEGIN
    -- Build dashboard update notification
    notification_data := jsonb_build_object(
        'event_type', 'analytics_update',
        'restaurant_id', COALESCE(NEW.restaurant_id, OLD.restaurant_id),
        'sop_document_id', COALESCE(NEW.sop_document_id, OLD.sop_document_id),
        'date_recorded', COALESCE(NEW.date_recorded, OLD.date_recorded),
        'timestamp', NOW()
    );
    
    -- Add key metrics for quick dashboard updates
    IF NEW IS NOT NULL THEN
        notification_data := notification_data || jsonb_build_object(
            'completion_rate', NEW.completion_rate,
            'on_time_completion_rate', NEW.on_time_completion_rate,
            'avg_compliance_score', NEW.avg_compliance_score,
            'critical_failures', NEW.critical_failures
        );
    END IF;
    
    -- Send to dashboard channel
    PERFORM pg_notify(
        'dashboard_' || COALESCE(NEW.restaurant_id, OLD.restaurant_id), 
        notification_data::TEXT
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for analytics updates
CREATE TRIGGER sop_analytics_dashboard_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sop_analytics
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

-- ===========================================
-- SCHEDULE-BASED NOTIFICATION FUNCTIONS
-- ===========================================

-- Function to generate scheduled assignment notifications
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    schedule_rec RECORD;
    notification_data JSONB;
BEGIN
    -- Process schedules that need to generate assignments
    FOR schedule_rec IN
        SELECT 
            s.*,
            d.title,
            d.title_th,
            r.name as restaurant_name
        FROM sop_schedules s
        JOIN sop_documents d ON s.sop_document_id = d.id
        JOIN restaurants r ON s.restaurant_id = r.id
        WHERE 
            s.is_active = true
            AND (s.next_generation_at IS NULL OR s.next_generation_at <= NOW())
            AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
    LOOP
        -- Create new assignment
        INSERT INTO sop_assignments (
            sop_document_id,
            restaurant_id,
            assigned_to,
            assigned_by,
            status,
            priority,
            due_date,
            scheduled_start,
            estimated_duration_minutes,
            recurring_schedule_id,
            assignment_notes
        ) VALUES (
            schedule_rec.sop_document_id,
            schedule_rec.restaurant_id,
            schedule_rec.default_assigned_to,
            schedule_rec.created_by,
            'assigned'::sop_assignment_status,
            schedule_rec.priority,
            CASE schedule_rec.frequency
                WHEN 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
                WHEN 'weekly' THEN CURRENT_DATE + INTERVAL '7 days'
                WHEN 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
                ELSE CURRENT_DATE + INTERVAL '1 day'
            END,
            schedule_rec.time_of_day,
            schedule_rec.estimated_duration_minutes,
            schedule_rec.id,
            'Auto-generated from schedule: ' || schedule_rec.name
        );
        
        -- Update schedule next generation time
        UPDATE sop_schedules 
        SET 
            next_generation_at = CASE frequency
                WHEN 'daily' THEN NOW() + INTERVAL '1 day'
                WHEN 'weekly' THEN NOW() + INTERVAL '7 days'
                WHEN 'monthly' THEN NOW() + INTERVAL '1 month'
                WHEN 'quarterly' THEN NOW() + INTERVAL '3 months'
                WHEN 'yearly' THEN NOW() + INTERVAL '1 year'
                ELSE NOW() + INTERVAL '1 day'
            END,
            last_generated_at = NOW()
        WHERE id = schedule_rec.id;
        
        -- Send notification
        notification_data := jsonb_build_object(
            'event_type', 'scheduled_assignment',
            'restaurant_id', schedule_rec.restaurant_id,
            'schedule_id', schedule_rec.id,
            'sop_document_id', schedule_rec.sop_document_id,
            'assigned_to', schedule_rec.default_assigned_to,
            'title', schedule_rec.title,
            'title_th', schedule_rec.title_th,
            'frequency', schedule_rec.frequency,
            'timestamp', NOW()
        );
        
        PERFORM pg_notify(
            'scheduled_assignments_' || schedule_rec.restaurant_id, 
            notification_data::TEXT
        );
        
        -- Send user notification
        IF schedule_rec.default_assigned_to IS NOT NULL THEN
            PERFORM pg_notify(
                'user_' || schedule_rec.default_assigned_to, 
                (notification_data || jsonb_build_object('notification_type', 'scheduled_assignment'))::TEXT
            );
        END IF;
    END LOOP;
END;
$$;

-- ===========================================
-- REMINDER AND ESCALATION FUNCTIONS
-- ===========================================

-- Function to send overdue assignment reminders
CREATE OR REPLACE FUNCTION send_overdue_reminders()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    assignment_rec RECORD;
    notification_data JSONB;
BEGIN
    -- Find overdue assignments that need reminders
    FOR assignment_rec IN
        SELECT 
            a.*,
            d.title,
            d.title_th,
            u.full_name,
            u.full_name_th,
            m.id as manager_id
        FROM sop_assignments a
        JOIN sop_documents d ON a.sop_document_id = d.id
        JOIN auth_users u ON a.assigned_to = u.id
        LEFT JOIN auth_users m ON u.restaurant_id = m.restaurant_id AND m.role = 'manager'
        WHERE 
            a.is_active = true
            AND a.status IN ('assigned', 'acknowledged', 'in_progress')
            AND a.due_date < NOW()
            AND (a.last_reminder_at IS NULL OR a.last_reminder_at < NOW() - INTERVAL '2 hours')
            AND a.reminder_count < 3 -- Limit to 3 reminders
    LOOP
        -- Update reminder tracking
        UPDATE sop_assignments 
        SET 
            reminder_count = reminder_count + 1,
            last_reminder_at = NOW(),
            status = 'overdue'::sop_assignment_status
        WHERE id = assignment_rec.id;
        
        -- Send reminder notification
        notification_data := jsonb_build_object(
            'event_type', 'overdue_reminder',
            'assignment_id', assignment_rec.id,
            'restaurant_id', assignment_rec.restaurant_id,
            'sop_document_id', assignment_rec.sop_document_id,
            'assigned_to', assignment_rec.assigned_to,
            'title', assignment_rec.title,
            'title_th', assignment_rec.title_th,
            'due_date', assignment_rec.due_date,
            'reminder_count', assignment_rec.reminder_count + 1,
            'hours_overdue', EXTRACT(EPOCH FROM (NOW() - assignment_rec.due_date)) / 3600,
            'timestamp', NOW()
        );
        
        -- Send to assigned user
        PERFORM pg_notify(
            'user_' || assignment_rec.assigned_to, 
            (notification_data || jsonb_build_object('notification_type', 'overdue_reminder'))::TEXT
        );
        
        -- Escalate to manager after 2 reminders
        IF assignment_rec.reminder_count + 1 >= 2 AND assignment_rec.manager_id IS NOT NULL THEN
            UPDATE sop_assignments 
            SET 
                escalation_level = escalation_level + 1,
                escalated_at = NOW(),
                escalated_to = assignment_rec.manager_id
            WHERE id = assignment_rec.id;
            
            -- Send escalation notification to manager
            PERFORM pg_notify(
                'user_' || assignment_rec.manager_id, 
                (notification_data || jsonb_build_object(
                    'notification_type', 'escalation',
                    'escalated_to', assignment_rec.manager_id
                ))::TEXT
            );
        END IF;
        
        -- Send to restaurant dashboard
        PERFORM pg_notify(
            'dashboard_' || assignment_rec.restaurant_id, 
            notification_data::TEXT
        );
    END LOOP;
END;
$$;

-- ===========================================
-- SUBSCRIPTION MANAGEMENT FUNCTIONS
-- ===========================================

-- Function to manage real-time subscriptions for a user
CREATE OR REPLACE FUNCTION manage_user_subscriptions(
    user_id_param UUID,
    subscription_types TEXT[] DEFAULT ARRAY['assignments', 'approvals', 'completions']
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_restaurant_id UUID;
    subscription_channels TEXT[];
    result JSONB;
BEGIN
    -- Get user's restaurant ID
    SELECT restaurant_id INTO user_restaurant_id
    FROM auth_users
    WHERE id = user_id_param;
    
    IF user_restaurant_id IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found or no restaurant assigned');
    END IF;
    
    -- Build subscription channels based on requested types
    subscription_channels := ARRAY[]::TEXT[];
    
    IF 'assignments' = ANY(subscription_types) THEN
        subscription_channels := subscription_channels || ARRAY[
            'user_' || user_id_param,
            'sop_assignments_' || user_restaurant_id
        ];
    END IF;
    
    IF 'approvals' = ANY(subscription_types) THEN
        subscription_channels := subscription_channels || ARRAY[
            'sop_approvals_' || user_restaurant_id
        ];
    END IF;
    
    IF 'completions' = ANY(subscription_types) THEN
        subscription_channels := subscription_channels || ARRAY[
            'sop_completions_' || user_restaurant_id
        ];
    END IF;
    
    IF 'dashboard' = ANY(subscription_types) THEN
        subscription_channels := subscription_channels || ARRAY[
            'dashboard_' || user_restaurant_id,
            'restaurant_' || user_restaurant_id
        ];
    END IF;
    
    -- Return subscription configuration
    result := jsonb_build_object(
        'user_id', user_id_param,
        'restaurant_id', user_restaurant_id,
        'subscription_channels', subscription_channels,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$;

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION notify_sop_event() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_dashboard_update() TO authenticated;
GRANT EXECUTE ON FUNCTION process_scheduled_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION send_overdue_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION manage_user_subscriptions(UUID, TEXT[]) TO authenticated;

-- ===========================================
-- SCHEDULED JOBS (CRON-LIKE FUNCTIONALITY)
-- ===========================================

-- Note: These would typically be set up as cron jobs or using pg_cron extension
-- For demonstration, here are the SQL commands that would be scheduled:

-- Run every 15 minutes to process scheduled assignments
-- SELECT process_scheduled_notifications();

-- Run every hour to send overdue reminders
-- SELECT send_overdue_reminders();

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON FUNCTION notify_sop_event() IS 'Real-time notification system for all SOP workflow events';
COMMENT ON FUNCTION notify_dashboard_update() IS 'Dashboard-specific notifications for analytics updates';
COMMENT ON FUNCTION process_scheduled_notifications() IS 'Processes recurring schedules and creates assignments';
COMMENT ON FUNCTION send_overdue_reminders() IS 'Automated reminder system for overdue assignments with escalation';
COMMENT ON FUNCTION manage_user_subscriptions(UUID, TEXT[]) IS 'Manages real-time subscription channels for users';

-- Real-time subscription channels documentation
COMMENT ON TRIGGER sop_documents_notify_trigger ON sop_documents IS 'Real-time notifications for SOP document changes';
COMMENT ON TRIGGER sop_assignments_notify_trigger ON sop_assignments IS 'Real-time notifications for assignment status changes';
COMMENT ON TRIGGER sop_completions_notify_trigger ON sop_completions IS 'Real-time notifications for completion events';
COMMENT ON TRIGGER sop_photos_notify_trigger ON sop_photos IS 'Real-time notifications for photo verification workflow';
COMMENT ON TRIGGER sop_approvals_notify_trigger ON sop_approvals IS 'Real-time notifications for approval workflow';

-- Performance and scalability notes
COMMENT ON TABLE sop_documents IS 'Real-time enabled for instant updates across tablet clients';
COMMENT ON TABLE sop_assignments IS 'Real-time notifications support concurrent tablet operations';
COMMENT ON TABLE sop_completions IS 'Real-time workflow updates for immediate manager visibility';