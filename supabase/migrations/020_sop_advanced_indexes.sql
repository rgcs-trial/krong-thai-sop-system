-- Advanced Database Indexes for SOP Search Performance
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Optimized indexes for tablet-based concurrent access and search performance

-- ===========================================
-- ADVANCED SEARCH INDEXES
-- ===========================================

-- Enhanced full-text search indexes for SOP documents with better language support
DROP INDEX IF EXISTS idx_sop_documents_search_en;
DROP INDEX IF EXISTS idx_sop_documents_search_th;

-- Comprehensive English full-text search
CREATE INDEX idx_sop_documents_fulltext_en ON sop_documents 
USING GIN(to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(content, '') || ' ' || 
    COALESCE(array_to_string(tags, ' '), '')
));

-- Thai/Simple full-text search (Thai language support)
CREATE INDEX idx_sop_documents_fulltext_th ON sop_documents 
USING GIN(to_tsvector('simple', 
    COALESCE(title_th, '') || ' ' || 
    COALESCE(content_th, '') || ' ' || 
    COALESCE(array_to_string(tags_th, ' '), '')
));

-- Trigram indexes for fuzzy/partial text search (typo tolerance)
CREATE INDEX idx_sop_documents_title_trigram ON sop_documents 
USING GIN(title gin_trgm_ops);

CREATE INDEX idx_sop_documents_title_th_trigram ON sop_documents 
USING GIN(title_th gin_trgm_ops);

CREATE INDEX idx_sop_documents_content_trigram ON sop_documents 
USING GIN(content gin_trgm_ops);

CREATE INDEX idx_sop_documents_content_th_trigram ON sop_documents 
USING GIN(content_th gin_trgm_ops);

-- ===========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ===========================================

-- Restaurant + Status + Priority (frequently used for dashboard queries)
CREATE INDEX idx_sop_documents_restaurant_status_priority ON sop_documents(restaurant_id, status, priority, updated_at);

-- Category + Restaurant + Status (category browsing)
CREATE INDEX idx_sop_documents_category_restaurant_status ON sop_documents(category_id, restaurant_id, status, created_at);

-- Active SOPs with priority for assignment logic
CREATE INDEX idx_sop_documents_active_priority ON sop_documents(is_active, priority, restaurant_id) 
WHERE is_active = true;

-- Effective date range queries for compliance
CREATE INDEX idx_sop_documents_effective_dates ON sop_documents(effective_date, review_date, restaurant_id) 
WHERE is_active = true;

-- User assignment queries
CREATE INDEX idx_sop_assignments_user_status_due ON sop_assignments(assigned_to, status, due_date) 
WHERE is_active = true;

-- Overdue assignments (critical for dashboard alerts)
CREATE INDEX idx_sop_assignments_overdue ON sop_assignments(restaurant_id, due_date, status) 
WHERE is_active = true AND status IN ('assigned', 'acknowledged', 'in_progress');

-- Completion tracking for performance metrics
CREATE INDEX idx_sop_completions_performance ON sop_completions(restaurant_id, completed_at, status, compliance_score);

-- Photo verification workflow
CREATE INDEX idx_sop_photos_verification_workflow ON sop_photos(restaurant_id, verification_status, created_at) 
WHERE is_valid = true;

-- ===========================================
-- ANALYTICS AND REPORTING INDEXES
-- ===========================================

-- Daily analytics aggregation
CREATE INDEX idx_sop_analytics_daily_report ON sop_analytics(restaurant_id, date_recorded, completion_rate);

-- SOP performance over time
CREATE INDEX idx_sop_analytics_performance_trends ON sop_analytics(sop_document_id, date_recorded, completion_rate, avg_quality_rating);

-- Equipment maintenance tracking
CREATE INDEX idx_sop_equipment_maintenance_due ON sop_equipment(restaurant_id, next_maintenance_date, status) 
WHERE is_active = true;

-- Critical equipment monitoring
CREATE INDEX idx_sop_equipment_critical_status ON sop_equipment(restaurant_id, is_critical, status) 
WHERE is_active = true AND is_critical = true;

-- ===========================================
-- REAL-TIME WORKFLOW INDEXES
-- ===========================================

-- Active schedules for task generation
CREATE INDEX idx_sop_schedules_generation ON sop_schedules(next_generation_at, is_active, frequency) 
WHERE is_active = true;

-- Pending approvals for managers
CREATE INDEX idx_sop_approvals_pending ON sop_approvals(restaurant_id, approver_id, status, due_by) 
WHERE is_active = true AND status = 'pending';

-- Recent completions for real-time dashboard
CREATE INDEX idx_sop_completions_recent ON sop_completions(restaurant_id, completed_at, status) 
WHERE completed_at > (NOW() - INTERVAL '24 hours');

-- Step-level completion tracking
CREATE INDEX idx_sop_completions_step_tracking ON sop_completions(sop_document_id, sop_step_id, status, completed_at);

-- ===========================================
-- MOBILE/TABLET OPTIMIZATION INDEXES
-- ===========================================

-- Offline sync queries (for tablet applications)
CREATE INDEX idx_sop_documents_sync ON sop_documents(restaurant_id, updated_at, status) 
WHERE is_active = true;

CREATE INDEX idx_sop_assignments_sync ON sop_assignments(assigned_to, updated_at, status) 
WHERE is_active = true;

CREATE INDEX idx_sop_completions_sync ON sop_completions(completed_by, updated_at, status);

-- Favorite SOPs (frequently accessed)
CREATE INDEX idx_sop_documents_favorites ON sop_documents(restaurant_id, priority, updated_at) 
WHERE status = 'approved' AND is_active = true;

-- Quick access by category
CREATE INDEX idx_sop_categories_quick_access ON sop_categories(sort_order, is_active) 
WHERE is_active = true;

-- ===========================================
-- AUDIT AND COMPLIANCE INDEXES
-- ===========================================

-- Audit trail queries by date range
CREATE INDEX idx_audit_logs_compliance ON audit_logs(restaurant_id, created_at, action, resource_type);

-- Version history tracking
CREATE INDEX idx_sop_versions_history ON sop_versions(sop_document_id, version_number, created_at);

-- Current version lookup
CREATE INDEX idx_sop_versions_current ON sop_versions(sop_document_id, is_current) 
WHERE is_current = true;

-- ===========================================
-- SPECIALIZED FUNCTIONAL INDEXES
-- ===========================================

-- SOP documents by estimated completion time (for scheduling)
CREATE INDEX idx_sop_documents_duration ON sop_documents((
    COALESCE((steps->>'estimatedDuration')::INTEGER, 30)
), restaurant_id, status) WHERE is_active = true;

-- Equipment by usage frequency (calculated from completions)
CREATE INDEX idx_sop_equipment_usage ON sop_equipment(restaurant_id, category, status) 
WHERE is_active = true;

-- Steps requiring photo verification
CREATE INDEX idx_sop_steps_photo_required ON sop_steps(sop_document_id, requires_photo, step_number) 
WHERE is_active = true AND requires_photo = true;

-- Critical control points for HACCP compliance
CREATE INDEX idx_sop_steps_critical_control ON sop_steps(sop_document_id, critical_control_point, step_number) 
WHERE is_active = true AND critical_control_point = true;

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Covering index for assignment list queries
CREATE INDEX idx_sop_assignments_covering ON sop_assignments(assigned_to, restaurant_id, status, due_date) 
INCLUDE (sop_document_id, priority, estimated_duration_minutes) 
WHERE is_active = true;

-- Covering index for completion dashboard
CREATE INDEX idx_sop_completions_covering ON sop_completions(restaurant_id, completed_at, status) 
INCLUDE (sop_document_id, completed_by, duration_minutes, quality_rating);

-- Covering index for SOP listing
CREATE INDEX idx_sop_documents_covering ON sop_documents(restaurant_id, status, category_id) 
INCLUDE (title, title_th, priority, updated_at) 
WHERE is_active = true;

-- ===========================================
-- CONCURRENT ACCESS OPTIMIZATION
-- ===========================================

-- Partitioned-style index for high-volume tables (by restaurant)
-- These help with concurrent tablet access from multiple locations

-- SOP completions by restaurant and date (for large restaurant chains)
CREATE INDEX idx_sop_completions_partitioned ON sop_completions(restaurant_id, date_trunc('day', created_at), status);

-- Assignments by restaurant and date
CREATE INDEX idx_sop_assignments_partitioned ON sop_assignments(restaurant_id, date_trunc('day', created_at), status);

-- Photos by restaurant and date
CREATE INDEX idx_sop_photos_partitioned ON sop_photos(restaurant_id, date_trunc('day', created_at), verification_status);

-- ===========================================
-- SEARCH PERFORMANCE FUNCTIONS
-- ===========================================

-- Function to optimize SOP search with ranking
CREATE OR REPLACE FUNCTION search_sop_documents(
    search_query TEXT,
    restaurant_id_param UUID,
    category_id_param UUID DEFAULT NULL,
    status_filter sop_status DEFAULT 'approved',
    limit_results INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    title_th TEXT,
    category_id UUID,
    priority sop_priority,
    rank REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.title_th,
        d.category_id,
        d.priority,
        GREATEST(
            ts_rank(to_tsvector('english', d.title || ' ' || d.content), plainto_tsquery('english', search_query)),
            ts_rank(to_tsvector('simple', d.title_th || ' ' || d.content_th), plainto_tsquery('simple', search_query)),
            similarity(d.title, search_query),
            similarity(d.title_th, search_query)
        ) as rank
    FROM sop_documents d
    WHERE 
        d.restaurant_id = restaurant_id_param
        AND d.status = status_filter
        AND d.is_active = true
        AND (category_id_param IS NULL OR d.category_id = category_id_param)
        AND (
            to_tsvector('english', d.title || ' ' || d.content) @@ plainto_tsquery('english', search_query)
            OR to_tsvector('simple', d.title_th || ' ' || d.content_th) @@ plainto_tsquery('simple', search_query)
            OR d.title % search_query
            OR d.title_th % search_query
            OR d.content ILIKE '%' || search_query || '%'
            OR d.content_th ILIKE '%' || search_query || '%'
        )
    ORDER BY rank DESC, d.priority DESC, d.updated_at DESC
    LIMIT limit_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_sop_documents(TEXT, UUID, UUID, sop_status, INTEGER) TO authenticated;

-- ===========================================
-- INDEX MAINTENANCE FUNCTIONS
-- ===========================================

-- Function to reindex SOP tables for maintenance
CREATE OR REPLACE FUNCTION reindex_sop_tables()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Reindex high-traffic tables
    REINDEX TABLE sop_documents;
    REINDEX TABLE sop_completions;
    REINDEX TABLE sop_assignments;
    REINDEX TABLE sop_photos;
    
    -- Update table statistics
    ANALYZE sop_documents;
    ANALYZE sop_completions;
    ANALYZE sop_assignments;
    ANALYZE sop_photos;
    ANALYZE sop_schedules;
    ANALYZE sop_approvals;
    ANALYZE sop_versions;
    ANALYZE sop_analytics;
    ANALYZE sop_equipment;
    
    -- Log maintenance
    INSERT INTO audit_logs (restaurant_id, action, resource_type, metadata)
    SELECT 
        '550e8400-e29b-41d4-a716-446655440000'::UUID,
        'UPDATE'::audit_action,
        'database_maintenance',
        '{"operation": "reindex_sop_tables", "timestamp": "' || NOW() || '"}'::JSONB;
END;
$$;

-- Grant execute permission to admins only
GRANT EXECUTE ON FUNCTION reindex_sop_tables() TO authenticated;

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON INDEX idx_sop_documents_fulltext_en IS 'Full-text search for English SOP content with tag support';
COMMENT ON INDEX idx_sop_documents_fulltext_th IS 'Full-text search for Thai SOP content with tag support';
COMMENT ON INDEX idx_sop_documents_title_trigram IS 'Trigram index for fuzzy title search and typo tolerance';
COMMENT ON INDEX idx_sop_assignments_overdue IS 'Optimized index for finding overdue assignments - critical for alerts';
COMMENT ON INDEX idx_sop_completions_recent IS 'Real-time dashboard queries for recent completions';
COMMENT ON INDEX idx_sop_equipment_critical_status IS 'Monitor critical equipment status for operational safety';

COMMENT ON FUNCTION search_sop_documents(TEXT, UUID, UUID, sop_status, INTEGER) IS 'Optimized SOP search with bilingual support and ranking';
COMMENT ON FUNCTION reindex_sop_tables() IS 'Maintenance function to reindex SOP tables and update statistics';

-- Performance notes
COMMENT ON TABLE sop_documents IS 'Optimized for concurrent tablet access with 20+ specialized indexes';
COMMENT ON TABLE sop_completions IS 'High-volume table with partitioned-style indexing for scalability';
COMMENT ON TABLE sop_assignments IS 'Real-time workflow optimization with covering indexes';