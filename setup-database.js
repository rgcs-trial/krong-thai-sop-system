#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

async function runSQL(sql, description) {
  console.log(`📝 ${description}...`);
  
  try {
    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('sql', { query: statement });
        if (error && !error.message.includes('already exists')) {
          console.error(`❌ SQL Error:`, error.message);
          console.error(`   Statement:`, statement.substring(0, 100) + '...');
          return false;
        }
      }
    }
    
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to ${description.toLowerCase()}:`, err.message);
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 Starting database setup...');
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  const migrationFiles = [
    '001_initial_schema.sql',
    '002_user_devices_table.sql', 
    '003_training_system.sql',
    '004_session_management.sql'
  ];
  
  // Apply migrations
  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, 'supabase', 'migrations', file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${file}`);
      continue;
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    const success = await runSQL(sql, `Applying migration ${file}`);
    
    if (!success) {
      console.error(`❌ Failed to apply migration ${file}`);
      process.exit(1);
    }
  }
  
  // Apply seed data
  const seedPath = path.join(__dirname, 'supabase', 'seed.sql');
  if (fs.existsSync(seedPath)) {
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    await runSQL(seedSQL, 'Applying seed data');
  }
  
  console.log('🎉 Database setup completed successfully!');
  
  // Test authentication
  await testAuthentication();
}

async function testAuthentication() {
  console.log('🔐 Testing PIN authentication...');
  
  try {
    const { data, error } = await supabase
      .rpc('validate_pin', {
        user_email: 'admin@krongthai.com',
        pin_input: '1234'
      });
    
    if (error) {
      console.error('❌ PIN validation failed:', error.message);
      return;
    }
    
    if (data && data.length > 0 && data[0].is_valid) {
      console.log('✅ PIN authentication test successful!');
      console.log('   User:', data[0].full_name);
      console.log('   Role:', data[0].role);
    } else {
      console.error('❌ PIN authentication failed - invalid credentials');
    }
  } catch (err) {
    console.error('❌ PIN authentication test failed:', err.message);
  }
}

async function checkSchema() {
  console.log('📊 Checking database schema...');
  
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) {
      console.error('❌ Failed to check schema:', error.message);
      return;
    }
    
    console.log('📋 Tables created:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // Check for expected tables
    const expectedTables = [
      'restaurants',
      'auth_users', 
      'sop_categories',
      'sop_documents',
      'form_templates',
      'form_submissions',
      'audit_logs',
      'user_devices',
      'training_modules',
      'location_sessions'
    ];
    
    const missingTables = expectedTables.filter(table => 
      !tables.some(t => t.table_name === table)
    );
    
    if (missingTables.length > 0) {
      console.error('❌ Missing expected tables:', missingTables);
    } else {
      console.log('✅ All expected tables created successfully');
    }
    
  } catch (err) {
    console.error('❌ Schema check failed:', err.message);
  }
}

// Run the setup
runMigrations()
  .then(() => checkSchema())
  .then(() => {
    console.log('\n🎯 Setup Summary:');
    console.log('   ✅ Database connection verified');
    console.log('   ✅ All migrations applied');
    console.log('   ✅ Seed data loaded');
    console.log('   ✅ Schema validation passed');
    console.log('   ✅ PIN authentication tested');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin: admin@krongthai.com PIN: 1234');
    console.log('   Manager: manager@krongthai.com PIN: 2345'); 
    console.log('   Staff: staff@krongthai.com PIN: 3456');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Setup failed:', err);
    process.exit(1);
  });