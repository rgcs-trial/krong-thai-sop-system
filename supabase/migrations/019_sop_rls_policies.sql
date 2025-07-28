-- SOP Row Level Security (RLS) Policies
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive security policies for SOP workflow tables

-- ===========================================
-- ENABLE RLS ON ALL SOP TABLES
-- ===========================================

ALTER TABLE sop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_equipment ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- ===========================================

-- Function to get current user's restaurant ID
CREATE OR REPLACE FUNCTION get_current_user_restaurant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_restaurant_id UUID;
BEGIN
    SELECT restaurant_id INTO user_restaurant_id
    FROM auth_users
    WHERE id = auth.uid();
    
    RETURN user_restaurant_id;
END;
$$;

-- Function to check if current user has specific role
CREATE OR REPLACE FUNCTION user_has_role(required_roles user_role[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role_value user_role;
BEGIN
    SELECT role INTO user_role_value
    FROM auth_users
    WHERE id = auth.uid();
    
    RETURN user_role_value = ANY(required_roles);
END;
$$;

-- Function to check if user is manager or admin
CREATE OR REPLACE FUNCTION user_is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN user_has_role(ARRAY['admin'::user_role, 'manager'::user_role]);
END;
$$;

-- Function to check if user can access SOP document
CREATE OR REPLACE FUNCTION can_access_sop_document(document_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    doc_restaurant_id UUID;
    user_restaurant_id UUID;
BEGIN
    -- Get document's restaurant ID
    SELECT restaurant_id INTO doc_restaurant_id
    FROM sop_documents
    WHERE id = document_id;
    
    -- Get user's restaurant ID
    user_restaurant_id := get_current_user_restaurant_id();
    
    -- Allow access if in same restaurant or user is admin
    RETURN doc_restaurant_id = user_restaurant_id OR user_has_role(ARRAY['admin'::user_role]);
END;
$$;

-- ===========================================
-- SOP STEPS POLICIES
-- ===========================================

-- Read access: Users can view steps for SOPs in their restaurant
CREATE POLICY "sop_steps_select_policy"
ON sop_steps FOR SELECT
TO authenticated
USING (
    can_access_sop_document(sop_document_id)
);

-- Insert/Update/Delete: Only managers and admins can modify steps
CREATE POLICY "sop_steps_modify_policy"
ON sop_steps FOR ALL
TO authenticated
USING (
    can_access_sop_document(sop_document_id)
    AND user_is_manager_or_admin()
)
WITH CHECK (
    can_access_sop_document(sop_document_id)
    AND user_is_manager_or_admin()
);

-- ===========================================
-- SOP COMPLETIONS POLICIES
-- ===========================================

-- Read access: Users can view completions in their restaurant
-- Staff can see their own completions, managers can see all
CREATE POLICY "sop_completions_select_policy"
ON sop_completions FOR SELECT
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        completed_by = auth.uid() -- Own completions
        OR assigned_to = auth.uid() -- Assigned to user
        OR user_is_manager_or_admin() -- Managers see all
    )
);

-- Insert: Users can create completions for assignments in their restaurant
CREATE POLICY "sop_completions_insert_policy"
ON sop_completions FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND can_access_sop_document(sop_document_id)
    AND (
        completed_by = auth.uid() -- Own completion
        OR user_is_manager_or_admin() -- Managers can create for others
    )
);

-- Update: Users can update their own completions, managers can update all
CREATE POLICY "sop_completions_update_policy"
ON sop_completions FOR UPDATE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        completed_by = auth.uid() -- Own completion
        OR user_is_manager_or_admin() -- Managers can update all
    )
)
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        completed_by = auth.uid() -- Own completion
        OR user_is_manager_or_admin() -- Managers can update all
    )
);

-- Delete: Only managers and admins can delete completions
CREATE POLICY "sop_completions_delete_policy"
ON sop_completions FOR DELETE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND user_is_manager_or_admin()
);

-- ===========================================
-- SOP ASSIGNMENTS POLICIES
-- ===========================================

-- Read access: Users can view their own assignments and managers can see all
CREATE POLICY "sop_assignments_select_policy"
ON sop_assignments FOR SELECT
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        assigned_to = auth.uid() -- Own assignments
        OR assigned_by = auth.uid() -- Assignments created by user
        OR user_is_manager_or_admin() -- Managers see all
    )
);

-- Insert: Managers and admins can create assignments
CREATE POLICY "sop_assignments_insert_policy"
ON sop_assignments FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND can_access_sop_document(sop_document_id)
    AND user_is_manager_or_admin()
    AND assigned_by = auth.uid()
);

-- Update: Users can update their own assignments, managers can update all
CREATE POLICY "sop_assignments_update_policy"
ON sop_assignments FOR UPDATE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        assigned_to = auth.uid() -- Can update own assignment status
        OR assigned_by = auth.uid() -- Can update assignments they created
        OR user_is_manager_or_admin() -- Managers can update all
    )
)
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        assigned_to = auth.uid() -- Can update own assignment status
        OR assigned_by = auth.uid() -- Can update assignments they created
        OR user_is_manager_or_admin() -- Managers can update all
    )
);

-- Delete: Only managers and admins can delete assignments
CREATE POLICY "sop_assignments_delete_policy"
ON sop_assignments FOR DELETE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND user_is_manager_or_admin()
);

-- ===========================================
-- SOP PHOTOS POLICIES
-- ===========================================

-- Read access: Users can view photos for completions they can access
CREATE POLICY "sop_photos_select_policy"
ON sop_photos FOR SELECT
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        uploaded_by = auth.uid() -- Own photos
        OR user_is_manager_or_admin() -- Managers see all
        OR EXISTS (
            SELECT 1 FROM sop_completions sc
            WHERE sc.id = sop_completion_id
            AND (sc.completed_by = auth.uid() OR sc.assigned_to = auth.uid())
        )
    )
);

-- Insert: Users can upload photos for their own completions
CREATE POLICY "sop_photos_insert_policy"
ON sop_photos FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND uploaded_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM sop_completions sc
        WHERE sc.id = sop_completion_id
        AND restaurant_id = get_current_user_restaurant_id()
        AND (
            sc.completed_by = auth.uid()
            OR sc.assigned_to = auth.uid()
            OR user_is_manager_or_admin()
        )
    )
);

-- Update: Users can update their own photos, managers can verify all
CREATE POLICY "sop_photos_update_policy"
ON sop_photos FOR UPDATE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        uploaded_by = auth.uid() -- Own photos
        OR user_is_manager_or_admin() -- Managers can verify all
    )
)
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        uploaded_by = auth.uid() -- Own photos
        OR user_is_manager_or_admin() -- Managers can verify all
    )
);

-- Delete: Users can delete their own photos, managers can delete all
CREATE POLICY "sop_photos_delete_policy"
ON sop_photos FOR DELETE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        uploaded_by = auth.uid() -- Own photos
        OR user_is_manager_or_admin() -- Managers can delete all
    )
);

-- ===========================================
-- SOP SCHEDULES POLICIES
-- ===========================================

-- Read access: All users in restaurant can view schedules
CREATE POLICY "sop_schedules_select_policy"
ON sop_schedules FOR SELECT
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
);

-- Modify: Only managers and admins can create/update/delete schedules
CREATE POLICY "sop_schedules_modify_policy"
ON sop_schedules FOR ALL
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND user_is_manager_or_admin()
)
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND user_is_manager_or_admin()
    AND can_access_sop_document(sop_document_id)
    AND created_by = auth.uid()
);

-- ===========================================
-- SOP APPROVALS POLICIES
-- ===========================================

-- Read access: Users can view approvals they requested or are assigned to approve
CREATE POLICY "sop_approvals_select_policy"
ON sop_approvals FOR SELECT
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        requested_by = auth.uid() -- Own approval requests
        OR approver_id = auth.uid() -- Assigned as approver
        OR user_is_manager_or_admin() -- Managers see all
    )
);

-- Insert: Users can request approvals for their own completions
CREATE POLICY "sop_approvals_insert_policy"
ON sop_approvals FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND requested_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM sop_completions sc
        WHERE sc.id = sop_completion_id
        AND restaurant_id = get_current_user_restaurant_id()
        AND sc.completed_by = auth.uid()
    )
);

-- Update: Approvers can update approvals assigned to them, managers can update all
CREATE POLICY "sop_approvals_update_policy"
ON sop_approvals FOR UPDATE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        approver_id = auth.uid() -- Assigned approver
        OR user_is_manager_or_admin() -- Managers can update all
    )
)
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        approver_id = auth.uid() -- Assigned approver
        OR user_is_manager_or_admin() -- Managers can update all
    )
);

-- Delete: Only managers and admins can delete approvals
CREATE POLICY "sop_approvals_delete_policy"
ON sop_approvals FOR DELETE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND user_is_manager_or_admin()
);

-- ===========================================
-- SOP VERSIONS POLICIES
-- ===========================================

-- Read access: Users can view versions for SOPs in their restaurant
CREATE POLICY "sop_versions_select_policy"
ON sop_versions FOR SELECT
TO authenticated
USING (
    can_access_sop_document(sop_document_id)
);

-- Modify: Only managers and admins can create/update versions
CREATE POLICY "sop_versions_modify_policy"
ON sop_versions FOR ALL
TO authenticated
USING (
    can_access_sop_document(sop_document_id)
    AND user_is_manager_or_admin()
)
WITH CHECK (
    can_access_sop_document(sop_document_id)
    AND user_is_manager_or_admin()
    AND created_by = auth.uid()
);

-- ===========================================
-- SOP ANALYTICS POLICIES
-- ===========================================

-- Read access: Managers and admins can view analytics for their restaurant
CREATE POLICY "sop_analytics_select_policy"
ON sop_analytics FOR SELECT
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND user_is_manager_or_admin()
);

-- Modify: Only admins can manually modify analytics (usually done by system functions)
CREATE POLICY "sop_analytics_modify_policy"
ON sop_analytics FOR ALL
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND user_has_role(ARRAY['admin'::user_role])
)
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND user_has_role(ARRAY['admin'::user_role])
);

-- ===========================================
-- SOP EQUIPMENT POLICIES
-- ===========================================

-- Read access: All users in restaurant can view equipment
CREATE POLICY "sop_equipment_select_policy"
ON sop_equipment FOR SELECT
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
);

-- Insert: Managers and admins can add equipment
CREATE POLICY "sop_equipment_insert_policy"
ON sop_equipment FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND user_is_manager_or_admin()
);

-- Update: Users can update equipment they're responsible for, managers can update all
CREATE POLICY "sop_equipment_update_policy"
ON sop_equipment FOR UPDATE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        responsible_person = auth.uid() -- Responsible person
        OR user_is_manager_or_admin() -- Managers can update all
    )
)
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        responsible_person = auth.uid() -- Responsible person
        OR user_is_manager_or_admin() -- Managers can update all
    )
);

-- Delete: Only managers and admins can delete equipment
CREATE POLICY "sop_equipment_delete_policy"
ON sop_equipment FOR DELETE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND user_is_manager_or_admin()
);

-- ===========================================
-- ENHANCED SOP DOCUMENTS POLICIES
-- ===========================================

-- Replace existing basic SOP documents policy with more comprehensive one
DROP POLICY IF EXISTS "SOP documents restaurant isolation" ON sop_documents;

-- Read access: All users in restaurant can view published SOPs
CREATE POLICY "sop_documents_select_policy"
ON sop_documents FOR SELECT
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        status = 'approved' -- Published SOPs visible to all
        OR created_by = auth.uid() -- Own drafts
        OR user_is_manager_or_admin() -- Managers see all
    )
);

-- Insert: All authenticated users can create SOPs in their restaurant
CREATE POLICY "sop_documents_insert_policy"
ON sop_documents FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND created_by = auth.uid()
);

-- Update: Users can update their own SOPs, managers can update all
CREATE POLICY "sop_documents_update_policy"
ON sop_documents FOR UPDATE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        created_by = auth.uid() -- Own SOPs
        OR user_is_manager_or_admin() -- Managers can update all
    )
)
WITH CHECK (
    restaurant_id = get_current_user_restaurant_id()
    AND (
        created_by = auth.uid() -- Own SOPs
        OR user_is_manager_or_admin() -- Managers can update all
    )
);

-- Delete: Only managers and admins can delete SOPs
CREATE POLICY "sop_documents_delete_policy"
ON sop_documents FOR DELETE
TO authenticated
USING (
    restaurant_id = get_current_user_restaurant_id()
    AND user_is_manager_or_admin()
);

-- ===========================================
-- GRANT EXECUTE PERMISSIONS
-- ===========================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_current_user_restaurant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role(user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_manager_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_sop_document(UUID) TO authenticated;

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON FUNCTION get_current_user_restaurant_id() IS 'Returns current authenticated user restaurant ID for RLS policies';
COMMENT ON FUNCTION user_has_role(user_role[]) IS 'Check if current user has any of the specified roles';
COMMENT ON FUNCTION user_is_manager_or_admin() IS 'Check if current user is manager or admin';
COMMENT ON FUNCTION can_access_sop_document(UUID) IS 'Check if current user can access specific SOP document';

-- Security notes
COMMENT ON POLICY "sop_completions_select_policy" ON sop_completions IS 'Staff can view own completions, managers can view all in restaurant';
COMMENT ON POLICY "sop_assignments_select_policy" ON sop_assignments IS 'Users can view assignments assigned to them or created by them';
COMMENT ON POLICY "sop_photos_select_policy" ON sop_photos IS 'Users can view photos for completions they have access to';
COMMENT ON POLICY "sop_approvals_select_policy" ON sop_approvals IS 'Users can view approval requests they made or are assigned to approve';