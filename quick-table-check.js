#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Quick table check...')

// Test basic authentication table
try {
  const { data, error } = await supabase
    .from('auth_users')
    .select('email, role')
    .limit(5)

  if (error) {
    console.log('❌ auth_users error:', error.message)
  } else {
    console.log('✅ auth_users working, found', data?.length || 0, 'users')
    if (data?.length > 0) {
      console.log('Sample users:', data.map(u => `${u.email} (${u.role})`))
    }
  }
} catch (e) {
  console.log('❌ auth_users connection error:', e.message)
}

// Test if we can create a simple table
try {
  console.log('\n🔧 Attempting to create test table...')
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS test_table_temp (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  
  // We can't use RPC, so let's try to insert into a known working table first
  const { data: testData, error: testError } = await supabase
    .from('restaurants')
    .select('id, name')
    .limit(1)
  
  if (testError) {
    console.log('❌ Cannot query restaurants:', testError.message)
  } else {
    console.log('✅ Basic database connectivity confirmed')
    console.log('Found restaurant data:', testData)
  }

} catch (e) {
  console.log('❌ Database test error:', e.message)
}

console.log('\n📋 To create missing tables, please:')
console.log('1. Go to https://supabase.com/dashboard')
console.log('2. Open your project: blimbcomhmhlubqngben')
console.log('3. Go to SQL Editor')
console.log('4. Run the SQL commands from create-missing-tables.sql')
console.log('5. Restart the dev server with: pnpm dev')