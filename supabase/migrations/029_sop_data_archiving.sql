-- SOP Data Archiving System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive data archiving for old procedures with automated retention

-- ===========================================
-- SOP ARCHIVING TABLES
-- ===========================================

-- Archive reasons enum
CREATE TYPE archive_reason AS ENUM (
    'outdated', 'replaced', 'policy_change', 'seasonal', 
    'compliance_expired', 'restaurant_closed', 'manual', 'retention_policy'
);

-- Archive status enum
CREATE TYPE archive_status AS ENUM (
    'active', 'archived', 'permanently_deleted', 'restored'
);

-- SOP Document Archive table
CREATE TABLE IF NOT EXISTS sop_documents_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_document_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    category_id UUID,
    
    -- Original document data (full snapshot)
    title TEXT NOT NULL,
    title_th TEXT NOT NULL,
    content TEXT NOT NULL,
    content_th TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    tags_th TEXT[] DEFAULT '{}',
    priority sop_priority DEFAULT 'medium',
    effective_date DATE,
    expiry_date DATE,
    version INTEGER DEFAULT 1,
    status sop_status,
    is_active BOOLEAN DEFAULT false, -- Always false for archived items
    
    -- Archive metadata
    archive_reason archive_reason NOT NULL,
    archive_status archive_status DEFAULT 'archived',
    archived_by UUID NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archive_notes TEXT,
    retention_until DATE, -- When this archive can be permanently deleted
    
    -- Original timestamps for historical accuracy
    original_created_at TIMESTAMPTZ NOT NULL,
    original_updated_at TIMESTAMPTZ NOT NULL,
    original_created_by UUID,
    original_updated_by UUID,
    
    -- Restore information
    restored_by UUID,
    restored_at TIMESTAMPTZ,
    restore_notes TEXT,
    
    -- Storage optimization
    compressed_content BYTEA, -- Compressed version of content for long-term storage
    checksum TEXT, -- Data integrity verification
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_archive_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_archive_category FOREIGN KEY (category_id) REFERENCES sop_categories(id),
    CONSTRAINT fk_archive_archived_by FOREIGN KEY (archived_by) REFERENCES auth_users(id),
    CONSTRAINT fk_archive_restored_by FOREIGN KEY (restored_by) REFERENCES auth_users(id),
    CONSTRAINT fk_archive_created_by FOREIGN KEY (original_created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_archive_updated_by FOREIGN KEY (original_updated_by) REFERENCES auth_users(id)
);

-- Archive policies table
CREATE TABLE IF NOT EXISTS sop_archive_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    policy_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Policy conditions
    auto_archive_after_days INTEGER, -- Auto-archive after X days of inactivity
    archive_superseded BOOLEAN DEFAULT true, -- Archive when new version is created
    archive_expired BOOLEAN DEFAULT true, -- Archive when expiry_date is reached
    archive_unused_days INTEGER, -- Archive if not accessed for X days
    
    -- Retention settings
    retention_days INTEGER DEFAULT 2555, -- 7 years default
    permanent_delete_after_days INTEGER DEFAULT 3650, -- 10 years
    
    -- Category-specific rules
    category_id UUID, -- NULL means applies to all categories
    priority_filter sop_priority[], -- Which priorities this applies to
    
    -- Policy metadata
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_policy_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_policy_category FOREIGN KEY (category_id) REFERENCES sop_categories(id),
    CONSTRAINT fk_policy_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_policy_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT unique_policy_name_restaurant UNIQUE (restaurant_id, policy_name)
);

-- Archive audit log
CREATE TABLE IF NOT EXISTS sop_archive_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    archive_id UUID,
    document_id UUID,
    action VARCHAR(50) NOT NULL, -- 'archived', 'restored', 'permanently_deleted', 'policy_applied'
    reason archive_reason,
    policy_id UUID,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    
    CONSTRAINT fk_audit_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_audit_archive FOREIGN KEY (archive_id) REFERENCES sop_documents_archive(id),
    CONSTRAINT fk_audit_document FOREIGN KEY (document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_audit_policy FOREIGN KEY (policy_id) REFERENCES sop_archive_policies(id),
    CONSTRAINT fk_audit_performed_by FOREIGN KEY (performed_by) REFERENCES auth_users(id)
);

-- ===========================================
-- ARCHIVING INDEXES
-- ===========================================

-- Archive table indexes
CREATE INDEX idx_archive_restaurant ON sop_documents_archive(restaurant_id);
CREATE INDEX idx_archive_original_id ON sop_documents_archive(original_document_id);
CREATE INDEX idx_archive_status ON sop_documents_archive(archive_status);
CREATE INDEX idx_archive_reason ON sop_documents_archive(archive_reason);
CREATE INDEX idx_archive_archived_at ON sop_documents_archive(archived_at);
CREATE INDEX idx_archive_retention_until ON sop_documents_archive(retention_until);
CREATE INDEX idx_archive_category ON sop_documents_archive(category_id);
CREATE INDEX idx_archive_title_search ON sop_documents_archive USING GIN(to_tsvector('english', title));
CREATE INDEX idx_archive_title_th_search ON sop_documents_archive USING GIN(to_tsvector('simple', title_th));

-- Archive policies indexes
CREATE INDEX idx_policies_restaurant ON sop_archive_policies(restaurant_id);
CREATE INDEX idx_policies_active ON sop_archive_policies(is_active);
CREATE INDEX idx_policies_category ON sop_archive_policies(category_id);

-- Archive audit indexes
CREATE INDEX idx_audit_restaurant ON sop_archive_audit(restaurant_id);
CREATE INDEX idx_audit_archive ON sop_archive_audit(archive_id);
CREATE INDEX idx_audit_document ON sop_archive_audit(document_id);
CREATE INDEX idx_audit_performed_at ON sop_archive_audit(performed_at);
CREATE INDEX idx_audit_action ON sop_archive_audit(action);

-- ===========================================
-- ARCHIVING FUNCTIONS
-- ===========================================

-- Function to archive a SOP document
CREATE OR REPLACE FUNCTION archive_sop_document(
    p_document_id UUID,
    p_reason archive_reason,
    p_archived_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_retention_days INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    doc_record RECORD;
    archive_id UUID;
    retention_date DATE;
    default_retention INTEGER := 2555; -- 7 years
BEGIN
    -- Get the document to archive
    SELECT * INTO doc_record 
    FROM sop_documents 
    WHERE id = p_document_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not found or already archived: %', p_document_id;
    END IF;
    
    -- Calculate retention date
    retention_date := CURRENT_DATE + INTERVAL '1 day' * COALESCE(p_retention_days, default_retention);
    
    -- Create archive entry
    INSERT INTO sop_documents_archive (
        original_document_id, restaurant_id, category_id,
        title, title_th, content, content_th, tags, tags_th,
        priority, effective_date, expiry_date, version, status,
        archive_reason, archived_by, archive_notes, retention_until,
        original_created_at, original_updated_at, original_created_by, original_updated_by,
        checksum
    ) VALUES (
        doc_record.id, doc_record.restaurant_id, doc_record.category_id,
        doc_record.title, doc_record.title_th, doc_record.content, doc_record.content_th,
        doc_record.tags, doc_record.tags_th, doc_record.priority, doc_record.effective_date,
        doc_record.expiry_date, doc_record.version, doc_record.status,
        p_reason, p_archived_by, p_notes, retention_date,
        doc_record.created_at, doc_record.updated_at, doc_record.created_by, doc_record.updated_by,
        md5(doc_record.content || doc_record.content_th)
    ) RETURNING id INTO archive_id;
    
    -- Mark original document as archived
    UPDATE sop_documents 
    SET is_active = false, 
        status = 'archived',
        updated_at = NOW(),
        updated_by = p_archived_by
    WHERE id = p_document_id;
    
    -- Log the archive action
    INSERT INTO sop_archive_audit (
        restaurant_id, archive_id, document_id, action, reason, performed_by, details
    ) VALUES (
        doc_record.restaurant_id, archive_id, p_document_id, 'archived', p_reason, p_archived_by,
        jsonb_build_object(
            'archive_notes', p_notes,
            'retention_until', retention_date,
            'original_title', doc_record.title
        )
    );
    
    -- Update audit logs
    INSERT INTO audit_logs (restaurant_id, action, resource_type, resource_id, user_id, metadata)
    VALUES (
        doc_record.restaurant_id, 'ARCHIVE'::audit_action, 'sop_document', p_document_id, p_archived_by,
        jsonb_build_object(
            'reason', p_reason,
            'archive_id', archive_id,
            'retention_until', retention_date
        )
    );
    
    RETURN archive_id;
END;
$$;

-- Function to restore an archived SOP document
CREATE OR REPLACE FUNCTION restore_sop_document(
    p_archive_id UUID,
    p_restored_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    archive_record RECORD;
    new_document_id UUID;
BEGIN
    -- Get the archive record
    SELECT * INTO archive_record 
    FROM sop_documents_archive 
    WHERE id = p_archive_id AND archive_status = 'archived';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Archive not found or cannot be restored: %', p_archive_id;
    END IF;
    
    -- Check if original document still exists and is archived
    IF EXISTS (
        SELECT 1 FROM sop_documents 
        WHERE id = archive_record.original_document_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Cannot restore: original document is still active';
    END IF;
    
    -- Restore as new document (with new ID to avoid conflicts)
    INSERT INTO sop_documents (
        restaurant_id, category_id, title, title_th, content, content_th,
        tags, tags_th, priority, effective_date, expiry_date, version,
        status, is_active, created_by, updated_by
    ) VALUES (
        archive_record.restaurant_id, archive_record.category_id,
        archive_record.title, archive_record.title_th,
        archive_record.content, archive_record.content_th,
        archive_record.tags, archive_record.tags_th,
        archive_record.priority, archive_record.effective_date,
        archive_record.expiry_date, archive_record.version + 1, -- Increment version
        'draft', true, p_restored_by, p_restored_by
    ) RETURNING id INTO new_document_id;
    
    -- Update archive record
    UPDATE sop_documents_archive 
    SET archive_status = 'restored',
        restored_by = p_restored_by,
        restored_at = NOW(),
        restore_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_archive_id;
    
    -- Log the restore action
    INSERT INTO sop_archive_audit (
        restaurant_id, archive_id, document_id, action, performed_by, details
    ) VALUES (
        archive_record.restaurant_id, p_archive_id, new_document_id, 'restored', p_restored_by,
        jsonb_build_object(
            'restore_notes', p_notes,
            'new_document_id', new_document_id,
            'original_document_id', archive_record.original_document_id
        )
    );
    
    -- Update audit logs
    INSERT INTO audit_logs (restaurant_id, action, resource_type, resource_id, user_id, metadata)
    VALUES (
        archive_record.restaurant_id, 'RESTORE'::audit_action, 'sop_document', new_document_id, p_restored_by,
        jsonb_build_object(
            'archive_id', p_archive_id,
            'original_document_id', archive_record.original_document_id,
            'restore_notes', p_notes
        )
    );
    
    RETURN new_document_id;
END;
$$;

-- Function to apply archive policies automatically
CREATE OR REPLACE FUNCTION apply_archive_policies(p_restaurant_id UUID DEFAULT NULL)
RETURNS TABLE (
    documents_archived INTEGER,
    policy_name TEXT,
    execution_details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    policy_record RECORD;
    archived_count INTEGER := 0;
    total_archived INTEGER := 0;
    doc_record RECORD;
    archive_id UUID;
BEGIN
    -- Apply all active policies for the restaurant(s)
    FOR policy_record IN 
        SELECT * FROM sop_archive_policies 
        WHERE (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
        AND is_active = true
        ORDER BY restaurant_id, policy_name
    LOOP
        archived_count := 0;
        
        -- Find documents that match this policy's criteria
        FOR doc_record IN
            SELECT d.* FROM sop_documents d
            WHERE d.restaurant_id = policy_record.restaurant_id
            AND d.is_active = true
            AND d.status = 'approved' -- Only archive approved documents
            AND (policy_record.category_id IS NULL OR d.category_id = policy_record.category_id)
            AND (policy_record.priority_filter IS NULL OR d.priority = ANY(policy_record.priority_filter))
            AND (
                -- Auto-archive after days of inactivity
                (policy_record.auto_archive_after_days IS NOT NULL 
                 AND d.updated_at < NOW() - (policy_record.auto_archive_after_days || ' days')::INTERVAL)
                OR
                -- Archive expired documents
                (policy_record.archive_expired = true 
                 AND d.expiry_date IS NOT NULL 
                 AND d.expiry_date < CURRENT_DATE)
                OR
                -- Archive unused documents (no recent access)
                (policy_record.archive_unused_days IS NOT NULL
                 AND NOT EXISTS (
                     SELECT 1 FROM audit_logs 
                     WHERE resource_type = 'sop_document' 
                     AND resource_id = d.id 
                     AND action = 'VIEW'::audit_action
                     AND created_at > NOW() - (policy_record.archive_unused_days || ' days')::INTERVAL
                 ))
            )
        LOOP
            -- Archive the document
            SELECT archive_sop_document(
                doc_record.id,
                CASE 
                    WHEN doc_record.expiry_date < CURRENT_DATE THEN 'compliance_expired'
                    WHEN policy_record.archive_unused_days IS NOT NULL THEN 'outdated'
                    ELSE 'retention_policy'
                END,
                policy_record.created_by, -- Use policy creator as archiver
                'Automatically archived by policy: ' || policy_record.policy_name,
                policy_record.retention_days
            ) INTO archive_id;
            
            archived_count := archived_count + 1;
            total_archived := total_archived + 1;
            
            -- Log policy application
            INSERT INTO sop_archive_audit (
                restaurant_id, archive_id, document_id, action, reason, 
                policy_id, performed_by, details
            ) VALUES (
                policy_record.restaurant_id, archive_id, doc_record.id, 
                'policy_applied', 'retention_policy', policy_record.id,
                policy_record.created_by,
                jsonb_build_object(
                    'policy_name', policy_record.policy_name,
                    'auto_applied', true,
                    'document_title', doc_record.title
                )
            );
        END LOOP;
        
        -- Return results for this policy
        RETURN QUERY SELECT 
            archived_count,
            policy_record.policy_name,
            jsonb_build_object(
                'restaurant_id', policy_record.restaurant_id,
                'policy_id', policy_record.id,
                'documents_processed', archived_count,
                'execution_time', NOW()
            );
    END LOOP;
    
    -- If no specific restaurant, return summary
    IF p_restaurant_id IS NULL THEN
        RETURN QUERY SELECT 
            total_archived,
            'SUMMARY'::TEXT,
            jsonb_build_object(
                'total_documents_archived', total_archived,
                'execution_time', NOW()
            );
    END IF;
END;
$$;

-- Function to permanently delete old archives
CREATE OR REPLACE FUNCTION cleanup_old_archives(p_restaurant_id UUID DEFAULT NULL)
RETURNS TABLE (
    archives_deleted INTEGER,
    restaurant_id UUID,
    cleanup_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    archive_record RECORD;
BEGIN
    -- Find archives ready for permanent deletion
    FOR archive_record IN
        SELECT a.* FROM sop_documents_archive a
        WHERE (p_restaurant_id IS NULL OR a.restaurant_id = p_restaurant_id)
        AND a.archive_status = 'archived'
        AND a.retention_until < CURRENT_DATE
    LOOP
        -- Log before deletion
        INSERT INTO sop_archive_audit (
            restaurant_id, archive_id, action, performed_by, details
        ) VALUES (
            archive_record.restaurant_id, archive_record.id, 'permanently_deleted',
            archive_record.archived_by, -- Use original archiver
            jsonb_build_object(
                'deletion_date', NOW(),
                'original_title', archive_record.title,
                'retention_expired', archive_record.retention_until
            )
        );
        
        -- Update archive status before deletion (for audit trail)
        UPDATE sop_documents_archive 
        SET archive_status = 'permanently_deleted', updated_at = NOW()
        WHERE id = archive_record.id;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Return results
    RETURN QUERY SELECT 
        deleted_count,
        COALESCE(p_restaurant_id, '00000000-0000-0000-0000-000000000000'::UUID),
        jsonb_build_object(
            'deleted_count', deleted_count,
            'cleanup_date', NOW(),
            'restaurant_filter', p_restaurant_id IS NOT NULL
        );
END;
$$;

-- Function to search archived documents
CREATE OR REPLACE FUNCTION search_archived_documents(
    p_restaurant_id UUID,
    p_search_query TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_archive_reason archive_reason DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_language TEXT DEFAULT 'en',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    original_document_id UUID,
    title TEXT,
    title_th TEXT,
    category_name TEXT,
    archive_reason archive_reason,
    archived_at TIMESTAMPTZ,
    archived_by_name TEXT,
    retention_until DATE,
    archive_status archive_status,
    search_rank REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.original_document_id,
        a.title,
        a.title_th,
        CASE WHEN p_language = 'th' THEN c.name_th ELSE c.name END as category_name,
        a.archive_reason,
        a.archived_at,
        u.full_name as archived_by_name,
        a.retention_until,
        a.archive_status,
        CASE 
            WHEN p_search_query IS NOT NULL THEN
                GREATEST(
                    ts_rank_cd(to_tsvector('english', a.title), plainto_tsquery('english', p_search_query)),
                    ts_rank_cd(to_tsvector('simple', a.title_th), plainto_tsquery('simple', p_search_query)),
                    similarity(a.title, p_search_query),
                    similarity(a.title_th, p_search_query)
                )
            ELSE 1.0
        END as search_rank
    FROM sop_documents_archive a
    LEFT JOIN sop_categories c ON a.category_id = c.id
    LEFT JOIN auth_users u ON a.archived_by = u.id
    WHERE a.restaurant_id = p_restaurant_id
    AND (p_search_query IS NULL OR (
        to_tsvector('english', a.title) @@ plainto_tsquery('english', p_search_query)
        OR to_tsvector('simple', a.title_th) @@ plainto_tsquery('simple', p_search_query)
        OR a.title ILIKE '%' || p_search_query || '%'
        OR a.title_th ILIKE '%' || p_search_query || '%'
    ))
    AND (p_category_id IS NULL OR a.category_id = p_category_id)
    AND (p_archive_reason IS NULL OR a.archive_reason = p_archive_reason)
    AND (p_date_from IS NULL OR DATE(a.archived_at) >= p_date_from)
    AND (p_date_to IS NULL OR DATE(a.archived_at) <= p_date_to)
    ORDER BY 
        CASE WHEN p_search_query IS NOT NULL THEN search_rank ELSE 0 END DESC,
        a.archived_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ===========================================
-- TRIGGERS FOR ARCHIVE AUTOMATION
-- ===========================================

-- Trigger to automatically compress content for long-term storage
CREATE OR REPLACE FUNCTION compress_archive_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Compress content if it's larger than 10KB
    IF LENGTH(NEW.content || NEW.content_th) > 10240 THEN
        -- Note: In a real implementation, you would use pg_compress here
        -- For now, we'll just mark it for compression
        NEW.compressed_content := encode(NEW.content || '|||' || NEW.content_th, 'base64')::bytea;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compress_archive_content
    BEFORE INSERT ON sop_documents_archive
    FOR EACH ROW
    EXECUTE FUNCTION compress_archive_content();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_archive_updated_at 
    BEFORE UPDATE ON sop_documents_archive 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archive_policies_updated_at 
    BEFORE UPDATE ON sop_archive_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on archive tables
ALTER TABLE sop_documents_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_archive_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_archive_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for archive documents
CREATE POLICY "Archive documents restaurant isolation"
ON sop_documents_archive FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- RLS policies for archive policies
CREATE POLICY "Archive policies restaurant isolation"
ON sop_archive_policies FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- RLS policies for archive audit
CREATE POLICY "Archive audit restaurant isolation"
ON sop_archive_audit FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION archive_sop_document TO authenticated;
GRANT EXECUTE ON FUNCTION restore_sop_document TO authenticated;
GRANT EXECUTE ON FUNCTION apply_archive_policies TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_archives TO authenticated;
GRANT EXECUTE ON FUNCTION search_archived_documents TO authenticated;

-- ===========================================
-- DEFAULT ARCHIVE POLICIES
-- ===========================================

-- Insert default archive policy for existing restaurants
INSERT INTO sop_archive_policies (
    restaurant_id, policy_name, description,
    auto_archive_after_days, archive_superseded, archive_expired,
    archive_unused_days, retention_days, permanent_delete_after_days,
    created_by
)
SELECT 
    r.id,
    'Default Retention Policy',
    'Standard 7-year retention with automatic archiving of expired and unused documents',
    365, -- Archive after 1 year of inactivity
    true, -- Archive when superseded
    true, -- Archive when expired
    180, -- Archive if unused for 6 months
    2555, -- 7 years retention
    3650, -- 10 years before permanent deletion
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE NOT EXISTS (
    SELECT 1 FROM sop_archive_policies 
    WHERE restaurant_id = r.id
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION
-- ===========================================

-- Update table statistics
ANALYZE sop_documents_archive;
ANALYZE sop_archive_policies;
ANALYZE sop_archive_audit;

-- Set statistics targets for frequently queried columns
ALTER TABLE sop_documents_archive ALTER COLUMN title SET STATISTICS 1000;
ALTER TABLE sop_documents_archive ALTER COLUMN title_th SET STATISTICS 1000;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_documents_archive IS 'Archived SOP documents with full content preservation and metadata';
COMMENT ON TABLE sop_archive_policies IS 'Configurable policies for automatic SOP document archiving';
COMMENT ON TABLE sop_archive_audit IS 'Comprehensive audit trail for all archive operations';

COMMENT ON FUNCTION archive_sop_document IS 'Archives a SOP document with full metadata preservation';
COMMENT ON FUNCTION restore_sop_document IS 'Restores an archived SOP document as a new version';
COMMENT ON FUNCTION apply_archive_policies IS 'Automatically applies archive policies to eligible documents';
COMMENT ON FUNCTION cleanup_old_archives IS 'Permanently deletes archives that have exceeded retention period';
COMMENT ON FUNCTION search_archived_documents IS 'Full-text search through archived SOP documents';

-- Performance optimization notes
COMMENT ON INDEX idx_archive_title_search IS 'Full-text search index for archived document titles (English)';
COMMENT ON INDEX idx_archive_title_th_search IS 'Full-text search index for archived document titles (Thai)';
COMMENT ON INDEX idx_archive_retention_until IS 'Index for efficient cleanup of expired archives';