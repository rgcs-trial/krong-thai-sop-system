#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * Tests the Supabase database connection and validates the environment
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '.env.local') })

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(`${title}`, 'bold')
  log(`${'='.repeat(60)}`, 'cyan')
}

async function testSupabaseConnection() {
  logSection('🔍 SUPABASE CONNECTION TEST')
  
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    log('\n📋 Environment Variables Check:', 'blue')
    log(`✓ SUPABASE_URL: ${supabaseUrl ? 'Present' : 'Missing'}`, supabaseUrl ? 'green' : 'red')
    log(`✓ ANON_KEY: ${supabaseAnonKey ? 'Present (first 20 chars: ' + supabaseAnonKey.substring(0, 20) + '...)' : 'Missing'}`, supabaseAnonKey ? 'green' : 'red')
    log(`✓ SERVICE_ROLE_KEY: ${serviceRoleKey ? 'Present' : 'Missing'}`, serviceRoleKey ? 'green' : 'red')

    if (!supabaseUrl || !supabaseAnonKey) {
      log('\n❌ Missing required environment variables', 'red')
      return false
    }

    // Test basic connection with anon key
    log('\n🔌 Testing Anonymous Connection...', 'blue')
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
    
    try {
      const { data, error } = await supabaseAnon.from('restaurants').select('count').limit(1)
      
      if (error) {
        log(`❌ Anonymous connection failed: ${error.message}`, 'red')
        log(`   Error code: ${error.code}`, 'yellow')
        log(`   Error details: ${error.details}`, 'yellow')
        
        // Check if it's a 404 (project not found/paused)
        if (error.message.includes('404') || error.code === 'PGRST116') {
          log('\n🚨 Project appears to be paused or inactive!', 'red')
          log('   This typically happens when:', 'yellow')
          log('   • Project has been paused due to inactivity', 'yellow')
          log('   • Project URL has changed', 'yellow')
          log('   • Project has been deleted', 'yellow')
        }
        
        return false
      } else {
        log('✅ Anonymous connection successful!', 'green')
        log(`   Response: ${JSON.stringify(data)}`, 'cyan')
      }
    } catch (fetchError) {
      log(`❌ Network error: ${fetchError.message}`, 'red')
      
      // Test if the URL is reachable
      log('\n🌐 Testing URL accessibility...', 'blue')
      try {
        const response = await fetch(supabaseUrl)
        log(`   HTTP Status: ${response.status}`, response.ok ? 'green' : 'red')
        
        if (response.status === 404) {
          log('🚨 Project not found (404) - likely paused or deleted', 'red')
        }
      } catch (urlError) {
        log(`   URL not accessible: ${urlError.message}`, 'red')
      }
      
      return false
    }

    // Test service role connection if available
    if (serviceRoleKey) {
      log('\n🔑 Testing Service Role Connection...', 'blue')
      const supabaseService = createClient(supabaseUrl, serviceRoleKey)
      
      try {
        const { data: tables, error: tablesError } = await supabaseService
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .limit(5)

        if (tablesError) {
          log(`❌ Service role connection failed: ${tablesError.message}`, 'red')
        } else {
          log('✅ Service role connection successful!', 'green')
          log(`   Found ${tables?.length || 0} tables`, 'cyan')
          if (tables?.length > 0) {
            log(`   Sample tables: ${tables.map(t => t.table_name).join(', ')}`, 'cyan')
          }
        }
      } catch (serviceError) {
        log(`❌ Service role error: ${serviceError.message}`, 'red')
      }
    }

    // Test specific tables that should exist
    log('\n📊 Testing Database Schema...', 'blue')
    const expectedTables = ['restaurants', 'auth_users', 'sop_categories', 'sop_documents', 'translation_keys']
    
    for (const table of expectedTables) {
      try {
        const { error } = await supabaseAnon.from(table).select('*').limit(1)
        if (error) {
          if (error.code === '42P01') {
            log(`❌ Table '${table}' does not exist`, 'red')
          } else {
            log(`⚠️  Table '${table}' exists but access denied (expected for RLS)`, 'yellow')
          }
        } else {
          log(`✅ Table '${table}' accessible`, 'green')
        }
      } catch (tableError) {
        log(`❌ Error checking table '${table}': ${tableError.message}`, 'red')
      }
    }

    return true

  } catch (error) {
    log(`\n💥 Unexpected error: ${error.message}`, 'red')
    console.error(error)
    return false
  }
}

async function checkLocalSupabase() {
  logSection('🏠 LOCAL SUPABASE CHECK')
  
  try {
    // Check if local Supabase is running
    log('🔍 Checking for local Supabase instance...', 'blue')
    
    const localUrl = 'http://localhost:54321'
    try {
      const response = await fetch(`${localUrl}/rest/v1/`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
        }
      })
      
      if (response.ok) {
        log('✅ Local Supabase is running!', 'green')
        log(`   URL: ${localUrl}`, 'cyan')
        return true
      } else {
        log(`❌ Local Supabase responded with status: ${response.status}`, 'red')
        return false
      }
    } catch (fetchError) {
      log('❌ Local Supabase is not running', 'red')
      log('   To start local Supabase:', 'yellow')
      log('   • Install Supabase CLI: npm install -g supabase', 'yellow')
      log('   • Start local instance: supabase start', 'yellow')
      return false
    }
  } catch (error) {
    log(`💥 Error checking local Supabase: ${error.message}`, 'red')
    return false
  }
}

async function provideSolutions() {
  logSection('💡 SOLUTIONS & NEXT STEPS')
  
  log('Based on the test results, here are your options:', 'blue')
  log('')
  
  log('🔄 Option 1: Resume/Reactivate Supabase Project', 'green')
  log('   • Log into your Supabase dashboard', 'yellow')
  log('   • Check if project "blimbcomhmhlubqngben" is paused', 'yellow')
  log('   • Click "Resume" if available', 'yellow')
  log('   • Projects auto-pause after 1 week of inactivity', 'yellow')
  log('')
  
  log('🆕 Option 2: Create New Supabase Project', 'green')
  log('   • Go to https://supabase.com/dashboard', 'yellow')
  log('   • Create a new project', 'yellow')
  log('   • Update .env.local with new credentials', 'yellow')
  log('   • Run database migrations', 'yellow')
  log('')
  
  log('🏠 Option 3: Use Local Supabase Development', 'green')
  log('   • Install Supabase CLI: npm install -g supabase', 'yellow')
  log('   • Initialize project: supabase init', 'yellow')
  log('   • Start local instance: supabase start', 'yellow')
  log('   • Update .env.local to use localhost:54321', 'yellow')
  log('')
  
  log('⚡ Quick Fix Commands:', 'magenta')
  log('   # Check Supabase CLI status', 'cyan')
  log('   supabase status', 'cyan')
  log('')
  log('   # Start local development', 'cyan')
  log('   supabase start', 'cyan')
  log('')
  log('   # Generate types from local DB', 'cyan')
  log('   pnpm db:generate-types', 'cyan')
}

// Main execution
async function main() {
  log(`${colors.bold}${colors.magenta}🍜 KRONG THAI SOP SYSTEM - DATABASE CONNECTION TEST${colors.reset}`)
  log(`${colors.cyan}Version: 0.2.0 | Node: ${process.version} | Platform: ${process.platform}${colors.reset}`)
  
  const remoteWorking = await testSupabaseConnection()
  const localAvailable = await checkLocalSupabase()
  
  logSection('📋 SUMMARY')
  log(`Remote Supabase: ${remoteWorking ? '✅ Working' : '❌ Not Working'}`, remoteWorking ? 'green' : 'red')
  log(`Local Supabase: ${localAvailable ? '✅ Available' : '❌ Not Available'}`, localAvailable ? 'green' : 'red')
  
  if (!remoteWorking && !localAvailable) {
    log('\n🚨 No working database connection found!', 'red')
    await provideSolutions()
  } else if (localAvailable) {
    log('\n✅ Local Supabase is ready for development!', 'green')
  } else if (remoteWorking) {
    log('\n✅ Remote Supabase connection is working!', 'green')
  }
  
  log('\n🏁 Test completed!', 'bold')
}

// Run the test
main().catch(console.error)