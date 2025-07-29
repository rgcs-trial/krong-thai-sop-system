/**
 * Supabase client configuration for Restaurant Krong Thai SOP System
 * Handles database connections with RLS policies
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

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

// Client-side Supabase client (with RLS)
export const supabase: SupabaseClient<Database> = createSupabaseClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false, // We handle sessions manually with PIN auth
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'krong-thai-sop-system@1.0.0',
      },
    },
  }
);

// Server-side Supabase client (bypasses RLS for admin operations)
export const supabaseAdmin: SupabaseClient<Database> = (() => {
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found - admin operations will not be available');
    return supabase; // Fallback to regular client
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
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
        'X-Client-Info': 'krong-thai-sop-system-admin@1.0.0',
      },
    },
  });
})();

/**
 * Create a Supabase client with user context for RLS
 * This sets the user context for Row Level Security policies
 */
export const createAuthenticatedClient = async (
  userId: string,
  restaurantId: string
): Promise<SupabaseClient<Database>> => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
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
        'X-Client-Info': 'krong-thai-sop-system@1.0.0',
        'X-User-ID': userId,
        'X-Restaurant-ID': restaurantId,
      },
    },
  });

  // Set auth context for RLS
  await client.auth.setSession({
    access_token: supabaseAnonKey,
    refresh_token: '',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      app_metadata: {
        restaurant_id: restaurantId,
      },
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as any,
  } as any);

  return client;
};

/**
 * Database query helpers with proper error handling
 */
export class DatabaseService {
  private client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database> = supabase) {
    this.client = client;
  }

  /**
   * Execute a query with proper error handling
   */
  async executeQuery<T>(
    queryBuilder: () => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const { data, error } = await queryBuilder();
      
      if (error) {
        console.error('Database query error:', error);
        return {
          data: null,
          error: this.formatDatabaseError(error),
        };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected database error:', err);
      return {
        data: null,
        error: 'An unexpected database error occurred',
      };
    }
  }

  /**
   * Execute a query that should return a single row
   */
  async executeSingleQuery<T>(
    queryBuilder: () => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await this.executeQuery(queryBuilder);
    
    if (result.error) {
      return result;
    }

    if (!result.data) {
      return {
        data: null,
        error: 'Record not found',
      };
    }

    return result;
  }

  /**
   * Execute a query that should return multiple rows
   */
  async executeListQuery<T>(
    queryBuilder: () => Promise<{ data: T[] | null; error: any }>
  ): Promise<{ data: T[] | null; error: string | null }> {
    const result = await this.executeQuery(queryBuilder);
    
    if (result.error) {
      return { data: null, error: result.error };
    }

    return {
      data: result.data || [],
      error: null,
    };
  }

  /**
   * Format database errors for consistent API responses
   */
  private formatDatabaseError(error: any): string {
    if (!error) return 'Unknown database error';

    // Handle Postgres error codes
    switch (error.code) {
      case '23505': // unique_violation
        return 'A record with this information already exists';
      case '23503': // foreign_key_violation
        return 'Referenced record does not exist';
      case '23502': // not_null_violation
        return 'Required field is missing';
      case '23514': // check_violation
        return 'Data validation failed';
      case '42P01': // undefined_table
        return 'Database table not found';
      case '42703': // undefined_column
        return 'Database column not found';
      case '08P01': // protocol_violation
        return 'Database connection error';
      default:
        // Return the error message if it's user-friendly, otherwise generic message
        if (error.message && error.message.length < 200 && !error.message.includes('Error:')) {
          return error.message;
        }
        return 'Database operation failed';
    }
  }

  /**
   * Check if a database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('restaurants')
        .select('id')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get database statistics for monitoring
   */
  async getStats(): Promise<{
    isHealthy: boolean;
    connectionPool?: any;
    lastQuery?: Date;
  }> {
    const isHealthy = await this.healthCheck();
    
    return {
      isHealthy,
      lastQuery: new Date(),
    };
  }
}

/**
 * Default database service instance
 */
export const db = new DatabaseService();

/**
 * Admin database service instance
 */
export const dbAdmin = new DatabaseService(supabaseAdmin);

/**
 * Connection pool configuration for high-traffic scenarios
 */
export const createConnectionPool = (maxConnections: number = 10) => {
  const connections: SupabaseClient<Database>[] = [];
  
  for (let i = 0; i < maxConnections; i++) {
    connections.push(createClient(supabaseUrl, supabaseAnonKey, {
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
          'X-Client-Info': `krong-thai-sop-system-pool-${i}@1.0.0`,
        },
      },
    }));
  }

  let currentIndex = 0;

  return {
    getConnection: (): SupabaseClient<Database> => {
      const connection = connections[currentIndex];
      currentIndex = (currentIndex + 1) % connections.length;
      return connection;
    },
    closeAll: () => {
      // Supabase clients don't need explicit closing
      connections.length = 0;
    },
    getPoolSize: () => connections.length,
  };
};

/**
 * Types for better type safety
 */
export type DatabaseClient = SupabaseClient<Database>;
export type DatabaseError = {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
};

export type QueryResult<T> = {
  data: T | null;
  error: string | null;
};

export type ListQueryResult<T> = {
  data: T[] | null;
  error: string | null;
};

/**
 * Export createClient function for API routes that need client-side supabase clients
 * This creates a new client with the same configuration as our main client
 */
export function createClient() {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // We handle sessions manually with PIN auth
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'krong-thai-sop-system@1.0.0',
      },
    },
  });
}

// Export types for external use
export * from '@/types/supabase';