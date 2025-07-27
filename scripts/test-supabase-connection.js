#!/usr/bin/env node

/**
 * Test Supabase Connection Script
 * Tests database connectivity and checks for existing data
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...\n');

console.log('Configuration:');
console.log(`URL: ${supabaseUrl}`);
console.log(`Anon Key: ${anonKey ? 'Present' : 'Missing'}`);
console.log(`Service Key: ${serviceKey && serviceKey !== 'development_service_key_replace_in_production' ? 'Present' : 'Missing/Placeholder'}\n`);

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Test with anon key first
const supabase = createClient(supabaseUrl, anonKey);

async function testConnection() {
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const { data, error } = await supabase.from('restaurants').select('count').limit(1);
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'Unknown'}`);
      
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('   💡 This suggests the database tables haven\'t been created yet');
        return 'tables_missing';
      } else if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('   💡 This suggests RLS policies are blocking access (expected)');
        return 'rls_blocking';
      }
      return 'connection_failed';
    } else {
      console.log('   ✅ Basic connection successful');
      return 'connected';
    }
  } catch (err) {
    console.log(`   ❌ Network error: ${err.message}`);
    return 'network_error';
  }
}

async function checkTables() {
  console.log('\n2. Checking if tables exist...');
  
  if (serviceKey && serviceKey !== 'development_service_key_replace_in_production') {
    const adminClient = createClient(supabaseUrl, serviceKey);
    
    try {
      const { data, error } = await adminClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['restaurants', 'auth_users', 'sop_categories', 'sop_documents']);
      
      if (error) {
        console.log(`   ❌ Error checking tables: ${error.message}`);
        return false;
      }
      
      const tableNames = data.map(t => t.table_name);
      console.log(`   Tables found: ${tableNames.join(', ')}`);
      return tableNames.length > 0;
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      return false;
    }
  } else {
    console.log('   ⚠️  Service role key not available - cannot check tables directly');
    return null;
  }
}

async function checkData() {
  console.log('\n3. Checking for existing data...');
  
  if (serviceKey && serviceKey !== 'development_service_key_replace_in_production') {
    const adminClient = createClient(supabaseUrl, serviceKey);
    
    try {
      // Check restaurants
      const { data: restaurants, error: restError } = await adminClient
        .from('restaurants')
        .select('id, name')
        .limit(5);
      
      if (!restError && restaurants) {
        console.log(`   Restaurants: ${restaurants.length} found`);
        restaurants.forEach(r => console.log(`     - ${r.name} (${r.id})`));
      }
      
      // Check users
      const { data: users, error: userError } = await adminClient
        .from('auth_users')
        .select('id, email, role')
        .limit(5);
      
      if (!userError && users) {
        console.log(`   Users: ${users.length} found`);
        users.forEach(u => console.log(`     - ${u.email} (${u.role})`));
      }
      
      // Check categories
      const { data: categories, error: catError } = await adminClient
        .from('sop_categories')
        .select('code, name')
        .limit(5);
      
      if (!catError && categories) {
        console.log(`   SOP Categories: ${categories.length} found`);
        categories.forEach(c => console.log(`     - ${c.code}: ${c.name}`));
      }
      
      return {
        restaurants: restaurants?.length || 0,
        users: users?.length || 0,
        categories: categories?.length || 0
      };
      
    } catch (err) {
      console.log(`   ❌ Error checking data: ${err.message}`);
      return null;
    }
  } else {
    console.log('   ⚠️  Service role key not available - cannot check data');
    return null;
  }
}

async function testAuthentication() {
  console.log('\n4. Testing authentication functions...');
  
  if (serviceKey && serviceKey !== 'development_service_key_replace_in_production') {
    const adminClient = createClient(supabaseUrl, serviceKey);
    
    try {
      // Test PIN validation function
      const { data, error } = await adminClient.rpc('validate_pin', {
        user_email: 'admin@krongthai.com',
        pin_input: '1234'
      });
      
      if (error) {
        console.log(`   ❌ PIN validation error: ${error.message}`);
        return false;
      }
      
      if (data && data.length > 0) {
        console.log(`   ✅ PIN validation successful for ${data[0].full_name}`);
        return true;
      } else {
        console.log('   ❌ No user data returned from PIN validation');
        return false;
      }
    } catch (err) {
      console.log(`   ❌ Error testing authentication: ${err.message}`);
      return false;
    }
  } else {
    console.log('   ⚠️  Service role key not available - cannot test authentication');
    return null;
  }
}

async function main() {
  const connectionResult = await testConnection();
  const tablesExist = await checkTables();
  const dataStatus = await checkData();
  const authWorks = await testAuthentication();
  
  console.log('\n📊 Summary:');
  console.log('===================');
  
  console.log(`Connection: ${connectionResult === 'connected' ? '✅ Working' : '❌ Issues detected'}`);
  
  if (tablesExist === true) {
    console.log('Tables: ✅ Exist');
  } else if (tablesExist === false) {
    console.log('Tables: ❌ Missing - migrations need to be run');
  } else {
    console.log('Tables: ⚠️  Cannot verify without service key');
  }
  
  if (dataStatus) {
    if (dataStatus.restaurants > 0 && dataStatus.users > 0) {
      console.log('Data: ✅ Present');
    } else {
      console.log('Data: ❌ Missing - seed data needs to be loaded');
    }
  } else {
    console.log('Data: ⚠️  Cannot verify without service key');
  }
  
  if (authWorks === true) {
    console.log('Authentication: ✅ Working');
  } else if (authWorks === false) {
    console.log('Authentication: ❌ Not working');
  } else {
    console.log('Authentication: ⚠️  Cannot test without service key');
  }
  
  console.log('\n🎯 Next Steps:');
  
  if (serviceKey === 'development_service_key_replace_in_production') {
    console.log('1. 🔑 Get real service role key from Supabase dashboard');
    console.log('   - Go to: https://supabase.com/dashboard/project/blimbcomhmhlubqngben/settings/api');
    console.log('   - Copy the "service_role" key');
    console.log('   - Update SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  
  if (connectionResult === 'tables_missing' || tablesExist === false) {
    console.log('2. 📋 Run database migrations to create tables');
    console.log('   - Run: node scripts/run-migrations.js');
  }
  
  if (dataStatus && (dataStatus.restaurants === 0 || dataStatus.users === 0)) {
    console.log('3. 🌱 Load seed data');
    console.log('   - Run: node scripts/load-seed-data.js');
  }
  
  if (authWorks === false) {
    console.log('4. 🔐 Test authentication');
    console.log('   - Run: node scripts/test-auth.js');
  }
  
  console.log('\n');
}

main().catch(console.error);