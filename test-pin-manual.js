#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testPINManually() {
  console.log('🔐 Testing PIN authentication manually...');
  
  const testUsers = [
    { email: 'admin@krongthai.com', pins: ['1234', '0000', 'admin'] },
    { email: 'manager@krongthai.com', pins: ['5678', '2345', 'manager'] },
    { email: 'chef@krongthai.com', pins: ['2468', '1111'] },
    { email: 'server@krongthai.com', pins: ['9999', '3456', '1357'] }
  ];
  
  for (const user of testUsers) {
    try {
      console.log(`\n🧪 Testing ${user.email}...`);
      
      // Get user data including PIN hash
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id, email, pin_hash, role, full_name, full_name_th, restaurant_id, is_active')
        .eq('email', user.email)
        .single();
      
      if (userError) {
        console.error(`❌ Error fetching user:`, userError.message);
        continue;
      }
      
      if (!userData) {
        console.error(`❌ User not found: ${user.email}`);
        continue;
      }
      
      console.log(`   User: ${userData.full_name} (${userData.role})`);
      console.log(`   Active: ${userData.is_active}`);
      console.log(`   PIN Hash: ${userData.pin_hash?.substring(0, 20)}...`);
      
      // Try each possible PIN
      let authenticated = false;
      for (const pin of user.pins) {
        try {
          const isValid = bcrypt.compareSync(pin, userData.pin_hash);
          if (isValid) {
            console.log(`✅ PIN ${pin} is correct!`);
            authenticated = true;
            break;
          } else {
            console.log(`❌ PIN ${pin} is incorrect`);
          }
        } catch (err) {
          console.log(`❌ Error testing PIN ${pin}:`, err.message);
        }
      }
      
      if (!authenticated) {
        console.log(`❌ None of the test PINs worked for ${user.email}`);
      }
      
    } catch (err) {
      console.error(`💥 Exception testing ${user.email}:`, err.message);
    }
  }
}

async function resetUserPINs() {
  console.log('\n🔄 Resetting user PINs to known values...');
  
  const updates = [
    { email: 'admin@krongthai.com', pin: '1234' },
    { email: 'manager@krongthai.com', pin: '2345' },
    { email: 'chef@krongthai.com', pin: '2468' },
    { email: 'server@krongthai.com', pin: '3456' }
  ];
  
  for (const update of updates) {
    try {
      const pinHash = bcrypt.hashSync(update.pin, 12);
      
      const { error } = await supabase
        .from('auth_users')
        .update({ pin_hash: pinHash })
        .eq('email', update.email);
      
      if (error) {
        console.error(`❌ Failed to update PIN for ${update.email}:`, error.message);
      } else {
        console.log(`✅ Updated PIN for ${update.email} to ${update.pin}`);
      }
    } catch (err) {
      console.error(`💥 Exception updating ${update.email}:`, err.message);
    }
  }
}

async function main() {
  console.log('🚀 Krong Thai SOP System - Manual PIN Test\n');
  
  console.log('📋 Testing existing PINs first...');
  await testPINManually();
  
  console.log('\n🤔 If PINs failed, would you like to reset them? (Continuing automatically...)');
  await resetUserPINs();
  
  console.log('\n📋 Testing PINs after reset...');
  await testPINManually();
  
  console.log('\n🎯 Final Test Credentials:');
  console.log('   admin@krongthai.com - PIN: 1234');
  console.log('   manager@krongthai.com - PIN: 2345'); 
  console.log('   chef@krongthai.com - PIN: 2468');
  console.log('   server@krongthai.com - PIN: 3456');
}

main().catch(console.error);