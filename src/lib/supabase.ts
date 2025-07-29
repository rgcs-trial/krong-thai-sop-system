/**
 * Supabase Client Configuration for Restaurant Krong Thai SOP Management System
 * Handles database connections and type-safe queries
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

/**
 * Client-side Supabase client (public, anonymous key)
 * Use this in client components and API routes that don't require elevated permissions
 */
export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable automatic auth since we're using custom PIN authentication
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'krong-thai-sop-system',
    },
  },
});

/**
 * Server-side Supabase client (service role key)
 * Use this in server actions, API routes, and middleware that require admin permissions
 * Only available on the server side
 */
export const supabaseAdmin = supabaseServiceKey
  ? createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'krong-thai-sop-system-admin',
        },
      },
    })
  : null;

/**
 * Get Supabase client for server-side operations
 * Automatically chooses between admin and regular client based on availability
 */
export function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    // Client-side: use regular client
    return supabase;
  }

  // Server-side: prefer admin client if available
  return supabaseAdmin || supabase;
}

/**
 * Custom hook for getting the appropriate Supabase client
 * Ensures type safety and proper client selection
 */
export function useSupabase() {
  return supabase;
}

/**
 * Database helper functions
 */
export const dbHelpers = {
  /**
   * Get current user's restaurant ID from auth context
   */
  async getCurrentRestaurantId(userId?: string): Promise<string | null> {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('auth_users')
        .select('restaurant_id')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error getting restaurant ID:', error);
        return null;
      }

      return data.restaurant_id;
    } catch (error) {
      console.error('Error getting restaurant ID:', error);
      return null;
    }
  },

  /**
   * Check if user exists and is active
   */
  async isUserActive(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('auth_users')
        .select('is_active')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.is_active;
    } catch (error) {
      console.error('Error checking user status:', error);
      return false;
    }
  },

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('auth_users')
        .select(`
          id,
          email,
          role,
          full_name,
          full_name_fr,
          position,
          position_fr,
          restaurant_id,
          is_active,
          last_login_at,
          restaurants (
            id,
            name,
            name_fr
          )
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error getting user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  /**
   * Get SOP categories for restaurant
   */
  async getSopCategories(restaurantId?: string) {
    try {
      const { data, error } = await supabase
        .from('sop_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error getting SOP categories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting SOP categories:', error);
      return [];
    }
  },

  /**
   * Get SOP documents for category and restaurant
   */
  async getSopDocuments(categoryId: string, restaurantId: string) {
    try {
      const { data, error } = await supabase
        .from('sop_documents')
        .select(`
          *,
          sop_categories (
            id,
            name,
            name_fr,
            code
          ),
          created_by_user:auth_users!created_by (
            full_name,
            full_name_th
          )
        `)
        .eq('category_id', categoryId)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting SOP documents:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting SOP documents:', error);
      return [];
    }
  },

  /**
   * Search SOP documents
   */
  async searchSopDocuments(query: string, restaurantId: string, locale: 'en' | 'fr' = 'en') {
    try {
      const searchColumn = locale === 'fr' ? 'title_fr' : 'title';
      const contentColumn = locale === 'fr' ? 'content_fr' : 'content';

      const { data, error } = await supabase
        .from('sop_documents')
        .select(`
          *,
          sop_categories (
            id,
            name,
            name_fr,
            code
          )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .eq('status', 'approved')
        .or(`${searchColumn}.ilike.%${query}%,${contentColumn}.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching SOP documents:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error searching SOP documents:', error);
      return [];
    }
  },
};

/**
 * Export createClient function for API routes that need to create their own clients
 * This exports the raw createClient from Supabase - most API routes should use the server version
 */
export { createClient } from '@supabase/supabase-js';

/**
 * Configured createClient function that returns a client with our app settings
 * Use this when you need a new client instance with the same configuration as the main client
 */
export function createConfiguredClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Disable automatic auth since we're using custom PIN authentication
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'krong-thai-sop-system',
      },
    },
  });
}

/**
 * Type exports for use throughout the application
 */
export type SupabaseClient = typeof supabase;
export type SupabaseAdminClient = typeof supabaseAdmin;

/**
 * Database table row types (extracted from the generated Database type)
 */
export type AuthUser = Database['public']['Tables']['auth_users']['Row'];
export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type SopCategory = Database['public']['Tables']['sop_categories']['Row'];
export type SopDocument = Database['public']['Tables']['sop_documents']['Row'];
export type FormTemplate = Database['public']['Tables']['form_templates']['Row'];
export type FormSubmission = Database['public']['Tables']['form_submissions']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type UserSession = Database['public']['Tables']['user_sessions']['Row'];
export type UserBookmark = Database['public']['Tables']['user_bookmarks']['Row'];
export type UserProgress = Database['public']['Tables']['user_progress']['Row'];
export type UserProgressSummary = Database['public']['Tables']['user_progress_summary']['Row'];
export type UploadedFile = Database['public']['Tables']['uploaded_files']['Row'];

/**
 * Database insert types
 */
export type AuthUserInsert = Database['public']['Tables']['auth_users']['Insert'];
export type RestaurantInsert = Database['public']['Tables']['restaurants']['Insert'];
export type SopCategoryInsert = Database['public']['Tables']['sop_categories']['Insert'];
export type SopDocumentInsert = Database['public']['Tables']['sop_documents']['Insert'];
export type FormTemplateInsert = Database['public']['Tables']['form_templates']['Insert'];
export type FormSubmissionInsert = Database['public']['Tables']['form_submissions']['Insert'];
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];
export type UserSessionInsert = Database['public']['Tables']['user_sessions']['Insert'];
export type UserBookmarkInsert = Database['public']['Tables']['user_bookmarks']['Insert'];
export type UserProgressInsert = Database['public']['Tables']['user_progress']['Insert'];
export type UserProgressSummaryInsert = Database['public']['Tables']['user_progress_summary']['Insert'];
export type UploadedFileInsert = Database['public']['Tables']['uploaded_files']['Insert'];

/**
 * Database update types
 */
export type AuthUserUpdate = Database['public']['Tables']['auth_users']['Update'];
export type RestaurantUpdate = Database['public']['Tables']['restaurants']['Update'];
export type SopCategoryUpdate = Database['public']['Tables']['sop_categories']['Update'];
export type SopDocumentUpdate = Database['public']['Tables']['sop_documents']['Update'];
export type FormTemplateUpdate = Database['public']['Tables']['form_templates']['Update'];
export type FormSubmissionUpdate = Database['public']['Tables']['form_submissions']['Update'];
export type AuditLogUpdate = Database['public']['Tables']['audit_logs']['Update'];
export type UserSessionUpdate = Database['public']['Tables']['user_sessions']['Update'];
export type UserBookmarkUpdate = Database['public']['Tables']['user_bookmarks']['Update'];
export type UserProgressUpdate = Database['public']['Tables']['user_progress']['Update'];
export type UserProgressSummaryUpdate = Database['public']['Tables']['user_progress_summary']['Update'];
export type UploadedFileUpdate = Database['public']['Tables']['uploaded_files']['Update'];