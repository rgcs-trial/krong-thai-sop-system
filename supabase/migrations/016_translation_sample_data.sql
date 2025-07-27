-- Translation System Sample Data
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-27
-- Purpose: Populate translation system with sample data from existing en.json structure

-- ===========================================
-- INSERT TRANSLATION KEYS FROM EXISTING STRUCTURE
-- ===========================================

-- Common category keys
INSERT INTO translation_keys (key_name, category, description, interpolation_vars, supports_pluralization, priority, namespace, feature_area) VALUES
('common.loading', 'common', 'Loading indicator text', '[]', false, 'high', 'common', 'ui'),
('common.error', 'common', 'Generic error message', '[]', false, 'high', 'common', 'ui'),
('common.success', 'common', 'Generic success message', '[]', false, 'high', 'common', 'ui'),
('common.cancel', 'common', 'Cancel button text', '[]', false, 'high', 'common', 'ui'),
('common.save', 'common', 'Save button text', '[]', false, 'high', 'common', 'ui'),
('common.delete', 'common', 'Delete button text', '[]', false, 'high', 'common', 'ui'),
('common.edit', 'common', 'Edit button text', '[]', false, 'high', 'common', 'ui'),
('common.view', 'common', 'View button text', '[]', false, 'medium', 'common', 'ui'),
('common.search', 'common', 'Search button text', '[]', false, 'high', 'common', 'ui'),
('common.filter', 'common', 'Filter button text', '[]', false, 'medium', 'common', 'ui'),
('common.sort', 'common', 'Sort button text', '[]', false, 'medium', 'common', 'ui'),
('common.next', 'common', 'Next button text', '[]', false, 'medium', 'common', 'navigation'),
('common.previous', 'common', 'Previous button text', '[]', false, 'medium', 'common', 'navigation'),
('common.language', 'common', 'Language selector label', '[]', false, 'medium', 'common', 'i18n'),
('common.english', 'common', 'English language option', '[]', false, 'medium', 'common', 'i18n'),
('common.thai', 'common', 'Thai language option', '[]', false, 'medium', 'common', 'i18n');

-- Authentication category keys
INSERT INTO translation_keys (key_name, category, description, interpolation_vars, supports_pluralization, priority, namespace, feature_area) VALUES
('auth.title', 'auth', 'Application title in authentication', '[]', false, 'high', 'auth', 'authentication'),
('auth.subtitle', 'auth', 'Application subtitle in authentication', '[]', false, 'high', 'auth', 'authentication'),
('auth.pinRequired', 'auth', 'PIN requirement message', '[]', false, 'critical', 'auth', 'authentication'),
('auth.pinPlaceholder', 'auth', 'PIN input placeholder text', '[]', false, 'high', 'auth', 'authentication'),
('auth.loginButton', 'auth', 'Login button text', '[]', false, 'critical', 'auth', 'authentication'),
('auth.invalidPin', 'auth', 'Invalid PIN error message', '[]', false, 'critical', 'auth', 'authentication'),
('auth.loginFailed', 'auth', 'Login failure message', '[]', false, 'critical', 'auth', 'authentication'),
('auth.selectLocation', 'auth', 'Location selection prompt', '[]', false, 'high', 'auth', 'authentication'),
('auth.locationRequired', 'auth', 'Location requirement message', '[]', false, 'high', 'auth', 'authentication');

-- SOP category keys (selection for brevity)
INSERT INTO translation_keys (key_name, category, description, interpolation_vars, supports_pluralization, priority, namespace, feature_area) VALUES
('sop.title', 'sop', 'Standard Operating Procedures title', '[]', false, 'high', 'sop', 'content'),
('sop.categories', 'sop', 'Categories section title', '[]', false, 'high', 'sop', 'navigation'),
('sop.documents', 'sop', 'Documents section title', '[]', false, 'high', 'sop', 'content'),
('sop.search', 'sop', 'Search SOPs title', '[]', false, 'high', 'sop', 'search'),
('sop.searchPlaceholder', 'sop', 'Search input placeholder', '[]', false, 'high', 'sop', 'search'),
('sop.noResults', 'sop', 'No search results message', '[]', false, 'medium', 'sop', 'search'),
('sop.loading', 'sop', 'Loading SOPs message', '[]', false, 'medium', 'sop', 'ui'),
('sop.emergency', 'sop', 'Emergency Procedures category', '[]', false, 'critical', 'sop', 'categories'),
('sop.foodSafety', 'sop', 'Food Safety category', '[]', false, 'critical', 'sop', 'categories'),
('sop.kitchenOps', 'sop', 'Kitchen Operations category', '[]', false, 'high', 'sop', 'categories');

-- Search category keys with interpolation
INSERT INTO translation_keys (key_name, category, description, interpolation_vars, supports_pluralization, priority, namespace, feature_area) VALUES
('search.resultsCount', 'search', 'Search results count with interpolation', '["count", "query"]', false, 'high', 'search', 'results'),
('search.foundResults', 'search', 'Found results message with interpolation', '["count", "query"]', false, 'high', 'search', 'results'),
('search.minutesRead', 'search', 'Reading time with interpolation', '["minutes"]', false, 'medium', 'search', 'metadata'),
('search.placeholder', 'search', 'Search input placeholder', '[]', false, 'high', 'search', 'input'),
('search.searching', 'search', 'Searching in progress message', '[]', false, 'medium', 'search', 'status'),
('search.noResults', 'search', 'No search results message', '[]', false, 'medium', 'search', 'results');

-- Analytics category keys with interpolation
INSERT INTO translation_keys (key_name, category, description, interpolation_vars, supports_pluralization, priority, namespace, feature_area) VALUES
('analytics.export_started_desc', 'analytics', 'Export started notification with format', '["format"]', false, 'medium', 'analytics', 'notifications'),
('analytics.critical_alerts_active', 'analytics', 'Critical alerts count', '["count"]', true, 'critical', 'analytics', 'alerts'),
('analytics.analytics_dashboard', 'analytics', 'Analytics dashboard title', '[]', false, 'high', 'analytics', 'navigation'),
('analytics.executive_dashboard', 'analytics', 'Executive dashboard title', '[]', false, 'high', 'analytics', 'navigation'),
('analytics.sop_analytics', 'analytics', 'SOP analytics title', '[]', false, 'high', 'analytics', 'navigation'),
('analytics.training_analytics', 'analytics', 'Training analytics title', '[]', false, 'high', 'analytics', 'navigation');

-- Error category keys
INSERT INTO translation_keys (key_name, category, description, interpolation_vars, supports_pluralization, priority, namespace, feature_area) VALUES
('errors.generic', 'errors', 'Generic error message', '[]', false, 'critical', 'errors', 'messages'),
('errors.network', 'errors', 'Network error message', '[]', false, 'critical', 'errors', 'messages'),
('errors.unauthorized', 'errors', 'Unauthorized access message', '[]', false, 'critical', 'errors', 'messages'),
('errors.notFound', 'errors', 'Resource not found message', '[]', false, 'high', 'errors', 'messages'),
('errors.validation', 'errors', 'Validation error message', '[]', false, 'high', 'errors', 'messages');

-- Navigation category keys
INSERT INTO translation_keys (key_name, category, description, interpolation_vars, supports_pluralization, priority, namespace, feature_area) VALUES
('navigation.home', 'navigation', 'Home navigation item', '[]', false, 'high', 'navigation', 'menu'),
('navigation.sops', 'navigation', 'SOPs navigation item', '[]', false, 'high', 'navigation', 'menu'),
('navigation.training', 'navigation', 'Training navigation item', '[]', false, 'high', 'navigation', 'menu'),
('navigation.dashboard', 'navigation', 'Dashboard navigation item', '[]', false, 'high', 'navigation', 'menu'),
('navigation.settings', 'navigation', 'Settings navigation item', '[]', false, 'medium', 'navigation', 'menu'),
('navigation.categories', 'navigation', 'Categories navigation item', '[]', false, 'high', 'navigation', 'menu');

-- Time category keys
INSERT INTO translation_keys (key_name, category, description, interpolation_vars, supports_pluralization, priority, namespace, feature_area) VALUES
('time.last_7_days', 'time', 'Last 7 days time period', '[]', false, 'medium', 'time', 'periods'),
('time.last_30_days', 'time', 'Last 30 days time period', '[]', false, 'medium', 'time', 'periods'),
('time.last_90_days', 'time', 'Last 90 days time period', '[]', false, 'medium', 'time', 'periods'),
('time.last_year', 'time', 'Last year time period', '[]', false, 'medium', 'time', 'periods');

-- ===========================================
-- INSERT TRANSLATIONS FOR ENGLISH (EN)
-- ===========================================

-- Common translations (EN)
INSERT INTO translations (translation_key_id, locale, value, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'en', 
CASE tk.key_name
    WHEN 'common.loading' THEN 'Loading...'
    WHEN 'common.error' THEN 'Error'
    WHEN 'common.success' THEN 'Success'
    WHEN 'common.cancel' THEN 'Cancel'
    WHEN 'common.save' THEN 'Save'
    WHEN 'common.delete' THEN 'Delete'
    WHEN 'common.edit' THEN 'Edit'
    WHEN 'common.view' THEN 'View'
    WHEN 'common.search' THEN 'Search'
    WHEN 'common.filter' THEN 'Filter'
    WHEN 'common.sort' THEN 'Sort'
    WHEN 'common.next' THEN 'Next'
    WHEN 'common.previous' THEN 'Previous'
    WHEN 'common.language' THEN 'Language'
    WHEN 'common.english' THEN 'English'
    WHEN 'common.thai' THEN 'Thai'
END, 'published', true, true, NOW(), 
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'common';

-- Authentication translations (EN)
INSERT INTO translations (translation_key_id, locale, value, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'en', 
CASE tk.key_name
    WHEN 'auth.title' THEN 'Restaurant Krong Thai'
    WHEN 'auth.subtitle' THEN 'SOP Management System'
    WHEN 'auth.pinRequired' THEN 'Please enter your 4-digit PIN'
    WHEN 'auth.pinPlaceholder' THEN 'Enter PIN'
    WHEN 'auth.loginButton' THEN 'Login'
    WHEN 'auth.invalidPin' THEN 'Invalid PIN. Please try again.'
    WHEN 'auth.loginFailed' THEN 'Login failed. Please check your credentials.'
    WHEN 'auth.selectLocation' THEN 'Select Restaurant Location'
    WHEN 'auth.locationRequired' THEN 'Please select a location to continue'
END, 'published', true, true, NOW(),
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'auth';

-- SOP translations (EN)
INSERT INTO translations (translation_key_id, locale, value, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'en', 
CASE tk.key_name
    WHEN 'sop.title' THEN 'Standard Operating Procedures'
    WHEN 'sop.categories' THEN 'Categories'
    WHEN 'sop.documents' THEN 'Documents'
    WHEN 'sop.search' THEN 'Search SOPs'
    WHEN 'sop.searchPlaceholder' THEN 'Search SOPs, procedures, or keywords...'
    WHEN 'sop.noResults' THEN 'No SOPs found'
    WHEN 'sop.loading' THEN 'Loading SOPs...'
    WHEN 'sop.emergency' THEN 'Emergency Procedures'
    WHEN 'sop.foodSafety' THEN 'Food Safety'
    WHEN 'sop.kitchenOps' THEN 'Kitchen Operations'
END, 'published', true, true, NOW(),
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'sop';

-- Search translations (EN) with ICU formatting
INSERT INTO translations (translation_key_id, locale, value, icu_message, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'en', 
CASE tk.key_name
    WHEN 'search.resultsCount' THEN 'Found {count} results for "{query}"'
    WHEN 'search.foundResults' THEN 'Found {count} results for "{query}"'
    WHEN 'search.minutesRead' THEN '{minutes} min read'
    WHEN 'search.placeholder' THEN 'Search for SOPs, procedures, or keywords...'
    WHEN 'search.searching' THEN 'Searching...'
    WHEN 'search.noResults' THEN 'No results found'
END,
CASE tk.key_name
    WHEN 'search.resultsCount' THEN 'Found {count, number} {count, plural, =1 {result} other {results}} for "{query}"'
    WHEN 'search.foundResults' THEN 'Found {count, number} {count, plural, =1 {result} other {results}} for "{query}"'
    WHEN 'search.minutesRead' THEN '{minutes, number} {minutes, plural, =1 {min} other {mins}} read'
    ELSE NULL
END, 'published', true, true, NOW(),
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'search';

-- Analytics translations (EN)
INSERT INTO translations (translation_key_id, locale, value, icu_message, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'en', 
CASE tk.key_name
    WHEN 'analytics.export_started_desc' THEN '{format} export started and will download shortly'
    WHEN 'analytics.critical_alerts_active' THEN '{count} critical alerts active'
    WHEN 'analytics.analytics_dashboard' THEN 'Analytics Dashboard'
    WHEN 'analytics.executive_dashboard' THEN 'Executive Dashboard'
    WHEN 'analytics.sop_analytics' THEN 'SOP Analytics'
    WHEN 'analytics.training_analytics' THEN 'Training Analytics'
END,
CASE tk.key_name
    WHEN 'analytics.critical_alerts_active' THEN '{count, number} {count, plural, =1 {critical alert} other {critical alerts}} active'
    ELSE NULL
END, 'published', true, true, NOW(),
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'analytics';

-- Error translations (EN)
INSERT INTO translations (translation_key_id, locale, value, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'en', 
CASE tk.key_name
    WHEN 'errors.generic' THEN 'An error occurred'
    WHEN 'errors.network' THEN 'Network error. Please check your connection.'
    WHEN 'errors.unauthorized' THEN 'You are not authorized to access this resource'
    WHEN 'errors.notFound' THEN 'The requested resource was not found'
    WHEN 'errors.validation' THEN 'Please check your input and try again'
END, 'published', true, true, NOW(),
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'errors';

-- Navigation translations (EN)
INSERT INTO translations (translation_key_id, locale, value, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'en', 
CASE tk.key_name
    WHEN 'navigation.home' THEN 'Home'
    WHEN 'navigation.sops' THEN 'SOPs'
    WHEN 'navigation.training' THEN 'Training'
    WHEN 'navigation.dashboard' THEN 'Dashboard'
    WHEN 'navigation.settings' THEN 'Settings'
    WHEN 'navigation.categories' THEN 'Categories'
END, 'published', true, true, NOW(),
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'navigation';

-- Time translations (EN)
INSERT INTO translations (translation_key_id, locale, value, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'en', 
CASE tk.key_name
    WHEN 'time.last_7_days' THEN 'Last 7 Days'
    WHEN 'time.last_30_days' THEN 'Last 30 Days'
    WHEN 'time.last_90_days' THEN 'Last 90 Days'
    WHEN 'time.last_year' THEN 'Last Year'
END, 'published', true, true, NOW(),
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'time';

-- ===========================================
-- INSERT TRANSLATIONS FOR FRENCH (FR)
-- ===========================================

-- Common translations (FR)
INSERT INTO translations (translation_key_id, locale, value, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'fr', 
CASE tk.key_name
    WHEN 'common.loading' THEN 'Chargement...'
    WHEN 'common.error' THEN 'Erreur'
    WHEN 'common.success' THEN 'Succès'
    WHEN 'common.cancel' THEN 'Annuler'
    WHEN 'common.save' THEN 'Enregistrer'
    WHEN 'common.delete' THEN 'Supprimer'
    WHEN 'common.edit' THEN 'Modifier'
    WHEN 'common.view' THEN 'Voir'
    WHEN 'common.search' THEN 'Rechercher'
    WHEN 'common.filter' THEN 'Filtrer'
    WHEN 'common.sort' THEN 'Trier'
    WHEN 'common.next' THEN 'Suivant'
    WHEN 'common.previous' THEN 'Précédent'
    WHEN 'common.language' THEN 'Langue'
    WHEN 'common.english' THEN 'Anglais'
    WHEN 'common.thai' THEN 'Thaï'
END, 'published', true, true, NOW(),
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'common';

-- Authentication translations (FR)
INSERT INTO translations (translation_key_id, locale, value, status, is_approved, is_reviewed, published_at, created_by) 
SELECT tk.id, 'fr', 
CASE tk.key_name
    WHEN 'auth.title' THEN 'Restaurant Krong Thai'
    WHEN 'auth.subtitle' THEN 'Système de Gestion des POS'
    WHEN 'auth.pinRequired' THEN 'Veuillez saisir votre code PIN à 4 chiffres'
    WHEN 'auth.pinPlaceholder' THEN 'Saisir le PIN'
    WHEN 'auth.loginButton' THEN 'Connexion'
    WHEN 'auth.invalidPin' THEN 'PIN invalide. Veuillez réessayer.'
    WHEN 'auth.loginFailed' THEN 'Échec de la connexion. Vérifiez vos identifiants.'
    WHEN 'auth.selectLocation' THEN 'Sélectionner l''emplacement du restaurant'
    WHEN 'auth.locationRequired' THEN 'Veuillez sélectionner un emplacement pour continuer'
END, 'published', true, true, NOW(),
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.category = 'auth';

-- Add draft translations for some keys to show workflow
INSERT INTO translations (translation_key_id, locale, value, status, is_approved, is_reviewed, created_by) 
SELECT tk.id, 'th', 
CASE tk.key_name
    WHEN 'common.loading' THEN 'กำลังโหลด...'
    WHEN 'common.save' THEN 'บันทึก'
    WHEN 'common.search' THEN 'ค้นหา'
    WHEN 'auth.title' THEN 'ร้านอาหารครองไทย'
    WHEN 'auth.loginButton' THEN 'เข้าสู่ระบบ'
END, 'draft', false, false,
(SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
FROM translation_keys tk 
WHERE tk.key_name IN ('common.loading', 'common.save', 'common.search', 'auth.title', 'auth.loginButton');

-- ===========================================
-- CREATE SAMPLE TRANSLATION PROJECT
-- ===========================================

INSERT INTO translation_projects (name, description, target_locales, status, progress_percentage, start_date, target_completion_date, project_manager_id, created_by) 
VALUES (
    'Thai Localization Phase 1',
    'Complete Thai translations for core functionality including authentication, navigation, and common UI elements',
    ARRAY['th']::supported_locale[],
    'in_progress',
    25.00,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1),
    (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1)
);

-- Create sample project assignments
INSERT INTO translation_project_assignments (project_id, translation_key_id, assigned_locale, assigned_to, assignment_status, priority, due_date)
SELECT 
    p.id,
    tk.id,
    'th',
    (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com' LIMIT 1),
    'assigned',
    tk.priority,
    CURRENT_DATE + INTERVAL '14 days'
FROM translation_projects p, translation_keys tk
WHERE p.name = 'Thai Localization Phase 1'
AND tk.category IN ('common', 'auth', 'navigation')
LIMIT 10;

-- ===========================================
-- GENERATE TRANSLATION CACHE
-- ===========================================

-- Generate cache for English translations
INSERT INTO translation_cache (locale, namespace, translations_json, cache_version, generated_at, expires_at, generation_time_ms, is_valid)
VALUES (
    'en',
    'common',
    jsonb_build_object(
        'common', jsonb_build_object(
            'loading', 'Loading...',
            'error', 'Error',
            'success', 'Success',
            'save', 'Save',
            'search', 'Search'
        )
    ),
    '1.0.0',
    NOW(),
    NOW() + INTERVAL '24 hours',
    150,
    true
);

-- Generate cache for French translations
INSERT INTO translation_cache (locale, namespace, translations_json, cache_version, generated_at, expires_at, generation_time_ms, is_valid)
VALUES (
    'fr',
    'common',
    jsonb_build_object(
        'common', jsonb_build_object(
            'loading', 'Chargement...',
            'error', 'Erreur',
            'success', 'Succès',
            'save', 'Enregistrer',
            'search', 'Rechercher'
        )
    ),
    '1.0.0',
    NOW(),
    NOW() + INTERVAL '24 hours',
    175,
    true
);

-- ===========================================
-- INITIALIZE ANALYTICS DATA
-- ===========================================

-- Sample analytics data for popular translations
INSERT INTO translation_analytics (translation_key_id, locale, view_count, last_viewed_at, avg_load_time_ms, total_requests, user_feedback_score, feedback_count, recorded_date)
SELECT 
    tk.id,
    'en',
    FLOOR(RANDOM() * 1000 + 100)::INTEGER,
    NOW() - INTERVAL '1 hour',
    ROUND((RANDOM() * 50 + 10)::NUMERIC, 2),
    FLOOR(RANDOM() * 5000 + 500)::INTEGER,
    ROUND((RANDOM() * 2 + 3)::NUMERIC, 2), -- 3.00 to 5.00
    FLOOR(RANDOM() * 50 + 5)::INTEGER,
    CURRENT_DATE
FROM translation_keys tk
WHERE tk.category IN ('common', 'auth', 'navigation')
LIMIT 15;

-- Update word counts for translations
UPDATE translations 
SET word_count = ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(value), ' '), 1)
WHERE word_count IS NULL AND value IS NOT NULL;

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- These can be used to verify the data was inserted correctly
-- SELECT COUNT(*) as total_keys FROM translation_keys;
-- SELECT COUNT(*) as total_translations FROM translations;
-- SELECT locale, COUNT(*) as translation_count FROM translations GROUP BY locale;
-- SELECT category, COUNT(*) as key_count FROM translation_keys GROUP BY category;
-- SELECT status, COUNT(*) as status_count FROM translations GROUP BY status;