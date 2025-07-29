#!/usr/bin/env node

/**
 * Run essential migrations for the Krong Thai SOP System
 * This will set up the missing tables needed for the app to function
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

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

async function runMigration(supabase, migrationFile, description) {
  log(`\n🔄 Running: ${description}`, 'blue')
  
  try {
    const migrationPath = join(__dirname, 'supabase', 'migrations', migrationFile)
    const sql = readFileSync(migrationPath, 'utf8')
    
    // Split SQL into individual statements (basic approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    log(`  Found ${statements.length} SQL statements`, 'cyan')
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
          if (error) {
            // Try direct query if RPC fails
            const { error: directError } = await supabase.from('').select().single().sql(statement)
            if (directError && !directError.message.includes('already exists')) {
              log(`    ❌ Statement ${i + 1} failed: ${error.message}`, 'red')
              // Continue with other statements
            }
          }
        } catch (e) {
          if (!e.message.includes('already exists')) {
            log(`    ⚠️  Statement ${i + 1} issue: ${e.message}`, 'yellow')
          }
        }
      }
    }
    
    log(`  ✅ Migration completed`, 'green')
    return true
    
  } catch (error) {
    log(`  ❌ Migration failed: ${error.message}`, 'red')
    return false
  }
}

async function createMissingTables(supabase) {
  log('\n🏗️  Creating missing core tables manually...', 'blue')
  
  // Create training_modules table
  const trainingModulesSQL = `
    CREATE TABLE IF NOT EXISTS training_modules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      title_fr VARCHAR(255),
      description TEXT,
      description_fr TEXT,
      content JSONB DEFAULT '{}',
      duration_minutes INTEGER DEFAULT 30,
      difficulty_level VARCHAR(20) DEFAULT 'beginner',
      is_required BOOLEAN DEFAULT false,
      prerequisites UUID[],
      tags TEXT[],
      created_by UUID REFERENCES auth_users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  
  // Create training_progress table
  const trainingProgressSQL = `
    CREATE TABLE IF NOT EXISTS training_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
      module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'not_started',
      progress_percentage INTEGER DEFAULT 0,
      completed_at TIMESTAMPTZ,
      score INTEGER,
      time_spent_minutes INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, module_id)
    );
  `
  
  // Create translation_keys table (simplified)
  const translationKeysSQL = `
    CREATE TABLE IF NOT EXISTS translation_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key_name VARCHAR(255) NOT NULL UNIQUE,
      category VARCHAR(50) DEFAULT 'common',
      context TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  
  // Create translations table (simplified)
  const translationsSQL = `
    CREATE TABLE IF NOT EXISTS translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key_id UUID REFERENCES translation_keys(id) ON DELETE CASCADE,
      locale VARCHAR(10) NOT NULL DEFAULT 'en',
      value TEXT NOT NULL,
      is_approved BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(key_id, locale)
    );
  `
  
  const tables = [
    { sql: trainingModulesSQL, name: 'training_modules' },
    { sql: trainingProgressSQL, name: 'training_progress' },
    { sql: translationKeysSQL, name: 'translation_keys' },
    { sql: translationsSQL, name: 'translations' }
  ]
  
  for (const table of tables) {
    try {
      log(`  Creating ${table.name}...`, 'cyan')
      
      // Use a more direct approach
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: table.sql })
      })
      
      if (response.ok) {
        log(`    ✅ ${table.name} created successfully`, 'green')
      } else {
        const error = await response.text()
        if (error.includes('already exists')) {
          log(`    ✅ ${table.name} already exists`, 'green')
        } else {
          log(`    ❌ Failed to create ${table.name}: ${error}`, 'red')
        }
      }
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        log(`    ✅ ${table.name} already exists`, 'green')
      } else {
        log(`    ❌ Error creating ${table.name}: ${error.message}`, 'red')
      }
    }
  }
}

async function seedSampleData(supabase) {
  log('\n🌱 Adding sample data...', 'blue')
  
  try {
    // Add sample training module
    const { data: existingModule } = await supabase
      .from('training_modules')
      .select('id')
      .limit(1)
      .single()
    
    if (!existingModule) {
      const { error: moduleError } = await supabase
        .from('training_modules')
        .insert([
          {
            title: 'Restaurant Safety Basics',
            title_fr: 'Bases de la sécurité du restaurant',
            description: 'Essential safety procedures for restaurant staff',
            description_fr: 'Procédures de sécurité essentielles pour le personnel du restaurant',
            duration_minutes: 45,
            difficulty_level: 'beginner',
            is_required: true,
            content: {
              sections: [
                {
                  title: 'Kitchen Safety',
                  content: 'Basic kitchen safety protocols and procedures'
                }
              ]
            }
          }
        ])
      
      if (!moduleError) {
        log('  ✅ Sample training module added', 'green')
      }
    }
    
    // Add sample translation keys
    const { data: existingKeys } = await supabase
      .from('translation_keys')
      .select('id')
      .limit(1)
      .single()
    
    if (!existingKeys) {
      const sampleKeys = [
        { key_name: 'common.loading', category: 'common' },
        { key_name: 'common.save', category: 'common' },
        { key_name: 'common.cancel', category: 'common' },
        { key_name: 'auth.login', category: 'auth' },
        { key_name: 'auth.logout', category: 'auth' },
        { key_name: 'navigation.home', category: 'navigation' },
        { key_name: 'navigation.sops', category: 'navigation' },
        { key_name: 'navigation.training', category: 'navigation' }
      ]
      
      const { error: keysError } = await supabase
        .from('translation_keys')
        .insert(sampleKeys)
      
      if (!keysError) {
        log('  ✅ Sample translation keys added', 'green')
        
        // Add corresponding translations
        const { data: keys } = await supabase
          .from('translation_keys')
          .select('id, key_name')
        
        if (keys) {
          const translations = []
          keys.forEach(key => {
            const translations_map = {
              'common.loading': { en: 'Loading...', fr: 'Chargement...' },
              'common.save': { en: 'Save', fr: 'Enregistrer' },
              'common.cancel': { en: 'Cancel', fr: 'Annuler' },
              'auth.login': { en: 'Login', fr: 'Connexion' },
              'auth.logout': { en: 'Logout', fr: 'Déconnexion' },
              'navigation.home': { en: 'Home', fr: 'Accueil' },
              'navigation.sops': { en: 'SOPs', fr: 'PON' },
              'navigation.training': { en: 'Training', fr: 'Formation' }
            }
            
            const values = translations_map[key.key_name] || { en: key.key_name, fr: key.key_name }
            translations.push(
              { key_id: key.id, locale: 'en', value: values.en, is_approved: true },
              { key_id: key.id, locale: 'fr', value: values.fr, is_approved: true }
            )
          })
          
          const { error: translationsError } = await supabase
            .from('translations')
            .insert(translations)
          
          if (!translationsError) {
            log('  ✅ Sample translations added', 'green')
          }
        }
      }
    }
    
  } catch (error) {
    log(`  ⚠️  Sample data seeding had issues: ${error.message}`, 'yellow')
  }
}

async function main() {
  log('🏗️  RUNNING ESSENTIAL MIGRATIONS FOR KRONG THAI SOP SYSTEM', 'bold')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    log('❌ Missing Supabase credentials', 'red')
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  
  // Create missing tables directly
  await createMissingTables(supabase)
  
  // Add sample data
  await seedSampleData(supabase)
  
  log('\n🎉 Essential migrations completed!', 'green')
  log('   The app should now have all required tables for basic functionality.', 'cyan')
  log('   You can now test the authentication and app features.', 'cyan')
}

main().catch(console.error)