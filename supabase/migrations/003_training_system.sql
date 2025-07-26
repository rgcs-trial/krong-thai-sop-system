-- Training System Database Schema
-- This migration adds tables for the interactive training module

-- Training progress status
CREATE TYPE training_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed', 'expired');

-- Assessment result status
CREATE TYPE assessment_status AS ENUM ('pending', 'passed', 'failed', 'retake_required');

-- Certificate status
CREATE TYPE certificate_status AS ENUM ('active', 'expired', 'revoked');

-- Training modules table
CREATE TABLE training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_th VARCHAR(500) NOT NULL,
    description TEXT,
    description_th TEXT,
    duration_minutes INTEGER DEFAULT 30,
    passing_score INTEGER DEFAULT 80, -- Minimum score to pass (0-100)
    max_attempts INTEGER DEFAULT 3,
    validity_days INTEGER DEFAULT 365, -- Certificate validity
    is_mandatory BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_training_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_training_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_training_created FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_training_updated FOREIGN KEY (updated_by) REFERENCES auth_users(id)
);

-- Training sections table (breaks down modules into sections)
CREATE TABLE training_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL,
    section_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_th VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_th TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]', -- Images, videos, documents
    estimated_minutes INTEGER DEFAULT 5,
    is_required BOOLEAN DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_section_module FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE,
    CONSTRAINT unique_section_number UNIQUE (module_id, section_number)
);

-- Training questions table (for assessments)
CREATE TABLE training_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL,
    section_id UUID, -- Optional - question can be module-wide
    question_type VARCHAR(20) DEFAULT 'multiple_choice', -- multiple_choice, true_false, short_answer
    question TEXT NOT NULL,
    question_th TEXT NOT NULL,
    options JSONB, -- For multiple choice: ["Option A", "Option B", ...]
    options_th JSONB, -- Thai options
    correct_answer TEXT NOT NULL, -- For multiple choice: index (0,1,2...), for true_false: "true"/"false"
    explanation TEXT,
    explanation_th TEXT,
    points INTEGER DEFAULT 1,
    difficulty VARCHAR(10) DEFAULT 'medium', -- easy, medium, hard
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_question_module FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_question_section FOREIGN KEY (section_id) REFERENCES training_sections(id) ON DELETE CASCADE
);

-- User training progress
CREATE TABLE user_training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    status training_status DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_section_id UUID,
    started_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent_minutes INTEGER DEFAULT 0,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_progress_module FOREIGN KEY (module_id) REFERENCES training_modules(id),
    CONSTRAINT fk_progress_section FOREIGN KEY (current_section_id) REFERENCES training_sections(id),
    CONSTRAINT unique_user_module_attempt UNIQUE (user_id, module_id, attempt_number)
);

-- Section completion tracking
CREATE TABLE user_section_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    section_id UUID NOT NULL,
    progress_id UUID NOT NULL, -- Links to user_training_progress
    is_completed BOOLEAN DEFAULT false,
    time_spent_minutes INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    notes TEXT, -- User notes or bookmarks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_section_progress_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_section_progress_section FOREIGN KEY (section_id) REFERENCES training_sections(id),
    CONSTRAINT fk_section_progress_main FOREIGN KEY (progress_id) REFERENCES user_training_progress(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_section_progress UNIQUE (user_id, section_id, progress_id)
);

-- Assessment attempts
CREATE TABLE training_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    progress_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL,
    status assessment_status DEFAULT 'pending',
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    score_percentage INTEGER DEFAULT 0 CHECK (score_percentage >= 0 AND score_percentage <= 100),
    time_spent_minutes INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_assessment_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_assessment_module FOREIGN KEY (module_id) REFERENCES training_modules(id),
    CONSTRAINT fk_assessment_progress FOREIGN KEY (progress_id) REFERENCES user_training_progress(id) ON DELETE CASCADE,
    CONSTRAINT unique_assessment_attempt UNIQUE (user_id, module_id, attempt_number)
);

-- Individual question responses
CREATE TABLE training_question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL,
    question_id UUID NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_response_assessment FOREIGN KEY (assessment_id) REFERENCES training_assessments(id) ON DELETE CASCADE,
    CONSTRAINT fk_response_question FOREIGN KEY (question_id) REFERENCES training_questions(id),
    CONSTRAINT unique_assessment_question UNIQUE (assessment_id, question_id)
);

-- Training certificates
CREATE TABLE training_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    assessment_id UUID NOT NULL,
    certificate_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., KT-FS-001-2024-001
    status certificate_status DEFAULT 'active',
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    revoked_reason TEXT,
    certificate_data JSONB NOT NULL, -- PDF metadata, template info, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_certificate_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_certificate_module FOREIGN KEY (module_id) REFERENCES training_modules(id),
    CONSTRAINT fk_certificate_assessment FOREIGN KEY (assessment_id) REFERENCES training_assessments(id),
    CONSTRAINT fk_certificate_revoker FOREIGN KEY (revoked_by) REFERENCES auth_users(id)
);

-- Training reminders and notifications
CREATE TABLE training_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    reminder_type VARCHAR(50) NOT NULL, -- 'due_soon', 'overdue', 'mandatory', 'certificate_expiring'
    title VARCHAR(255) NOT NULL,
    title_th VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    message_th TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_reminder_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_reminder_module FOREIGN KEY (module_id) REFERENCES training_modules(id)
);

-- Training analytics and reporting
CREATE TABLE training_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    date DATE NOT NULL,
    module_id UUID,
    total_enrollments INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    total_failures INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    average_completion_time INTEGER DEFAULT 0, -- minutes
    engagement_metrics JSONB DEFAULT '{}', -- Click rates, section views, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_analytics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_analytics_module FOREIGN KEY (module_id) REFERENCES training_modules(id),
    CONSTRAINT unique_daily_analytics UNIQUE (restaurant_id, date, module_id)
);

-- Indexes for performance
CREATE INDEX idx_training_modules_restaurant ON training_modules(restaurant_id);
CREATE INDEX idx_training_modules_sop ON training_modules(sop_document_id);
CREATE INDEX idx_training_modules_active ON training_modules(is_active);

CREATE INDEX idx_training_sections_module ON training_sections(module_id);
CREATE INDEX idx_training_sections_sort ON training_sections(module_id, sort_order);

CREATE INDEX idx_training_questions_module ON training_questions(module_id);
CREATE INDEX idx_training_questions_section ON training_questions(section_id);
CREATE INDEX idx_training_questions_active ON training_questions(is_active);

CREATE INDEX idx_progress_user ON user_training_progress(user_id);
CREATE INDEX idx_progress_module ON user_training_progress(module_id);
CREATE INDEX idx_progress_status ON user_training_progress(status);
CREATE INDEX idx_progress_user_status ON user_training_progress(user_id, status);

CREATE INDEX idx_section_progress_user ON user_section_progress(user_id);
CREATE INDEX idx_section_progress_section ON user_section_progress(section_id);
CREATE INDEX idx_section_progress_main ON user_section_progress(progress_id);

CREATE INDEX idx_assessments_user ON training_assessments(user_id);
CREATE INDEX idx_assessments_module ON training_assessments(module_id);
CREATE INDEX idx_assessments_status ON training_assessments(status);

CREATE INDEX idx_responses_assessment ON training_question_responses(assessment_id);
CREATE INDEX idx_responses_question ON training_question_responses(question_id);

CREATE INDEX idx_certificates_user ON training_certificates(user_id);
CREATE INDEX idx_certificates_module ON training_certificates(module_id);
CREATE INDEX idx_certificates_status ON training_certificates(status);
CREATE INDEX idx_certificates_expires ON training_certificates(expires_at);

CREATE INDEX idx_reminders_user ON training_reminders(user_id);
CREATE INDEX idx_reminders_scheduled ON training_reminders(scheduled_for);
CREATE INDEX idx_reminders_sent ON training_reminders(sent_at);

CREATE INDEX idx_analytics_restaurant ON training_analytics(restaurant_id);
CREATE INDEX idx_analytics_date ON training_analytics(date);
CREATE INDEX idx_analytics_module ON training_analytics(module_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all training tables
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_section_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_analytics ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Restaurant training isolation"
ON training_modules FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

CREATE POLICY "User training progress isolation"
ON user_training_progress FOR ALL
TO authenticated
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM auth_users 
        WHERE auth_users.id = auth.uid() 
        AND auth_users.role IN ('admin', 'manager')
        AND auth_users.restaurant_id = (
            SELECT restaurant_id FROM auth_users u2 
            WHERE u2.id = user_training_progress.user_id
        )
    )
);

CREATE POLICY "User assessment isolation"
ON training_assessments FOR ALL
TO authenticated
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM auth_users 
        WHERE auth_users.id = auth.uid() 
        AND auth_users.role IN ('admin', 'manager')
        AND auth_users.restaurant_id = (
            SELECT restaurant_id FROM auth_users u2 
            WHERE u2.id = training_assessments.user_id
        )
    )
);

CREATE POLICY "User certificate isolation"
ON training_certificates FOR ALL
TO authenticated
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM auth_users 
        WHERE auth_users.id = auth.uid() 
        AND auth_users.role IN ('admin', 'manager')
        AND auth_users.restaurant_id = (
            SELECT restaurant_id FROM auth_users u2 
            WHERE u2.id = training_certificates.user_id
        )
    )
);

-- Auto-update triggers
CREATE TRIGGER update_training_modules_updated_at 
    BEFORE UPDATE ON training_modules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_sections_updated_at 
    BEFORE UPDATE ON training_sections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_questions_updated_at 
    BEFORE UPDATE ON training_questions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_training_progress_updated_at 
    BEFORE UPDATE ON user_training_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for training system

-- Function to calculate training progress percentage
CREATE OR REPLACE FUNCTION calculate_training_progress(
    p_user_id UUID,
    p_module_id UUID,
    p_progress_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    total_sections INTEGER;
    completed_sections INTEGER;
    progress_pct INTEGER;
BEGIN
    -- Get total required sections for the module
    SELECT COUNT(*) INTO total_sections
    FROM training_sections 
    WHERE module_id = p_module_id AND is_required = true;
    
    -- Get completed sections for this user's progress
    SELECT COUNT(*) INTO completed_sections
    FROM user_section_progress usp
    JOIN training_sections ts ON usp.section_id = ts.id
    WHERE usp.user_id = p_user_id 
    AND usp.progress_id = p_progress_id
    AND ts.module_id = p_module_id
    AND ts.is_required = true
    AND usp.is_completed = true;
    
    -- Calculate percentage
    IF total_sections > 0 THEN
        progress_pct := ROUND((completed_sections::DECIMAL / total_sections) * 100);
    ELSE
        progress_pct := 0;
    END IF;
    
    RETURN COALESCE(progress_pct, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number(
    p_restaurant_id UUID,
    p_module_id UUID,
    p_user_id UUID
)
RETURNS VARCHAR AS $$
DECLARE
    restaurant_code VARCHAR(10);
    module_code VARCHAR(10);
    year_code VARCHAR(4);
    sequence_num INTEGER;
    cert_number VARCHAR(50);
BEGIN
    -- Get restaurant code (first 2 chars of name)
    SELECT UPPER(LEFT(REPLACE(name, ' ', ''), 2)) INTO restaurant_code
    FROM restaurants WHERE id = p_restaurant_id;
    
    -- Get module code from associated SOP category
    SELECT UPPER(LEFT(sc.code, 2)) INTO module_code
    FROM training_modules tm
    JOIN sop_documents sd ON tm.sop_document_id = sd.id
    JOIN sop_categories sc ON sd.category_id = sc.id
    WHERE tm.id = p_module_id;
    
    -- Get current year
    year_code := EXTRACT(YEAR FROM NOW())::VARCHAR;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(certificate_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO sequence_num
    FROM training_certificates tc
    JOIN training_modules tm ON tc.module_id = tm.id
    WHERE tm.restaurant_id = p_restaurant_id
    AND EXTRACT(YEAR FROM tc.issued_at) = EXTRACT(YEAR FROM NOW());
    
    -- Format: KT-FS-2024-001
    cert_number := restaurant_code || '-' || 
                   COALESCE(module_code, 'XX') || '-' || 
                   year_code || '-' || 
                   LPAD(sequence_num::VARCHAR, 3, '0');
    
    RETURN cert_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update training analytics
CREATE OR REPLACE FUNCTION update_training_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily analytics when training progress changes
    INSERT INTO training_analytics (
        restaurant_id,
        date,
        module_id,
        total_enrollments,
        total_completions,
        total_failures,
        average_score,
        average_completion_time
    )
    SELECT 
        tm.restaurant_id,
        CURRENT_DATE,
        NEW.module_id,
        COUNT(*) as total_enrollments,
        SUM(CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END) as total_completions,
        SUM(CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END) as total_failures,
        COALESCE(AVG(ta.score_percentage), 0) as average_score,
        COALESCE(AVG(NEW.time_spent_minutes), 0) as average_completion_time
    FROM training_modules tm
    LEFT JOIN training_assessments ta ON ta.module_id = NEW.module_id 
        AND ta.status = 'passed'
        AND DATE(ta.completed_at) = CURRENT_DATE
    WHERE tm.id = NEW.module_id
    GROUP BY tm.restaurant_id, NEW.module_id
    ON CONFLICT (restaurant_id, date, module_id)
    DO UPDATE SET
        total_enrollments = EXCLUDED.total_enrollments,
        total_completions = EXCLUDED.total_completions,
        total_failures = EXCLUDED.total_failures,
        average_score = EXCLUDED.average_score,
        average_completion_time = EXCLUDED.average_completion_time;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analytics on progress changes
CREATE TRIGGER update_analytics_on_progress_change
    AFTER UPDATE ON user_training_progress
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_training_analytics();