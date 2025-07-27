#!/usr/bin/env node

/**
 * Simple Rate Limit Clear Script
 * Resets PIN attempts only (using existing schema)
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

async function clearRateLimiting() {
  console.log('🔄 Clearing PIN attempts for all users...\n');

  try {
    // Reset PIN attempts only
    const { data, error } = await supabase
      .from('auth_users')
      .update({ pin_attempts: 0 })
      .select('email, pin_attempts');

    if (error) {
      console.error('❌ Error clearing rate limits:', error);
      return;
    }

    console.log('✅ PIN attempts reset for all users:');
    data?.forEach(user => {
      console.log(`   - ${user.email}: attempts reset to ${user.pin_attempts}`);
    });

    console.log('\n🎉 Rate limiting cleared! You can now try logging in again.');
    console.log('\n📋 Test with these credentials:');
    console.log('   manager@krongthai.com - PIN: 2345');
    console.log('   admin@krongthai.com - PIN: 1234');
    console.log('   chef@krongthai.com - PIN: 2468');
    console.log('   server@krongthai.com - PIN: 3456');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

clearRateLimiting().catch(console.error);