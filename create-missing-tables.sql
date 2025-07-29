-- Create missing tables for Krong Thai SOP System
-- Execute these commands in the Supabase SQL Editor

-- 1. Create training_modules table
CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    title_fr VARCHAR(255),
    description TEXT,
    description_fr TEXT,
    content JSONB DEFAULT '{}',
    duration_minutes INTEGER DEFAULT 30,
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    is_required BOOLEAN DEFAULT false,
    prerequisites UUID[],
    tags TEXT[],
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create training_progress table
CREATE TABLE IF NOT EXISTS training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    score INTEGER,
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- 3. Create training_assessments table
CREATE TABLE IF NOT EXISTS training_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
    questions JSONB NOT NULL DEFAULT '[]',
    answers JSONB NOT NULL DEFAULT '{}',
    score INTEGER,
    max_score INTEGER,
    passed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create training_certificates table
CREATE TABLE IF NOT EXISTS training_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    issuer_name VARCHAR(100) DEFAULT 'Krong Thai Restaurant',
    verification_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create translation_keys table (simplified)
CREATE TABLE IF NOT EXISTS translation_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'common',
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create translations table (simplified)
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID REFERENCES translation_keys(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL DEFAULT 'en',
    value TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(key_id, locale)
);

-- 7. Create translation_history table
CREATE TABLE IF NOT EXISTS translation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_id UUID REFERENCES translations(id) ON DELETE CASCADE,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by UUID REFERENCES auth_users(id),
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_training_progress_user_id ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_module_id ON training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_training_assessments_user_id ON training_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_assessments_module_id ON training_assessments(module_id);
CREATE INDEX IF NOT EXISTS idx_training_certificates_user_id ON training_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_keys_category ON translation_keys(category);
CREATE INDEX IF NOT EXISTS idx_translations_key_locale ON translations(key_id, locale);
CREATE INDEX IF NOT EXISTS idx_translations_locale ON translations(locale);

-- 9. Insert sample training module
INSERT INTO training_modules (title, title_fr, description, description_fr, duration_minutes, difficulty_level, is_required, content) 
VALUES (
    'Restaurant Safety Basics',
    'Bases de la sécurité du restaurant',
    'Essential safety procedures for restaurant staff',
    'Procédures de sécurité essentielles pour le personnel du restaurant',
    45,
    'beginner',
    true,
    '{
        "sections": [
            {
                "title": "Kitchen Safety",
                "title_fr": "Sécurité de la cuisine",
                "content": "Basic kitchen safety protocols and procedures",
                "content_fr": "Protocoles et procédures de base pour la sécurité de la cuisine"
            },
            {
                "title": "Food Handling",
                "title_fr": "Manipulation des aliments",
                "content": "Proper food handling and storage procedures",
                "content_fr": "Procédures appropriées de manipulation et de stockage des aliments"
            }
        ]
    }'
) ON CONFLICT DO NOTHING;

-- 10. Insert sample translation keys and translations
INSERT INTO translation_keys (key_name, category) VALUES 
    ('common.loading', 'common'),
    ('common.save', 'common'),
    ('common.cancel', 'common'),
    ('common.edit', 'common'),
    ('common.delete', 'common'),
    ('auth.login', 'auth'),
    ('auth.logout', 'auth'),
    ('auth.enterPin', 'auth'),
    ('navigation.home', 'navigation'),
    ('navigation.sops', 'navigation'),
    ('navigation.training', 'navigation'),
    ('navigation.analytics', 'navigation'),
    ('sop.title', 'sop'),
    ('sop.search', 'sop'),
    ('sop.category', 'sop'),
    ('training.modules', 'training'),
    ('training.progress', 'training'),
    ('training.certificates', 'training')
ON CONFLICT (key_name) DO NOTHING;

-- Insert translations for the keys
INSERT INTO translations (key_id, locale, value, is_approved)
SELECT tk.id, 'en', 
    CASE tk.key_name
        WHEN 'common.loading' THEN 'Loading...'
        WHEN 'common.save' THEN 'Save'
        WHEN 'common.cancel' THEN 'Cancel'
        WHEN 'common.edit' THEN 'Edit'
        WHEN 'common.delete' THEN 'Delete'
        WHEN 'auth.login' THEN 'Login'
        WHEN 'auth.logout' THEN 'Logout'
        WHEN 'auth.enterPin' THEN 'Enter PIN'
        WHEN 'navigation.home' THEN 'Home'
        WHEN 'navigation.sops' THEN 'SOPs'
        WHEN 'navigation.training' THEN 'Training'
        WHEN 'navigation.analytics' THEN 'Analytics'
        WHEN 'sop.title' THEN 'Standard Operating Procedures'
        WHEN 'sop.search' THEN 'Search SOPs'
        WHEN 'sop.category' THEN 'Category'
        WHEN 'training.modules' THEN 'Training Modules'
        WHEN 'training.progress' THEN 'Progress'
        WHEN 'training.certificates' THEN 'Certificates'
        ELSE tk.key_name
    END,
    true
FROM translation_keys tk
ON CONFLICT (key_id, locale) DO NOTHING;

INSERT INTO translations (key_id, locale, value, is_approved)
SELECT tk.id, 'fr', 
    CASE tk.key_name
        WHEN 'common.loading' THEN 'Chargement...'
        WHEN 'common.save' THEN 'Enregistrer'
        WHEN 'common.cancel' THEN 'Annuler'
        WHEN 'common.edit' THEN 'Modifier'
        WHEN 'common.delete' THEN 'Supprimer'
        WHEN 'auth.login' THEN 'Connexion'
        WHEN 'auth.logout' THEN 'Déconnexion'
        WHEN 'auth.enterPin' THEN 'Entrer le PIN'
        WHEN 'navigation.home' THEN 'Accueil'
        WHEN 'navigation.sops' THEN 'PON'
        WHEN 'navigation.training' THEN 'Formation'
        WHEN 'navigation.analytics' THEN 'Analytique'
        WHEN 'sop.title' THEN 'Procédures opérationnelles normalisées'
        WHEN 'sop.search' THEN 'Rechercher PON'
        WHEN 'sop.category' THEN 'Catégorie'
        WHEN 'training.modules' THEN 'Modules de formation'
        WHEN 'training.progress' THEN 'Progrès'
        WHEN 'training.certificates' THEN 'Certificats'
        ELSE tk.key_name
    END,
    true
FROM translation_keys tk
ON CONFLICT (key_id, locale) DO NOTHING;