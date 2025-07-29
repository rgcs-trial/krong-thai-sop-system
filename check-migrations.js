#!/usr/bin/env node

/**
 * Check which migrations have been applied to the Supabase database
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '.env.local') })

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function checkMigrations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    log('❌ Missing Supabase credentials', 'red')
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  log('🔍 Checking database schema and tables...', 'blue')

  try {
    // Check for migration tracking table (common names)
    const migrationTables = ['schema_migrations', 'supabase_migrations', '_migrations']
    let migrationTable = null

    for (const table of migrationTables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (!error) {
          migrationTable = table
          log(`✅ Found migration table: ${table}`, 'green')
          break
        }
      } catch (e) {
        // Table doesn't exist, continue
      }
    }

    if (migrationTable) {
      const { data: migrations, error } = await supabase
        .from(migrationTable)
        .select('*')
        .order('version', { ascending: true })

      if (!error && migrations) {
        log(`\n📋 Applied migrations (${migrations.length}):`, 'cyan')
        migrations.forEach(migration => {
          log(`  ✓ ${migration.version} - ${migration.name || 'Unnamed'}`, 'green')
        })
      }
    } else {
      log('⚠️  No migration tracking table found', 'yellow')
    }

    // Check for key tables to understand current schema state
    log('\n🗂️  Checking key tables:', 'blue')

    const keyTables = [
      'restaurants',
      'auth_users', 
      'sop_categories',
      'sop_documents',
      'translation_keys',
      'translations',
      'training_modules',
      'training_progress'
    ]

    for (const table of keyTables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1)
        if (error && error.code === '42P01') {
          log(`  ❌ ${table} - Missing`, 'red')
        } else if (error && error.code === 'PGRST116') {
          log(`  ✅ ${table} - Exists (RLS protected)`, 'green')
        } else {
          log(`  ✅ ${table} - Exists and accessible`, 'green')
        }
      } catch (e) {
        log(`  ❓ ${table} - Unknown status`, 'yellow')
      }
    }

    // Check specific translation system tables
    log('\n🌐 Translation system tables:', 'blue')
    const translationTables = [
      'translation_keys',
      'translations', 
      'translation_history',
      'translation_projects',
      'translation_cache'
    ]

    let translationSystemExists = true
    for (const table of translationTables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1)
        if (error && error.code === '42P01') {
          log(`  ❌ ${table} - Missing`, 'red')
          translationSystemExists = false
        } else {
          log(`  ✅ ${table} - Exists`, 'green')
        }
      } catch (e) {
        log(`  ❓ ${table} - Unknown status`, 'yellow')
      }
    }

    if (!translationSystemExists) {
      log('\n🚨 Translation system appears incomplete!', 'red')
      log('   You may need to run migrations 014-017 for translation system', 'yellow')
    }

  } catch (error) {
    log(`❌ Error checking migrations: ${error.message}`, 'red')
  }
}

async function main() {
  log('🔍 CHECKING SUPABASE MIGRATIONS', 'bold')
  await checkMigrations()
  log('\n✅ Migration check complete!', 'green')
}

main().catch(console.error)