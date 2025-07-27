#!/usr/bin/env node

/**
 * Seed Test Users Script
 * Creates the test users mentioned in CLAUDE.md for local development
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

const testUsers = [
  {
    email: 'admin@krongthai.com',
    pin: '1234',
    role: 'admin',
    full_name: 'Admin User',
    full_name_fr: 'Utilisateur Admin',
    position: 'System Administrator',
    position_fr: 'Administrateur Système'
  },
  {
    email: 'manager@krongthai.com',
    pin: '2345',
    role: 'manager',
    full_name: 'Manager User',
    full_name_fr: 'Utilisateur Manager',
    position: 'Restaurant Manager',
    position_fr: 'Directeur de Restaurant'
  },
  {
    email: 'chef@krongthai.com',
    pin: '2468',
    role: 'staff',
    full_name: 'Chef User',
    full_name_fr: 'Utilisateur Chef',
    position: 'Head Chef',
    position_fr: 'Chef Principal'
  },
  {
    email: 'server@krongthai.com',
    pin: '3456',
    role: 'staff',
    full_name: 'Server User',
    full_name_fr: 'Utilisateur Serveur',
    position: 'Server',
    position_fr: 'Serveur'
  }
];

async function createTestUsers() {
  console.log('🚀 Creating test users for Krong Thai SOP System...\n');

  // First, get the default restaurant ID
  const { data: restaurants, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id')
    .limit(1);

  if (restaurantError || !restaurants?.length) {
    console.error('❌ Error getting restaurant:', restaurantError);
    process.exit(1);
  }

  const restaurantId = restaurants[0].id;
  console.log(`📍 Using restaurant ID: ${restaurantId}\n`);

  for (const user of testUsers) {
    try {
      // Hash the PIN using the same method as the application
      const pinHash = await bcrypt.hash(user.pin, 12);

      const { data, error } = await supabase
        .from('auth_users')
        .upsert({
          email: user.email,
          pin_hash: pinHash,
          role: user.role,
          full_name: user.full_name,
          full_name_fr: user.full_name_fr,
          position: user.position,
          position_fr: user.position_fr,
          restaurant_id: restaurantId,
          is_active: true
        }, {
          onConflict: 'email'
        });

      if (error) {
        console.error(`❌ Error creating user ${user.email}:`, error);
      } else {
        console.log(`✅ Created/Updated user: ${user.email} (PIN: ${user.pin}) - ${user.role}`);
      }
    } catch (err) {
      console.error(`❌ Error processing user ${user.email}:`, err);
    }
  }

  console.log('\n🎉 Test users setup complete!');
  console.log('\n📋 Login credentials:');
  testUsers.forEach(user => {
    console.log(`   ${user.email} - PIN: ${user.pin} (${user.role})`);
  });
}

createTestUsers().catch(console.error);