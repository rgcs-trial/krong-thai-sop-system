#!/usr/bin/env node

/**
 * System Validation Script
 * Validates the translation system components without requiring database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validating Translation System Components...\n');

// Check if all required files exist
const requiredFiles = [
  'src/components/admin/translation-management-dashboard.tsx',
  'src/components/admin/translation-key-manager.tsx', 
  'src/components/admin/translation-editor.tsx',
  'src/components/admin/bulk-translation-manager.tsx',
  'src/components/admin/translation-workflow-manager.tsx',
  'src/components/admin/translation-analytics-dashboard.tsx',
  'src/components/admin/translation-preview-panel.tsx',
  'src/hooks/use-translations-db.ts',
  'src/hooks/use-translation-admin.ts',
  'src/types/translation.ts',
  'src/types/translation-keys.ts',
  'src/app/api/translations/[locale]/route.ts',
  'src/app/api/admin/translations/route.ts',
  'supabase/migrations/014_translation_system_schema.sql',
  'supabase/migrations/015_translation_rls_policies.sql',
  'scripts/migrate-translations-to-db.ts'
];

let allFilesExist = true;

console.log('📁 Checking Required Files:');
requiredFiles.forEach((file, index) => {
  const exists = fs.existsSync(path.join(__dirname, file));
  const status = exists ? '✅' : '❌';
  console.log(`${String(index + 1).padStart(2, ' ')}. ${status} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📋 Translation Files:');
const enExists = fs.existsSync(path.join(__dirname, 'messages/en.json'));
const frExists = fs.existsSync(path.join(__dirname, 'messages/fr.json'));

console.log(`1. ${enExists ? '✅' : '❌'} messages/en.json`);
console.log(`2. ${frExists ? '✅' : '❌'} messages/fr.json`);

// Check translation count
if (enExists) {
  const enTranslations = JSON.parse(fs.readFileSync(path.join(__dirname, 'messages/en.json'), 'utf8'));
  const count = countKeys(enTranslations);
  console.log(`   📊 English translations: ${count} keys`);
}

if (frExists) {
  const frTranslations = JSON.parse(fs.readFileSync(path.join(__dirname, 'messages/fr.json'), 'utf8'));
  const count = countKeys(frTranslations);
  console.log(`   📊 French translations: ${count} keys`);
}

function countKeys(obj, prefix = '') {
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countKeys(obj[key], prefix + key + '.');
    } else {
      count++;
    }
  }
  return count;
}

console.log('\n🏗️ Build Status:');
const buildExists = fs.existsSync(path.join(__dirname, '.next'));
console.log(`1. ${buildExists ? '✅' : '❌'} Production build exists`);

console.log('\n📦 Dependencies:');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const hasNextIntl = packageJson.dependencies['next-intl'];
const hasSupabase = packageJson.dependencies['@supabase/supabase-js'];
const hasZustand = packageJson.dependencies['zustand'];
const hasTanstack = packageJson.dependencies['@tanstack/react-query'];

console.log(`1. ${hasNextIntl ? '✅' : '❌'} next-intl: ${hasNextIntl || 'missing'}`);
console.log(`2. ${hasSupabase ? '✅' : '❌'} @supabase/supabase-js: ${hasSupabase || 'missing'}`);
console.log(`3. ${hasZustand ? '✅' : '❌'} zustand: ${hasZustand || 'missing'}`);
console.log(`4. ${hasTanstack ? '✅' : '❌'} @tanstack/react-query: ${hasTanstack || 'missing'}`);

console.log('\n🎯 Summary:');
if (allFilesExist && enExists && frExists && buildExists) {
  console.log('✅ All translation system components are ready!');
  console.log('🚀 Ready for database migration and testing phase');
} else {
  console.log('❌ Some components are missing - check the list above');
}

console.log('\n📋 Next Steps:');
console.log('1. Apply database migrations (supabase migration up)');
console.log('2. Run translation migration script');  
console.log('3. Test admin interface at /admin/settings');
console.log('4. Validate translation API endpoints');