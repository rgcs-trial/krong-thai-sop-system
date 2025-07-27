#!/usr/bin/env node

/**
 * Check and Reset PINs Script
 * Verifies PIN hashes and resets if needed
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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

const testCredentials = [
  { email: 'admin@krongthai.com', pin: '1234' },
  { email: 'manager@krongthai.com', pin: '2345' },
  { email: 'chef@krongthai.com', pin: '2468' },
  { email: 'server@krongthai.com', pin: '3456' }
];

async function checkAndResetPins() {
  console.log('🔍 Checking PIN verification for all users...\n');

  for (const cred of testCredentials) {
    try {
      // Get the user from database
      const { data: user, error } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', cred.email)
        .single();

      if (error || !user) {
        console.log(`❌ User ${cred.email} not found`);
        continue;
      }

      // Test PIN verification
      const isValid = await bcrypt.compare(cred.pin, user.pin_hash);
      
      if (isValid) {
        console.log(`✅ ${cred.email}: PIN ${cred.pin} is correct`);
      } else {
        console.log(`❌ ${cred.email}: PIN ${cred.pin} is INCORRECT - resetting...`);
        
        // Reset PIN hash
        const newPinHash = await bcrypt.hash(cred.pin, 12);
        
        const { error: updateError } = await supabase
          .from('auth_users')
          .update({ 
            pin_hash: newPinHash,
            pin_attempts: 0,
            locked_until: null
          })
          .eq('email', cred.email);

        if (updateError) {
          console.log(`❌ Failed to reset PIN for ${cred.email}:`, updateError);
        } else {
          console.log(`✅ PIN reset successful for ${cred.email}`);
        }
      }

      // Reset any rate limiting
      await supabase
        .from('auth_users')
        .update({ 
          pin_attempts: 0,
          locked_until: null
        })
        .eq('email', cred.email);

    } catch (err) {
      console.error(`❌ Error processing ${cred.email}:`, err);
    }
  }

  console.log('\n🎉 PIN verification complete!');
  console.log('\n📋 Test these credentials:');
  testCredentials.forEach(cred => {
    console.log(`   ${cred.email} - PIN: ${cred.pin}`);
  });
}

checkAndResetPins().catch(console.error);