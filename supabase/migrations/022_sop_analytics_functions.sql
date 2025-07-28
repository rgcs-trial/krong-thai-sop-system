-- SOP Analytics and Calculation Functions
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Advanced analytics calculations for SOP performance, compliance, and insights

-- ===========================================
-- CORE ANALYTICS CALCULATION FUNCTIONS
-- ===========================================

-- Function to calculate comprehensive SOP performance metrics
CREATE OR REPLACE FUNCTION calculate_sop_performance_metrics(
    restaurant_id_param UUID,
    sop_document_id_param UUID DEFAULT NULL,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    sop_document_id UUID,
    sop_title TEXT,
    sop_title_th TEXT,
    category_name TEXT,
    total_assignments BIGINT,
    completed_assignments BIGINT,
    overdue_assignments BIGINT,
    completion_rate DECIMAL,
    on_time_completion_rate DECIMAL,
    avg_completion_time_minutes DECIMAL,
    avg_quality_rating DECIMAL,
    avg_compliance_score DECIMAL,
    total_photos_required BIGINT,
    total_photos_uploaded BIGINT,
    photo_compliance_rate DECIMAL,
    critical_failures BIGINT,
    escalations BIGINT,
    unique_completers BIGINT,
    performance_score DECIMAL,
    risk_level TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH sop_metrics AS (
        SELECT 
            d.id as document_id,
            d.title,
            d.title_th,
            c.name as category_name,
            
            -- Assignment metrics
            COUNT(DISTINCT a.id) as total_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'overdue' THEN a.id END) as overdue_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.completed_at <= a.due_date THEN a.id END) as on_time_completions,
            
            -- Completion metrics
            COUNT(DISTINCT sc.id) as total_completions,
            AVG(sc.duration_minutes) as avg_duration,
            AVG(sc.quality_rating) as avg_quality,
            AVG(sc.compliance_score) as avg_compliance,
            COUNT(DISTINCT CASE WHEN sc.status = 'failed' THEN sc.id END) as critical_failures,
            COUNT(DISTINCT CASE WHEN a.escalation_level > 0 THEN a.id END) as escalations,
            COUNT(DISTINCT sc.completed_by) as unique_completers,
            
            -- Photo metrics
            COUNT(DISTINCT CASE WHEN s.requires_photo = true THEN s.id END) as photo_required_steps,
            COUNT(DISTINCT p.id) as photos_uploaded,
            COUNT(DISTINCT CASE WHEN p.verification_status = 'approved' THEN p.id END) as photos_approved
            
        FROM sop_documents d
        LEFT JOIN sop_categories c ON d.category_id = c.id
        LEFT JOIN sop_assignments a ON d.id = a.sop_document_id 
            AND a.restaurant_id = restaurant_id_param
            AND DATE(a.created_at) BETWEEN start_date AND end_date
        LEFT JOIN sop_completions sc ON d.id = sc.sop_document_id 
            AND sc.restaurant_id = restaurant_id_param
            AND DATE(sc.completed_at) BETWEEN start_date AND end_date
        LEFT JOIN sop_steps s ON d.id = s.sop_document_id AND s.is_active = true
        LEFT JOIN sop_photos p ON sc.id = p.sop_completion_id 
            AND DATE(p.created_at) BETWEEN start_date AND end_date
        WHERE 
            d.restaurant_id = restaurant_id_param
            AND d.is_active = true
            AND (sop_document_id_param IS NULL OR d.id = sop_document_id_param)
        GROUP BY d.id, d.title, d.title_th, c.name
    )
    SELECT 
        sm.document_id,
        sm.title,
        sm.title_th,
        sm.category_name,
        sm.total_assignments,
        sm.completed_assignments,
        sm.overdue_assignments,
        
        -- Completion rate
        CASE 
            WHEN sm.total_assignments > 0 THEN 
                ROUND((sm.completed_assignments::DECIMAL / sm.total_assignments) * 100, 2)
            ELSE 0
        END as completion_rate,
        
        -- On-time completion rate
        CASE 
            WHEN sm.total_assignments > 0 THEN 
                ROUND((sm.on_time_completions::DECIMAL / sm.total_assignments) * 100, 2)
            ELSE 0
        END as on_time_completion_rate,
        
        ROUND(sm.avg_duration, 2) as avg_completion_time_minutes,
        ROUND(sm.avg_quality, 2) as avg_quality_rating,
        ROUND(sm.avg_compliance, 2) as avg_compliance_score,
        
        sm.photo_required_steps as total_photos_required,
        sm.photos_uploaded as total_photos_uploaded,
        
        -- Photo compliance rate
        CASE 
            WHEN sm.photo_required_steps > 0 THEN 
                ROUND((sm.photos_approved::DECIMAL / sm.photo_required_steps) * 100, 2)
            ELSE 100
        END as photo_compliance_rate,
        
        sm.critical_failures,
        sm.escalations,
        sm.unique_completers,
        
        -- Performance score (weighted average)
        ROUND(
            (
                COALESCE((sm.completed_assignments::DECIMAL / NULLIF(sm.total_assignments, 0)) * 40, 0) +
                COALESCE((sm.on_time_completions::DECIMAL / NULLIF(sm.total_assignments, 0)) * 30, 0) +
                COALESCE(sm.avg_compliance * 20, 0) +
                COALESCE((sm.avg_quality / 5) * 10, 0)
            ), 2
        ) as performance_score,
        
        -- Risk level assessment
        CASE 
            WHEN sm.critical_failures > 0 OR sm.avg_compliance < 0.7 THEN 'HIGH'
            WHEN sm.overdue_assignments > sm.completed_assignments OR sm.avg_compliance < 0.85 THEN 'MEDIUM'
            ELSE 'LOW'
        END as risk_level
        
    FROM sop_metrics sm
    ORDER BY sm.title;
END;
$$;

-- Function to calculate staff performance metrics
CREATE OR REPLACE FUNCTION calculate_staff_sop_performance(
    restaurant_id_param UUID,
    user_id_param UUID DEFAULT NULL,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    full_name_th TEXT,
    role user_role,
    total_assignments BIGINT,
    completed_assignments BIGINT,
    overdue_assignments BIGINT,
    completion_rate DECIMAL,
    on_time_rate DECIMAL,
    avg_completion_time_minutes DECIMAL,
    avg_quality_rating DECIMAL,
    avg_compliance_score DECIMAL,
    photos_uploaded BIGINT,
    critical_violations BIGINT,
    performance_score DECIMAL,
    consistency_score DECIMAL,
    improvement_trend DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH staff_metrics AS (
        SELECT 
            u.id as user_id,
            u.full_name,
            u.full_name_th,
            u.role,
            
            COUNT(DISTINCT a.id) as total_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'overdue' THEN a.id END) as overdue_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.completed_at <= a.due_date THEN a.id END) as on_time_completions,
            
            AVG(sc.duration_minutes) as avg_duration,
            AVG(sc.quality_rating) as avg_quality,
            AVG(sc.compliance_score) as avg_compliance,
            
            COUNT(DISTINCT p.id) as photos_uploaded,
            COUNT(DISTINCT CASE WHEN sc.status = 'failed' OR sc.compliance_score < 0.7 THEN sc.id END) as critical_violations,
            
            -- Recent performance (last 7 days)
            AVG(CASE 
                WHEN sc.completed_at >= CURRENT_DATE - INTERVAL '7 days' 
                THEN sc.compliance_score 
            END) as recent_compliance,
            
            -- Earlier performance (8-30 days ago)
            AVG(CASE 
                WHEN sc.completed_at BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE - INTERVAL '8 days'
                THEN sc.compliance_score 
            END) as earlier_compliance,
            
            -- Consistency calculation (standard deviation of compliance scores)
            STDDEV(sc.compliance_score) as compliance_stddev
            
        FROM auth_users u
        LEFT JOIN sop_assignments a ON u.id = a.assigned_to 
            AND a.restaurant_id = restaurant_id_param
            AND DATE(a.created_at) BETWEEN start_date AND end_date
        LEFT JOIN sop_completions sc ON u.id = sc.completed_by 
            AND sc.restaurant_id = restaurant_id_param
            AND DATE(sc.completed_at) BETWEEN start_date AND end_date
        LEFT JOIN sop_photos p ON sc.id = p.sop_completion_id 
            AND u.id = p.uploaded_by
            AND DATE(p.created_at) BETWEEN start_date AND end_date
        WHERE 
            u.restaurant_id = restaurant_id_param
            AND u.is_active = true
            AND (user_id_param IS NULL OR u.id = user_id_param)
            AND u.role != 'admin' -- Exclude system admins
        GROUP BY u.id, u.full_name, u.full_name_th, u.role
    )
    SELECT 
        sm.user_id,
        sm.full_name,
        sm.full_name_th,
        sm.role,
        sm.total_assignments,
        sm.completed_assignments,
        sm.overdue_assignments,
        
        -- Completion rate
        CASE 
            WHEN sm.total_assignments > 0 THEN 
                ROUND((sm.completed_assignments::DECIMAL / sm.total_assignments) * 100, 2)
            ELSE 0
        END as completion_rate,
        
        -- On-time rate
        CASE 
            WHEN sm.total_assignments > 0 THEN 
                ROUND((sm.on_time_completions::DECIMAL / sm.total_assignments) * 100, 2)
            ELSE 0
        END as on_time_rate,
        
        ROUND(sm.avg_duration, 2) as avg_completion_time_minutes,
        ROUND(sm.avg_quality, 2) as avg_quality_rating,
        ROUND(sm.avg_compliance, 2) as avg_compliance_score,
        sm.photos_uploaded,
        sm.critical_violations,
        
        -- Performance score
        ROUND(
            (
                COALESCE((sm.completed_assignments::DECIMAL / NULLIF(sm.total_assignments, 0)) * 30, 0) +
                COALESCE((sm.on_time_completions::DECIMAL / NULLIF(sm.total_assignments, 0)) * 25, 0) +
                COALESCE(sm.avg_compliance * 30, 0) +
                COALESCE((sm.avg_quality / 5) * 15, 0)
            ), 2
        ) as performance_score,
        
        -- Consistency score (inverse of standard deviation, normalized)
        ROUND(
            CASE 
                WHEN sm.compliance_stddev IS NOT NULL AND sm.compliance_stddev > 0 
                THEN (1 - LEAST(sm.compliance_stddev, 1)) * 100
                ELSE 100
            END, 2
        ) as consistency_score,
        
        -- Improvement trend (recent vs earlier performance)
        ROUND(
            CASE 
                WHEN sm.recent_compliance IS NOT NULL AND sm.earlier_compliance IS NOT NULL 
                THEN ((sm.recent_compliance - sm.earlier_compliance) / sm.earlier_compliance) * 100
                ELSE 0
            END, 2
        ) as improvement_trend
        
    FROM staff_metrics sm
    WHERE sm.total_assignments > 0 -- Only include staff with assignments
    ORDER BY sm.full_name;
END;
$$;

-- Function to calculate restaurant-wide analytics dashboard
CREATE OR REPLACE FUNCTION calculate_restaurant_dashboard_metrics(
    restaurant_id_param UUID,
    period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    metric_name TEXT,
    current_value DECIMAL,
    previous_value DECIMAL,
    change_percentage DECIMAL,
    trend TEXT,
    status TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    current_start DATE := CURRENT_DATE - INTERVAL '1 day' * period_days;
    current_end DATE := CURRENT_DATE;
    previous_start DATE := CURRENT_DATE - INTERVAL '1 day' * (period_days * 2);
    previous_end DATE := current_start;
BEGIN
    RETURN QUERY
    WITH current_metrics AS (
        SELECT 
            COUNT(DISTINCT a.id) as total_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'overdue' THEN a.id END) as overdue_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.completed_at <= a.due_date THEN a.id END) as on_time_completions,
            AVG(sc.compliance_score) as avg_compliance,
            AVG(sc.quality_rating) as avg_quality,
            AVG(sc.duration_minutes) as avg_duration,
            COUNT(DISTINCT CASE WHEN sc.status = 'failed' THEN sc.id END) as critical_failures,
            COUNT(DISTINCT sc.completed_by) as active_staff,
            COUNT(DISTINCT p.id) as photos_uploaded,
            COUNT(DISTINCT CASE WHEN p.verification_status = 'approved' THEN p.id END) as photos_approved
        FROM sop_assignments a
        LEFT JOIN sop_completions sc ON a.completion_id = sc.id
        LEFT JOIN sop_photos p ON sc.id = p.sop_completion_id
        WHERE 
            a.restaurant_id = restaurant_id_param
            AND DATE(a.created_at) BETWEEN current_start AND current_end
    ),
    previous_metrics AS (
        SELECT 
            COUNT(DISTINCT a.id) as total_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'overdue' THEN a.id END) as overdue_assignments,
            COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.completed_at <= a.due_date THEN a.id END) as on_time_completions,
            AVG(sc.compliance_score) as avg_compliance,
            AVG(sc.quality_rating) as avg_quality,
            AVG(sc.duration_minutes) as avg_duration,
            COUNT(DISTINCT CASE WHEN sc.status = 'failed' THEN sc.id END) as critical_failures,
            COUNT(DISTINCT sc.completed_by) as active_staff,
            COUNT(DISTINCT p.id) as photos_uploaded,
            COUNT(DISTINCT CASE WHEN p.verification_status = 'approved' THEN p.id END) as photos_approved
        FROM sop_assignments a
        LEFT JOIN sop_completions sc ON a.completion_id = sc.id
        LEFT JOIN sop_photos p ON sc.id = p.sop_completion_id
        WHERE 
            a.restaurant_id = restaurant_id_param
            AND DATE(a.created_at) BETWEEN previous_start AND previous_end
    )
    SELECT 
        'Total Assignments'::TEXT,
        cm.total_assignments::DECIMAL,
        pm.total_assignments::DECIMAL,
        CASE WHEN pm.total_assignments > 0 THEN 
            ROUND(((cm.total_assignments - pm.total_assignments)::DECIMAL / pm.total_assignments) * 100, 2)
        ELSE 0 END,
        CASE WHEN cm.total_assignments > pm.total_assignments THEN 'UP' ELSE 'DOWN' END,
        'INFO'
    FROM current_metrics cm, previous_metrics pm
    
    UNION ALL
    
    SELECT 
        'Completion Rate %'::TEXT,
        CASE WHEN cm.total_assignments > 0 THEN 
            ROUND((cm.completed_assignments::DECIMAL / cm.total_assignments) * 100, 2)
        ELSE 0 END,
        CASE WHEN pm.total_assignments > 0 THEN 
            ROUND((pm.completed_assignments::DECIMAL / pm.total_assignments) * 100, 2)
        ELSE 0 END,
        CASE WHEN pm.completed_assignments > 0 AND pm.total_assignments > 0 THEN 
            ROUND(((cm.completed_assignments::DECIMAL / cm.total_assignments) - 
                   (pm.completed_assignments::DECIMAL / pm.total_assignments)) * 100, 2)
        ELSE 0 END,
        CASE WHEN (cm.completed_assignments::DECIMAL / NULLIF(cm.total_assignments, 0)) > 
                  (pm.completed_assignments::DECIMAL / NULLIF(pm.total_assignments, 0)) THEN 'UP' ELSE 'DOWN' END,
        CASE WHEN cm.total_assignments > 0 AND (cm.completed_assignments::DECIMAL / cm.total_assignments) < 0.8 
             THEN 'WARNING' ELSE 'SUCCESS' END
    FROM current_metrics cm, previous_metrics pm
    
    UNION ALL
    
    SELECT 
        'On-Time Rate %'::TEXT,
        CASE WHEN cm.total_assignments > 0 THEN 
            ROUND((cm.on_time_completions::DECIMAL / cm.total_assignments) * 100, 2)
        ELSE 0 END,
        CASE WHEN pm.total_assignments > 0 THEN 
            ROUND((pm.on_time_completions::DECIMAL / pm.total_assignments) * 100, 2)
        ELSE 0 END,
        CASE WHEN pm.on_time_completions > 0 AND pm.total_assignments > 0 THEN 
            ROUND(((cm.on_time_completions::DECIMAL / cm.total_assignments) - 
                   (pm.on_time_completions::DECIMAL / pm.total_assignments)) * 100, 2)
        ELSE 0 END,
        CASE WHEN (cm.on_time_completions::DECIMAL / NULLIF(cm.total_assignments, 0)) > 
                  (pm.on_time_completions::DECIMAL / NULLIF(pm.total_assignments, 0)) THEN 'UP' ELSE 'DOWN' END,
        CASE WHEN cm.total_assignments > 0 AND (cm.on_time_completions::DECIMAL / cm.total_assignments) < 0.9 
             THEN 'WARNING' ELSE 'SUCCESS' END
    FROM current_metrics cm, previous_metrics pm
    
    UNION ALL
    
    SELECT 
        'Average Compliance Score'::TEXT,
        ROUND(COALESCE(cm.avg_compliance, 0), 2),
        ROUND(COALESCE(pm.avg_compliance, 0), 2),
        CASE WHEN pm.avg_compliance > 0 THEN 
            ROUND(((cm.avg_compliance - pm.avg_compliance) / pm.avg_compliance) * 100, 2)
        ELSE 0 END,
        CASE WHEN cm.avg_compliance > pm.avg_compliance THEN 'UP' ELSE 'DOWN' END,
        CASE WHEN cm.avg_compliance < 0.8 THEN 'ERROR' 
             WHEN cm.avg_compliance < 0.9 THEN 'WARNING' 
             ELSE 'SUCCESS' END
    FROM current_metrics cm, previous_metrics pm
    
    UNION ALL
    
    SELECT 
        'Critical Failures'::TEXT,
        cm.critical_failures::DECIMAL,
        pm.critical_failures::DECIMAL,
        CASE WHEN pm.critical_failures > 0 THEN 
            ROUND(((cm.critical_failures - pm.critical_failures)::DECIMAL / pm.critical_failures) * 100, 2)
        ELSE 0 END,
        CASE WHEN cm.critical_failures < pm.critical_failures THEN 'UP' ELSE 'DOWN' END,
        CASE WHEN cm.critical_failures > 5 THEN 'ERROR'
             WHEN cm.critical_failures > 2 THEN 'WARNING'
             ELSE 'SUCCESS' END
    FROM current_metrics cm, previous_metrics pm
    
    UNION ALL
    
    SELECT 
        'Active Staff Count'::TEXT,
        cm.active_staff::DECIMAL,
        pm.active_staff::DECIMAL,
        CASE WHEN pm.active_staff > 0 THEN 
            ROUND(((cm.active_staff - pm.active_staff)::DECIMAL / pm.active_staff) * 100, 2)
        ELSE 0 END,
        CASE WHEN cm.active_staff > pm.active_staff THEN 'UP' ELSE 'DOWN' END,
        'INFO'
    FROM current_metrics cm, previous_metrics pm;
END;
$$;

-- Function to generate SOP compliance alerts
CREATE OR REPLACE FUNCTION generate_compliance_alerts(
    restaurant_id_param UUID,
    severity_threshold TEXT DEFAULT 'MEDIUM' -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
)
RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    sop_document_id UUID,
    sop_title TEXT,
    description TEXT,
    description_th TEXT,
    affected_count INTEGER,
    last_incident TIMESTAMPTZ,
    recommended_action TEXT,
    recommended_action_th TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    -- Overdue assignments alert
    SELECT 
        'OVERDUE_ASSIGNMENTS'::TEXT,
        CASE WHEN COUNT(*) > 10 THEN 'CRITICAL'
             WHEN COUNT(*) > 5 THEN 'HIGH'
             WHEN COUNT(*) > 2 THEN 'MEDIUM'
             ELSE 'LOW' END as severity,
        d.id,
        d.title,
        'Multiple overdue assignments detected'::TEXT,
        'พบงานที่เลยกำหนดหลายรายการ'::TEXT,
        COUNT(*)::INTEGER,
        MAX(a.due_date),
        'Reassign tasks or extend deadlines'::TEXT,
        'มอบหมายงานใหม่หรือขยายเวลา'::TEXT
    FROM sop_assignments a
    JOIN sop_documents d ON a.sop_document_id = d.id
    WHERE 
        a.restaurant_id = restaurant_id_param
        AND a.status = 'overdue'
        AND a.is_active = true
    GROUP BY d.id, d.title
    HAVING COUNT(*) > 0
    
    UNION ALL
    
    -- Low compliance scores alert
    SELECT 
        'LOW_COMPLIANCE'::TEXT,
        CASE WHEN AVG(sc.compliance_score) < 0.6 THEN 'CRITICAL'
             WHEN AVG(sc.compliance_score) < 0.7 THEN 'HIGH'
             WHEN AVG(sc.compliance_score) < 0.8 THEN 'MEDIUM'
             ELSE 'LOW' END as severity,
        d.id,
        d.title,
        'Low compliance scores in recent completions'::TEXT,
        'คะแนนการปฏิบัติตามต่ำในการทำงานล่าสุด'::TEXT,
        COUNT(sc.id)::INTEGER,
        MAX(sc.completed_at),
        'Review procedures and provide additional training'::TEXT,
        'ทบทวนขั้นตอนและให้การฝึกอบรมเพิ่มเติม'::TEXT
    FROM sop_completions sc
    JOIN sop_documents d ON sc.sop_document_id = d.id
    WHERE 
        sc.restaurant_id = restaurant_id_param
        AND sc.completed_at >= CURRENT_DATE - INTERVAL '7 days'
        AND sc.compliance_score IS NOT NULL
    GROUP BY d.id, d.title
    HAVING AVG(sc.compliance_score) < 0.85
    
    UNION ALL
    
    -- Critical failures alert
    SELECT 
        'CRITICAL_FAILURES'::TEXT,
        'CRITICAL'::TEXT,
        d.id,
        d.title,
        'Critical control point failures detected'::TEXT,
        'พบความล้มเหลวในจุดควบคุมวิกฤต'::TEXT,
        COUNT(sc.id)::INTEGER,
        MAX(sc.completed_at),
        'Immediate investigation and corrective action required'::TEXT,
        'ต้องการการตรวจสอบและการแก้ไขทันที'::TEXT
    FROM sop_completions sc
    JOIN sop_documents d ON sc.sop_document_id = d.id
    JOIN sop_steps s ON d.id = s.sop_document_id
    WHERE 
        sc.restaurant_id = restaurant_id_param
        AND sc.completed_at >= CURRENT_DATE - INTERVAL '24 hours'
        AND sc.status = 'failed'
        AND s.critical_control_point = true
    GROUP BY d.id, d.title
    HAVING COUNT(sc.id) > 0
    
    UNION ALL
    
    -- Missing photo verification alert
    SELECT 
        'MISSING_PHOTOS'::TEXT,
        CASE WHEN COUNT(*) > 5 THEN 'HIGH'
             WHEN COUNT(*) > 2 THEN 'MEDIUM'
             ELSE 'LOW' END as severity,
        d.id,
        d.title,
        'Required photo verifications missing'::TEXT,
        'การยืนยันด้วยภาพที่จำเป็นหายไป'::TEXT,
        COUNT(*)::INTEGER,
        MAX(sc.completed_at),
        'Follow up with staff for required photo documentation'::TEXT,
        'ติดตามพนักงานสำหรับเอกสารภาพที่จำเป็น'::TEXT
    FROM sop_completions sc
    JOIN sop_documents d ON sc.sop_document_id = d.id
    JOIN sop_steps s ON d.id = s.sop_document_id
    LEFT JOIN sop_photos p ON sc.id = p.sop_completion_id AND p.sop_step_id = s.id
    WHERE 
        sc.restaurant_id = restaurant_id_param
        AND sc.completed_at >= CURRENT_DATE - INTERVAL '3 days'
        AND s.requires_photo = true
        AND s.is_active = true
        AND p.id IS NULL -- No photo uploaded
    GROUP BY d.id, d.title
    HAVING COUNT(*) > 0;
END;
$$;

-- Function to calculate equipment utilization and maintenance alerts
CREATE OR REPLACE FUNCTION calculate_equipment_analytics(
    restaurant_id_param UUID
)
RETURNS TABLE (
    equipment_id UUID,
    equipment_name TEXT,
    equipment_name_th TEXT,
    category TEXT,
    status equipment_status,
    utilization_rate DECIMAL,
    maintenance_due_days INTEGER,
    usage_count BIGINT,
    last_used TIMESTAMPTZ,
    maintenance_cost_ytd DECIMAL,
    efficiency_score DECIMAL,
    alert_level TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.name_th,
        e.category,
        e.status,
        
        -- Utilization rate (based on SOP completions that used this equipment)
        CASE WHEN total_possible_uses.count > 0 THEN
            ROUND((actual_uses.count::DECIMAL / total_possible_uses.count) * 100, 2)
        ELSE 0 END as utilization_rate,
        
        -- Days until maintenance due
        CASE WHEN e.next_maintenance_date IS NOT NULL THEN
            (e.next_maintenance_date - CURRENT_DATE)::INTEGER
        ELSE NULL END as maintenance_due_days,
        
        COALESCE(actual_uses.count, 0) as usage_count,
        actual_uses.last_used,
        
        -- Placeholder for maintenance cost (would need maintenance_costs table)
        0.00 as maintenance_cost_ytd,
        
        -- Efficiency score based on utilization and condition
        ROUND(
            CASE 
                WHEN e.status = 'available' THEN 
                    COALESCE((actual_uses.count::DECIMAL / NULLIF(total_possible_uses.count, 0)) * 100, 50)
                WHEN e.status = 'maintenance' THEN 25
                WHEN e.status = 'out_of_order' THEN 0
                ELSE 50
            END, 2
        ) as efficiency_score,
        
        -- Alert level
        CASE 
            WHEN e.status = 'out_of_order' THEN 'CRITICAL'
            WHEN e.next_maintenance_date <= CURRENT_DATE THEN 'HIGH'
            WHEN e.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'MEDIUM'
            WHEN e.status = 'maintenance' THEN 'MEDIUM'
            ELSE 'LOW'
        END as alert_level
        
    FROM sop_equipment e
    
    -- Calculate actual equipment usage
    LEFT JOIN (
        SELECT 
            unnest(s.equipment_required) as equipment_id,
            COUNT(*) as count,
            MAX(sc.completed_at) as last_used
        FROM sop_steps s
        JOIN sop_completions sc ON s.sop_document_id = sc.sop_document_id
        WHERE 
            sc.restaurant_id = restaurant_id_param
            AND sc.completed_at >= CURRENT_DATE - INTERVAL '30 days'
            AND sc.status = 'completed'
        GROUP BY unnest(s.equipment_required)
    ) actual_uses ON e.id = actual_uses.equipment_id
    
    -- Calculate total possible uses (total completions for SOPs that require this equipment)
    LEFT JOIN (
        SELECT 
            unnest(s.equipment_required) as equipment_id,
            COUNT(DISTINCT sc.id) as count
        FROM sop_steps s
        JOIN sop_completions sc ON s.sop_document_id = sc.sop_document_id
        WHERE 
            sc.restaurant_id = restaurant_id_param
            AND sc.completed_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY unnest(s.equipment_required)
    ) total_possible_uses ON e.id = total_possible_uses.equipment_id
    
    WHERE e.restaurant_id = restaurant_id_param
    AND e.is_active = true
    ORDER BY e.name;
END;
$$;

-- ===========================================
-- GRANT EXECUTE PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION calculate_sop_performance_metrics(UUID, UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_staff_sop_performance(UUID, UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_restaurant_dashboard_metrics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_compliance_alerts(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_equipment_analytics(UUID) TO authenticated;

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON FUNCTION calculate_sop_performance_metrics(UUID, UUID, DATE, DATE) IS 'Comprehensive SOP performance analytics with completion rates, quality scores, and risk assessment';
COMMENT ON FUNCTION calculate_staff_sop_performance(UUID, UUID, DATE, DATE) IS 'Staff performance metrics including consistency and improvement trends';
COMMENT ON FUNCTION calculate_restaurant_dashboard_metrics(UUID, INTEGER) IS 'Restaurant-wide dashboard metrics with period comparison and trend analysis';
COMMENT ON FUNCTION generate_compliance_alerts(UUID, TEXT) IS 'Automated compliance monitoring with severity-based alerts for management attention';
COMMENT ON FUNCTION calculate_equipment_analytics(UUID) IS 'Equipment utilization tracking and maintenance scheduling analytics';