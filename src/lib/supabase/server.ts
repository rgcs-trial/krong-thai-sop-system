/**
 * Supabase Server-side Client Configuration
 * For use in API routes, server actions, and middleware
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export { supabaseAdmin as default, supabaseAdmin, getSupabaseClient } from '../supabase';
export type { SupabaseAdminClient } from '../supabase';

/**
 * Server-side createClient function that automatically uses admin credentials
 * This is what API routes expect when they import createClient from '@/lib/supabase/server'
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'krong-thai-sop-system-server@1.0.0',
      },
    },
  });
}