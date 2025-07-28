/**
 * Supabase Client Export for legacy compatibility
 * Re-exports the main supabase client for backward compatibility
 */

export { supabase as default, supabase, supabaseAdmin, getSupabaseClient, useSupabase, dbHelpers } from './supabase';
export type { SupabaseClient, SupabaseAdminClient } from './supabase';