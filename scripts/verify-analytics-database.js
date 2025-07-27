#!/usr/bin/env node

/**
 * Analytics Database Schema Verification Script
 * Verifies all analytics-related tables, queries, and sample data
 * For Krong Thai SOP Management System
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Analytics Database Verification Starting...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please check .env.local file contains:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Test database connection
 */
async function testConnection() {
  console.log('📡 Testing database connection...');
  try {
    const { data, error } = await supabase.from('restaurants').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Database connection successful\n');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Verify analytics-related tables exist
 */
async function verifyTables() {
  console.log('🗄️ Verifying analytics database tables...\n');
  
  const requiredTables = [
    // Core analytics tables
    'restaurants',
    'auth_users', 
    'sop_documents',
    'sop_categories',
    'training_modules',
    'user_training_progress',
    'training_assessments',
    'training_certificates',
    'form_submissions',
    'audit_logs',
    
    // Performance monitoring tables (from migration 007)
    'query_performance_log',
    'system_alerts',
    'capacity_metrics',
    
    // Session and progress tracking
    'location_sessions',
    'user_bookmarks',
    'user_progress_summary',
    'uploaded_files'
  ];
  
  const results = [];
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error && error.code === 'PGRST116') {
        // Table doesn't exist
        results.push({ table, exists: false, error: 'Table not found' });
        console.log(`❌ ${table} - Table not found`);
      } else if (error) {
        results.push({ table, exists: false, error: error.message });
        console.log(`❌ ${table} - Error: ${error.message}`);
      } else {
        results.push({ table, exists: true, rowCount: Array.isArray(data) ? data.length : 0 });
        console.log(`✅ ${table} - Available`);
      }
    } catch (err) {
      results.push({ table, exists: false, error: err.message });
      console.log(`❌ ${table} - Error: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Table Verification Summary:`);
  const existingTables = results.filter(r => r.exists).length;
  const totalTables = results.length;
  console.log(`${existingTables}/${totalTables} tables available\n`);
  
  return results;
}

/**
 * Verify RLS policies for analytics tables
 */
async function verifyRLSPolicies() {
  console.log('🔒 Verifying Row Level Security policies...\n');
  
  const tablesWithRLS = [
    'restaurants',
    'auth_users',
    'sop_documents', 
    'training_modules',
    'user_training_progress',
    'audit_logs',
    'query_performance_log',
    'system_alerts',
    'capacity_metrics'
  ];
  
  const results = [];
  
  for (const table of tablesWithRLS) {
    try {
      // Check if RLS is enabled by trying to query as anonymous user
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === '42501') {
        // RLS is working (insufficient privilege error)
        results.push({ table, rlsEnabled: true });
        console.log(`✅ ${table} - RLS enabled`);
      } else if (error) {
        results.push({ table, rlsEnabled: false, error: error.message });
        console.log(`⚠️ ${table} - RLS error: ${error.message}`);
      } else {
        // No error means either no RLS or policies allow access
        results.push({ table, rlsEnabled: 'unknown', note: 'May have permissive policies' });
        console.log(`⚠️ ${table} - RLS status unclear (data accessible)`);
      }
    } catch (err) {
      results.push({ table, rlsEnabled: false, error: err.message });
      console.log(`❌ ${table} - Error checking RLS: ${err.message}`);
    }
  }
  
  console.log('');
  return results;
}

/**
 * Test analytics queries
 */
async function testAnalyticsQueries() {
  console.log('📈 Testing analytics queries...\n');
  
  const queries = [
    {
      name: 'SOP View Statistics',
      query: async () => {
        return await supabase
          .from('sop_documents')
          .select(`
            id,
            title,
            category_id,
            restaurant_id,
            status,
            created_at,
            sop_categories!inner(name)
          `)
          .eq('status', 'approved')
          .limit(5);
      }
    },
    {
      name: 'Training Progress Analytics', 
      query: async () => {
        return await supabase
          .from('user_training_progress')
          .select(`
            id,
            user_id,
            module_id,
            status,
            progress_percentage,
            training_modules!inner(title, restaurant_id)
          `)
          .limit(5);
      }
    },
    {
      name: 'User Activity Summary',
      query: async () => {
        return await supabase
          .from('auth_users')
          .select(`
            id,
            full_name,
            role,
            restaurant_id,
            last_login_at,
            is_active
          `)
          .eq('is_active', true)
          .limit(5);
      }
    },
    {
      name: 'System Alerts Check',
      query: async () => {
        return await supabase
          .from('system_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
      }
    },
    {
      name: 'Audit Log Sample',
      query: async () => {
        return await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
      }
    }
  ];
  
  const results = [];
  
  for (const { name, query } of queries) {
    try {
      console.log(`  Testing: ${name}...`);
      const startTime = Date.now();
      const { data, error } = await query();
      const executionTime = Date.now() - startTime;
      
      if (error) {
        results.push({ 
          name, 
          success: false, 
          error: error.message,
          executionTime
        });
        console.log(`    ❌ Failed: ${error.message}`);
      } else {
        results.push({ 
          name, 
          success: true, 
          rowCount: data?.length || 0,
          executionTime,
          sample: data?.[0] || null
        });
        console.log(`    ✅ Success: ${data?.length || 0} rows (${executionTime}ms)`);
      }
    } catch (err) {
      results.push({ 
        name, 
        success: false, 
        error: err.message,
        executionTime: null
      });
      console.log(`    ❌ Error: ${err.message}`);
    }
  }
  
  console.log('');
  return results;
}

/**
 * Check for sample data availability
 */
async function checkSampleData() {
  console.log('📋 Checking sample data availability...\n');
  
  const dataChecks = [
    {
      name: 'Restaurant Data',
      table: 'restaurants',
      expectedMin: 1
    },
    {
      name: 'SOP Categories (16 standard)',
      table: 'sop_categories', 
      expectedMin: 16
    },
    {
      name: 'Sample Users',
      table: 'auth_users',
      expectedMin: 3
    },
    {
      name: 'Sample SOPs',
      table: 'sop_documents',
      expectedMin: 1
    },
    {
      name: 'Sample Training Modules',
      table: 'training_modules',
      expectedMin: 0 // Optional
    }
  ];
  
  const results = [];
  
  for (const { name, table, expectedMin } of dataChecks) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });
        
      if (error) {
        results.push({ name, table, error: error.message, available: false });
        console.log(`❌ ${name}: Error - ${error.message}`);
      } else {
        const rowCount = count || data?.length || 0;
        const adequate = rowCount >= expectedMin;
        results.push({ 
          name, 
          table, 
          rowCount, 
          expectedMin, 
          adequate,
          available: true 
        });
        
        if (adequate) {
          console.log(`✅ ${name}: ${rowCount} rows (adequate)`);
        } else {
          console.log(`⚠️ ${name}: ${rowCount} rows (expected min: ${expectedMin})`);
        }
      }
    } catch (err) {
      results.push({ name, table, error: err.message, available: false });
      console.log(`❌ ${name}: ${err.message}`);
    }
  }
  
  console.log('');
  return results;
}

/**
 * Test performance monitoring functions
 */
async function testPerformanceFunctions() {
  console.log('⚡ Testing performance monitoring functions...\n');
  
  const functions = [
    {
      name: 'log_query_performance',
      test: async () => {
        return await supabase.rpc('log_query_performance', {
          p_query_type: 'test_query',
          p_execution_time_ms: 150,
          p_query_text: 'SELECT * FROM test',
        });
      }
    },
    {
      name: 'get_performance_dashboard', 
      test: async () => {
        return await supabase.rpc('get_performance_dashboard', {
          p_hours: 24
        });
      }
    },
    {
      name: 'get_alert_summary',
      test: async () => {
        return await supabase.rpc('get_alert_summary', {
          p_hours: 24
        });
      }
    }
  ];
  
  const results = [];
  
  for (const { name, test } of functions) {
    try {
      console.log(`  Testing function: ${name}...`);
      const { data, error } = await test();
      
      if (error) {
        results.push({ name, available: false, error: error.message });
        console.log(`    ❌ Error: ${error.message}`);
      } else {
        results.push({ name, available: true, resultCount: data?.length || 0 });
        console.log(`    ✅ Success: ${data?.length || 0} results`);
      }
    } catch (err) {
      results.push({ name, available: false, error: err.message });
      console.log(`    ❌ Exception: ${err.message}`);
    }
  }
  
  console.log('');
  return results;
}

/**
 * Generate comprehensive verification report
 */
async function generateReport(tableResults, rlsResults, queryResults, dataResults, functionResults) {
  console.log('📊 ANALYTICS DATABASE VERIFICATION REPORT');
  console.log('==========================================\n');
  
  // Overall Health Score
  const totalTables = tableResults.length;
  const availableTables = tableResults.filter(r => r.exists).length;
  const successfulQueries = queryResults.filter(r => r.success).length;
  const totalQueries = queryResults.length;
  const adequateData = dataResults.filter(r => r.adequate !== false).length;
  const totalDataChecks = dataResults.length;
  const availableFunctions = functionResults.filter(r => r.available).length;
  const totalFunctions = functionResults.length;
  
  const healthScore = Math.round(
    ((availableTables / totalTables) * 0.3 +
     (successfulQueries / totalQueries) * 0.3 +
     (adequateData / totalDataChecks) * 0.2 +
     (availableFunctions / totalFunctions) * 0.2) * 100
  );
  
  console.log(`🎯 Overall Health Score: ${healthScore}/100\n`);
  
  // Detailed Results
  console.log('📋 DETAILED RESULTS:');
  console.log('-------------------\n');
  
  console.log(`1. Database Tables: ${availableTables}/${totalTables} available`);
  const missingTables = tableResults.filter(r => !r.exists);
  if (missingTables.length > 0) {
    console.log('   Missing tables:');
    missingTables.forEach(t => console.log(`   - ${t.table}: ${t.error}`));
  }
  console.log('');
  
  console.log(`2. Analytics Queries: ${successfulQueries}/${totalQueries} successful`);
  const failedQueries = queryResults.filter(r => !r.success);
  if (failedQueries.length > 0) {
    console.log('   Failed queries:');
    failedQueries.forEach(q => console.log(`   - ${q.name}: ${q.error}`));
  }
  console.log('');
  
  console.log(`3. Sample Data: ${adequateData}/${totalDataChecks} adequate`);
  const insufficientData = dataResults.filter(r => r.adequate === false);
  if (insufficientData.length > 0) {
    console.log('   Insufficient data:');
    insufficientData.forEach(d => console.log(`   - ${d.name}: ${d.rowCount}/${d.expectedMin} rows`));
  }
  console.log('');
  
  console.log(`4. Monitoring Functions: ${availableFunctions}/${totalFunctions} available`);
  const missingFunctions = functionResults.filter(r => !r.available);
  if (missingFunctions.length > 0) {
    console.log('   Missing functions:');
    missingFunctions.forEach(f => console.log(`   - ${f.name}: ${f.error}`));
  }
  console.log('');
  
  // Performance Analysis
  const queryTimes = queryResults.filter(r => r.success && r.executionTime);
  if (queryTimes.length > 0) {
    const avgTime = Math.round(queryTimes.reduce((sum, q) => sum + q.executionTime, 0) / queryTimes.length);
    const maxTime = Math.max(...queryTimes.map(q => q.executionTime));
    console.log(`⚡ Query Performance:`);
    console.log(`   Average execution time: ${avgTime}ms`);
    console.log(`   Maximum execution time: ${maxTime}ms`);
    console.log(`   Target: <100ms for search, <50ms for SOP queries\n`);
  }
  
  // Recommendations
  console.log('💡 RECOMMENDATIONS:');
  console.log('-------------------\n');
  
  if (healthScore >= 90) {
    console.log('✅ Analytics database is in excellent condition!');
    console.log('✅ All systems ready for production deployment.');
  } else if (healthScore >= 75) {
    console.log('✅ Analytics database is in good condition.');
    console.log('⚠️ Minor issues should be addressed before production.');
  } else if (healthScore >= 50) {
    console.log('⚠️ Analytics database needs attention.');
    console.log('❌ Several issues must be fixed before production.');
  } else {
    console.log('❌ Analytics database has critical issues.');
    console.log('❌ Major fixes required before any deployment.');
  }
  
  console.log('\n');
  
  // Specific recommendations
  if (missingTables.length > 0) {
    console.log('🔧 Run missing database migrations:');
    console.log('   pnpm supabase db reset');
    console.log('   pnpm supabase migration up\n');
  }
  
  if (insufficientData.length > 0) {
    console.log('📋 Add sample data by running:');
    console.log('   pnpm supabase db reset (includes seed data)\n');
  }
  
  if (failedQueries.length > 0) {
    console.log('🔍 Check RLS policies and table permissions\n');
  }
  
  return {
    healthScore,
    summary: {
      tables: `${availableTables}/${totalTables}`,
      queries: `${successfulQueries}/${totalQueries}`, 
      data: `${adequateData}/${totalDataChecks}`,
      functions: `${availableFunctions}/${totalFunctions}`
    }
  };
}

/**
 * Main verification process
 */
async function main() {
  try {
    // Test basic connection
    const connectionOk = await testConnection();
    if (!connectionOk) {
      process.exit(1);
    }
    
    // Run all verification tests
    const tableResults = await verifyTables();
    const rlsResults = await verifyRLSPolicies();
    const queryResults = await testAnalyticsQueries();
    const dataResults = await checkSampleData();
    const functionResults = await testPerformanceFunctions();
    
    // Generate comprehensive report
    const report = await generateReport(
      tableResults, 
      rlsResults, 
      queryResults, 
      dataResults, 
      functionResults
    );
    
    console.log('🏁 Verification completed!');
    console.log(`📊 Final Score: ${report.healthScore}/100`);
    
    // Exit with appropriate code
    process.exit(report.healthScore >= 75 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Verification failed with error:', error.message);
    process.exit(1);
  }
}

// Run the verification
main().catch(console.error);