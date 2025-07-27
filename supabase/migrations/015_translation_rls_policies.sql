-- Translation System Row Level Security (RLS) Policies
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-27
-- Purpose: Secure access control for translation management system

-- ===========================================
-- ENABLE RLS ON ALL TRANSLATION TABLES
-- ===========================================

ALTER TABLE translation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_analytics ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- HELPER FUNCTIONS FOR RLS
-- ===========================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth_users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is manager or admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth_users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has translation management permissions
CREATE OR REPLACE FUNCTION has_translation_permissions()
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin and manager roles can manage translations
    RETURN is_manager_or_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is assigned to a translation project
CREATE OR REPLACE FUNCTION is_assigned_to_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM translation_project_assignments tpa
        WHERE tpa.project_id = project_uuid
        AND tpa.assigned_to = auth.uid()
    ) OR is_manager_or_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- TRANSLATION_KEYS TABLE POLICIES
-- ===========================================

-- Allow all authenticated users to read translation keys (needed for frontend)
CREATE POLICY "translation_keys_read_authenticated" ON translation_keys
    FOR SELECT
    TO authenticated
    USING (true);

-- Only users with translation permissions can create new keys
CREATE POLICY "translation_keys_create_managers" ON translation_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (has_translation_permissions());

-- Only users with translation permissions can update keys
CREATE POLICY "translation_keys_update_managers" ON translation_keys
    FOR UPDATE
    TO authenticated
    USING (has_translation_permissions())
    WITH CHECK (has_translation_permissions());

-- Only admins can delete translation keys
CREATE POLICY "translation_keys_delete_admin" ON translation_keys
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- ===========================================
-- TRANSLATIONS TABLE POLICIES
-- ===========================================

-- Allow all authenticated users to read published translations
CREATE POLICY "translations_read_published" ON translations
    FOR SELECT
    TO authenticated
    USING (status = 'published' OR has_translation_permissions());

-- Allow managers to read all translations (including drafts)
CREATE POLICY "translations_read_all_managers" ON translations
    FOR SELECT
    TO authenticated
    USING (has_translation_permissions());

-- Allow translation managers to create new translations
CREATE POLICY "translations_create_managers" ON translations
    FOR INSERT
    TO authenticated
    WITH CHECK (has_translation_permissions());

-- Allow users to update translations they created or if they have permissions
CREATE POLICY "translations_update_creators_or_managers" ON translations
    FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid() OR 
        has_translation_permissions()
    )
    WITH CHECK (
        created_by = auth.uid() OR 
        has_translation_permissions()
    );

-- Only admins can delete translations
CREATE POLICY "translations_delete_admin" ON translations
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- ===========================================
-- TRANSLATION_HISTORY TABLE POLICIES
-- ===========================================

-- Allow managers to read translation history for audit purposes
CREATE POLICY "translation_history_read_managers" ON translation_history
    FOR SELECT
    TO authenticated
    USING (has_translation_permissions());

-- System automatically inserts history records (no manual insert policy needed)
-- History records are never updated or deleted manually

-- ===========================================
-- TRANSLATION_PROJECTS TABLE POLICIES
-- ===========================================

-- Allow all authenticated users to read active projects (for visibility)
CREATE POLICY "translation_projects_read_all" ON translation_projects
    FOR SELECT
    TO authenticated
    USING (true);

-- Only managers can create projects
CREATE POLICY "translation_projects_create_managers" ON translation_projects
    FOR INSERT
    TO authenticated
    WITH CHECK (has_translation_permissions());

-- Project managers and admins can update their projects
CREATE POLICY "translation_projects_update_managers" ON translation_projects
    FOR UPDATE
    TO authenticated
    USING (
        project_manager_id = auth.uid() OR 
        has_translation_permissions()
    )
    WITH CHECK (
        project_manager_id = auth.uid() OR 
        has_translation_permissions()
    );

-- Only admins can delete projects
CREATE POLICY "translation_projects_delete_admin" ON translation_projects
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- ===========================================
-- TRANSLATION_PROJECT_ASSIGNMENTS TABLE POLICIES
-- ===========================================

-- Allow users to read assignments for projects they're involved in
CREATE POLICY "project_assignments_read_involved" ON translation_project_assignments
    FOR SELECT
    TO authenticated
    USING (
        assigned_to = auth.uid() OR 
        is_assigned_to_project(project_id) OR
        has_translation_permissions()
    );

-- Only project managers can create assignments
CREATE POLICY "project_assignments_create_managers" ON translation_project_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (has_translation_permissions());

-- Users can update their own assignments, managers can update all
CREATE POLICY "project_assignments_update_assignees_or_managers" ON translation_project_assignments
    FOR UPDATE
    TO authenticated
    USING (
        assigned_to = auth.uid() OR 
        has_translation_permissions()
    )
    WITH CHECK (
        assigned_to = auth.uid() OR 
        has_translation_permissions()
    );

-- Only managers can delete assignments
CREATE POLICY "project_assignments_delete_managers" ON translation_project_assignments
    FOR DELETE
    TO authenticated
    USING (has_translation_permissions());

-- ===========================================
-- TRANSLATION_CACHE TABLE POLICIES
-- ===========================================

-- Allow all authenticated users to read cache (needed for frontend performance)
CREATE POLICY "translation_cache_read_all" ON translation_cache
    FOR SELECT
    TO authenticated
    USING (is_valid = true);

-- Only system functions should manage cache (via service role)
-- No policies for INSERT/UPDATE/DELETE as these are handled by triggers and functions

-- ===========================================
-- TRANSLATION_ANALYTICS TABLE POLICIES
-- ===========================================

-- Allow managers to read analytics for insights
CREATE POLICY "translation_analytics_read_managers" ON translation_analytics
    FOR SELECT
    TO authenticated
    USING (has_translation_permissions());

-- System automatically manages analytics (via triggers and background jobs)
-- Allow system to insert analytics data
CREATE POLICY "translation_analytics_insert_system" ON translation_analytics
    FOR INSERT
    TO authenticated
    WITH CHECK (true); -- Controlled by application logic

-- Allow system to update analytics data
CREATE POLICY "translation_analytics_update_system" ON translation_analytics
    FOR UPDATE
    TO authenticated
    USING (true) -- Controlled by application logic
    WITH CHECK (true);

-- ===========================================
-- SPECIAL POLICIES FOR PUBLIC ACCESS
-- ===========================================

-- Create a policy for anonymous access to published translations (if needed for public pages)
CREATE POLICY "translations_public_read" ON translations
    FOR SELECT
    TO anon
    USING (status = 'published' AND translation_key_id IN (
        SELECT id FROM translation_keys 
        WHERE category IN ('common', 'navigation', 'errors') 
        AND is_active = true
    ));

-- Allow anonymous access to translation cache for public content
CREATE POLICY "translation_cache_public_read" ON translation_cache
    FOR SELECT
    TO anon
    USING (is_valid = true AND namespace IN ('common', 'navigation', 'errors'));

-- ===========================================
-- SECURITY FUNCTIONS FOR TRANSLATIONS
-- ===========================================

-- Function to safely get translations for a specific locale
CREATE OR REPLACE FUNCTION get_translations_for_locale(target_locale supported_locale)
RETURNS TABLE (
    key_name VARCHAR,
    value TEXT,
    status translation_status,
    version INTEGER
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tk.key_name,
        t.value,
        t.status,
        t.version
    FROM translation_keys tk
    JOIN translations t ON tk.id = t.translation_key_id
    WHERE 
        t.locale = target_locale
        AND t.status = 'published'
        AND tk.is_active = true
    ORDER BY tk.key_name;
END;
$$ LANGUAGE plpgsql;

-- Function to safely get translation with fallback
CREATE OR REPLACE FUNCTION get_translation_with_fallback(
    key_name VARCHAR,
    target_locale supported_locale,
    fallback_locale supported_locale DEFAULT 'en'
)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    -- Try to get translation in target locale
    SELECT t.value INTO result
    FROM translation_keys tk
    JOIN translations t ON tk.id = t.translation_key_id
    WHERE 
        tk.key_name = get_translation_with_fallback.key_name
        AND t.locale = target_locale
        AND t.status = 'published'
        AND tk.is_active = true
    LIMIT 1;
    
    -- If not found, try fallback locale
    IF result IS NULL THEN
        SELECT t.value INTO result
        FROM translation_keys tk
        JOIN translations t ON tk.id = t.translation_key_id
        WHERE 
            tk.key_name = get_translation_with_fallback.key_name
            AND t.locale = fallback_locale
            AND t.status = 'published'
            AND tk.is_active = true
        LIMIT 1;
    END IF;
    
    -- Return result or key name if no translation found
    RETURN COALESCE(result, get_translation_with_fallback.key_name);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- GRANTS FOR PROPER FUNCTIONALITY
-- ===========================================

-- Grant execute permissions on security functions to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_manager_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION has_translation_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION is_assigned_to_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_translations_for_locale(supported_locale) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_translation_with_fallback(VARCHAR, supported_locale, supported_locale) TO authenticated, anon;

-- ===========================================
-- COMMENTS FOR POLICY DOCUMENTATION
-- ===========================================

COMMENT ON POLICY "translation_keys_read_authenticated" ON translation_keys IS 'Allow all authenticated users to read translation keys for frontend functionality';
COMMENT ON POLICY "translations_read_published" ON translations IS 'Allow reading of published translations for application functionality';
COMMENT ON POLICY "translation_cache_read_all" ON translation_cache IS 'Allow reading valid cache entries for performance optimization';

COMMENT ON FUNCTION has_translation_permissions() IS 'Security function to check if user has translation management permissions';
COMMENT ON FUNCTION get_translations_for_locale(supported_locale) IS 'Secure function to retrieve all published translations for a specific locale';
COMMENT ON FUNCTION get_translation_with_fallback(VARCHAR, supported_locale, supported_locale) IS 'Secure function to get translation with automatic fallback to default locale';