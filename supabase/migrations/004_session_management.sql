-- Session Management Tables Migration
-- Adds location-bound sessions and user sessions for tablet-based authentication
-- Created: 2025-07-27

-- ===========================================
-- LOCATION SESSIONS TABLE
-- ===========================================

-- Create location_sessions table for tablet-bound authentication
CREATE TABLE location_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    tablet_device_id VARCHAR(255) NOT NULL, -- Device fingerprint
    session_token VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL, -- Location name (e.g., "Kitchen Station #1")
    location VARCHAR(255), -- Physical location description
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    last_staff_login_at TIMESTAMPTZ,
    last_staff_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_location_session_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_location_session_last_user FOREIGN KEY (last_staff_user_id) REFERENCES auth_users(id)
);

-- ===========================================
-- USER SESSIONS TABLE (Enhanced)
-- ===========================================

-- Add session_type and location binding to existing user_sessions
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_type VARCHAR(50) DEFAULT 'standard';
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS location_bound_restaurant_id UUID;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add foreign key constraint for location binding
ALTER TABLE user_sessions ADD CONSTRAINT fk_user_session_location_restaurant 
    FOREIGN KEY (location_bound_restaurant_id) REFERENCES restaurants(id);

-- ===========================================
-- PROGRESS AND BOOKMARK TABLES
-- ===========================================

-- These tables already exist in the generated types but may need to be created

-- User bookmarks table (if not exists)
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sop_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    notes TEXT,
    notes_th TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bookmark_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookmark_sop FOREIGN KEY (sop_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookmark_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_sop_bookmark UNIQUE (user_id, sop_id)
);

-- User progress table (if not exists)
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sop_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'viewed', 'completed', 'downloaded', etc.
    duration INTEGER, -- Time spent in seconds
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_sop FOREIGN KEY (sop_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- User progress summary table (if not exists)
CREATE TABLE IF NOT EXISTS user_progress_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sop_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    viewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_progress_summary_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_summary_sop FOREIGN KEY (sop_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_summary_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_sop_summary UNIQUE (user_id, sop_id)
);

-- Uploaded files table (if not exists)
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    bucket VARCHAR(100) NOT NULL,
    path TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    sop_id UUID,
    restaurant_id UUID NOT NULL,
    uploaded_by UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_file_sop FOREIGN KEY (sop_id) REFERENCES sop_documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_file_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_uploader FOREIGN KEY (uploaded_by) REFERENCES auth_users(id)
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Location sessions indexes
CREATE INDEX idx_location_sessions_restaurant ON location_sessions(restaurant_id);
CREATE INDEX idx_location_sessions_device ON location_sessions(tablet_device_id);
CREATE INDEX idx_location_sessions_active ON location_sessions(is_active);
CREATE INDEX idx_location_sessions_expires ON location_sessions(expires_at);
CREATE UNIQUE INDEX idx_location_sessions_active_device 
    ON location_sessions(tablet_device_id) 
    WHERE is_active = true;

-- User sessions additional indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_type ON user_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_location_restaurant ON user_sessions(location_bound_restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip ON user_sessions(ip_address);

-- User bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_sop ON user_bookmarks(sop_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_restaurant ON user_bookmarks(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_active ON user_bookmarks(is_active);

-- User progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_sop ON user_progress(sop_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_restaurant ON user_progress(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_action ON user_progress(action);
CREATE INDEX IF NOT EXISTS idx_user_progress_created ON user_progress(created_at);

-- User progress summary indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_summary_user ON user_progress_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_summary_sop ON user_progress_summary(sop_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_summary_restaurant ON user_progress_summary(restaurant_id);

-- Uploaded files indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_files_restaurant ON uploaded_files(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_sop ON uploaded_files(sop_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploader ON uploaded_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_category ON uploaded_files(category);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_bucket ON uploaded_files(bucket);

-- ===========================================
-- TRIGGERS FOR AUTO-UPDATE
-- ===========================================

-- Location sessions trigger
CREATE TRIGGER update_location_sessions_updated_at 
    BEFORE UPDATE ON location_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User bookmarks trigger
CREATE TRIGGER update_user_bookmarks_updated_at 
    BEFORE UPDATE ON user_bookmarks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User progress trigger
CREATE TRIGGER update_user_progress_updated_at 
    BEFORE UPDATE ON user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User progress summary trigger
CREATE TRIGGER update_user_progress_summary_updated_at 
    BEFORE UPDATE ON user_progress_summary 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Uploaded files trigger
CREATE TRIGGER update_uploaded_files_updated_at 
    BEFORE UPDATE ON uploaded_files 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on new tables
ALTER TABLE location_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- Location sessions: Restaurant isolation for managers+
CREATE POLICY "Location sessions restaurant access"
ON location_sessions FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
    AND auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = location_sessions.restaurant_id
        AND role IN ('admin', 'manager')
    )
);

-- User bookmarks: Users can access their own bookmarks
CREATE POLICY "User bookmarks personal access"
ON user_bookmarks FOR ALL
TO authenticated
USING (
    user_id = auth.uid()
    AND restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- User progress: Users can access their own progress, managers can view all
CREATE POLICY "User progress access policy"
ON user_progress FOR ALL
TO authenticated
USING (
    user_id = auth.uid()
    OR (
        auth.uid() IN (
            SELECT id FROM auth_users 
            WHERE restaurant_id = user_progress.restaurant_id
            AND role IN ('admin', 'manager')
        )
        AND restaurant_id = (
            SELECT restaurant_id FROM auth_users 
            WHERE auth_users.id = auth.uid()
        )
    )
);

-- User progress summary: Same as user progress
CREATE POLICY "User progress summary access policy"
ON user_progress_summary FOR ALL
TO authenticated
USING (
    user_id = auth.uid()
    OR (
        auth.uid() IN (
            SELECT id FROM auth_users 
            WHERE restaurant_id = user_progress_summary.restaurant_id
            AND role IN ('admin', 'manager')
        )
        AND restaurant_id = (
            SELECT restaurant_id FROM auth_users 
            WHERE auth_users.id = auth.uid()
        )
    )
);

-- Uploaded files: Restaurant isolation
CREATE POLICY "Uploaded files restaurant access"
ON uploaded_files FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function to create location session
CREATE OR REPLACE FUNCTION create_location_session(
    p_restaurant_id UUID,
    p_device_id VARCHAR(255),
    p_location_name VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
    session_token VARCHAR(255);
    expires_at TIMESTAMPTZ;
BEGIN
    -- Generate session token
    session_token := encode(gen_random_bytes(32), 'hex');
    
    -- Set expiry to 24 hours from now
    expires_at := NOW() + INTERVAL '24 hours';
    
    -- Deactivate any existing sessions for this device
    UPDATE location_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE tablet_device_id = p_device_id AND is_active = true;
    
    -- Create new session
    INSERT INTO location_sessions (
        restaurant_id,
        tablet_device_id,
        session_token,
        name,
        location,
        ip_address,
        user_agent,
        expires_at
    ) VALUES (
        p_restaurant_id,
        p_device_id,
        session_token,
        p_location_name,
        p_location_name,
        p_ip_address,
        p_user_agent,
        expires_at
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired location sessions
CREATE OR REPLACE FUNCTION cleanup_expired_location_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE location_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user progress stats
CREATE OR REPLACE FUNCTION get_user_progress_stats(
    p_user_id UUID,
    p_restaurant_id UUID
)
RETURNS TABLE(
    total_sops INTEGER,
    viewed_sops INTEGER,
    completed_sops INTEGER,
    downloaded_sops INTEGER,
    bookmarked_sops INTEGER,
    progress_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT sd.id)::INTEGER as total_sops,
        COUNT(DISTINCT ups.sop_id) FILTER (WHERE ups.viewed_at IS NOT NULL)::INTEGER as viewed_sops,
        COUNT(DISTINCT ups.sop_id) FILTER (WHERE ups.completed_at IS NOT NULL)::INTEGER as completed_sops,
        COUNT(DISTINCT ups.sop_id) FILTER (WHERE ups.downloaded_at IS NOT NULL)::INTEGER as downloaded_sops,
        COUNT(DISTINCT ub.sop_id) FILTER (WHERE ub.is_active = true)::INTEGER as bookmarked_sops,
        CASE 
            WHEN COUNT(DISTINCT sd.id) > 0 THEN
                ROUND((COUNT(DISTINCT ups.sop_id) FILTER (WHERE ups.completed_at IS NOT NULL)::DECIMAL / COUNT(DISTINCT sd.id)) * 100, 2)
            ELSE 0
        END as progress_percentage
    FROM sop_documents sd
    LEFT JOIN user_progress_summary ups ON sd.id = ups.sop_id AND ups.user_id = p_user_id
    LEFT JOIN user_bookmarks ub ON sd.id = ub.sop_id AND ub.user_id = p_user_id
    WHERE sd.restaurant_id = p_restaurant_id 
    AND sd.is_active = true 
    AND sd.status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- SAMPLE DATA
-- ===========================================

-- Insert sample location session for testing
INSERT INTO location_sessions (
    restaurant_id,
    tablet_device_id,
    session_token,
    name,
    location,
    ip_address,
    expires_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000', -- Krong Thai Restaurant
    'tablet-kitchen-001',
    encode(gen_random_bytes(32), 'hex'),
    'Kitchen Station #1',
    'Main Kitchen Area',
    '192.168.1.50',
    NOW() + INTERVAL '24 hours'
);

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE location_sessions IS 'Manages tablet-bound location sessions for restaurant staff authentication';
COMMENT ON TABLE user_bookmarks IS 'Stores user bookmarks for SOP documents';
COMMENT ON TABLE user_progress IS 'Tracks detailed user interactions with SOP documents';
COMMENT ON TABLE user_progress_summary IS 'Aggregated summary of user progress per SOP document';
COMMENT ON TABLE uploaded_files IS 'Manages file uploads associated with SOPs and restaurant operations';

-- Analyze tables for better query planning
ANALYZE location_sessions;
ANALYZE user_bookmarks;
ANALYZE user_progress;
ANALYZE user_progress_summary;
ANALYZE uploaded_files;