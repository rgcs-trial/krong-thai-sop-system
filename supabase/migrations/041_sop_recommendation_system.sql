-- Restaurant Krong Thai SOP Management System
-- SOP Recommendation System Database
-- Migration 041: Advanced recommendation engine with collaborative filtering and content-based recommendations
-- Created: 2025-07-28

-- ===========================================
-- RECOMMENDATION SYSTEM ENUMS
-- ===========================================

-- Recommendation types
CREATE TYPE recommendation_type AS ENUM (
    'content_based', 'collaborative_filtering', 'hybrid', 'knowledge_based',
    'context_aware', 'sequence_based', 'popularity_based', 'demographic'
);

-- Recommendation algorithms
CREATE TYPE recommendation_algorithm AS ENUM (
    'cosine_similarity', 'matrix_factorization', 'deep_learning', 'association_rules',
    'clustering', 'nearest_neighbor', 'neural_collaborative_filtering', 'content_filtering'
);

-- Recommendation contexts
CREATE TYPE recommendation_context AS ENUM (
    'task_completion', 'training_suggestion', 'workflow_optimization', 'skill_development',
    'equipment_usage', 'seasonal_adjustment', 'error_prevention', 'efficiency_improvement'
);

-- Feedback types
CREATE TYPE feedback_type AS ENUM (
    'implicit', 'explicit', 'click', 'view', 'completion', 'rating', 'bookmark', 'share'
);

-- ===========================================
-- RECOMMENDATION SYSTEM TABLES
-- ===========================================

-- User interaction matrix for collaborative filtering
CREATE TABLE IF NOT EXISTS sop_user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,
    
    -- Interaction details
    interaction_type feedback_type NOT NULL,
    interaction_value DECIMAL(4,2), -- Normalized value (0-1 for implicit, 1-5 for explicit)
    interaction_weight DECIMAL(4,2) DEFAULT 1.0, -- Weight for aggregation
    
    -- Temporal context
    interaction_timestamp TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT,
    interaction_duration_seconds INTEGER,
    
    -- Contextual factors
    time_of_day INTEGER, -- Hour 0-23
    day_of_week INTEGER, -- 1-7
    day_of_month INTEGER, -- 1-31
    month INTEGER, -- 1-12
    season VARCHAR(20), -- 'spring', 'summer', 'fall', 'winter'
    
    -- Business context
    shift_type VARCHAR(50), -- 'morning', 'afternoon', 'evening', 'night'
    workload_level VARCHAR(20), -- 'low', 'medium', 'high', 'peak'
    staff_count INTEGER,
    equipment_status JSONB DEFAULT '{}',
    
    -- Interaction quality
    completion_rate DECIMAL(4,2), -- 0-1
    error_occurred BOOLEAN DEFAULT false,
    help_requested BOOLEAN DEFAULT false,
    feedback_provided BOOLEAN DEFAULT false,
    
    -- Device and environment
    device_type VARCHAR(50), -- 'tablet', 'phone', 'desktop'
    location VARCHAR(100), -- Kitchen section, front of house, etc.
    
    CONSTRAINT fk_interaction_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_interaction_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_interaction_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_sop_session UNIQUE (user_id, sop_document_id, session_id, interaction_type)
);

-- SOP content features for content-based recommendations
CREATE TABLE IF NOT EXISTS sop_content_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,
    
    -- Content analysis
    title_keywords TEXT[] DEFAULT '{}',
    content_keywords TEXT[] DEFAULT '{}',
    skill_requirements TEXT[] DEFAULT '{}',
    equipment_required TEXT[] DEFAULT '{}',
    ingredients_used TEXT[] DEFAULT '{}',
    
    -- Complexity and requirements
    difficulty_level INTEGER DEFAULT 1, -- 1-10 scale
    estimated_time_minutes INTEGER,
    prerequisite_sops UUID[] DEFAULT '{}',
    required_certifications TEXT[] DEFAULT '{}',
    
    -- Content categorization
    primary_category VARCHAR(100),
    secondary_categories TEXT[] DEFAULT '{}',
    cooking_methods TEXT[] DEFAULT '{}',
    dietary_restrictions TEXT[] DEFAULT '{}',
    allergen_warnings TEXT[] DEFAULT '{}',
    
    -- Quality and performance metrics
    average_rating DECIMAL(3,2), -- 1-5 scale
    completion_success_rate DECIMAL(4,2), -- 0-1
    user_satisfaction_score DECIMAL(3,2), -- 1-5 scale
    training_effectiveness_score DECIMAL(4,2), -- 0-1
    
    -- Temporal patterns
    seasonal_relevance JSONB DEFAULT '{}', -- Season -> relevance score
    time_of_day_relevance JSONB DEFAULT '{}', -- Hour -> relevance score
    day_of_week_relevance JSONB DEFAULT '{}', -- DOW -> relevance score
    
    -- Usage patterns
    total_views INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    average_completion_time_minutes DECIMAL(8,2),
    
    -- Content similarity features (for ML)
    content_embedding VECTOR(512), -- Text embedding for semantic similarity
    tfidf_vector JSONB DEFAULT '{}', -- TF-IDF representation
    
    -- Feature weights for recommendation
    feature_importance JSONB DEFAULT '{}',
    last_features_update TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_content_features_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_content_features_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT unique_sop_content_features UNIQUE (sop_document_id)
);

-- User profiles for personalized recommendations
CREATE TABLE IF NOT EXISTS sop_user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Preference profiles
    preferred_sop_categories TEXT[] DEFAULT '{}',
    skill_proficiency JSONB DEFAULT '{}', -- Skill -> proficiency level (1-10)
    equipment_familiarity JSONB DEFAULT '{}', -- Equipment -> familiarity score
    ingredient_preferences JSONB DEFAULT '{}', -- Ingredient -> preference score
    
    -- Behavioral patterns
    preferred_difficulty_range JSONB DEFAULT '{"min": 1, "max": 10}',
    average_task_duration_minutes DECIMAL(8,2),
    preferred_time_slots INTEGER[] DEFAULT '{}', -- Preferred hours
    activity_pattern_weekdays JSONB DEFAULT '{}',
    activity_pattern_weekends JSONB DEFAULT '{}',
    
    -- Learning preferences
    learning_style VARCHAR(50), -- 'visual', 'auditory', 'kinesthetic', 'reading'
    feedback_preference feedback_type DEFAULT 'implicit',
    training_frequency_preference VARCHAR(50), -- 'daily', 'weekly', 'monthly'
    challenge_seeking_level INTEGER DEFAULT 5, -- 1-10 scale
    
    -- Performance history
    overall_performance_score DECIMAL(4,2), -- 0-1
    improvement_trend DECIMAL(6,4), -- Rate of improvement
    consistency_score DECIMAL(4,2), -- How consistent performance is
    error_pattern_analysis JSONB DEFAULT '{}',
    
    -- Social features
    collaboration_preference INTEGER DEFAULT 5, -- 1-10 scale
    mentoring_interest INTEGER DEFAULT 5, -- 1-10 scale
    knowledge_sharing_activity INTEGER DEFAULT 0,
    peer_interaction_frequency DECIMAL(4,2),
    
    -- Contextual preferences
    workload_preference VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    multitasking_ability INTEGER DEFAULT 5, -- 1-10 scale
    stress_tolerance INTEGER DEFAULT 5, -- 1-10 scale
    adaptation_speed INTEGER DEFAULT 5, -- 1-10 scale
    
    -- Recommendation settings
    recommendation_frequency VARCHAR(50) DEFAULT 'daily',
    max_recommendations_per_session INTEGER DEFAULT 5,
    diversity_preference DECIMAL(4,2) DEFAULT 0.3, -- 0-1, higher = more diverse
    novelty_preference DECIMAL(4,2) DEFAULT 0.5, -- 0-1, higher = more novel
    
    -- Profile metadata
    profile_completeness DECIMAL(4,2) DEFAULT 0, -- 0-1
    last_activity TIMESTAMPTZ,
    profile_confidence DECIMAL(4,2) DEFAULT 0.5, -- How confident we are in the profile
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_user_profile_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_profile_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- Generated recommendations
CREATE TABLE IF NOT EXISTS sop_generated_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,
    
    -- Recommendation metadata
    recommendation_type recommendation_type NOT NULL,
    algorithm_used recommendation_algorithm NOT NULL,
    context recommendation_context NOT NULL,
    
    -- Scoring and ranking
    relevance_score DECIMAL(5,4) NOT NULL, -- 0-1
    confidence_score DECIMAL(5,4) NOT NULL, -- 0-1
    novelty_score DECIMAL(5,4) DEFAULT 0, -- 0-1
    diversity_score DECIMAL(5,4) DEFAULT 0, -- 0-1
    final_score DECIMAL(5,4) NOT NULL, -- Weighted combination
    rank_position INTEGER,
    
    -- Recommendation reasoning
    recommendation_reasons JSONB DEFAULT '{}', -- Why this was recommended
    similar_items UUID[] DEFAULT '{}', -- Related SOPs that influenced this
    feature_contributions JSONB DEFAULT '{}', -- Feature -> contribution to score
    
    -- Context at generation time
    generation_context JSONB DEFAULT '{}',
    user_state_snapshot JSONB DEFAULT '{}',
    environmental_factors JSONB DEFAULT '{}',
    
    -- Recommendation lifecycle
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- User interaction with recommendation
    viewed_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Feedback and evaluation
    user_feedback feedback_type,
    feedback_value DECIMAL(4,2), -- 1-5 for explicit, 0-1 for implicit
    feedback_timestamp TIMESTAMPTZ,
    
    -- A/B testing
    experiment_id UUID,
    variant_name VARCHAR(100),
    control_group BOOLEAN DEFAULT false,
    
    -- Performance tracking
    click_through_rate DECIMAL(5,4),
    conversion_rate DECIMAL(5,4),
    engagement_duration_seconds INTEGER,
    
    CONSTRAINT fk_recommendation_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT unique_active_user_sop_recommendation UNIQUE (user_id, sop_document_id) WHERE is_active = true
);

-- Recommendation model configurations
CREATE TABLE IF NOT EXISTS sop_recommendation_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Model identification
    model_name VARCHAR(255) NOT NULL,
    model_version VARCHAR(50) DEFAULT '1.0.0',
    algorithm recommendation_algorithm NOT NULL,
    description TEXT,
    
    -- Model configuration
    hyperparameters JSONB DEFAULT '{}',
    feature_weights JSONB DEFAULT '{}',
    similarity_threshold DECIMAL(4,2) DEFAULT 0.3,
    
    -- Training configuration
    training_data_size INTEGER DEFAULT 0,
    min_interactions_per_user INTEGER DEFAULT 5,
    min_interactions_per_item INTEGER DEFAULT 3,
    train_test_split DECIMAL(4,2) DEFAULT 0.8,
    
    -- Model performance
    training_accuracy DECIMAL(5,4),
    validation_accuracy DECIMAL(5,4),
    precision_at_k JSONB DEFAULT '{}', -- k -> precision value
    recall_at_k JSONB DEFAULT '{}', -- k -> recall value
    ndcg_at_k JSONB DEFAULT '{}', -- k -> NDCG value
    
    -- Business metrics
    click_through_rate DECIMAL(5,4),
    conversion_rate DECIMAL(5,4),
    diversity_score DECIMAL(5,4),
    novelty_score DECIMAL(5,4),
    user_satisfaction DECIMAL(4,2), -- 1-5 scale
    
    -- Model deployment
    is_active BOOLEAN DEFAULT false,
    deployment_date TIMESTAMPTZ,
    last_training_date TIMESTAMPTZ,
    next_retraining_date TIMESTAMPTZ,
    
    -- Performance monitoring
    recommendation_count INTEGER DEFAULT 0,
    acceptance_rate DECIMAL(5,4),
    feedback_score DECIMAL(4,2),
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_rec_model_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_rec_model_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_model_version UNIQUE (restaurant_id, model_name, model_version)
);

-- Recommendation analytics and insights
CREATE TABLE IF NOT EXISTS sop_recommendation_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Analytics period
    analytics_date DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    
    -- Model performance metrics
    model_id UUID,
    total_recommendations INTEGER DEFAULT 0,
    unique_users_served INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,4),
    conversion_rate DECIMAL(5,4),
    
    -- User engagement metrics
    average_session_recommendations INTEGER DEFAULT 0,
    recommendation_acceptance_rate DECIMAL(5,4),
    user_satisfaction_score DECIMAL(4,2),
    feedback_response_rate DECIMAL(5,4),
    
    -- Content metrics
    most_recommended_sops JSONB DEFAULT '{}', -- SOP ID -> count
    least_recommended_sops JSONB DEFAULT '{}',
    category_distribution JSONB DEFAULT '{}', -- Category -> percentage
    difficulty_distribution JSONB DEFAULT '{}',
    
    -- Algorithm performance comparison
    algorithm_performance JSONB DEFAULT '{}', -- Algorithm -> metrics
    recommendation_type_effectiveness JSONB DEFAULT '{}',
    
    -- Business impact
    estimated_time_saved_minutes INTEGER DEFAULT 0,
    estimated_efficiency_improvement DECIMAL(5,2),
    training_acceleration_factor DECIMAL(4,2),
    error_reduction_percentage DECIMAL(5,2),
    
    -- Trend analysis
    week_over_week_change DECIMAL(6,4),
    month_over_month_change DECIMAL(6,4),
    seasonal_adjustment_factor DECIMAL(6,4),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_rec_analytics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_rec_analytics_model FOREIGN KEY (model_id) REFERENCES sop_recommendation_models(id),
    CONSTRAINT unique_restaurant_analytics_date UNIQUE (restaurant_id, analytics_date, model_id)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- User interactions indexes
CREATE INDEX idx_user_interactions_user_time ON sop_user_interactions(user_id, interaction_timestamp DESC);
CREATE INDEX idx_user_interactions_sop_time ON sop_user_interactions(sop_document_id, interaction_timestamp DESC);
CREATE INDEX idx_user_interactions_restaurant_type ON sop_user_interactions(restaurant_id, interaction_type);
CREATE INDEX idx_user_interactions_session ON sop_user_interactions(session_id);
CREATE INDEX idx_user_interactions_context ON sop_user_interactions(time_of_day, day_of_week, shift_type);

-- Content features indexes
CREATE INDEX idx_content_features_restaurant ON sop_content_features(restaurant_id);
CREATE INDEX idx_content_features_category ON sop_content_features(primary_category);
CREATE INDEX idx_content_features_difficulty ON sop_content_features(difficulty_level);
CREATE INDEX idx_content_features_rating ON sop_content_features(average_rating DESC);
CREATE INDEX idx_content_features_embedding ON sop_content_features USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);

-- User profiles indexes
CREATE INDEX idx_user_profiles_restaurant ON sop_user_profiles(restaurant_id);
CREATE INDEX idx_user_profiles_user ON sop_user_profiles(user_id);
CREATE INDEX idx_user_profiles_performance ON sop_user_profiles(overall_performance_score DESC);
CREATE INDEX idx_user_profiles_activity ON sop_user_profiles(last_activity DESC);

-- Generated recommendations indexes
CREATE INDEX idx_recommendations_user_active ON sop_generated_recommendations(user_id) WHERE is_active = true;
CREATE INDEX idx_recommendations_restaurant_time ON sop_generated_recommendations(restaurant_id, generated_at DESC);
CREATE INDEX idx_recommendations_score ON sop_generated_recommendations(final_score DESC);
CREATE INDEX idx_recommendations_context ON sop_generated_recommendations(context);
CREATE INDEX idx_recommendations_algorithm ON sop_generated_recommendations(algorithm_used);
CREATE INDEX idx_recommendations_feedback ON sop_generated_recommendations(user_feedback) WHERE user_feedback IS NOT NULL;
CREATE INDEX idx_recommendations_experiment ON sop_generated_recommendations(experiment_id) WHERE experiment_id IS NOT NULL;

-- Recommendation models indexes
CREATE INDEX idx_rec_models_restaurant ON sop_recommendation_models(restaurant_id);
CREATE INDEX idx_rec_models_active ON sop_recommendation_models(is_active) WHERE is_active = true;
CREATE INDEX idx_rec_models_algorithm ON sop_recommendation_models(algorithm);
CREATE INDEX idx_rec_models_performance ON sop_recommendation_models(validation_accuracy DESC);

-- Recommendation analytics indexes
CREATE INDEX idx_rec_analytics_restaurant_date ON sop_recommendation_analytics(restaurant_id, analytics_date DESC);
CREATE INDEX idx_rec_analytics_model ON sop_recommendation_analytics(model_id);
CREATE INDEX idx_rec_analytics_ctr ON sop_recommendation_analytics(click_through_rate DESC);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on recommendation tables
ALTER TABLE sop_user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_content_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_generated_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_recommendation_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_recommendation_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "User interactions restaurant access"
ON sop_user_interactions FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Content features restaurant access"
ON sop_content_features FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "User profiles restaurant access"
ON sop_user_profiles FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Generated recommendations restaurant access"
ON sop_generated_recommendations FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Recommendation models restaurant access"
ON sop_recommendation_models FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Recommendation analytics restaurant access"
ON sop_recommendation_analytics FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_content_features_updated_at 
    BEFORE UPDATE ON sop_content_features 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_user_profiles_updated_at 
    BEFORE UPDATE ON sop_user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_recommendation_models_updated_at 
    BEFORE UPDATE ON sop_recommendation_models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- UTILITY FUNCTIONS
-- ===========================================

-- Function to calculate user similarity (collaborative filtering)
CREATE OR REPLACE FUNCTION calculate_user_similarity(
    p_user1_id UUID,
    p_user2_id UUID,
    p_restaurant_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
    similarity DECIMAL DEFAULT 0;
BEGIN
    -- Calculate cosine similarity based on user interactions
    WITH user1_interactions AS (
        SELECT sop_document_id, interaction_value
        FROM sop_user_interactions
        WHERE user_id = p_user1_id AND restaurant_id = p_restaurant_id
    ),
    user2_interactions AS (
        SELECT sop_document_id, interaction_value
        FROM sop_user_interactions
        WHERE user_id = p_user2_id AND restaurant_id = p_restaurant_id
    ),
    common_items AS (
        SELECT u1.sop_document_id, u1.interaction_value as val1, u2.interaction_value as val2
        FROM user1_interactions u1
        JOIN user2_interactions u2 ON u1.sop_document_id = u2.sop_document_id
    )
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE SUM(val1 * val2) / (SQRT(SUM(val1 * val1)) * SQRT(SUM(val2 * val2)))
        END
    INTO similarity
    FROM common_items;
    
    RETURN COALESCE(similarity, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update user profile based on interactions
CREATE OR REPLACE FUNCTION update_user_profile_from_interactions(p_user_id UUID)
RETURNS void AS $$
DECLARE
    user_restaurant_id UUID;
BEGIN
    -- Get user's restaurant
    SELECT restaurant_id INTO user_restaurant_id 
    FROM auth_users WHERE id = p_user_id;
    
    -- Update user profile based on recent interactions
    INSERT INTO sop_user_profiles (restaurant_id, user_id, last_activity)
    VALUES (user_restaurant_id, p_user_id, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        last_activity = NOW(),
        profile_completeness = (
            SELECT LEAST(1.0, COUNT(DISTINCT sop_document_id)::DECIMAL / 10)
            FROM sop_user_interactions
            WHERE user_id = p_user_id
        ),
        overall_performance_score = (
            SELECT COALESCE(AVG(completion_rate), 0.5)
            FROM sop_user_interactions
            WHERE user_id = p_user_id AND completion_rate IS NOT NULL
        ),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_user_interactions IS 'User interaction matrix for collaborative filtering and behavior analysis';
COMMENT ON TABLE sop_content_features IS 'Content features for content-based recommendations with semantic embeddings';
COMMENT ON TABLE sop_user_profiles IS 'Comprehensive user profiles for personalized recommendations';
COMMENT ON TABLE sop_generated_recommendations IS 'Generated recommendations with scoring, ranking, and feedback tracking';
COMMENT ON TABLE sop_recommendation_models IS 'Recommendation model configurations and performance metrics';
COMMENT ON TABLE sop_recommendation_analytics IS 'Analytics and insights for recommendation system performance';

-- Performance optimization
ANALYZE sop_user_interactions;
ANALYZE sop_content_features;
ANALYZE sop_user_profiles;
ANALYZE sop_generated_recommendations;
ANALYZE sop_recommendation_models;
ANALYZE sop_recommendation_analytics;