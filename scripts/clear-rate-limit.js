#!/usr/bin/env node

/**
 * Clear Rate Limiting Script
 * Resets authentication rate limiting for development
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
  console.log('🔄 Clearing rate limiting for all users...\n');

  try {
    // Reset PIN attempts and unlock all users
    const { data, error } = await supabase
      .from('auth_users')
      .update({ 
        pin_attempts: 0,
        locked_until: null
      })
      .select('email, pin_attempts, locked_until');

    if (error) {
      console.error('❌ Error clearing rate limits:', error);
      return;
    }

    console.log('✅ Rate limiting cleared for all users:');
    data?.forEach(user => {
      console.log(`   - ${user.email}: attempts reset to ${user.pin_attempts}, unlocked`);
    });

    console.log('\n🎉 You can now try logging in again!');
    console.log('\n📋 Use these credentials:');
    console.log('   manager@krongthai.com - PIN: 2345');
    console.log('   admin@krongthai.com - PIN: 1234');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

clearRateLimiting().catch(console.error);