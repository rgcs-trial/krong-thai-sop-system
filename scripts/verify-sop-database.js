#!/usr/bin/env node

/**
 * SOP Database Verification Script
 * Restaurant Krong Thai SOP Management System
 * 
 * Purpose: Verify database schema, data integrity, and performance
 * Usage: node scripts/verify-sop-database.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔍 SOP Database Verification Starting...\n');

/**
 * Verify table existence and structure
 */
async function verifyTableStructure() {
  console.log('📋 Verifying Table Structure...');
  
  const expectedTables = [
    // Core existing tables
    'restaurants', 'auth_users', 'sop_categories', 'sop_documents',
    'form_templates', 'form_submissions', 'audit_logs',
    
    // New SOP workflow tables
    'sop_steps', 'sop_completions', 'sop_assignments', 'sop_photos',
    'sop_schedules', 'sop_approvals', 'sop_versions', 'sop_analytics',
    'sop_equipment',
    
    // Translation system tables
    'translation_keys', 'translations', 'translation_history',
    'translation_projects', 'translation_cache', 'translation_analytics'
  ];
  
  try {
    // Check table existence
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', expectedTables);
    
    if (error) throw error;
    
    const existingTables = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length === 0) {
      console.log('  ✅ All expected tables exist');
    } else {
      console.log('  ❌ Missing tables:', missingTables);
      return false;
    }
    
    // Verify key columns exist
    const keyColumns = [
      { table: 'sop_documents', column: 'title_th' },
      { table: 'sop_steps', column: 'critical_control_point' },
      { table: 'sop_completions', column: 'compliance_score' },
      { table: 'sop_assignments', column: 'escalation_level' },
      { table: 'sop_photos', column: 'verification_status' },
      { table: 'sop_equipment', column: 'next_maintenance_date' }
    ];
    
    for (const { table, column } of keyColumns) {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', table)
        .eq('column_name', column);
      
      if (error || !data.length) {
        console.log(`  ❌ Missing column ${column} in table ${table}`);
        return false;
      }
    }
    
    console.log('  ✅ Key columns verified');
    return true;
    
  } catch (error) {
    console.error('  ❌ Table verification failed:', error.message);
    return false;
  }
}

/**
 * Verify RLS policies are active
 */
async function verifyRLSPolicies() {
  console.log('\n🔒 Verifying RLS Policies...');
  
  const sopTables = [
    'sop_documents', 'sop_steps', 'sop_completions', 'sop_assignments',
    'sop_photos', 'sop_schedules', 'sop_approvals', 'sop_versions',
    'sop_analytics', 'sop_equipment'
  ];
  
  try {
    for (const table of sopTables) {
      // Check if RLS is enabled
      const { data: rlsData, error: rlsError } = await supabase
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', table)
        .eq('schemaname', 'public');
      
      if (rlsError || !rlsData.length || !rlsData[0].rowsecurity) {
        console.log(`  ❌ RLS not enabled for table: ${table}`);
        return false;
      }
      
      // Check if policies exist
      const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('policyname')
        .eq('tablename', table);
      
      if (policyError || !policies.length) {
        console.log(`  ❌ No RLS policies found for table: ${table}`);
        return false;
      }
    }
    
    console.log('  ✅ RLS policies active on all SOP tables');
    return true;
    
  } catch (error) {
    console.error('  ❌ RLS verification failed:', error.message);
    return false;
  }
}

/**
 * Verify database functions exist
 */
async function verifyDatabaseFunctions() {
  console.log('\n⚙️ Verifying Database Functions...');
  
  const expectedFunctions = [
    'calculate_sop_performance_metrics',
    'calculate_staff_sop_performance', 
    'calculate_restaurant_dashboard_metrics',
    'generate_compliance_alerts',
    'calculate_equipment_analytics',
    'search_sop_documents',
    'process_scheduled_notifications',
    'send_overdue_reminders',
    'manage_user_subscriptions'
  ];
  
  try {
    const { data: functions, error } = await supabase
      .from('pg_proc')
      .select('proname')
      .in('proname', expectedFunctions);
    
    if (error) throw error;
    
    const existingFunctions = functions.map(f => f.proname);
    const missingFunctions = expectedFunctions.filter(f => !existingFunctions.includes(f));
    
    if (missingFunctions.length === 0) {
      console.log('  ✅ All analytics functions exist');
    } else {
      console.log('  ❌ Missing functions:', missingFunctions);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('  ❌ Function verification failed:', error.message);
    return false;
  }
}

/**
 * Verify sample data integrity
 */
async function verifySampleData() {
  console.log('\n📊 Verifying Sample Data...');
  
  try {
    // Check restaurants
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*');
    
    if (restaurantError || !restaurants.length) {
      console.log('  ❌ No restaurant data found');
      return false;
    }
    
    // Check SOP categories
    const { data: categories, error: categoryError } = await supabase
      .from('sop_categories')
      .select('*');
    
    if (categoryError || categories.length < 16) {
      console.log('  ❌ Insufficient SOP categories (expected 16)');
      return false;
    }
    
    // Check users
    const { data: users, error: userError } = await supabase
      .from('auth_users')
      .select('*');
    
    if (userError || users.length < 3) {
      console.log('  ❌ Insufficient user accounts for testing');
      return false;
    }
    
    // Check sample SOPs
    const { data: sops, error: sopError } = await supabase
      .from('sop_documents')
      .select('*');
    
    if (sopError) {
      console.log('  ❌ Error checking SOP documents:', sopError.message);
      return false;
    }
    
    console.log(`  ✅ Sample data verified:`);
    console.log(`    - Restaurants: ${restaurants.length}`);
    console.log(`    - Categories: ${categories.length}`);
    console.log(`    - Users: ${users.length}`);
    console.log(`    - SOP Documents: ${sops.length}`);
    
    return true;
    
  } catch (error) {
    console.error('  ❌ Sample data verification failed:', error.message);
    return false;
  }
}

/**
 * Test analytics function performance
 */
async function testAnalyticsPerformance() {
  console.log('\n⚡ Testing Analytics Performance...');
  
  try {
    const restaurantId = '550e8400-e29b-41d4-a716-446655440000';
    
    // Test dashboard metrics function
    const startTime = Date.now();
    const { data, error } = await supabase
      .rpc('calculate_restaurant_dashboard_metrics', {
        restaurant_id_param: restaurantId,
        period_days: 30
      });
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.log('  ❌ Analytics function error:', error.message);
      return false;
    }
    
    console.log(`  ✅ Dashboard analytics completed in ${duration}ms`);
    console.log(`    - Metrics returned: ${data ? data.length : 0}`);
    
    if (duration > 2000) {
      console.log('  ⚠️ Performance warning: Query took > 2 seconds');
    }
    
    return true;
    
  } catch (error) {
    console.error('  ❌ Analytics performance test failed:', error.message);
    return false;
  }
}

/**
 * Test search performance
 */
async function testSearchPerformance() {
  console.log('\n🔍 Testing Search Performance...');
  
  try {
    const restaurantId = '550e8400-e29b-41d4-a716-446655440000';
    
    // Test search function
    const startTime = Date.now();
    const { data, error } = await supabase
      .rpc('search_sop_documents', {
        search_query: 'temperature',
        restaurant_id_param: restaurantId,
        limit_results: 10
      });
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.log('  ❌ Search function error:', error.message);
      return false;
    }
    
    console.log(`  ✅ Search completed in ${duration}ms`);
    console.log(`    - Results returned: ${data ? data.length : 0}`);
    
    if (duration > 100) {
      console.log('  ⚠️ Performance warning: Search took > 100ms');
    }
    
    return true;
    
  } catch (error) {
    console.error('  ❌ Search performance test failed:', error.message);
    return false;
  }
}

/**
 * Verify indexes exist
 */
async function verifyIndexes() {
  console.log('\n📇 Verifying Performance Indexes...');
  
  const criticalIndexes = [
    'idx_sop_documents_fulltext_en',
    'idx_sop_documents_fulltext_th',
    'idx_sop_assignments_overdue',
    'idx_sop_completions_performance',
    'idx_sop_photos_verification_workflow',
    'idx_sop_equipment_critical_status'
  ];
  
  try {
    const { data: indexes, error } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .in('indexname', criticalIndexes);
    
    if (error) throw error;
    
    const existingIndexes = indexes.map(i => i.indexname);
    const missingIndexes = criticalIndexes.filter(i => !existingIndexes.includes(i));
    
    if (missingIndexes.length === 0) {
      console.log('  ✅ All critical indexes exist');
    } else {
      console.log('  ❌ Missing indexes:', missingIndexes);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('  ❌ Index verification failed:', error.message);
    return false;
  }
}

/**
 * Generate verification report
 */
async function generateReport() {
  console.log('\n📋 Generating Verification Report...\n');
  
  const results = {
    tableStructure: await verifyTableStructure(),
    rlsPolicies: await verifyRLSPolicies(),
    databaseFunctions: await verifyDatabaseFunctions(),
    sampleData: await verifySampleData(),
    analyticsPerformance: await testAnalyticsPerformance(),
    searchPerformance: await testSearchPerformance(),
    indexes: await verifyIndexes()
  };
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log('═══════════════════════════════════════════════');
  console.log('📊 SOP DATABASE VERIFICATION REPORT');
  console.log('═══════════════════════════════════════════════');
  console.log(`Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
  console.log('');
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`${icon} ${test.padEnd(20)} ${status}`);
  });
  
  console.log('');
  
  if (successRate >= 100) {
    console.log('🎉 DATABASE VERIFICATION SUCCESSFUL!');
    console.log('   All systems operational and ready for production.');
  } else if (successRate >= 80) {
    console.log('⚠️ DATABASE VERIFICATION PARTIAL SUCCESS');
    console.log('   Minor issues detected. Review failed tests.');
  } else {
    console.log('❌ DATABASE VERIFICATION FAILED');
    console.log('   Critical issues detected. Do not deploy to production.');
  }
  
  console.log('\n═══════════════════════════════════════════════\n');
  
  return successRate >= 80;
}

/**
 * Main execution
 */
async function main() {
  try {
    const success = await generateReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Verification script failed:', error.message);
    process.exit(1);
  }
}

// Run verification
main();