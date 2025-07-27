#!/usr/bin/env node

/**
 * Debug Database Script
 * Checks the current state of the database and auth_users table
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugDatabase() {
  console.log('🔍 Debugging database connection and tables...\n');
  
  try {
    // Check if we can connect to the database
    console.log('📡 Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('restaurants')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      return;
    }
    console.log('✅ Database connection successful\n');

    // Check restaurants table
    console.log('🏢 Checking restaurants table...');
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*');
    
    if (restaurantError) {
      console.error('❌ Error querying restaurants:', restaurantError);
    } else {
      console.log(`✅ Found ${restaurants.length} restaurants:`);
      restaurants.forEach(r => console.log(`   - ${r.name} (${r.id})`));
    }
    console.log();

    // Check auth_users table structure and data
    console.log('👤 Checking auth_users table...');
    const { data: users, error: usersError } = await supabase
      .from('auth_users')
      .select('*');
    
    if (usersError) {
      console.error('❌ Error querying auth_users:', usersError);
      
      // Try to get table schema info
      console.log('🔍 Checking if auth_users table exists...');
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { table_name: 'auth_users' });
      
      if (tableError) {
        console.error('❌ Cannot get table info:', tableError);
      }
    } else {
      console.log(`✅ Found ${users.length} users in auth_users table:`);
      users.forEach(u => console.log(`   - ${u.email} (${u.role}) - Active: ${u.is_active}`));
    }
    console.log();

    // Specifically check for admin user
    console.log('🔍 Looking specifically for admin@krongthai.com...');
    const { data: adminUser, error: adminError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', 'admin@krongthai.com')
      .single();
    
    if (adminError) {
      console.error('❌ Admin user not found:', adminError);
    } else {
      console.log('✅ Admin user found:', {
        email: adminUser.email,
        role: adminUser.role,
        active: adminUser.is_active,
        restaurant_id: adminUser.restaurant_id
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugDatabase().catch(console.error);