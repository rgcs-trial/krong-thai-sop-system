# Translation Migration Guide
# คู่มือการย้ายข้อมูลระบบการแปล

*Restaurant Krong Thai SOP Management System*  
*ระบบจัดการ SOP ร้านอาหารไทยกรองไทย*

**Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**Migration Type**: JSON to Database-Driven System  
**Target Audience**: System Administrators, DevOps Engineers, Technical Managers

---

## Table of Contents / สารบัญ

1. [Migration Overview](#migration-overview)
2. [Pre-Migration Assessment](#pre-migration-assessment)
3. [Data Preparation](#data-preparation)
4. [Migration Process](#migration-process)
5. [Validation & Testing](#validation--testing)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Migration Optimization](#post-migration-optimization)
8. [Troubleshooting](#troubleshooting)

---

## Migration Overview

The Translation System Migration involves transitioning from static JSON-based translations to a dynamic, database-driven system with enterprise-grade features including workflow management, real-time updates, and comprehensive analytics.

### Migration Benefits

#### Before (JSON-based System)
- ❌ Static translation files loaded at build time
- ❌ No real-time updates without deployment
- ❌ No workflow management or approval processes
- ❌ Limited analytics and usage tracking
- ❌ Manual translation management processes
- ❌ No version control or change history
- ❌ No collaborative editing capabilities

#### After (Database-driven System)
- ✅ Dynamic translations with instant updates
- ✅ Real-time collaboration and WebSocket support
- ✅ Comprehensive workflow management (draft → review → approved → published)
- ✅ Advanced analytics and performance monitoring
- ✅ Admin interface for non-technical content management
- ✅ Complete audit trail and version control
- ✅ Multi-layer caching for optimal performance
- ✅ Type-safe hooks with autocomplete support

### Migration Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Assessment** | 1-2 days | Analyze existing translations and plan migration |
| **Preparation** | 2-3 days | Set up database, prepare data, create backups |
| **Migration** | 4-6 hours | Execute migration scripts and validate data |
| **Testing** | 1-2 days | Comprehensive testing and validation |
| **Optimization** | 1 day | Performance tuning and cache warming |
| **Training** | 2-3 days | Staff training on new admin interface |

### Migration Scope

#### Data to be Migrated
- **Translation Keys**: ~1,250 unique keys across all categories
- **Translation Values**: ~3,750 translations (EN/TH/FR)
- **Categories**: 16 predefined categories (common, menu, auth, etc.)
- **Namespaces**: Organizational groupings for large translation sets
- **Variables**: ICU MessageFormat variables and pluralization rules

#### System Components
- **Database Schema**: 7 tables with RLS policies and triggers
- **API Endpoints**: 15+ REST endpoints for CRUD operations
- **Admin Interface**: 7 management components for content editing
- **Real-time System**: WebSocket integration for live updates
- **Caching Layer**: Multi-tier caching with intelligent invalidation

---

## Pre-Migration Assessment

### Current System Analysis

#### Inventory Existing Translations

```bash
# Analyze current JSON structure
find ./messages -name "*.json" -exec wc -l {} + | sort -n
find ./messages -name "*.json" -exec jq 'keys | length' {} +

# Generate translation statistics
node scripts/analyze-translations.js > translation-analysis.json
```

#### Translation Analysis Script

```javascript
// scripts/analyze-translations.js
const fs = require('fs');
const path = require('path');

function analyzeTranslations() {
  const locales = ['en', 'th', 'fr'];
  const analysis = {
    totalKeys: 0,
    keysByCategory: {},
    localeCompleteness: {},
    duplicateKeys: [],
    missingKeys: [],
    invalidICU: []
  };
  
  const allKeys = new Set();
  const translations = {};
  
  // Load all translation files
  for (const locale of locales) {
    const filePath = path.join('./messages', `${locale}.json`);
    if (fs.existsSync(filePath)) {
      translations[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Extract all keys
      function extractKeys(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object') {
            extractKeys(value, fullKey);
          } else {
            allKeys.add(fullKey);
          }
        }
      }
      
      extractKeys(translations[locale]);
    }
  }
  
  analysis.totalKeys = allKeys.size;
  
  // Analyze completeness by locale
  for (const locale of locales) {
    const localeKeys = new Set();
    if (translations[locale]) {
      function extractKeys(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object') {
            extractKeys(value, fullKey);
          } else {
            localeKeys.add(fullKey);
          }
        }
      }
      extractKeys(translations[locale]);
    }
    
    analysis.localeCompleteness[locale] = {
      total: localeKeys.size,
      percentage: (localeKeys.size / allKeys.size) * 100,
      missing: Array.from(allKeys).filter(key => !localeKeys.has(key))
    };
  }
  
  // Categorize keys
  for (const key of allKeys) {
    const category = key.split('.')[0];
    if (!analysis.keysByCategory[category]) {
      analysis.keysByCategory[category] = 0;
    }
    analysis.keysByCategory[category]++;
  }
  
  // Validate ICU format
  for (const locale of locales) {
    if (translations[locale]) {
      function validateICU(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object') {
            validateICU(value, fullKey);
          } else if (typeof value === 'string') {
            // Basic ICU validation
            const icuPattern = /\{[^}]+\}/g;
            const matches = value.match(icuPattern);
            if (matches) {
              for (const match of matches) {
                try {
                  // Simple validation - check for common ICU patterns
                  if (match.includes('plural') || match.includes('select')) {
                    // More complex validation needed
                    if (!match.includes('other')) {
                      analysis.invalidICU.push({
                        key: fullKey,
                        locale,
                        value,
                        issue: 'Missing "other" case in ICU format'
                      });
                    }
                  }
                } catch (error) {
                  analysis.invalidICU.push({
                    key: fullKey,
                    locale,
                    value,
                    issue: error.message
                  });
                }
              }
            }
          }
        }
      }
      validateICU(translations[locale]);
    }
  }
  
  return analysis;
}

const analysis = analyzeTranslations();
console.log(JSON.stringify(analysis, null, 2));
```

#### Analysis Report Example

```json
{
  "totalKeys": 1247,
  "keysByCategory": {
    "common": 156,
    "auth": 45,
    "sop": 312,
    "menu": 234,
    "training": 189,
    "analytics": 78,
    "navigation": 67,
    "errors": 89,
    "dashboard": 77
  },
  "localeCompleteness": {
    "en": {
      "total": 1247,
      "percentage": 100.0,
      "missing": []
    },
    "th": {
      "total": 1189,
      "percentage": 95.3,
      "missing": ["menu.new.item", "training.advanced.section"]
    },
    "fr": {
      "total": 1098,
      "percentage": 88.1,
      "missing": ["...", "..."]
    }
  },
  "invalidICU": [
    {
      "key": "items.count",
      "locale": "en", 
      "value": "{count, plural, =0 {no items} =1 {one item}}",
      "issue": "Missing \"other\" case in ICU format"
    }
  ]
}
```

### System Requirements Validation

#### Database Readiness Checklist

```sql
-- Verify PostgreSQL version (minimum 13)
SELECT version();

-- Check available extensions
SELECT * FROM pg_available_extensions WHERE name IN ('uuid-ossp', 'pg_trgm');

-- Verify storage capacity (recommend 10GB minimum)
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check connection limits
SHOW max_connections;
```

#### Application Environment Check

```bash
# Node.js version check (require 18+)
node --version

# Package dependencies
npm list next react typescript

# Environment variables validation
node scripts/check-environment.js
```

### Risk Assessment

#### Potential Migration Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|---------|-------------------|
| **Data Loss** | Low | Critical | Complete backup + validation scripts |
| **Downtime** | Medium | High | Blue-green deployment strategy |
| **Performance Issues** | Medium | Medium | Load testing + cache warming |
| **Translation Corruption** | Low | High | Character encoding validation |
| **User Training Delays** | High | Medium | Comprehensive training materials |

#### Rollback Scenarios

1. **Database Migration Failure**: Restore from backup, continue with JSON system
2. **Performance Degradation**: Activate cached translations, diagnose issues
3. **Data Integrity Issues**: Halt migration, run validation scripts
4. **User Adoption Problems**: Provide fallback admin interface

---

## Data Preparation

### Backup Creation

#### Complete System Backup

```bash
#!/bin/bash
# scripts/create-migration-backup.sh

BACKUP_DIR="./migration-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating comprehensive backup..."

# Backup translation files
cp -r ./messages "$BACKUP_DIR/messages"
cp -r ./src/lib/i18n* "$BACKUP_DIR/i18n-code"

# Backup database (if any existing data)
pg_dump $DATABASE_URL > "$BACKUP_DIR/database-before-migration.sql"

# Create system snapshot
tar -czf "$BACKUP_DIR/system-snapshot.tar.gz" \
  ./src ./pages ./app ./components \
  --exclude node_modules \
  --exclude .next

# Backup configuration
cp .env.local "$BACKUP_DIR/env-backup"
cp package.json "$BACKUP_DIR/package-backup.json"

echo "Backup created in: $BACKUP_DIR"
echo "$(du -sh $BACKUP_DIR)"
```

### Data Transformation

#### JSON to Database Schema Mapping

```javascript
// scripts/transform-translations.js
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class TranslationTransformer {
  constructor() {
    this.translationKeys = new Map();
    this.translations = [];
    this.categories = new Set();
  }
  
  flattenTranslations(obj, prefix = '', category = null) {
    const flattened = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const currentCategory = category || fullKey.split('.')[0];
      
      if (typeof value === 'object' && value !== null) {
        flattened.push(...this.flattenTranslations(value, fullKey, currentCategory));
      } else if (typeof value === 'string') {
        flattened.push({
          key: fullKey,
          value: value,
          category: currentCategory
        });
      }
    }
    
    return flattened;
  }
  
  extractVariables(value) {
    const variables = [];
    const icuPattern = /\{([^}]+)\}/g;
    let match;
    
    while ((match = icuPattern.exec(value)) !== null) {
      const variable = match[1];
      // Extract variable name (before comma if ICU format)
      const varName = variable.split(',')[0].trim();
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }
    
    return variables;
  }
  
  detectPluralRules(value) {
    return value.includes('plural') && 
           (value.includes('=0') || value.includes('=1') || value.includes('other'));
  }
  
  transformToSchema(inputDir) {
    const locales = ['en', 'th', 'fr'];
    
    // First pass: collect all unique keys
    const allFlatTranslations = {};
    
    for (const locale of locales) {
      const filePath = `${inputDir}/${locale}.json`;
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        allFlatTranslations[locale] = this.flattenTranslations(data);
      }
    }
    
    // Create translation keys (using English as reference)
    const enTranslations = allFlatTranslations['en'] || [];
    
    for (const item of enTranslations) {
      if (!this.translationKeys.has(item.key)) {
        const variables = this.extractVariables(item.value);
        const supportsPluralRules = this.detectPluralRules(item.value);
        
        const translationKey = {
          id: uuidv4(),
          key_name: item.key,
          category: item.category,
          description: `Translation for ${item.key}`,
          interpolation_vars: variables,
          supports_pluralization: supportsPluralRules,
          namespace: item.key.split('.')[0],
          feature_area: this.determineFeatureArea(item.category),
          priority: this.determinePriority(item.category),
          is_active: true,
          created_at: new Date().toISOString(),
          created_by: null // Will be set during migration
        };
        
        this.translationKeys.set(item.key, translationKey);
        this.categories.add(item.category);
      }
    }
    
    // Create translations for each locale
    for (const [locale, translations] of Object.entries(allFlatTranslations)) {
      for (const translation of translations) {
        const keyRecord = this.translationKeys.get(translation.key);
        if (keyRecord) {
          const translationRecord = {
            id: uuidv4(),
            translation_key_id: keyRecord.id,
            locale: locale,
            value: translation.value,
            icu_message: this.detectPluralRules(translation.value) ? translation.value : null,
            word_count: translation.value.split(/\s+/).length,
            status: 'published', // Migrate as published
            version: 1,
            is_reviewed: true,
            reviewed_at: new Date().toISOString(),
            is_approved: true,
            approved_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            created_by: null // Will be set during migration
          };
          
          this.translations.push(translationRecord);
        }
      }
    }
    
    return {
      translationKeys: Array.from(this.translationKeys.values()),
      translations: this.translations,
      categories: Array.from(this.categories)
    };
  }
  
  determineFeatureArea(category) {
    const mapping = {
      'common': 'ui',
      'auth': 'authentication',
      'sop': 'operations',
      'menu': 'content',
      'training': 'education',
      'analytics': 'reporting',
      'navigation': 'ui',
      'errors': 'system',
      'dashboard': 'analytics'
    };
    return mapping[category] || 'general';
  }
  
  determinePriority(category) {
    const priorities = {
      'errors': 'high',
      'auth': 'high',
      'common': 'medium',
      'sop': 'medium',
      'menu': 'medium',
      'training': 'low',
      'analytics': 'low'
    };
    return priorities[category] || 'medium';
  }
  
  generateSQL(data) {
    let sql = '-- Translation System Migration SQL\n';
    sql += '-- Generated on: ' + new Date().toISOString() + '\n\n';
    
    sql += 'BEGIN;\n\n';
    
    // Insert translation keys
    sql += '-- Insert translation keys\n';
    for (const key of data.translationKeys) {
      sql += `INSERT INTO translation_keys (id, key_name, category, description, interpolation_vars, supports_pluralization, namespace, feature_area, priority, is_active, created_at) VALUES `;
      sql += `('${key.id}', '${key.key_name}', '${key.category}', '${key.description}', `;
      sql += `'${JSON.stringify(key.interpolation_vars)}', ${key.supports_pluralization}, `;
      sql += `'${key.namespace}', '${key.feature_area}', '${key.priority}', ${key.is_active}, `;
      sql += `'${key.created_at}');\n`;
    }
    
    sql += '\n-- Insert translations\n';
    for (const translation of data.translations) {
      sql += `INSERT INTO translations (id, translation_key_id, locale, value, icu_message, word_count, status, version, is_reviewed, reviewed_at, is_approved, approved_at, published_at, created_at) VALUES `;
      sql += `('${translation.id}', '${translation.translation_key_id}', '${translation.locale}', `;
      sql += `'${translation.value.replace(/'/g, "''")}', `;
      sql += `${translation.icu_message ? `'${translation.icu_message.replace(/'/g, "''")}'` : 'NULL'}, `;
      sql += `${translation.word_count}, '${translation.status}', ${translation.version}, `;
      sql += `${translation.is_reviewed}, '${translation.reviewed_at}', `;
      sql += `${translation.is_approved}, '${translation.approved_at}', `;
      sql += `'${translation.published_at}', '${translation.created_at}');\n`;
    }
    
    sql += '\nCOMMIT;\n';
    return sql;
  }
}

// Usage
const transformer = new TranslationTransformer();
const data = transformer.transformToSchema('./messages');
const sql = transformer.generateSQL(data);

fs.writeFileSync('./migration-data.sql', sql);
fs.writeFileSync('./migration-data.json', JSON.stringify(data, null, 2));

console.log(`Migration data prepared:`);
console.log(`- Translation keys: ${data.translationKeys.length}`);
console.log(`- Translations: ${data.translations.length}`);
console.log(`- Categories: ${data.categories.length}`);
```

### Data Validation

#### Pre-Migration Validation Script

```javascript
// scripts/validate-migration-data.js
const fs = require('fs');

class MigrationValidator {
  constructor(dataPath) {
    this.data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    this.errors = [];
    this.warnings = [];
  }
  
  validateTranslationKeys() {
    const keyNames = new Set();
    
    for (const key of this.data.translationKeys) {
      // Check for duplicates
      if (keyNames.has(key.key_name)) {
        this.errors.push(`Duplicate key name: ${key.key_name}`);
      }
      keyNames.add(key.key_name);
      
      // Validate key format
      if (!/^[a-z0-9]+(\.[a-z0-9_]+)*$/.test(key.key_name)) {
        this.errors.push(`Invalid key format: ${key.key_name}`);
      }
      
      // Validate category
      const validCategories = ['common', 'auth', 'sop', 'menu', 'training', 'analytics', 'navigation', 'errors', 'dashboard'];
      if (!validCategories.includes(key.category)) {
        this.warnings.push(`Unexpected category: ${key.category} for key ${key.key_name}`);
      }
      
      // Validate variables format
      if (key.interpolation_vars) {
        for (const variable of key.interpolation_vars) {
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
            this.errors.push(`Invalid variable name: ${variable} in key ${key.key_name}`);
          }
        }
      }
    }
  }
  
  validateTranslations() {
    const keyMap = new Map();
    this.data.translationKeys.forEach(key => keyMap.set(key.id, key));
    
    const translationCombinations = new Set();
    
    for (const translation of this.data.translations) {
      // Check for duplicate locale/key combinations
      const combo = `${translation.translation_key_id}:${translation.locale}`;
      if (translationCombinations.has(combo)) {
        this.errors.push(`Duplicate translation for key ${translation.translation_key_id} and locale ${translation.locale}`);
      }
      translationCombinations.add(combo);
      
      // Validate locale
      if (!['en', 'th', 'fr'].includes(translation.locale)) {
        this.errors.push(`Invalid locale: ${translation.locale}`);
      }
      
      // Validate translation value
      if (!translation.value || translation.value.trim().length === 0) {
        this.errors.push(`Empty translation value for key ${translation.translation_key_id}`);
      }
      
      // Check if referenced key exists
      const key = keyMap.get(translation.translation_key_id);
      if (!key) {
        this.errors.push(`Translation references non-existent key: ${translation.translation_key_id}`);
        continue;
      }
      
      // Validate ICU variables
      if (key.interpolation_vars && key.interpolation_vars.length > 0) {
        const valueVariables = this.extractVariables(translation.value);
        const missingVars = key.interpolation_vars.filter(v => !valueVariables.includes(v));
        const extraVars = valueVariables.filter(v => !key.interpolation_vars.includes(v));
        
        if (missingVars.length > 0) {
          this.warnings.push(`Missing variables in ${translation.locale} for ${key.key_name}: ${missingVars.join(', ')}`);
        }
        if (extraVars.length > 0) {
          this.warnings.push(`Extra variables in ${translation.locale} for ${key.key_name}: ${extraVars.join(', ')}`);
        }
      }
      
      // Validate character encoding for Thai
      if (translation.locale === 'th') {
        if (!/[\u0E00-\u0E7F]/.test(translation.value)) {
          this.warnings.push(`Thai translation might not contain Thai characters: ${key.key_name}`);
        }
      }
    }
  }
  
  extractVariables(value) {
    const variables = [];
    const icuPattern = /\{([^}]+)\}/g;
    let match;
    
    while ((match = icuPattern.exec(value)) !== null) {
      const variable = match[1].split(',')[0].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }
    
    return variables;
  }
  
  validateCompleteness() {
    const keysByLocale = {};
    
    for (const translation of this.data.translations) {
      if (!keysByLocale[translation.locale]) {
        keysByLocale[translation.locale] = new Set();
      }
      keysByLocale[translation.locale].add(translation.translation_key_id);
    }
    
    const totalKeys = this.data.translationKeys.length;
    
    for (const [locale, keySet] of Object.entries(keysByLocale)) {
      const completeness = (keySet.size / totalKeys) * 100;
      if (completeness < 90) {
        this.warnings.push(`Low completeness for ${locale}: ${completeness.toFixed(1)}% (${keySet.size}/${totalKeys})`);
      }
    }
  }
  
  generateReport() {
    this.validateTranslationKeys();
    this.validateTranslations();
    this.validateCompleteness();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalKeys: this.data.translationKeys.length,
        totalTranslations: this.data.translations.length,
        categories: [...new Set(this.data.translationKeys.map(k => k.category))],
        locales: [...new Set(this.data.translations.map(t => t.locale))]
      },
      validation: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        passed: this.errors.length === 0
      },
      errors: this.errors,
      warnings: this.warnings
    };
    
    return report;
  }
}

// Usage
const validator = new MigrationValidator('./migration-data.json');
const report = validator.generateReport();

fs.writeFileSync('./migration-validation-report.json', JSON.stringify(report, null, 2));

console.log('Migration Validation Report:');
console.log(`Total Keys: ${report.summary.totalKeys}`);
console.log(`Total Translations: ${report.summary.totalTranslations}`);
console.log(`Errors: ${report.validation.errors}`);
console.log(`Warnings: ${report.validation.warnings}`);
console.log(`Validation Passed: ${report.validation.passed ? 'YES' : 'NO'}`);

if (report.errors.length > 0) {
  console.log('\nErrors:');
  report.errors.forEach(error => console.log(`  - ${error}`));
}

if (report.warnings.length > 0) {
  console.log('\nWarnings:');
  report.warnings.forEach(warning => console.log(`  - ${warning}`));
}

process.exit(report.validation.errors > 0 ? 1 : 0);
```

---

## Migration Process

### Migration Execution

#### Master Migration Script

```bash
#!/bin/bash
# scripts/execute-migration.sh

set -e  # Exit on any error

MIGRATION_DIR="./migration-$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$MIGRATION_DIR/migration.log"

# Create migration directory
mkdir -p "$MIGRATION_DIR"

# Initialize logging
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo "=== Translation System Migration Started ==="
echo "Migration ID: $(basename $MIGRATION_DIR)"
echo "Started at: $(date)"
echo "Environment: $NODE_ENV"

# Step 1: Environment validation
echo -e "\n=== Step 1: Environment Validation ==="
node scripts/validate-environment.js
if [ $? -ne 0 ]; then
  echo "Environment validation failed. Aborting migration."
  exit 1
fi

# Step 2: Create backups
echo -e "\n=== Step 2: Creating Backups ==="
./scripts/create-migration-backup.sh
if [ $? -ne 0 ]; then
  echo "Backup creation failed. Aborting migration."
  exit 1
fi

# Step 3: Prepare migration data
echo -e "\n=== Step 3: Preparing Migration Data ==="
node scripts/transform-translations.js
if [ $? -ne 0 ]; then
  echo "Data transformation failed. Aborting migration."
  exit 1
fi

# Step 4: Validate migration data
echo -e "\n=== Step 4: Validating Migration Data ==="
node scripts/validate-migration-data.js
if [ $? -ne 0 ]; then
  echo "Data validation failed. Aborting migration."
  exit 1
fi

# Step 5: Database schema migration
echo -e "\n=== Step 5: Database Schema Setup ==="
npx supabase db push
if [ $? -ne 0 ]; then
  echo "Database schema migration failed. Aborting migration."
  exit 1
fi

# Step 6: Data migration
echo -e "\n=== Step 6: Migrating Translation Data ==="
psql $DATABASE_URL -f migration-data.sql
if [ $? -ne 0 ]; then
  echo "Data migration failed. Attempting rollback..."
  ./scripts/rollback-migration.sh
  exit 1
fi

# Step 7: Post-migration validation
echo -e "\n=== Step 7: Post-Migration Validation ==="
node scripts/validate-migrated-data.js
if [ $? -ne 0 ]; then
  echo "Post-migration validation failed. Review required."
  # Don't exit here - let manual review happen
fi

# Step 8: Cache warming
echo -e "\n=== Step 8: Cache Warming ==="
node scripts/warm-translation-cache.js
if [ $? -ne 0 ]; then
  echo "Cache warming failed. Performance may be reduced initially."
  # Non-critical, continue
fi

# Step 9: Code updates
echo -e "\n=== Step 9: Updating Application Code ==="
./scripts/update-translation-imports.sh
if [ $? -ne 0 ]; then
  echo "Code update failed. Manual intervention required."
  exit 1
fi

# Step 10: Final validation
echo -e "\n=== Step 10: Final System Validation ==="
npm run test:migration
if [ $? -ne 0 ]; then
  echo "Final validation failed. Review migration status."
  exit 1
fi

echo -e "\n=== Migration Completed Successfully ==="
echo "Completed at: $(date)"
echo "Migration directory: $MIGRATION_DIR"
echo "Log file: $LOG_FILE"

# Generate migration report
node scripts/generate-migration-report.js > "$MIGRATION_DIR/migration-report.json"

echo -e "\nNext steps:"
echo "1. Review migration report: $MIGRATION_DIR/migration-report.json"
echo "2. Test application functionality"
echo "3. Train staff on new admin interface"
echo "4. Monitor system performance"
```

#### Database Migration with Rollback Support

```javascript
// scripts/migrate-with-rollback.js
const { Pool } = require('pg');
const fs = require('fs');

class DatabaseMigrator {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
    this.rollbackPoints = [];
  }
  
  async createRollbackPoint(name) {
    const rollbackId = `rollback_${Date.now()}`;
    await this.pool.query(`SAVEPOINT ${rollbackId}`);
    this.rollbackPoints.push({ id: rollbackId, name, timestamp: new Date() });
    console.log(`Created rollback point: ${name} (${rollbackId})`);
    return rollbackId;
  }
  
  async rollbackTo(rollbackId) {
    await this.pool.query(`ROLLBACK TO SAVEPOINT ${rollbackId}`);
    // Remove rollback points after the one we're rolling back to
    const index = this.rollbackPoints.findIndex(p => p.id === rollbackId);
    this.rollbackPoints = this.rollbackPoints.slice(0, index + 1);
    console.log(`Rolled back to: ${rollbackId}`);
  }
  
  async executeMigration() {
    let migrationSuccessful = false;
    
    try {
      await this.pool.query('BEGIN');
      
      // Step 1: Verify schema is ready
      await this.createRollbackPoint('schema_verified');
      await this.verifySchema();
      
      // Step 2: Load migration data
      await this.createRollbackPoint('before_data_load');
      const migrationData = JSON.parse(fs.readFileSync('./migration-data.json', 'utf8'));
      
      // Step 3: Insert translation keys
      await this.createRollbackPoint('before_keys_insert');
      await this.insertTranslationKeys(migrationData.translationKeys);
      
      // Step 4: Insert translations
      await this.createRollbackPoint('before_translations_insert');
      await this.insertTranslations(migrationData.translations);
      
      // Step 5: Validate data integrity
      await this.createRollbackPoint('before_validation');
      await this.validateMigratedData();
      
      // Step 6: Rebuild cache
      await this.createRollbackPoint('before_cache_rebuild');
      await this.rebuildTranslationCache();
      
      await this.pool.query('COMMIT');
      migrationSuccessful = true;
      console.log('Migration completed successfully');
      
    } catch (error) {
      console.error('Migration failed:', error);
      
      // Attempt intelligent rollback
      if (this.rollbackPoints.length > 0) {
        const lastRollbackPoint = this.rollbackPoints[this.rollbackPoints.length - 1];
        console.log(`Attempting rollback to: ${lastRollbackPoint.name}`);
        
        try {
          await this.rollbackTo(lastRollbackPoint.id);
          await this.pool.query('COMMIT'); // Commit the rollback
          console.log('Rollback completed successfully');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
          await this.pool.query('ROLLBACK'); // Full rollback
        }
      } else {
        await this.pool.query('ROLLBACK');
      }
      
      throw error;
    }
    
    return migrationSuccessful;
  }
  
  async verifySchema() {
    // Verify all required tables exist
    const requiredTables = [
      'translation_keys',
      'translations', 
      'translation_history',
      'translation_cache',
      'translation_analytics'
    ];
    
    for (const table of requiredTables) {
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (!result.rows[0].exists) {
        throw new Error(`Required table missing: ${table}`);
      }
    }
    
    console.log('Schema verification passed');
  }
  
  async insertTranslationKeys(keys) {
    console.log(`Inserting ${keys.length} translation keys...`);
    
    for (const key of keys) {
      await this.pool.query(`
        INSERT INTO translation_keys (
          id, key_name, category, description, interpolation_vars,
          supports_pluralization, namespace, feature_area, priority,
          is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        key.id, key.key_name, key.category, key.description,
        JSON.stringify(key.interpolation_vars), key.supports_pluralization,
        key.namespace, key.feature_area, key.priority, key.is_active,
        key.created_at
      ]);
    }
    
    console.log('Translation keys inserted successfully');
  }
  
  async insertTranslations(translations) {
    console.log(`Inserting ${translations.length} translations...`);
    
    // Use batch inserts for better performance
    const batchSize = 100;
    for (let i = 0; i < translations.length; i += batchSize) {
      const batch = translations.slice(i, i + batchSize);
      
      const values = batch.map((t, index) => {
        const baseIndex = index * 14;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14})`;
      }).join(', ');
      
      const queryParams = batch.flatMap(t => [
        t.id, t.translation_key_id, t.locale, t.value,
        t.icu_message, t.word_count, t.status, t.version,
        t.is_reviewed, t.reviewed_at, t.is_approved,
        t.approved_at, t.published_at, t.created_at
      ]);
      
      await this.pool.query(`
        INSERT INTO translations (
          id, translation_key_id, locale, value, icu_message,
          word_count, status, version, is_reviewed, reviewed_at,
          is_approved, approved_at, published_at, created_at
        ) VALUES ${values}
      `, queryParams);
      
      console.log(`Batch ${Math.floor(i / batchSize) + 1} inserted (${batch.length} translations)`);
    }
    
    console.log('All translations inserted successfully');
  }
  
  async validateMigratedData() {
    // Count validation
    const keyCount = await this.pool.query('SELECT COUNT(*) FROM translation_keys');
    const translationCount = await this.pool.query('SELECT COUNT(*) FROM translations');
    
    console.log(`Data validation: ${keyCount.rows[0].count} keys, ${translationCount.rows[0].count} translations`);
    
    // Integrity validation
    const orphanedTranslations = await this.pool.query(`
      SELECT COUNT(*) FROM translations t
      LEFT JOIN translation_keys tk ON t.translation_key_id = tk.id
      WHERE tk.id IS NULL
    `);
    
    if (parseInt(orphanedTranslations.rows[0].count) > 0) {
      throw new Error(`Found ${orphanedTranslations.rows[0].count} orphaned translations`);
    }
    
    console.log('Data integrity validation passed');
  }
  
  async rebuildTranslationCache() {
    // Rebuild cache for all locales
    const locales = ['en', 'th', 'fr'];
    
    for (const locale of locales) {
      await this.pool.query('SELECT rebuild_translation_cache($1)', [locale]);
      console.log(`Cache rebuilt for locale: ${locale}`);
    }
  }
  
  async close() {
    await this.pool.end();
  }
}

// Execute migration
async function runMigration() {
  const migrator = new DatabaseMigrator(process.env.DATABASE_URL);
  
  try {
    await migrator.executeMigration();
    console.log('Migration process completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

runMigration();
```

### Code Updates

#### Update Import Statements

```bash
#!/bin/bash
# scripts/update-translation-imports.sh

echo "Updating translation imports..."

# Find and replace old import statements
find ./src -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | xargs sed -i.bak \
  -e "s/from '@\/hooks\/use-i18n'/from '@\/hooks\/use-translations-db'/g" \
  -e "s/useI18n(/useTranslations(/g"

# Update specific hook calls
find ./src -name "*.tsx" -o -name "*.ts" | xargs sed -i.bak \
  -e "s/const { t } = useI18n()/const { t } = useTranslations()/g" \
  -e "s/const { t, locale } = useI18n()/const { t, locale } = useTranslations()/g"

# Clean up backup files
find ./src -name "*.bak" -delete

# Update package.json scripts if needed
if grep -q "next-intl" package.json; then
  echo "Updating package.json for new translation system..."
  # Add any new dependencies or scripts
fi

echo "Import updates completed"
```

---

## Validation & Testing

### Post-Migration Validation

#### Comprehensive Validation Script

```javascript
// scripts/validate-migrated-data.js
const { Pool } = require('pg');
const fs = require('fs');

class PostMigrationValidator {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
    this.originalData = JSON.parse(fs.readFileSync('./migration-data.json', 'utf8'));
    this.validationResults = {
      passed: true,
      errors: [],
      warnings: [],
      statistics: {}
    };
  }
  
  async validateDataIntegrity() {
    console.log('Validating data integrity...');
    
    // Validate translation key count
    const keyCountResult = await this.pool.query('SELECT COUNT(*) FROM translation_keys');
    const dbKeyCount = parseInt(keyCountResult.rows[0].count);
    const originalKeyCount = this.originalData.translationKeys.length;
    
    if (dbKeyCount !== originalKeyCount) {
      this.validationResults.errors.push(
        `Translation key count mismatch: DB has ${dbKeyCount}, original had ${originalKeyCount}`
      );
      this.validationResults.passed = false;
    }
    
    // Validate translation count
    const translationCountResult = await this.pool.query('SELECT COUNT(*) FROM translations');
    const dbTranslationCount = parseInt(translationCountResult.rows[0].count);
    const originalTranslationCount = this.originalData.translations.length;
    
    if (dbTranslationCount !== originalTranslationCount) {
      this.validationResults.errors.push(
        `Translation count mismatch: DB has ${dbTranslationCount}, original had ${originalTranslationCount}`
      );
      this.validationResults.passed = false;
    }
    
    this.validationResults.statistics.keyCount = dbKeyCount;
    this.validationResults.statistics.translationCount = dbTranslationCount;
  }
  
  async validateTranslationContent() {
    console.log('Validating translation content...');
    
    // Sample validation of key translations
    const sampleKeys = ['common.welcome', 'menu.title', 'auth.login.title'];
    
    for (const keyName of sampleKeys) {
      const result = await this.pool.query(`
        SELECT tk.key_name, t.locale, t.value
        FROM translation_keys tk
        JOIN translations t ON tk.id = t.translation_key_id
        WHERE tk.key_name = $1 AND t.status = 'published'
      `, [keyName]);
      
      if (result.rows.length === 0) {
        this.validationResults.warnings.push(
          `No published translations found for key: ${keyName}`
        );
      } else {
        // Validate against original data
        const originalTranslations = this.findOriginalTranslations(keyName);
        for (const row of result.rows) {
          const originalValue = originalTranslations[row.locale];
          if (originalValue && originalValue !== row.value) {
            this.validationResults.errors.push(
              `Content mismatch for ${keyName} (${row.locale}): "${row.value}" != "${originalValue}"`
            );
            this.validationResults.passed = false;
          }
        }
      }
    }
  }
  
  async validateSystemFunctionality() {
    console.log('Validating system functionality...');
    
    // Test cache functionality
    try {
      await this.pool.query('SELECT rebuild_translation_cache($1)', ['en']);
      
      const cacheResult = await this.pool.query(`
        SELECT * FROM translation_cache 
        WHERE locale = 'en' AND is_valid = true
      `);
      
      if (cacheResult.rows.length === 0) {
        this.validationResults.errors.push('Cache rebuild failed - no valid cache entries found');
        this.validationResults.passed = false;
      }
    } catch (error) {
      this.validationResults.errors.push(`Cache functionality error: ${error.message}`);
      this.validationResults.passed = false;
    }
    
    // Test triggers
    try {
      const testKeyResult = await this.pool.query(`
        INSERT INTO translation_keys (key_name, category, description)
        VALUES ('test.validation.key', 'common', 'Test key for validation')
        RETURNING id
      `);
      
      const keyId = testKeyResult.rows[0].id;
      
      await this.pool.query(`
        INSERT INTO translations (translation_key_id, locale, value, status)
        VALUES ($1, 'en', 'Test value', 'published')
      `, [keyId]);
      
      // Check if history was created
      const historyResult = await this.pool.query(`
        SELECT COUNT(*) FROM translation_history 
        WHERE translation_key_id = $1
      `, [keyId]);
      
      if (parseInt(historyResult.rows[0].count) === 0) {
        this.validationResults.warnings.push('Audit triggers may not be working correctly');
      }
      
      // Clean up test data
      await this.pool.query('DELETE FROM translations WHERE translation_key_id = $1', [keyId]);
      await this.pool.query('DELETE FROM translation_keys WHERE id = $1', [keyId]);
      
    } catch (error) {
      this.validationResults.warnings.push(`Trigger validation error: ${error.message}`);
    }
  }
  
  async validatePerformance() {
    console.log('Validating performance...');
    
    const performanceTests = [
      {
        name: 'Single translation lookup',
        query: `
          SELECT t.value
          FROM translation_keys tk
          JOIN translations t ON tk.id = t.translation_key_id
          WHERE tk.key_name = 'common.welcome' AND t.locale = 'en' AND t.status = 'published'
        `
      },
      {
        name: 'Locale translation set',
        query: `
          SELECT tk.key_name, t.value
          FROM translation_keys tk
          JOIN translations t ON tk.id = t.translation_key_id
          WHERE t.locale = 'en' AND t.status = 'published'
          LIMIT 100
        `
      },
      {
        name: 'Cache lookup',
        query: `
          SELECT translations_json
          FROM translation_cache
          WHERE locale = 'en' AND is_valid = true
        `
      }
    ];
    
    for (const test of performanceTests) {
      const startTime = Date.now();
      
      try {
        await this.pool.query(test.query);
        const duration = Date.now() - startTime;
        
        if (duration > 1000) { // 1 second threshold
          this.validationResults.warnings.push(
            `Performance warning: ${test.name} took ${duration}ms`
          );
        }
        
        this.validationResults.statistics[`${test.name}_duration`] = duration;
      } catch (error) {
        this.validationResults.errors.push(
          `Performance test failed for ${test.name}: ${error.message}`
        );
        this.validationResults.passed = false;
      }
    }
  }
  
  findOriginalTranslations(keyName) {
    const translations = {};
    
    for (const translation of this.originalData.translations) {
      const key = this.originalData.translationKeys.find(k => k.id === translation.translation_key_id);
      if (key && key.key_name === keyName) {
        translations[translation.locale] = translation.value;
      }
    }
    
    return translations;
  }
  
  async runAllValidations() {
    try {
      await this.validateDataIntegrity();
      await this.validateTranslationContent();
      await this.validateSystemFunctionality();
      await this.validatePerformance();
      
      console.log('\n=== Validation Summary ===');
      console.log(`Overall Status: ${this.validationResults.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`Errors: ${this.validationResults.errors.length}`);
      console.log(`Warnings: ${this.validationResults.warnings.length}`);
      
      if (this.validationResults.errors.length > 0) {
        console.log('\nErrors:');
        this.validationResults.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (this.validationResults.warnings.length > 0) {
        console.log('\nWarnings:');
        this.validationResults.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
      
      console.log('\nStatistics:');
      Object.entries(this.validationResults.statistics).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      
      return this.validationResults;
      
    } catch (error) {
      console.error('Validation process failed:', error);
      this.validationResults.passed = false;
      this.validationResults.errors.push(`Validation process error: ${error.message}`);
      return this.validationResults;
    }
  }
  
  async close() {
    await this.pool.end();
  }
}

// Run validation
async function runValidation() {
  const validator = new PostMigrationValidator(process.env.DATABASE_URL);
  
  try {
    const results = await validator.runAllValidations();
    
    // Save results
    fs.writeFileSync('./post-migration-validation.json', JSON.stringify(results, null, 2));
    
    process.exit(results.passed ? 0 : 1);
  } finally {
    await validator.close();
  }
}

runValidation();
```

### Application Testing

#### Migration Test Suite

```typescript
// src/__tests__/migration.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslations } from '@/hooks/use-translations-db';
import { ReactNode } from 'react';

describe('Post-Migration Translation System', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });
  
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('should load translations from database', async () => {
    const { result } = renderHook(() => useTranslations(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.t).toBeDefined();
    expect(typeof result.current.t).toBe('function');
  });
  
  it('should return correct translations for common keys', async () => {
    const { result } = renderHook(() => useTranslations(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Test key translations that should exist post-migration
    expect(result.current.t('common.welcome')).toBeTruthy();
    expect(result.current.t('common.loading')).toBeTruthy();
    expect(result.current.t('common.save')).toBeTruthy();
  });
  
  it('should support ICU variable interpolation', async () => {
    const { result } = renderHook(() => useTranslations(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    const translationWithVar = result.current.t('welcome.user', { name: 'John' });
    expect(translationWithVar).toContain('John');
  });
  
  it('should handle missing translations gracefully', async () => {
    const { result } = renderHook(() => useTranslations(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    const missingTranslation = result.current.t('nonexistent.key');
    expect(missingTranslation).toBe('nonexistent.key'); // Fallback to key
  });
  
  it('should support namespace-specific hooks', async () => {
    const { result: commonResult } = renderHook(() => useCommonTranslations(), { wrapper });
    const { result: menuResult } = renderHook(() => useMenuTranslations(), { wrapper });
    
    await waitFor(() => {
      expect(commonResult.current.isLoading).toBe(false);
      expect(menuResult.current.isLoading).toBe(false);
    });
    
    expect(commonResult.current.t('loading')).toBeTruthy();
    expect(menuResult.current.t('appetizers.title')).toBeTruthy();
  });
});
```

#### E2E Migration Tests

```typescript
// cypress/e2e/migration-verification.cy.ts
describe('Translation System Migration Verification', () => {
  beforeEach(() => {
    cy.visit('/');
  });
  
  it('should display translations correctly throughout the app', () => {
    // Check main navigation
    cy.get('[data-testid="nav-sop"]').should('contain.text', 'SOPs');
    cy.get('[data-testid="nav-menu"]').should('contain.text', 'Menu');
    cy.get('[data-testid="nav-training"]').should('contain.text', 'Training');
    
    // Check common UI elements
    cy.get('[data-testid="loading-indicator"]').should('contain.text', 'Loading...');
    
    // Navigate to different sections and verify translations
    cy.get('[data-testid="nav-sop"]').click();
    cy.url().should('include', '/sop');
    cy.get('h1').should('contain.text', 'Standard Operating Procedures');
    
    // Test language switching
    cy.get('[data-testid="language-switcher"]').click();
    cy.get('[data-testid="th-option"]').click();
    
    // Verify Thai translations are loaded
    cy.get('[data-testid="nav-sop"]').should('contain.text', 'ขั้นตอนการปฏิบัติงาน');
  });
  
  it('should handle admin translation management', () => {
    // Login as admin
    cy.login('admin@krongthai.com', '1234');
    
    // Navigate to translation management
    cy.visit('/admin/settings');
    cy.get('[data-testid="translation-management-link"]').click();
    
    // Verify admin interface loads
    cy.get('[data-testid="translation-dashboard"]').should('be.visible');
    cy.get('[data-testid="translation-stats"]').should('contain.text', 'Translation Keys');
    
    // Test creating a new translation
    cy.get('[data-testid="new-translation-btn"]').click();
    cy.get('[data-testid="key-input"]').type('test.migration.key');
    cy.get('[data-testid="en-input"]').type('Test Migration Text');
    cy.get('[data-testid="save-btn"]').click();
    
    cy.get('[data-testid="success-message"]').should('contain.text', 'Translation saved');
  });
  
  it('should maintain performance after migration', () => {
    // Measure page load times
    cy.visit('/', {
      onBeforeLoad: (win) => {
        win.performance.mark('start');
      }
    });
    
    cy.window().then((win) => {
      win.performance.mark('end');
      win.performance.measure('pageLoad', 'start', 'end');
      
      const measure = win.performance.getEntriesByName('pageLoad')[0];
      expect(measure.duration).to.be.lessThan(3000); // 3 second threshold
    });
    
    // Test translation API performance
    cy.intercept('GET', '/api/translations/en').as('getTranslations');
    cy.reload();
    
    cy.wait('@getTranslations').then((interception) => {
      expect(interception.reply?.statusCode).to.eq(200);
      // Verify response time is reasonable
      expect(interception.reply?.duration).to.be.lessThan(500); // 500ms threshold
    });
  });
});
```

---

## Rollback Procedures

### Emergency Rollback

#### Immediate Rollback Script

```bash
#!/bin/bash
# scripts/emergency-rollback.sh

set -e

ROLLBACK_DIR="./rollback-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ROLLBACK_DIR"

echo "=== EMERGENCY ROLLBACK INITIATED ==="
echo "Rollback ID: $(basename $ROLLBACK_DIR)"
echo "Started at: $(date)"

# Step 1: Stop application services
echo -e "\n=== Step 1: Stopping Services ==="
if command -v pm2 &> /dev/null; then
  pm2 stop all
fi

# Step 2: Restore database from backup
echo -e "\n=== Step 2: Database Rollback ==="
if [ -f "./migration-backups/latest/database-before-migration.sql" ]; then
  echo "Restoring database from backup..."
  psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  psql $DATABASE_URL < "./migration-backups/latest/database-before-migration.sql"
else
  echo "ERROR: No database backup found. Manual intervention required."
  exit 1
fi

# Step 3: Restore application code
echo -e "\n=== Step 3: Code Rollback ==="
if [ -f "./migration-backups/latest/system-snapshot.tar.gz" ]; then
  echo "Restoring application code..."
  tar -xzf "./migration-backups/latest/system-snapshot.tar.gz" -C ./
else
  echo "WARNING: No code backup found. Using git reset..."
  git reset --hard HEAD~1
fi

# Step 4: Restore configuration
echo -e "\n=== Step 4: Configuration Rollback ==="
if [ -f "./migration-backups/latest/env-backup" ]; then
  cp "./migration-backups/latest/env-backup" .env.local
fi

# Step 5: Restore dependencies
echo -e "\n=== Step 5: Dependencies Rollback ==="
if [ -f "./migration-backups/latest/package-backup.json" ]; then
  cp "./migration-backups/latest/package-backup.json" package.json
  npm install
fi

# Step 6: Restart services
echo -e "\n=== Step 6: Restarting Services ==="
npm run build
if command -v pm2 &> /dev/null; then
  pm2 start all
else
  npm start &
fi

# Step 7: Verification
echo -e "\n=== Step 7: Rollback Verification ==="
sleep 10  # Wait for services to start

# Test application health
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Application is responding"
else
  echo "❌ Application is not responding. Manual intervention required."
  exit 1
fi

echo -e "\n=== ROLLBACK COMPLETED ==="
echo "Completed at: $(date)"
echo "Application restored to pre-migration state"
echo "Rollback logs: $ROLLBACK_DIR"

# Generate rollback report
echo "Creating rollback report..."
cat > "$ROLLBACK_DIR/rollback-report.json" << EOF
{
  "rollbackId": "$(basename $ROLLBACK_DIR)",
  "timestamp": "$(date -Iseconds)",
  "reason": "Emergency rollback",
  "restoredComponents": [
    "database",
    "application_code", 
    "configuration",
    "dependencies"
  ],
  "status": "completed",
  "applicationHealth": "responding"
}
EOF

echo "Rollback report saved: $ROLLBACK_DIR/rollback-report.json"
```

### Partial Rollback

#### Selective Component Rollback

```javascript
// scripts/selective-rollback.js
const { Pool } = require('pg');
const fs = require('fs');
const readline = require('readline');

class SelectiveRollback {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.rollbackOptions = [
      'database_only',
      'code_only', 
      'configuration_only',
      'cache_only',
      'specific_translations'
    ];
  }
  
  async promptRollbackType() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      console.log('Select rollback type:');
      this.rollbackOptions.forEach((option, index) => {
        console.log(`${index + 1}. ${option.replace('_', ' ')}`);
      });
      
      rl.question('Enter choice (1-5): ', (answer) => {
        const choice = parseInt(answer) - 1;
        rl.close();
        resolve(this.rollbackOptions[choice] || 'database_only');
      });
    });
  }
  
  async rollbackDatabase() {
    console.log('Rolling back database changes...');
    
    try {
      // Drop migration-added tables
      await this.pool.query('DROP TABLE IF EXISTS translation_analytics CASCADE');
      await this.pool.query('DROP TABLE IF EXISTS translation_cache CASCADE');
      await this.pool.query('DROP TABLE IF EXISTS translation_history CASCADE');
      await this.pool.query('DROP TABLE IF EXISTS translation_project_assignments CASCADE');
      await this.pool.query('DROP TABLE IF EXISTS translation_projects CASCADE');
      await this.pool.query('DROP TABLE IF EXISTS translations CASCADE');
      await this.pool.query('DROP TABLE IF EXISTS translation_keys CASCADE');
      
      // Drop custom types
      await this.pool.query('DROP TYPE IF EXISTS translation_status CASCADE');
      await this.pool.query('DROP TYPE IF EXISTS translation_category CASCADE');
      await this.pool.query('DROP TYPE IF EXISTS supported_locale CASCADE');
      await this.pool.query('DROP TYPE IF EXISTS translation_priority CASCADE');
      
      console.log('Database rollback completed');
    } catch (error) {
      console.error('Database rollback failed:', error);
      throw error;
    }
  }
  
  async rollbackCode() {
    console.log('Rolling back code changes...');
    
    const filesToRestore = [
      'src/hooks/use-i18n.ts',
      'src/lib/i18n.ts',
      'messages/en.json',
      'messages/th.json',
      'messages/fr.json'
    ];
    
    for (const file of filesToRestore) {
      const backupPath = `./migration-backups/latest/${file}`;
      if (fs.existsSync(backupPath)) {
        const dir = file.substring(0, file.lastIndexOf('/'));
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(backupPath, file);
        console.log(`Restored: ${file}`);
      }
    }
    
    console.log('Code rollback completed');
  }
  
  async rollbackCache() {
    console.log('Rolling back cache changes...');
    
    try {
      // Clear Redis cache if used
      if (process.env.REDIS_URL) {
        // Redis rollback logic
      }
      
      // Clear database cache
      await this.pool.query('DELETE FROM translation_cache');
      
      console.log('Cache rollback completed');
    } catch (error) {
      console.error('Cache rollback failed:', error);
      throw error;
    }
  }
  
  async rollbackSpecificTranslations() {
    console.log('Rolling back specific translations...');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise(async (resolve) => {
      rl.question('Enter translation keys to rollback (comma-separated): ', async (answer) => {
        const keys = answer.split(',').map(k => k.trim());
        
        try {
          for (const key of keys) {
            // Find and remove specific translations
            await this.pool.query(`
              DELETE FROM translations 
              WHERE translation_key_id IN (
                SELECT id FROM translation_keys WHERE key_name = $1
              )
            `, [key]);
            
            await this.pool.query(`
              DELETE FROM translation_keys WHERE key_name = $1
            `, [key]);
            
            console.log(`Rolled back translation: ${key}`);
          }
          
          console.log('Specific translations rollback completed');
        } catch (error) {
          console.error('Specific translations rollback failed:', error);
        }
        
        rl.close();
        resolve();
      });
    });
  }
  
  async executeRollback() {
    try {
      const rollbackType = await this.promptRollbackType();
      console.log(`Executing rollback type: ${rollbackType}`);
      
      switch (rollbackType) {
        case 'database_only':
          await this.rollbackDatabase();
          break;
        case 'code_only':
          await this.rollbackCode();
          break;
        case 'configuration_only':
          // Restore configuration files
          if (fs.existsSync('./migration-backups/latest/env-backup')) {
            fs.copyFileSync('./migration-backups/latest/env-backup', '.env.local');
          }
          break;
        case 'cache_only':
          await this.rollbackCache();
          break;
        case 'specific_translations':
          await this.rollbackSpecificTranslations();
          break;
        default:
          console.log('Invalid rollback type');
          return;
      }
      
      console.log(`\nRollback completed successfully: ${rollbackType}`);
      
    } catch (error) {
      console.error('Rollback failed:', error);
      process.exit(1);
    }
  }
  
  async close() {
    await this.pool.end();
  }
}

// Execute selective rollback
async function runSelectiveRollback() {
  const rollback = new SelectiveRollback();
  
  try {
    await rollback.executeRollback();
  } finally {
    await rollback.close();
  }
}

runSelectiveRollback();
```

---

## Post-Migration Optimization

### Performance Tuning

#### Cache Warming Script

```javascript
// scripts/warm-translation-cache.js
const { Pool } = require('pg');

class CacheWarmer {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  
  async warmCache() {
    console.log('Starting cache warming process...');
    
    const locales = ['en', 'th', 'fr'];
    const namespaces = ['common', 'menu', 'sop', 'training', 'analytics'];
    
    // Warm cache for each locale
    for (const locale of locales) {
      console.log(`Warming cache for locale: ${locale}`);
      
      // Rebuild general cache
      await this.pool.query('SELECT rebuild_translation_cache($1)', [locale]);
      
      // Warm namespace-specific caches
      for (const namespace of namespaces) {
        await this.pool.query('SELECT rebuild_translation_cache($1, $2)', [locale, namespace]);
      }
    }
    
    // Pre-fetch popular translation sets
    await this.prefetchPopularTranslations();
    
    console.log('Cache warming completed');
  }
  
  async prefetchPopularTranslations() {
    console.log('Pre-fetching popular translations...');
    
    // Identify most-used translations from analytics (if available)
    const popularKeys = [
      'common.welcome',
      'common.loading', 
      'common.save',
      'common.cancel',
      'menu.appetizers.title',
      'menu.main_courses.title',
      'navigation.home',
      'navigation.menu'
    ];
    
    for (const locale of ['en', 'th', 'fr']) {
      const query = `
        SELECT tk.key_name, t.value
        FROM translation_keys tk
        JOIN translations t ON tk.id = t.translation_key_id
        WHERE tk.key_name = ANY($1) AND t.locale = $2 AND t.status = 'published'
      `;
      
      await this.pool.query(query, [popularKeys, locale]);
    }
  }
  
  async close() {
    await this.pool.end();
  }
}

// Execute cache warming
async function warmCache() {
  const warmer = new CacheWarmer();
  
  try {
    await warmer.warmCache();
    console.log('Cache warming process completed successfully');
  } catch (error) {
    console.error('Cache warming failed:', error);
    process.exit(1);
  } finally {
    await warmer.close();
  }
}

warmCache();
```

### Database Optimization

#### Index Optimization

```sql
-- Post-migration database optimization
-- Run after migration is complete and validated

-- Analyze table statistics
ANALYZE translation_keys;
ANALYZE translations;
ANALYZE translation_history;
ANALYZE translation_cache;
ANALYZE translation_analytics;

-- Additional performance indexes based on usage patterns
CREATE INDEX CONCURRENTLY idx_translations_key_locale_status 
ON translations(translation_key_id, locale, status) 
WHERE status = 'published';

CREATE INDEX CONCURRENTLY idx_translation_keys_category_active 
ON translation_keys(category, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_translation_cache_locale_namespace_valid 
ON translation_cache(locale, namespace, is_valid) 
WHERE is_valid = true;

-- Composite index for common queries
CREATE INDEX CONCURRENTLY idx_translations_lookup 
ON translations(translation_key_id, locale) 
INCLUDE (value, icu_message, updated_at)
WHERE status = 'published';

-- Partial index for analytics queries
CREATE INDEX CONCURRENTLY idx_translation_analytics_recent 
ON translation_analytics(recorded_date, translation_key_id) 
WHERE recorded_date >= CURRENT_DATE - INTERVAL '30 days';

-- Update table statistics after index creation
ANALYZE translation_keys;
ANALYZE translations;
ANALYZE translation_cache;
```

---

## Troubleshooting

### Common Migration Issues

#### Issue: Character Encoding Problems

**Symptoms**: Thai characters appear as question marks or boxes
**Solution**:
```sql
-- Verify database encoding
SHOW server_encoding;
SHOW client_encoding;

-- Set correct encoding if needed
SET client_encoding = 'UTF8';

-- Check for encoding issues in data
SELECT key_name, value, octet_length(value), char_length(value)
FROM translation_keys tk
JOIN translations t ON tk.id = t.translation_key_id
WHERE t.locale = 'th' AND octet_length(value) != char_length(value);
```

#### Issue: Performance Degradation

**Symptoms**: Slow translation loading, high database CPU
**Solution**:
```sql
-- Check query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT tk.key_name, t.value
FROM translation_keys tk
JOIN translations t ON tk.id = t.translation_key_id
WHERE t.locale = 'en' AND t.status = 'published';

-- Rebuild cache if needed
SELECT rebuild_translation_cache('en');

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' 
AND tablename IN ('translation_keys', 'translations')
AND n_distinct > 100;
```

#### Issue: Real-time Updates Not Working

**Symptoms**: Changes in admin panel don't appear immediately
**Solution**:
```javascript
// Check WebSocket connection
const ws = new WebSocket('wss://your-domain.com/api/realtime/translations');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (error) => console.error('WebSocket error:', error);

// Verify triggers are working
-- Check if triggers exist
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
AND event_object_table = 'translations';

-- Test trigger manually
INSERT INTO translations (translation_key_id, locale, value, status)
VALUES ((SELECT id FROM translation_keys LIMIT 1), 'en', 'Test trigger', 'draft');

-- Check if history was created
SELECT * FROM translation_history ORDER BY changed_at DESC LIMIT 1;
```

### Migration Recovery

#### Partial Migration Recovery

```bash
#!/bin/bash
# scripts/recover-partial-migration.sh

echo "=== Partial Migration Recovery ==="

# Check what was migrated successfully
echo "Checking migration status..."

# Database status
if psql $DATABASE_URL -c "SELECT COUNT(*) FROM translation_keys" > /dev/null 2>&1; then
  KEY_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM translation_keys" | xargs)
  echo "Database: ✅ ($KEY_COUNT keys found)"
  DB_STATUS="success"
else
  echo "Database: ❌ (tables not found)"
  DB_STATUS="failed"
fi

# Cache status
if psql $DATABASE_URL -c "SELECT COUNT(*) FROM translation_cache WHERE is_valid = true" > /dev/null 2>&1; then
  CACHE_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM translation_cache WHERE is_valid = true" | xargs)
  echo "Cache: ✅ ($CACHE_COUNT entries found)"
  CACHE_STATUS="success"
else
  echo "Cache: ❌ (no valid cache entries)"
  CACHE_STATUS="failed"
fi

# Application status
if curl -f http://localhost:3000/api/translations/en > /dev/null 2>&1; then
  echo "Application: ✅ (API responding)"
  APP_STATUS="success"
else
  echo "Application: ❌ (API not responding)"
  APP_STATUS="failed"
fi

# Recovery actions based on status
if [ "$DB_STATUS" = "success" ] && [ "$CACHE_STATUS" = "failed" ]; then
  echo "Rebuilding cache..."
  node scripts/warm-translation-cache.js
fi

if [ "$DB_STATUS" = "success" ] && [ "$APP_STATUS" = "failed" ]; then
  echo "Restarting application..."
  npm run build
  npm restart
fi

if [ "$DB_STATUS" = "failed" ]; then
  echo "Database migration failed. Consider full rollback."
  exit 1
fi

echo "Recovery completed"
```

### Support Resources

#### Migration Support Checklist

- [ ] **Pre-Migration**
  - [ ] Complete backup created
  - [ ] Migration data validated
  - [ ] Team trained on rollback procedures
  - [ ] Maintenance window scheduled

- [ ] **During Migration**
  - [ ] Real-time monitoring active
  - [ ] Support team on standby
  - [ ] Communication plan executed
  - [ ] Progress tracking updated

- [ ] **Post-Migration**
  - [ ] Validation tests passed
  - [ ] Performance benchmarks met
  - [ ] User acceptance testing completed
  - [ ] Documentation updated
  - [ ] Team training conducted

#### Emergency Contacts

| Role | Contact | Availability |
|------|---------|-------------|
| **Migration Lead** | migration@krongthai.com | 24/7 during migration |
| **Database Admin** | dba@krongthai.com | Business hours + on-call |
| **DevOps Engineer** | devops@krongthai.com | 24/7 |
| **Product Manager** | pm@krongthai.com | Business hours |

---

## Summary / สรุป

This comprehensive migration guide provides step-by-step procedures for transitioning from a JSON-based translation system to a sophisticated database-driven solution. Key migration highlights include:

### Migration Benefits
- **Dynamic Content Management**: Real-time translation updates without deployments
- **Workflow Integration**: Comprehensive approval processes for quality assurance
- **Performance Optimization**: Multi-layer caching for sub-100ms response times
- **Analytics & Monitoring**: Detailed usage tracking and performance insights
- **Collaborative Editing**: Real-time team collaboration with conflict resolution

### Critical Success Factors
- **Thorough Planning**: Comprehensive assessment and validation before execution
- **Robust Backup Strategy**: Multiple backup layers with tested restoration procedures
- **Incremental Validation**: Step-by-step verification throughout the migration process
- **Performance Testing**: Load testing and optimization for restaurant operations
- **Team Preparation**: Training materials and support for smooth transition

### Risk Mitigation
- **Rollback Procedures**: Multiple rollback scenarios with emergency recovery options
- **Data Validation**: Comprehensive validation scripts for data integrity
- **Performance Monitoring**: Real-time performance tracking during migration
- **Support Structure**: Clear escalation procedures and expert availability

By following this guide, restaurants can successfully migrate to a modern, scalable translation system that supports international expansion and enhances operational efficiency across diverse markets.

---

**Document Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**Migration Type**: JSON to Database-Driven  
**Platform**: Krong Thai SOP Management System  
**Estimated Duration**: 1-2 weeks (including testing and training)